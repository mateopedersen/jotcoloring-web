/** Bounded original-design creates via normal media, backup, import and search gates. */
import fs from 'node:fs/promises';import path from 'node:path';
import {validateOriginalRelease,ORIGINAL_RELEASE_ID} from './original-release';import {remoteContext} from './release-context';import {runBounded} from './bounded-release';
import {validateManifest} from '../../src/server/manifest';import {acceptReview,reviewSignature,publishedKey} from '../../src/server/assets';import {createImport,processImport,projectEvent} from '../../src/server/imports';import {backupBytes} from '../../src/server/backups';import {canonicalJSON,sha256} from '../../src/server/http';
const args=process.argv.slice(2),option=(k:string)=>{const i=args.indexOf(k);return i<0?undefined:args[i+1]};
const environment=option('--environment'),file=option('--release'),start=Number(option('--start')||0),limit=Number(option('--limit')||5),parallel=Number(option('--parallel')||1);
if(!['production','staging'].includes(environment||'')||!file||!Number.isInteger(start)||start<0||start>99||!Number.isInteger(limit)||limit<1||limit>5||![1,2,3].includes(parallel))throw Error('Use an explicit environment, release, bounded start/limit (1-5), and parallel (1-3).');
const releaseBytes=new Uint8Array(await fs.readFile(file)),release=await validateOriginalRelease(JSON.parse(new TextDecoder().decode(releaseBytes))),items=[];
// Check the complete set before the first remote session or mutation.
for(const entry of release.items){
 const dir=entry.prepared_directory,bytes=new Uint8Array(await fs.readFile(path.join(dir,'manifest.json')));if(await sha256(bytes)!==entry.manifest_sha256)throw Error('Prepared manifest changed');
 const prepared=validateManifest(JSON.parse(new TextDecoder().decode(bytes)),true),files=JSON.parse(await fs.readFile(path.join(dir,'files.json'),'utf8')),reviews=JSON.parse(await fs.readFile(path.join(dir,'reviews.json'),'utf8'));
 if(prepared.content_id!==entry.id||prepared.slug!==entry.slug||prepared.import_action!=='create'||prepared.provenance.source_type!=='ai_generated'||prepared.title!==entry.review.title||prepared.description!==entry.review.description||prepared.alt_text!==entry.review.alt_text||canonicalJSON(prepared.category_ids)!==canonicalJSON(entry.review.category_ids)||await sha256(new Uint8Array(await fs.readFile(files.source_original)))!==entry.source_sha256)throw Error('Original identity or source changed');
 for(const a of prepared.assets){const b=new Uint8Array(await fs.readFile(files[a.role]));if(a.sha256!==entry.assets[a.role]||b.length!==a.bytes||await sha256(b)!==a.sha256||!reviews.some((r:any)=>r.review.sha256===a.sha256&&r.review.role===a.role))throw Error('Derivative review changed');}
 for(const s of entry.sources){const b=new Uint8Array(await fs.readFile(s.path));if(b.length!==s.bytes||await sha256(b)!==s.sha256)throw Error('Native original changed');}
 const nativeKey=`originals/${entry.id}/${entry.source_sha256}/line-master.png`,m=validateManifest({...prepared,requested_status:'published',provenance:{...prepared.provenance,reference:prepared.provenance.reference+'; private source '+nativeKey}},true);
 items.push({entry,m,files,reviews});
}
// Do not start a bounded cloud batch with a session about to expire halfway
// through an import. Refresh the same owner session before resuming this offset.
const authPath=process.env.JOT_WRANGLER_AUTH_FILE;if(!authPath)throw Error('Existing JotColoring session required');
const authExpiry=(await fs.readFile(authPath,'utf8')).match(/^expiration_time\s*=\s*"([^"]+)"/m)?.[1],remaining=Date.parse(authExpiry||'')-Date.now();if(!Number.isFinite(remaining)||remaining<10*60_000)throw Error('Refresh the existing JotColoring session before starting this batch; no cloud write started.');
const selected=items.slice(start,Math.min(100,start+limit)),{env,api,requests}=await remoteContext(environment as 'production'|'staging',{requestLimit:4000});
for(const {m}of selected){const row=await env.CATALOG_DB!.prepare('SELECT id,latest_version FROM content WHERE id=? OR slug=?').bind(m.content_id,m.slug).first<any>();if(row){if(row.id!==m.content_id||row.latest_version!==1)throw Error('Concurrent or unrelated content conflict');const rev=await env.CATALOG_DB!.prepare('SELECT manifest_json FROM content_revision WHERE content_id=? AND version=1').bind(m.content_id).first<any>();if(!rev||canonicalJSON(JSON.parse(rev.manifest_json))!==canonicalJSON(m))throw Error('Existing revision differs from this sealed original');}}
if(!args.includes('--apply')){console.log(JSON.stringify({environment,mode:'PLAN',release:ORIGINAL_RELEASE_ID,complete_designs:items.length,selected:selected.map(i=>i.m.slug),requests:requests()}));process.exit(0)}
// Preserve the existing projection queue for concurrent publications. The exact
// imports below are processed synchronously, so only their import message is omitted.
const queues=await api('/queues?name='+encodeURIComponent('jotcoloring-'+environment+'-ingest')),matches=queues.filter((q:any)=>q.queue_name==='jotcoloring-'+environment+'-ingest');if(matches.length!==1||!/^[a-f0-9]{32}$/.test(matches[0].queue_id))throw Error('Exact existing ingest queue required');
env.INGEST_QUEUE={async send(value){if(!value||typeof value!=='object'||!('type'in value))throw Error('Unrecognized operator message');const message=value as {type:unknown};if(message.type==='projection')await api(`/queues/${matches[0].queue_id}/messages`,{body:message,content_type:'json'});else if(message.type!=='import')throw Error('Unrecognized operator message');}};
const receipt:any={release:ORIGINAL_RELEASE_ID,release_sha256:await sha256(releaseBytes),environment,start,limit,started:new Date().toISOString(),items:[],status:'running'};
try{
 await backupBytes(env,`operator-releases/${ORIGINAL_RELEASE_ID}/${await sha256(releaseBytes)}.json`,releaseBytes,'application/json');
 await runBounded(selected,parallel,async({entry,m,files,reviews})=>{
  const existing=await env.CATALOG_DB!.prepare('SELECT active_version,status FROM content WHERE id=?').bind(m.content_id).first<any>();
  if(existing?.active_version!==1){
   for(const s of entry.sources){const bytes=new Uint8Array(await fs.readFile(s.path)),key=`originals/${entry.id}/${s.sha256}/${s.name}`;await env.ORIGINALS!.put(key,bytes,{httpMetadata:{contentType:s.mime}});const check=await env.ORIGINALS!.get(key);if(!check||await sha256(new Uint8Array(await check.arrayBuffer()))!==s.sha256)throw Error('Native original readback failed');await backupBytes(env,key,bytes,s.mime);}
   for(const a of m.assets)await env.ORIGINALS!.put(a.object_key,new Uint8Array(await fs.readFile(files[a.role])),{httpMetadata:{contentType:a.mime}});
   for(const signed of reviews)await acceptReview(env,signed.review,await reviewSignature(signed.review,env.MEDIA_VALIDATION_SECRET!));
   const job=await createImport(env,m,'operator:owner-originals-100-20261101');await processImport(env,job.job_id,`imports/${job.job_id}/manifest.json`);
  }
  const events=await env.CATALOG_DB!.prepare('SELECT event_id FROM outbox_event WHERE content_id=? AND version=1 AND processed_at IS NULL').bind(m.content_id).all<{event_id:string}>();for(const event of events.results)await projectEvent(env,event.event_id);
  const current=await env.CATALOG_DB!.prepare('SELECT active_version,status FROM content WHERE id=?').bind(m.content_id).first<any>();if(current?.active_version!==1||current.status!=='published')throw Error('Publication readback failed');
  for(const a of m.assets){const obj=await env.PUBLISHED!.get(publishedKey(m.content_id,1,a,m));if(!obj||obj.size!==a.bytes||await sha256(new Uint8Array(await obj.arrayBuffer()))!==a.sha256)throw Error('Published object readback failed');}
  receipt.items.push({id:m.content_id,slug:m.slug,version:1,assets_verified:m.assets.length,originals_preserved:true,status:'published_pending_public_http_verification'});console.log(JSON.stringify(receipt.items.at(-1)));
 });receipt.status='published_pending_public_http_verification';
}catch(e){receipt.status='failed';receipt.error=(e as Error).message;throw e;}finally{receipt.finished=new Date().toISOString();receipt.requests=requests();await fs.writeFile(path.join(path.dirname(file),`original-publication-${environment}-${start}-${limit}.json`),JSON.stringify(receipt,null,2));}
