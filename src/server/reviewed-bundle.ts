/** Authenticated, one-artwork transport for an already sealed editorial release. */
import {matchesReviewedReleaseScope} from './reviewed-release-scope';
import type {Env,Bucket,Manifest} from './types';
import {AppError,canonicalJSON,sha256} from './http';
import {validateManifest} from './manifest';
import {acceptReview,reviewSignature,publishedKey,type MediaReview} from './assets';
import {backupBytes} from './backups';
import {createImport,processImport,projectEvent} from './imports';
import {heldDraftRevision,IMPORT_ACTOR} from './held-draft-resume';
import {requireDoubleEditorialApproval} from './editorial-approval';
export interface ReviewedBundleMessage {type:'reviewed_bundle';object_key:string;sha256:string;signature:string}
interface File {key:string;mime:string;sha256:string;bytes:number;base64:string}
export interface ReviewedBundle {schema_version:1;environment:string;release:{id?:string;sha256:string;collections:number;designs:number};expires_at:string;design_id:string;source_sha256:string;manifest:Manifest;editorial:any;reviews:MediaReview[];native:File;supplied:File[];assets:File[]}
const hex=/^[a-f0-9]{64}$/;
export function bundleReceiptKey(hash:string){if(!hex.test(hash))throw Error('Invalid bundle hash');return `operator-import-receipts/${hash}.json`;}
export async function bundleSignature(hash:string,environment:string,secret:string){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`jot-reviewed-bundle-v1\n${environment}\n${hash}`)))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function fileBytes(file:File){if(!file||!Number.isSafeInteger(file.bytes)||file.bytes<1||file.bytes>8_000_000||!hex.test(file.sha256)||typeof file.base64!=='string'||file.base64.length>11_000_000)throw Error('Invalid bounded file');const raw=atob(file.base64);return Uint8Array.from(raw,c=>c.charCodeAt(0));}
/** Authenticate and inspect every transported byte before the first storage mutation. */
export async function validateReviewedBundle(bytes:Uint8Array,message:ReviewedBundleMessage,env:Env){
 if(typeof message.signature!=='string'||!hex.test(message.sha256)||message.object_key!==`operator-imports/${message.sha256}.json`||!env.MEDIA_VALIDATION_SECRET||bytes.length>20_000_000||await sha256(bytes)!==message.sha256)throw new AppError('INVALID_BUNDLE','Invalid reviewed bundle.',422);
 const expected=await bundleSignature(message.sha256,env.APP_ENV||'',env.MEDIA_VALIDATION_SECRET);
 if(message.signature.length!==64||!Array.from(expected).every((c,i)=>c===message.signature[i]))throw new AppError('FORBIDDEN','Reviewed bundle signature was not accepted.',403);
 const b=JSON.parse(new TextDecoder().decode(bytes)) as ReviewedBundle;
 if(b.schema_version!==1||b.environment!==env.APP_ENV||!b.release||!matchesReviewedReleaseScope(b.release)||!hex.test(b.release.sha256)||!Number.isFinite(Date.parse(b.expires_at))||Date.parse(b.expires_at)<Date.now()||Date.parse(b.expires_at)>Date.now()+7*86400000)throw Error('Complete current release required');
 const m=validateManifest(b.manifest,env.APP_ENV==='production'),r=b.editorial;
 if(!/^[a-z0-9_-]+$/.test(b.design_id)||!hex.test(b.source_sha256)||m.requested_status!=='published'||m.import_action!=='create'||r?.design_id!==b.design_id||r?.status!=='approved_for_publication'||r?.prepared_source_sha256!==b.source_sha256||!m.provenance.reference?.includes('Source SHA-256 '+b.source_sha256))throw Error('Invalid source-bound publication');
 for(const k of ['title','description','alt_text','category_ids'] as const)if(canonicalJSON(m[k])!==canonicalJSON(r[k]))throw Error('Reviewed metadata changed');
 await requireDoubleEditorialApproval(r,b.source_sha256);
 if(!Array.isArray(b.assets)||b.assets.length!==m.assets.length||m.assets.length!==12||!Array.isArray(b.reviews)||b.reviews.length!==12||!Array.isArray(b.supplied)||b.supplied.length!==2)throw Error('Complete prepared media required');
 const decoded=new Map<string,Uint8Array>();
 for(const f of [b.native,...b.supplied,...b.assets]){if(!/^[a-zA-Z0-9][a-zA-Z0-9_./-]*$/.test(f.key)||f.key.includes('..')||decoded.has(f.key))throw Error('Invalid immutable file key');const data=fileBytes(f);if(data.length!==f.bytes||await sha256(data)!==f.sha256)throw Error('Transported bytes changed');decoded.set(f.key,data);}
 if(b.native.key!==`originals/${m.content_id}/${b.source_sha256}.png`||b.native.sha256!==b.source_sha256||b.native.mime!=='image/png')throw Error('Native source mismatch');
 const collection=b.design_id.split('__')[0];
 for(const [i,format] of ['pdf','webp'].entries()){const f=b.supplied[i];if(f.key!==`packages/${collection}/${b.design_id}/${f.sha256}.${format}`||f.sha256!==r[format+'_sha256']||f.mime!==`application/pdf`&&format==='pdf'||f.mime!=='image/webp'&&format==='webp')throw Error('Supplied original mismatch');}
 for(const a of m.assets){const f=b.assets.find(f=>f.key===a.object_key),review=b.reviews.find(r=>r.role===a.role);if(!f||f.bytes!==a.bytes||f.sha256!==a.sha256||f.mime!==a.mime||r.render_review?.assets?.[a.role]!==a.sha256||!review||review.sha256!==a.sha256||review.bytes!==a.bytes||review.mime!==a.mime)throw Error('Prepared media approval changed');}
 return {bundle:b,manifest:m,decoded};
}
async function immutable(bucket:Bucket,file:File,bytes:Uint8Array){const old=await bucket.get(file.key);if(old){if(old.size!==file.bytes||await sha256(new Uint8Array(await old.arrayBuffer()))!==file.sha256)throw Error('Immutable source conflict');}else await bucket.put(file.key,bytes,{httpMetadata:{contentType:file.mime}});const check=await bucket.get(file.key);if(!check||await sha256(new Uint8Array(await check.arrayBuffer()))!==file.sha256)throw Error('Original readback failed');}
/** This consumer runs the import itself; do not enqueue a second consumer for the same job. */
export function inlineReviewedImportEnvironment(env:Env):Env{
 const queue=env.INGEST_QUEUE;if(!queue)throw Error('Missing import queue binding');
 return {...env,INGEST_QUEUE:{async send(message:any,options?:unknown){if(message?.type==='import')return;await queue.send(message,options);}}};
}
export async function processReviewedBundle(env:Env,message:ReviewedBundleMessage){
 if(!env.ORIGINALS||!env.BACKUPS||!env.PUBLISHED||!env.CATALOG_DB)throw Error('Missing import bindings');
 const object=await env.ORIGINALS.get(message.object_key);if(!object||object.size>20_000_000)throw Error('Missing bounded import bundle');
 const {bundle:b,manifest:prepared,decoded}=await validateReviewedBundle(new Uint8Array(await object.arrayBuffer()),message,env);
 const receiptKey=bundleReceiptKey(message.sha256),done=await env.BACKUPS.get(receiptKey);if(done)return JSON.parse(await done.text());
 let m=prepared,version=1;const db=env.CATALOG_DB;
 const existing=await db.prepare('SELECT active_version,latest_version,status FROM content WHERE id=?').bind(m.content_id).first<any>();
 if(existing){const revision=await db.prepare('SELECT manifest_json FROM content_revision WHERE content_id=? AND version=?').bind(m.content_id,existing.latest_version).first<any>();if(!revision)throw Error('Existing revision unavailable');const current=JSON.parse(revision.manifest_json);
  if(existing.latest_version!==1||canonicalJSON(current)!==canonicalJSON(m)){
   const original=await db.prepare('SELECT manifest_json FROM content_revision WHERE content_id=? AND version=1').bind(m.content_id).first<any>();const job=await db.prepare("SELECT j.owner,j.status,j.error_code FROM import_job j JOIN import_item i ON i.import_id=j.id WHERE i.content_id=? AND i.version=1 AND j.owner=? AND j.error_code='OWNER_FULL_BATCH_HOLD'").bind(m.content_id,IMPORT_ACTOR).first<any>();
   if(!original)throw Error('Unrelated existing content');m=validateManifest(heldDraftRevision(m,existing,JSON.parse(original.manifest_json),current,job),env.APP_ENV==='production');version=2;
  }
 }
 for(const f of [b.native,...b.supplied]){const data=decoded.get(f.key)!;await immutable(env.ORIGINALS,f,data);await backupBytes(env,f.key,data,f.mime);}
 for(const a of m.assets){const source=prepared.assets.find(s=>s.role===a.role)!;await immutable(env.ORIGINALS,{...b.assets.find(f=>f.key===source.object_key)!,key:a.object_key},decoded.get(source.object_key)!);}
 for(const review of b.reviews)await acceptReview(env,review,await reviewSignature(review,env.MEDIA_VALIDATION_SECRET!));
 const inlineEnv=inlineReviewedImportEnvironment(env);const job=await createImport(inlineEnv,m,IMPORT_ACTOR);await processImport(inlineEnv,job.job_id,`imports/${job.job_id}/manifest.json`);
 const events=await db.prepare('SELECT event_id FROM outbox_event WHERE content_id=? AND version=? AND processed_at IS NULL').bind(m.content_id,version).all<{event_id:string}>();for(const e of events.results)await projectEvent(env,e.event_id);
 const current=await db.prepare('SELECT active_version,status FROM content WHERE id=?').bind(m.content_id).first<any>();if(current?.active_version!==version||current.status!=='published')throw Error('Publication readback failed');
 for(const a of m.assets){const o=await env.PUBLISHED.get(publishedKey(m.content_id,version,a,m));if(!o||o.size!==a.bytes||await sha256(new Uint8Array(await o.arrayBuffer()))!==a.sha256)throw Error('Published readback failed');}
 const receipt={status:'published_pending_public_http_verification',id:m.content_id,slug:m.slug,version,release_sha256:b.release.sha256,transport_sha256:message.sha256,assetsVerified:m.assets.length,nativeSourceBackedUp:true,suppliedPdfAndWebpBackedUp:true};
 await backupBytes(env,receiptKey,new TextEncoder().encode(canonicalJSON(receipt)),'application/json');return receipt;
}
