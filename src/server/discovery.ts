import {catalogLocation} from '../taxonomy/catalog-location';
import {collectionForRoot,collectionPath} from '../taxonomy/navigation';
import {canonicalNumberSubject,numberTopic} from '../taxonomy/number-topics';
import type {Env} from './types';
import {sha256} from './http';
import {buildSitemapSegment,SITEMAP_SEGMENT_SIZE} from './sitemap';
import {categoryPath,categoryById,COLORING_TAXONOMY} from '../taxonomy/catalog';
import {ALL_COLORING_PAGES_PATH} from '../taxonomy/routes';
export const INDEXNOW_KEY='ee854fe90c4924b910aaa1776782403c';
export const DISCOVERY_ORIGIN='https://jotcoloring.com';
const utf8=new TextEncoder();
export function discoveryPath(key:string,allowLegacy=false){if(key.startsWith('category:'))return categoryById(key.slice(9))?categoryPath(key.slice(9)):null;if(/^\/(?:coloring\/[a-z0-9-]+\/)?$/.test(key)||key==='/coloring-pages/')return key;const view=catalogLocation(key);return view&&(allowLegacy||view.path===key)?key:null;}
/** Additional navigation pages share canonical paths; preserve existing receipts. */
export async function recordDiscoveryLandingPages(env:Env,contentId:string){
 if(env.DISCOVERY_ENABLED!=='true'||!env.CATALOG_DB)return;const db=env.CATALOG_DB;
 const content=await db.prepare('SELECT c.status,c.updated_at,('+canonicalNumberSubject()+") AS number,EXISTS(SELECT 1 FROM content_category cc WHERE cc.content_id=c.id AND cc.category_id='numbers') AS is_number FROM content c WHERE c.id=?").bind(contentId).first<{status:string;updated_at:string;number:string|null;is_number:number}>();if(!content)return;
 const categories=(await db.prepare('SELECT category_id FROM content_category WHERE content_id=?').bind(contentId).all<{category_id:string}>()).results;
 const existing=new Set(categories.map(c=>categoryPath(c.category_id))),paths=new Set<string>(['/coloring-pages/',ALL_COLORING_PAGES_PATH]);
 for(const row of categories){const category=categoryById(row.category_id),group=category&&collectionForRoot(category.parent||category.id);if(group&&!existing.has(collectionPath(group.id)))paths.add(collectionPath(group.id));}
 const number=content.is_number&&content.number?numberTopic(content.number):undefined;if(number)paths.add(number.path);
 if(!paths.size)return;
 await db.batch([db.prepare("INSERT INTO discovery_dirty(segment) SELECT 'static' WHERE EXISTS(SELECT 1 FROM json_each(?) p WHERE NOT EXISTS(SELECT 1 FROM discovery_page d WHERE d.path_key=p.value AND d.lastmod>=?)) ON CONFLICT(segment) DO UPDATE SET generation=generation+1").bind(JSON.stringify([...paths]),content.updated_at),...[...paths].flatMap(path=>[db.prepare('INSERT INTO discovery_page(path_key,lastmod) VALUES(?,?) ON CONFLICT(path_key) DO UPDATE SET lastmod=excluded.lastmod WHERE excluded.lastmod>discovery_page.lastmod').bind(path,content.updated_at),db.prepare("INSERT OR IGNORE INTO discovery_notice(path_key,revision,event_type) VALUES(?,?,'upsert')").bind(path,content.updated_at)])]);
}

