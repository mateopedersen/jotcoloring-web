/** Bounded, resumable creates through the established import/backup/search pipeline. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {requireDoubleEditorialApproval} from './editorial-approval';
import {bundleSignature,validateReviewedBundle} from '../../src/server/reviewed-bundle';
import {remoteContext} from './release-context';
import {heldDraftRevision,IMPORT_ACTOR} from './held-draft-resume';
import {validateManifest} from '../../src/server/manifest';
import {acceptReview,reviewSignature,publishedKey} from '../../src/server/assets';
import {createImport,processImport,projectEvent} from '../../src/server/imports';
import {canonicalJSON,sha256} from '../../src/server/http';
const args=process.argv.slice(2),option=(key:string)=>{const i=args.indexOf(key);return i>=0?args[i+1]:undefined};
const environment=option('--environment');if(environment!=='staging'&&environment!=='production')throw Error('Verified environment required');
const reviewPath=option('--review'),preparationPath=option('--preparation');if(!reviewPath||!preparationPath)throw Error('Explicit approved review and preparation required');
const start=Number(option('--start')||0),limit=Number(option('--limit')||1);if(!Number.isInteger(start)||start<0||!Number.isInteger(limit)||limit<1||limit>10)throw Error('Use bounded batches of 1-10 items');
const reviews=JSON.parse(await fs.readFile(reviewPath,'utf8')),preparation=JSON.parse(await fs.readFile(preparationPath,'utf8'));
if(preparation.status!=='prepared_pending_render_review'||preparation.failed.length||preparation.prepared.length!==reviews.length)throw Error('Complete validated collection required before publishing any item');
if(reviews.some((r:any)=>r.status!=='approved_for_publication'||!r.prepared_source_sha256||!r.render_review))throw Error('Every artwork must have source-bound editorial and final-render approval');
let inventoryPath=option('--sources');
if(environment==='production'||args.includes('--queue-bundle')){
 const releasePath=option('--full-release');if(!releasePath)throw Error('Owner requires all 24 packages together: --full-release is mandatory');
 const release=JSON.parse(await fs.readFile(releasePath,'utf8'));if(release.status!=='ready_for_publication'||release.collections?.length!==24)throw Error('All 24 collections must be ready');
 const allIds=new Set<string>();for(const collection of release.collections){const rb=new Uint8Array(await fs.readFile(collection.review_path)),pb=new Uint8Array(await fs.readFile(collection.preparation_path));if(await sha256(rb)!==collection.review_sha256||await sha256(pb)!==collection.preparation_sha256)throw Error('Full release approval changed');const rr=JSON.parse(new TextDecoder().decode(rb)),pp=JSON.parse(new TextDecoder().decode(pb));if(rr.length!==100||pp.prepared?.length!==100||pp.failed?.length||pp.status!=='prepared_pending_render_review'||rr.some((r:any)=>r.status!=='approved_for_publication'||!r.render_review))throw Error('Incomplete collection in full release');for(const r of rr){await requireDoubleEditorialApproval(r,r.prepared_source_sha256);if(allIds.has(r.design_id))throw Error('Duplicate release identity');allIds.add(r.design_id);}}
 if(allIds.size!==2400||reviews.some((r:any)=>!allIds.has(r.design_id)))throw Error('Full 2400-artwork release required');
 if(!release.collections.some((c:any)=>path.resolve(c.review_path)===path.resolve(reviewPath)&&path.resolve(c.preparation_path)===path.resolve(preparationPath)))throw Error('Selected collection is not the sealed approval');
 if(!release.source_inventory_path||!release.source_inventory_sha256||(inventoryPath&&path.resolve(inventoryPath)!==path.resolve(release.source_inventory_path)))throw Error('Sealed original-source inventory required');
 inventoryPath=release.source_inventory_path;const inventoryBytes=new Uint8Array(await fs.readFile(inventoryPath!));if(await sha256(inventoryBytes)!==release.source_inventory_sha256)throw Error('Original-source inventory changed');
}
if(!inventoryPath)throw Error('Explicit original-source inventory required: --sources');
const sourceInventory=JSON.parse(await fs.readFile(inventoryPath,'utf8'));if(!Array.isArray(sourceInventory)||new Set(sourceInventory.map((r:any)=>r.design_id)).size!==sourceInventory.length)throw Error('Invalid original-source inventory');
const selected=preparation.prepared.slice(start,start+limit);if(!selected.length)throw Error('No selected records');
const {env,api,requests}=await remoteContext(environment as 'production'|'staging',{requestLimit:4000});
const reviewsPathRecord=(id:string)=>reviews.find((r:any)=>r.design_id===id);
const items=[];
// Validate complete selected batch before the first mutation.
for(const entry of selected){const review=reviews.find((r:any)=>r.design_id===entry.id);const dir=entry.folder;let m=validateManifest({...JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8')),requested_status:'published'},environment==='production');
if(m.import_action!=='create'||m.title!==review.title||m.description!==review.description||m.alt_text!==review.alt_text||m.content_id!==entry.content_id||review.prepared_source_sha256!==entry.source_sha256)throw Error('Review or prepared identity changed');
await requireDoubleEditorialApproval(review,entry.source_sha256);
if(!review.render_review.assets||m.assets.some(a=>review.render_review.assets[a.role]!==a.sha256)||Object.keys(review.render_review.assets).length!==m.assets.length)throw Error('Final-render approval is stale');
const files=JSON.parse(await fs.readFile(path.join(dir,'files.json'),'utf8'));if(await sha256(new Uint8Array(await fs.readFile(files.source_original)))!==entry.source_sha256)throw Error('Reviewed source changed');
for(const a of m.assets){const bytes=new Uint8Array(await fs.readFile(files[a.role]));if(bytes.length!==a.bytes||await sha256(bytes)!==a.sha256)throw Error('Prepared bytes changed');}
const existing=await env.CATALOG_DB!.prepare('SELECT active_version,latest_version,status FROM content WHERE id=?').bind(m.content_id).first<any>();let version=1;
if(existing){const revision=await env.CATALOG_DB!.prepare('SELECT manifest_json FROM content_revision WHERE content_id=? AND version=?').bind(m.content_id,existing.latest_version).first<any>();if(!revision)throw Error('Existing revision unavailable');const current=JSON.parse(revision.manifest_json);
 if(existing.latest_version!==1||canonicalJSON(current)!==canonicalJSON(m)){
  if(environment!=='production')throw Error('Unrelated existing or concurrent content');
  const original=await env.CATALOG_DB!.prepare('SELECT manifest_json FROM content_revision WHERE content_id=? AND version=1').bind(m.content_id).first<any>();
  const heldJob=await env.CATALOG_DB!.prepare("SELECT j.owner,j.status,j.error_code FROM import_job j JOIN import_item i ON i.import_id=j.id WHERE i.content_id=? AND i.version=1 AND j.owner=? AND j.error_code='OWNER_FULL_BATCH_HOLD'").bind(m.content_id,IMPORT_ACTOR).first<any>();
  if(!original)throw Error('Original held draft unavailable');m=validateManifest(heldDraftRevision(m,existing,JSON.parse(original.manifest_json),current,heldJob),true);version=2;
 }
}
const collection=entry.id.split('__')[0];if(!/^[a-z0-9_-]+$/.test(entry.id))throw Error('Invalid source design ID');
const original=sourceInventory.find((r:any)=>r.design_id===entry.id);if(!original||original.collection!==collection||original.source_sha256!==entry.source_sha256||original.original_pdf_sha256!==review.pdf_sha256||original.original_webp_sha256!==review.webp_sha256)throw Error('Original-source inventory does not match approved artwork');
const zip=original.source_zip_path,supplied=[];if(typeof zip!=='string'||!path.isAbsolute(zip)||!zip.endsWith('.zip'))throw Error('Explicit original ZIP path required');
for(const [kind,mime] of [['pdf','application/pdf'],['webp','image/webp']] as const){const entryPath=original['source_'+kind+'_path'];if(typeof entryPath!=='string'||entryPath.startsWith('/')||entryPath.split('/').some((s:string)=>s==='..'||!s)||!entryPath.toLowerCase().endsWith('.'+kind))throw Error('Invalid original archive entry');const bytes=new Uint8Array(execFileSync('/usr/bin/unzip',['-p',zip,entryPath],{maxBuffer:2_000_000}));const hash=await sha256(bytes);if(hash!==review[kind+'_sha256'])throw Error('Supplied original changed');supplied.push({bytes,mime,sha256:hash,key:`packages/${collection}/${entry.id}/${hash}.${kind}`});}
items.push({m,files,entry,existing,version,supplied,reviews:JSON.parse(await fs.readFile(path.join(dir,'reviews.json'),'utf8'))});}
if(!args.includes('--apply')){console.log(JSON.stringify({mode:'PLAN',environment,items:items.length,requests:requests()}));process.exit(0);}
const collectionName=path.basename(preparationPath).replace(/-preparation-report\.json$/,'');if(!/^[a-z0-9-]+$/.test(collectionName))throw Error('Invalid receipt collection');
const useQueue=args.includes('--queue-bundle');
const actor=IMPORT_ACTOR,receipt:any={environment,collection:collectionName,start,limit,started:new Date().toISOString(),items:[],status:'running'};
try{
let queueID:string|undefined;
if(useQueue){const queues=await api('/queues?name='+encodeURIComponent('jotcoloring-'+environment+'-ingest'));const matches=queues.filter((q:any)=>q.queue_name==='jotcoloring-'+environment+'-ingest');if(matches.length!==1||! /^[a-f0-9]{32}$/.test(matches[0].queue_id))throw Error('Exact existing ingest queue required');queueID=matches[0].queue_id;}
for(const {m,files,entry,reviews,supplied,version}of items){
if(useQueue){
 const prepared=validateManifest({...JSON.parse(await fs.readFile(path.join(entry.folder,'manifest.json'),'utf8')),requested_status:'published'},environment==='production');
 const review=reviewsPathRecord(entry.id),releaseBytes=new Uint8Array(await fs.readFile(option('--full-release')||path.join(path.dirname(preparationPath),'full-release.json'))),release=JSON.parse(new TextDecoder().decode(releaseBytes));
 if(release.status!=='ready_for_publication'||release.collections?.length!==24||release.expected_designs!==2400)throw Error('Sealed complete release required for queue transport');
 const file=async(key:string,mime:string,bytes:Uint8Array)=>({key,mime,bytes:bytes.length,sha256:await sha256(bytes),base64:Buffer.from(bytes).toString('base64')});
 const sourceBytes=new Uint8Array(await fs.readFile(files.source_original));
 const editorial=Object.fromEntries(['design_id','title','description','alt_text','category_ids','pdf_sha256','webp_sha256','status','prepared_source_sha256','second_editorial_review'].map(k=>[k,review[k]]));editorial.render_review={assets:review.render_review.assets};
 const bundle={schema_version:1,environment,release:{sha256:await sha256(releaseBytes),collections:24,designs:2400},expires_at:new Date(Date.parse(release.sealed_at)+3*86400000).toISOString(),design_id:entry.id,source_sha256:entry.source_sha256,manifest:prepared,editorial,reviews:reviews.map((r:any)=>r.review),native:await file(`originals/${prepared.content_id}/${entry.source_sha256}.png`,'image/png',sourceBytes),supplied:await Promise.all(supplied.map((r:any)=>file(r.key,r.mime,r.bytes))),assets:await Promise.all(prepared.assets.map(async a=>file(a.object_key,a.mime,new Uint8Array(await fs.readFile(files[a.role])))))};
 const bytes=new TextEncoder().encode(JSON.stringify(bundle)),hash=await sha256(bytes),key=`operator-imports/${hash}.json`,message={type:'reviewed_bundle' as const,object_key:key,sha256:hash,signature:await bundleSignature(hash,environment!,env.MEDIA_VALIDATION_SECRET!)};
 await validateReviewedBundle(bytes,message,env);await env.ORIGINALS!.put(key,bytes,{httpMetadata:{contentType:'application/json'}});const readback=await env.ORIGINALS!.get(key);if(!readback||await sha256(new Uint8Array(await readback.arrayBuffer()))!==hash)throw Error('Transport readback failed');
 await api(`/queues/${queueID}/messages`,{body:message,content_type:'json'});
 receipt.items.push({id:prepared.content_id,slug:prepared.slug,version,transport_sha256:hash,status:'queued_not_yet_published'});console.log(JSON.stringify(receipt.items.at(-1)));continue;
}

for(const original of supplied)for(const bucket of [env.ORIGINALS!,env.BACKUPS!]){await bucket.put(original.key,original.bytes,{httpMetadata:{contentType:original.mime}});const readback=await bucket.get(original.key);if(!readback||await sha256(new Uint8Array(await readback.arrayBuffer()))!==original.sha256)throw Error('Supplied PDF/WebP original backup failed');}
const sourceBytes=new Uint8Array(await fs.readFile(files.source_original)),sourceKey=`originals/${m.content_id}/${entry.source_sha256}.png`;
await env.ORIGINALS!.put(sourceKey,sourceBytes,{httpMetadata:{contentType:'image/png'}});await env.BACKUPS!.put(sourceKey,sourceBytes,{httpMetadata:{contentType:'image/png'}});
for(const bucket of [env.ORIGINALS!,env.BACKUPS!]){const obj=await bucket.get(sourceKey);if(!obj||await sha256(new Uint8Array(await obj.arrayBuffer()))!==entry.source_sha256)throw Error('Native source backup readback failed');}
for(const a of m.assets)await env.ORIGINALS!.put(a.object_key,new Uint8Array(await fs.readFile(files[a.role])),{httpMetadata:{contentType:a.mime}});
for(const signed of reviews){const review=signed.review;await acceptReview(env,review,await reviewSignature(review,env.MEDIA_VALIDATION_SECRET!));}
const job=await createImport(env,m,actor);await processImport(env,job.job_id,`imports/${job.job_id}/manifest.json`);
const events=await env.CATALOG_DB!.prepare('SELECT event_id FROM outbox_event WHERE content_id=? AND version=? AND processed_at IS NULL').bind(m.content_id,version).all<{event_id:string}>();for(const e of events.results)await projectEvent(env,e.event_id);
const current=await env.CATALOG_DB!.prepare('SELECT active_version,status FROM content WHERE id=?').bind(m.content_id).first<any>();if(current?.active_version!==version||current.status!=='published')throw Error('Publication readback failed');
for(const a of m.assets){const o=await env.PUBLISHED!.get(publishedKey(m.content_id,version,a,m));if(!o||o.size!==a.bytes||await sha256(new Uint8Array(await o.arrayBuffer()))!==a.sha256)throw Error('Published object readback failed');}
receipt.items.push({id:m.content_id,slug:m.slug,version,assetsVerified:m.assets.length,nativeSourceBackedUp:true,suppliedPdfAndWebpBackedUp:true});console.log(JSON.stringify(receipt.items.at(-1)));}
receipt.status=useQueue?'queued_pending_worker_receipts':'published_pending_public_http_verification';}catch(e){receipt.status='failed';receipt.error=(e as Error).message;throw e;}finally{receipt.finished=new Date().toISOString();receipt.requests=requests();await fs.writeFile(path.join(path.dirname(preparationPath),`publication-${environment}-${collectionName}-${start}-${limit}.json`),JSON.stringify(receipt,null,2));}
