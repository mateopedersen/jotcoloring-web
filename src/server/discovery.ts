import type {Env} from './types';
import {sha256} from './http';
import {buildSitemapSegment,SITEMAP_SEGMENT_SIZE} from './sitemap';
import {categoryPath,categoryById} from '../taxonomy/catalog';
export const INDEXNOW_KEY='ee854fe90c4924b910aaa1776782403c';
export const DISCOVERY_ORIGIN='https://jotcoloring.com';
const utf8=new TextEncoder();
export function discoveryPath(key:string){if(key.startsWith('category:'))return categoryById(key.slice(9))?categoryPath(key.slice(9)):null;return /^\/(?:coloring\/[a-z0-9-]+\/|coloring-pages\/)?$/.test(key)?key:null;}
export async function rebuildDiscovery(env:Env,limit=4){
 const db=env.CATALOG_DB;if(!db||!env.PUBLISHED)return;
 const dirty=await db.prepare('SELECT segment,generation FROM discovery_dirty ORDER BY segment LIMIT ?').bind(Math.min(8,limit)).all<{segment:string;generation:number}>();
 for(const d of dirty.results){
  const response=await buildSitemapSegment(env,new URL(env.PUBLIC_SITE_URL||DISCOVERY_ORIGIN),d.segment),xml=await response.text(),bytes=utf8.encode(xml);
  const count=(xml.match(/<url>/g)||[]).length;
  if(count>10000||bytes.length>40_000_000||!xml.startsWith('<?xml')||xml.includes('<sitemapindex'))throw Error('SITEMAP_SIZE_OR_FORMAT');
  const etag=await sha256(bytes),key=`sitemaps/v1/${d.segment}/${etag}.xml`;
  await env.PUBLISHED.put(key,bytes,{httpMetadata:{contentType:'application/xml; charset=utf-8',cacheControl:'public,max-age=31536000,immutable'}});
  const stored=await env.PUBLISHED.get(key);if(!stored||await sha256(new Uint8Array(await stored.arrayBuffer()))!==etag)throw Error('SITEMAP_READBACK_FAILED');
  // Publication that raced generation leaves dirty work behind; it cannot activate stale bytes.
  await db.batch([
   db.prepare('INSERT INTO discovery_fragment(segment,object_key,etag,url_count,bytes,generated_at,generation) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM discovery_dirty WHERE segment=? AND generation=?) ON CONFLICT(segment) DO UPDATE SET object_key=excluded.object_key,etag=excluded.etag,url_count=excluded.url_count,bytes=excluded.bytes,generated_at=excluded.generated_at,generation=excluded.generation').bind(d.segment,key,etag,count,bytes.length,new Date().toISOString(),d.generation,d.segment,d.generation),
   db.prepare('UPDATE discovery_state SET epoch=epoch+1 WHERE id=1 AND EXISTS(SELECT 1 FROM discovery_dirty WHERE segment=? AND generation=?)').bind(d.segment,d.generation),
   db.prepare('DELETE FROM discovery_dirty WHERE segment=? AND generation=?').bind(d.segment,d.generation)
  ]);
 }
}
export function nextDiscoveryAttempt(status:number,retryAfter:string|null,attempt:number,now=Date.now(),random=Math.random()){
 if(![429,0].includes(status)&&status<500)return null;
 if(attempt>=8)return null;
 const retry=retryAfter?(Number.isFinite(Number(retryAfter))?now+Number(retryAfter)*1000:Date.parse(retryAfter)):0;
 return new Date(Math.max(Number.isFinite(retry)?retry:0,now+Math.min(86400000,30000*2**attempt)+random*10000)).toISOString();
}
interface Notice{id:number;path_key:string;content_id:string|null;revision:string;event_type:string;attempts:number}
/** Runs only in production. Persistent leases + receipts survive duplicate queue delivery. */
export async function sendDiscoveryNotices(env:Env,fetcher:typeof fetch=fetch){
 const db=env.CATALOG_DB;if(env.APP_ENV!=='production'||env.DISCOVERY_ENABLED!=='true'||env.PUBLIC_SITE_URL!==DISCOVERY_ORIGIN||!db)return;
 if(await db.prepare('SELECT segment FROM discovery_dirty LIMIT 1').first())return;
 const now=new Date().toISOString();
 const rows=await db.prepare("SELECT id,path_key,content_id,revision,event_type,attempts FROM discovery_notice WHERE (state='pending' AND not_before<=?) OR (state='sending' AND lease_until<?) ORDER BY id LIMIT 20").bind(now,now).all<Notice>();
 for(const n of rows.results){
  const claim=await db.prepare("UPDATE discovery_notice SET state='sending',lease_until=?,attempts=attempts+1 WHERE id=? AND ((state='pending' AND not_before<=?) OR (state='sending' AND lease_until<?))").bind(new Date(Date.now()+300000).toISOString(),n.id,now,now).run();if(!claim.meta.changes)continue;
  const finish=async(state:string,status:number|null,error:string|null=null,at='')=>db.prepare('UPDATE discovery_notice SET state=?,last_status=?,last_error=?,not_before=?,lease_until=NULL,received_at=? WHERE id=?').bind(state,status,error,at,['received','key_pending'].includes(state)?new Date().toISOString():null,n.id).run();
  try{
   const path=discoveryPath(n.path_key);if(!path){await finish('failed',null,'INVALID_PATH');continue;}
   // Coalesce superseded notices, but retain the old URL's redirect/removal event.
   const newer=await db.prepare('SELECT id FROM discovery_notice WHERE path_key=? AND id>? LIMIT 1').bind(n.path_key,n.id).first();if(newer){await finish('obsolete',null);continue;}
   if(n.content_id){const c=await db.prepare('SELECT slug,status,latest_version,updated_at FROM content WHERE id=?').bind(n.content_id).first<{slug:string;status:string;latest_version:number;updated_at:string}>();if(!c||n.event_type==='upsert'&&(c.status!=='published'||path!==`/coloring/${c.slug}/`||n.revision!==`${c.latest_version}:${c.updated_at}`)){await finish('obsolete',null);continue;}}
   const url=DISCOVERY_ORIGIN+path,response=await fetcher(url,{redirect:'manual',headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)});
   if(n.event_type==='upsert'){
    if(response.status!==200)throw Error('LIVE_STATUS');
    const html=await response.text();if(/noindex/i.test(response.headers.get('x-robots-tag')||'')||/<meta[^>]+(?:name=["']robots["'][^>]+content=["'][^"']*noindex|content=["'][^"']*noindex[^>]+name=["']robots)/i.test(html)||!html.includes(`rel="canonical" href="${url}"`))throw Error('LIVE_CANONICAL_OR_INDEXABILITY');
    // Current sitemap version must contain this URL before notifying.
    const segment=n.content_id?String(Math.floor(((await db.prepare('SELECT ordinal FROM sitemap_entry WHERE content_id=?').bind(n.content_id).first<{ordinal:number}>())!.ordinal-1)/SITEMAP_SEGMENT_SIZE)+1):'static';
    const fragment=await db.prepare('SELECT object_key FROM discovery_fragment WHERE segment=?').bind(segment).first<{object_key:string}>(),object=fragment&&await env.PUBLISHED?.get(fragment.object_key);if(!object||!(await object.text()).includes(`<loc>${url}</loc>`))throw Error('SITEMAP_NOT_CURRENT');
   }else if(![301,308,404,410].includes(response.status))throw Error('LIVE_REMOVAL_STATUS');
   if(n.content_id&&n.event_type==='upsert'){
    const assets=await db.prepare("SELECT a.object_key,a.mime,a.bytes FROM asset a JOIN content c ON c.id=a.content_id AND c.active_version=a.content_version WHERE c.id=? AND a.verified=1 AND a.role IN ('catalog_preview_bw','printable_pdf_a4_bw')").bind(n.content_id).all<{object_key:string;mime:string;bytes:number}>();
    if(assets.results.length!==2)throw Error('LIVE_ASSETS_MISSING');
    for(const a of assets.results){const ar=await fetcher('https://assets.jotcoloring.com/'+a.object_key.split('/').map(encodeURIComponent).join('/'),{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(15000)});if(ar.status!==200||!ar.headers.get('content-type')?.startsWith(a.mime))throw Error('LIVE_ASSET_STATUS');}
   }
   if(await db.prepare('SELECT segment FROM discovery_dirty LIMIT 1').first())throw Error('PUBLICATION_CHANGED');
   const keyURL=`${DISCOVERY_ORIGIN}/${INDEXNOW_KEY}.txt`,key=await fetcher(keyURL,{signal:AbortSignal.timeout(15000)});if(key.status!==200||(await key.text()).trim()!==INDEXNOW_KEY)throw Error('KEY_NOT_LIVE');
   const result=await fetcher('https://api.indexnow.org/indexnow',{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify({host:'jotcoloring.com',key:INDEXNOW_KEY,keyLocation:keyURL,urlList:[url]}),redirect:'error',signal:AbortSignal.timeout(20000)});
   if(result.status===200||result.status===202)await finish(result.status===200?'received':'key_pending',result.status);
   else{const next=nextDiscoveryAttempt(result.status,result.headers.get('retry-after'),n.attempts+1);await finish(next?'pending':'failed',result.status,'INDEXNOW_HTTP',next||'');}
  }catch(error){const next=nextDiscoveryAttempt(0,null,n.attempts+1);await finish(next?'pending':'failed',null,error instanceof Error?error.message.slice(0,80):'NETWORK',next||'');}
 }
}
/** Bounded keyset reconciliation. The cursor survives restarts; never scans R2. */
export async function reconcileDiscovery(env:Env){
 const db=env.CATALOG_DB;if(!db)return;const state=await db.prepare('SELECT reconcile_after FROM discovery_state WHERE id=1').first<{reconcile_after:number}>();
 const rows=await db.prepare('SELECT s.ordinal,s.slug,s.visibility,s.updated_at,c.slug AS current_slug,c.status,c.updated_at AS current_updated FROM sitemap_entry s JOIN content c ON c.id=s.content_id WHERE s.ordinal>? ORDER BY s.ordinal LIMIT 100').bind(state?.reconcile_after||0).all<{ordinal:number;slug:string;visibility:string;updated_at:string;current_slug:string;status:string;current_updated:string}>();
 for(const r of rows.results)if(r.slug!==r.current_slug||r.visibility!==r.status||r.updated_at!==r.current_updated)await db.batch([db.prepare('UPDATE sitemap_entry SET slug=?,visibility=?,updated_at=? WHERE ordinal=?').bind(r.current_slug,r.status,r.current_updated,r.ordinal),db.prepare('INSERT INTO discovery_dirty(segment) VALUES(?) ON CONFLICT(segment) DO UPDATE SET generation=generation+1').bind(String(Math.floor((r.ordinal-1)/SITEMAP_SEGMENT_SIZE)+1))]);
 await db.prepare('UPDATE discovery_state SET reconcile_after=? WHERE id=1').bind(rows.results.at(-1)?.ordinal||0).run();
}
export async function runDiscovery(env:Env){if(env.DISCOVERY_ENABLED!=='true')return;await reconcileDiscovery(env);await rebuildDiscovery(env);await sendDiscoveryNotices(env);}