const REBUILD_LEASE_MS=5*60000;
const rebuildWake={type:'discovery_rebuild',job_id:'sitemap'};
async function sendRebuildWake(env:Env,token:string){
 try{if(!env.INGEST_QUEUE)throw Error('DISCOVERY_QUEUE_UNAVAILABLE');await env.INGEST_QUEUE.send(rebuildWake);}
 catch(error){await env.CATALOG_DB!.prepare("UPDATE discovery_state SET rebuild_state='idle',rebuild_lease_until='',rebuild_last_error=? WHERE id=1 AND rebuild_state='queued' AND rebuild_token=?").bind('QUEUE_SEND_FAILED',token).run();throw error;}
}
/** Coalesce publication events into one durable wake-up on the existing ingest queue. */
export async function queueDiscoveryRebuild(env:Env){
 if(env.DISCOVERY_ENABLED!=='true')return false;
 const db=env.CATALOG_DB;if(!db||!env.INGEST_QUEUE)throw Error('DISCOVERY_BINDINGS_UNAVAILABLE');
 if(!await db.prepare('SELECT segment FROM discovery_dirty LIMIT 1').first())return false;
 const now=new Date().toISOString(),token=crypto.randomUUID();
 const claimed=await db.prepare("UPDATE discovery_state SET rebuild_state='queued',rebuild_token=?,rebuild_lease_until=?,rebuild_queued_at=?,rebuild_last_error='' WHERE id=1 AND (rebuild_state='idle' OR rebuild_lease_until<=?)").bind(token,new Date(Date.now()+REBUILD_LEASE_MS).toISOString(),now,now).run();
 if(!claimed.meta.changes){if(!await db.prepare('SELECT id FROM discovery_state WHERE id=1').first())throw Error('DISCOVERY_STATE_UNAVAILABLE');return false;}
 await sendRebuildWake(env,token);return true;
}
/** Queue and cron share a recoverable lease; old wake-ups may rebuild current dirty work. */
export async function processDiscoveryRebuild(env:Env,by:'queue'|'cron'|'operator'='queue',limit=8){
 if(env.DISCOVERY_ENABLED!=='true')return false;
 const db=env.CATALOG_DB;if(!db||!env.PUBLISHED)throw Error('DISCOVERY_BINDINGS_UNAVAILABLE');
 const now=new Date().toISOString();
 if(!await db.prepare('SELECT segment FROM discovery_dirty LIMIT 1').first()){
  await db.prepare("UPDATE discovery_state SET rebuild_state='idle',rebuild_lease_until='' WHERE id=1 AND (rebuild_state<>'processing' OR rebuild_lease_until<=?) AND NOT EXISTS(SELECT 1 FROM discovery_dirty)").bind(now).run();return false;
 }
 const token=crypto.randomUUID(),claimed=await db.prepare("UPDATE discovery_state SET rebuild_state='processing',rebuild_token=?,rebuild_lease_until=?,rebuild_last_error='' WHERE id=1 AND (rebuild_state<>'processing' OR rebuild_lease_until<=?)").bind(token,new Date(Date.now()+REBUILD_LEASE_MS).toISOString(),now).run();
 if(!claimed.meta.changes){if(!await db.prepare('SELECT id FROM discovery_state WHERE id=1').first())throw Error('DISCOVERY_STATE_UNAVAILABLE');return false;}
 try{
  await rebuildDiscovery(env,limit);
  // Check dirty work in the same atomic update that releases ownership. A
  // publication racing this boundary either gets this wake-up or claims idle.
  const finished=await db.prepare("UPDATE discovery_state SET rebuild_state=CASE WHEN EXISTS(SELECT 1 FROM discovery_dirty) THEN 'queued' ELSE 'idle' END,rebuild_lease_until=CASE WHEN EXISTS(SELECT 1 FROM discovery_dirty) THEN ? ELSE '' END,rebuild_queued_at=CASE WHEN EXISTS(SELECT 1 FROM discovery_dirty) THEN ? ELSE rebuild_queued_at END,rebuild_completed_at=CASE WHEN EXISTS(SELECT 1 FROM discovery_dirty) THEN rebuild_completed_at ELSE ? END,rebuild_completed_by=CASE WHEN EXISTS(SELECT 1 FROM discovery_dirty) THEN rebuild_completed_by ELSE ? END WHERE id=1 AND rebuild_state='processing' AND rebuild_token=?").bind(new Date(Date.now()+REBUILD_LEASE_MS).toISOString(),new Date().toISOString(),new Date().toISOString(),by,token).run();
  if(!finished.meta.changes)return false;
  const state=await db.prepare('SELECT rebuild_state,rebuild_token FROM discovery_state WHERE id=1').first<{rebuild_state:string;rebuild_token:string}>();
  if(state?.rebuild_state==='queued'&&state.rebuild_token===token)await sendRebuildWake(env,token);
  return true;
 }catch(error){
  await db.prepare("UPDATE discovery_state SET rebuild_state='idle',rebuild_lease_until='',rebuild_last_error=? WHERE id=1 AND rebuild_token=?").bind(error instanceof Error?error.message.slice(0,120):'REBUILD_FAILED',token).run();throw error;
 }
}
export async function rebuildDiscovery(env:Env,limit=4){
 const db=env.CATALOG_DB;if(!db||!env.PUBLISHED)return;
 const bounded=Math.max(1,Math.min(8,Math.floor(limit))),first=await db.prepare("SELECT segment,generation FROM discovery_dirty WHERE segment='static'").all<{segment:string;generation:number}>();
 const rest=await db.prepare("SELECT segment,generation FROM discovery_dirty WHERE segment<>'static' ORDER BY segment LIMIT ?").bind(bounded-first.results.length).all<{segment:string;generation:number}>();
 const dirty={results:[...first.results,...rest.results]};
 for(const d of dirty.results){
  const response=await buildSitemapSegment(env,new URL(env.PUBLIC_SITE_URL||DISCOVERY_ORIGIN),d.segment),xml=await response.text(),bytes=utf8.encode(xml);
  const count=(xml.match(/<url>/g)||[]).length;
  if(count>10000||bytes.length>40_000_000||!xml.startsWith('<?xml')||xml.includes('<sitemapindex'))throw Error('SITEMAP_SIZE_OR_FORMAT');
  const etag=await sha256(bytes),key=`sitemaps/v1/${d.segment}/${etag}.xml`;
  await env.PUBLISHED.put(key,bytes,{httpMetadata:{contentType:'application/xml; charset=utf-8',cacheControl:'public,max-age=31536000,immutable'}});
  const stored=await env.PUBLISHED.get(key);if(!stored||await sha256(new Uint8Array(await stored.arrayBuffer()))!==etag)throw Error('SITEMAP_READBACK_FAILED');
  // Publication that raced generation leaves dirty work behind; it cannot activate stale bytes.
  await db.batch([
   db.prepare('INSERT INTO discovery_fragment(segment,object_key,etag,url_count,bytes,generated_at,generation) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM discovery_dirty WHERE segment=? AND generation=?) ON CONFLICT(segment) DO UPDATE SET object_key=excluded.object_key,etag=excluded.etag,url_count=excluded.url_count,bytes=excluded.bytes,generated_at=CASE WHEN discovery_fragment.etag=excluded.etag THEN discovery_fragment.generated_at ELSE excluded.generated_at END,generation=excluded.generation').bind(d.segment,key,etag,count,bytes.length,new Date().toISOString(),d.generation,d.segment,d.generation),
   db.prepare('UPDATE discovery_state SET epoch=epoch+1 WHERE id=1 AND EXISTS(SELECT 1 FROM discovery_dirty WHERE segment=? AND generation=?)').bind(d.segment,d.generation),
   db.prepare('DELETE FROM discovery_dirty WHERE segment=? AND generation=?').bind(d.segment,d.generation)
  ]);
 }
}
export function nextDiscoveryAttempt(status:number,retryAfter:string|null,attempt:number,now=Date.now(),random=Math.random()){
 if(![429,0].includes(status)&&status<500)return null;
 // A provider rate limit is a hold, not a permanent delivery failure. Keep
 // its durable cooldown even after repeated responses so other streams wait.
 if(attempt>=8&&status!==429)return null;
 const retry=retryAfter?(Number.isFinite(Number(retryAfter))?now+Number(retryAfter)*1000:Date.parse(retryAfter)):0;
 return new Date(Math.max(Number.isFinite(retry)?retry:0,now+Math.max(status===429?600000:0,Math.min(86400000,30000*2**attempt))+random*10000)).toISOString();
}
async function discoveryCoolingDown(db:NonNullable<Env['CATALOG_DB']>){return !!await db.prepare("SELECT id FROM discovery_notice WHERE state='pending' AND last_status=429 AND not_before>? LIMIT 1").bind(new Date().toISOString()).first();}
interface Notice{id:number;path_key:string;content_id:string|null;revision:string;event_type:string;attempts:number}
/** Runs only in production. Persistent leases + receipts survive duplicate queue delivery. */
export async function sendDiscoveryNotices(env:Env,fetcher:typeof fetch=fetch,revision?:string){
 if(revision&&!/^navigation-v1:[a-f0-9]{40}$/.test(revision))throw Error('Exact reviewed navigation revision required');
 const db=env.CATALOG_DB;if(env.APP_ENV!=='production'||env.DISCOVERY_ENABLED!=='true'||env.PUBLIC_SITE_URL!==DISCOVERY_ORIGIN||!db)return;
 if(await db.prepare('SELECT segment FROM discovery_dirty LIMIT 1').first())return;
 if(await discoveryCoolingDown(db))return;
 const now=new Date().toISOString(),started=Date.now();
 const rows=await db.prepare("SELECT id,path_key,content_id,revision,event_type,attempts FROM discovery_notice WHERE ((state='pending' AND not_before<=?) OR (state='sending' AND lease_until<?))"+(revision?" AND revision=?":"")+" ORDER BY id LIMIT 20").bind(now,now,...(revision?[revision]:[])).all<Notice>();
 let claimedCount=0;const ready:{url:string;n:Notice;renew:()=>Promise<boolean>;defer:(reason:string)=>Promise<unknown>;finish:(state:string,status:number|null,error?:string|null,at?:string)=>Promise<unknown>}[]=[];
 for(const n of rows.results){
  if(Date.now()-started>90000)break;let lease=new Date(Date.now()+300000).toISOString();
  const claim=await db.prepare("UPDATE discovery_notice SET state='sending',lease_until=?,attempts=attempts+1 WHERE id=? AND ((state='pending' AND not_before<=?) OR (state='sending' AND lease_until<?))").bind(lease,n.id,now,now).run();if(!claim.meta.changes)continue;claimedCount++;
  const finish=async(state:string,status:number|null,error:string|null=null,at='')=>db.prepare("UPDATE discovery_notice SET state=?,last_status=?,last_error=?,not_before=?,lease_until=NULL,received_at=? WHERE id=? AND state='sending' AND lease_until=?").bind(state,status,error,at,['received','key_pending'].includes(state)?new Date().toISOString():null,n.id,lease).run();
  const defer=async(reason:string)=>db.prepare("UPDATE discovery_notice SET state='pending',attempts=MAX(attempts-1,0),last_error=?,not_before=?,lease_until=NULL WHERE id=? AND state='sending' AND lease_until=?").bind(reason,new Date(Date.now()+60000).toISOString(),n.id,lease).run();
  try{
   const path=discoveryPath(n.path_key,n.event_type==='redirect');if(!path){await finish('failed',null,'INVALID_PATH');continue;}
   // Coalesce superseded notices, but retain the old URL's redirect/removal event.
   const aliases=[n.path_key,path,...COLORING_TAXONOMY.filter(c=>categoryPath(c.id)===path).map(c=>'category:'+c.id)];const newer=await db.prepare('SELECT id FROM discovery_notice WHERE path_key IN (SELECT value FROM json_each(?)) AND id>? LIMIT 1').bind(JSON.stringify([...new Set(aliases)]),n.id).first();if(newer){await finish('obsolete',null);continue;}
   if(n.content_id){const c=await db.prepare('SELECT slug,status,latest_version,updated_at FROM content WHERE id=?').bind(n.content_id).first<{slug:string;status:string;latest_version:number;updated_at:string}>();if(!c||n.event_type==='upsert'&&(c.status!=='published'||path!==`/coloring/${c.slug}/`||n.revision!==`${c.latest_version}:${c.updated_at}`)){await finish('obsolete',null);continue;}}
   const url=DISCOVERY_ORIGIN+path,response=await fetcher(url,{redirect:'manual',headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)});
   if(n.event_type==='upsert'){
    if(response.status!==200)throw Error('LIVE_STATUS');
    const html=await response.text();if(!n.content_id&&(/noindex/i.test(response.headers.get('x-robots-tag')||'')||/<meta[^>]+(?:name=["']robots["'][^>]+content=["'][^"']*noindex|content=["'][^"']*noindex[^>]+name=["']robots)/i.test(html))){await finish('obsolete',200,'LANDING_PAGE_NOT_INDEXABLE');continue;}
    if(/noindex/i.test(response.headers.get('x-robots-tag')||'')||/<meta[^>]+(?:name=["']robots["'][^>]+content=["'][^"']*noindex|content=["'][^"']*noindex[^>]+name=["']robots)/i.test(html)||!html.includes(`rel="canonical" href="${url}"`))throw Error('LIVE_CANONICAL_OR_INDEXABILITY');
    // Current sitemap version must contain this URL before notifying.
    const segment=n.content_id?String(Math.floor(((await db.prepare('SELECT ordinal FROM sitemap_entry WHERE content_id=?').bind(n.content_id).first<{ordinal:number}>())!.ordinal-1)/SITEMAP_SEGMENT_SIZE)+1):'static';
    const fragment=await db.prepare('SELECT object_key FROM discovery_fragment WHERE segment=?').bind(segment).first<{object_key:string}>(),object=fragment&&await env.PUBLISHED?.get(fragment.object_key);if(!object||!(await object.text()).includes(`<loc>${url}</loc>`))throw Error('SITEMAP_NOT_CURRENT');
   }else{if(![301,308,404,410].includes(response.status))throw Error('LIVE_REMOVAL_STATUS');if(n.event_type==='redirect'){const target=new URL(response.headers.get('location')||'',url),expected=catalogLocation(path)?.path;if(![301,308].includes(response.status)||target.origin!==DISCOVERY_ORIGIN||expected&&target.pathname!==expected)throw Error('LIVE_REDIRECT_TARGET');}}
   if(n.content_id&&n.event_type==='upsert'){
    const assets=await db.prepare("SELECT a.object_key,a.mime,a.bytes FROM asset a JOIN content c ON c.id=a.content_id AND c.active_version=a.content_version WHERE c.id=? AND a.verified=1 AND a.role IN ('catalog_preview_bw','printable_pdf_a4_bw')").bind(n.content_id).all<{object_key:string;mime:string;bytes:number}>();
    if(assets.results.length!==2)throw Error('LIVE_ASSETS_MISSING');
    for(const a of assets.results){const ar=await fetcher('https://assets.jotcoloring.com/'+a.object_key.split('/').map(encodeURIComponent).join('/'),{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(15000)});if(ar.status!==200||!ar.headers.get('content-type')?.startsWith(a.mime))throw Error('LIVE_ASSET_STATUS');}
   }
   if(await db.prepare('SELECT segment FROM discovery_dirty LIMIT 1').first())throw Error('PUBLICATION_CHANGED');
   ready.push({url,n,finish,defer,renew:async()=>{const next=new Date(Date.now()+300000).toISOString(),result=await db.prepare("UPDATE discovery_notice SET lease_until=? WHERE id=? AND state='sending' AND lease_until=?").bind(next,n.id,lease).run();if(!result.meta.changes)return false;lease=next;return true;}});
  }catch(error){if(discoveryDeferral(error)){await defer(error.message);continue;}const next=nextDiscoveryAttempt(0,null,n.attempts+1);await finish(next?'pending':'failed',null,error instanceof Error?error.message.slice(0,80):'NETWORK',next||'');}
 }
 const active:typeof ready=[];for(const item of ready)if(await item.renew())active.push(item);
 if(active.length){try{
  if(await db.prepare('SELECT segment FROM discovery_dirty LIMIT 1').first())throw Error('PUBLICATION_CHANGED');
  if(await discoveryCoolingDown(db))throw Error('INDEXNOW_COOLDOWN');
  const keyURL=`${DISCOVERY_ORIGIN}/${INDEXNOW_KEY}.txt`,key=await fetcher(keyURL,{signal:AbortSignal.timeout(15000)});if(key.status!==200||(await key.text()).trim()!==INDEXNOW_KEY)throw Error('KEY_NOT_LIVE');
  const result=await fetcher('https://api.indexnow.org/indexnow',{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify({host:'jotcoloring.com',key:INDEXNOW_KEY,keyLocation:keyURL,urlList:[...new Set(active.map(item=>item.url))]}),redirect:'manual',signal:AbortSignal.timeout(20000)});
  for(const item of active){if(result.status===200||result.status===202)await item.finish(result.status===200?'received':'key_pending',result.status);else{const next=nextDiscoveryAttempt(result.status,result.headers.get('retry-after'),item.n.attempts+1);await item.finish(next?'pending':'failed',result.status,'INDEXNOW_HTTP',next||'');}}
 }catch(error){for(const item of active){if(discoveryDeferral(error)){await item.defer(error.message);continue;}const next=nextDiscoveryAttempt(0,null,item.n.attempts+1);await item.finish(next?'pending':'failed',null,error instanceof Error?error.message.slice(0,80):'NETWORK',next||'');}}}
 return claimedCount;
}
function discoveryDeferral(error:unknown):error is Error{return error instanceof Error&&['PUBLICATION_CHANGED','INDEXNOW_COOLDOWN'].includes(error.message);}
/** One queue delivery handles at most 20 notices; receipt leases make duplicates harmless. */
export async function queueDiscoveryNotices(env:Env,revision?:string){
 if(revision&&!/^navigation-v1:[a-f0-9]{40}$/.test(revision))throw Error('Exact reviewed navigation revision required');
 if(env.APP_ENV!=='production'||env.DISCOVERY_ENABLED!=='true'||env.PUBLIC_SITE_URL!==DISCOVERY_ORIGIN||!env.CATALOG_DB||!env.INGEST_QUEUE)return false;
 const db=env.CATALOG_DB;if(await db.prepare('SELECT segment FROM discovery_dirty LIMIT 1').first()||await discoveryCoolingDown(db))return false;
 const now=new Date().toISOString(),eligible=await db.prepare("SELECT id FROM discovery_notice WHERE ((state='pending' AND not_before<=?) OR (state='sending' AND lease_until<?))"+(revision?' AND revision=?':'')+' LIMIT 1').bind(now,now,...(revision?[revision]:[])).first();
 if(!eligible)return false;await env.INGEST_QUEUE.send({type:'discovery_notify',job_id:'indexnow',...(revision?{revision}:{})});return true;
}
export async function processDiscoveryNotices(env:Env,fetcher:typeof fetch=fetch,revision?:string){
 const claimed=await sendDiscoveryNotices(env,fetcher,revision);if(claimed)await queueDiscoveryNotices(env,revision);return claimed||0;
}
/** Bounded keyset reconciliation. The cursor survives restarts; never scans R2. */
export async function reconcileDiscovery(env:Env){
 const db=env.CATALOG_DB;if(!db)return;const state=await db.prepare('SELECT reconcile_after FROM discovery_state WHERE id=1').first<{reconcile_after:number}>();
 const rows=await db.prepare('SELECT s.ordinal,s.slug,s.visibility,s.updated_at,c.slug AS current_slug,c.status,c.updated_at AS current_updated FROM sitemap_entry s JOIN content c ON c.id=s.content_id WHERE s.ordinal>? ORDER BY s.ordinal LIMIT 100').bind(state?.reconcile_after||0).all<{ordinal:number;slug:string;visibility:string;updated_at:string;current_slug:string;status:string;current_updated:string}>();
 for(const r of rows.results)if(r.slug!==r.current_slug||r.visibility!==r.status||r.updated_at!==r.current_updated)await db.batch([db.prepare('UPDATE sitemap_entry SET slug=?,visibility=?,updated_at=? WHERE ordinal=?').bind(r.current_slug,r.status,r.current_updated,r.ordinal),db.prepare('INSERT INTO discovery_dirty(segment) VALUES(?) ON CONFLICT(segment) DO UPDATE SET generation=generation+1').bind(String(Math.floor((r.ordinal-1)/SITEMAP_SEGMENT_SIZE)+1))]);
 await db.prepare('UPDATE discovery_state SET reconcile_after=? WHERE id=1').bind(rows.results.at(-1)?.ordinal||0).run();
}
export async function runDiscovery(env:Env){if(env.DISCOVERY_ENABLED!=='true')return;await reconcileDiscovery(env);await processDiscoveryRebuild(env,'cron');await processDiscoveryNotices(env);}

