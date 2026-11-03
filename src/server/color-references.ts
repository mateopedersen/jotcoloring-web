import {CONDITIONED_ENGINE} from '../coloring/conditioned-transfer';
import type {Env} from './types';
import {AppError,json,sha256} from './http';
import {colorRecordKey,validateColorRecord} from '../coloring/reference-record';
import {automaticReferenceKey,validateAutomaticReference} from '../coloring/automatic-reference-record';

export async function publicColorReference(request:Request,env:Env,id:string){
 const v=new URL(request.url).searchParams.get('v');
 if(!/^[a-zA-Z0-9_-]{1,128}$/.test(id)||!v||!/^[a-f0-9]{24}$/.test(v))throw new AppError('NOT_FOUND','Color reference not found.',404);
 if(!env.CATALOG_DB||!env.PUBLISHED)throw new AppError('STORAGE_UNAVAILABLE','Color reference unavailable.',503);
 const source=await env.CATALOG_DB.prepare("SELECT a.sha256,p.sha256 AS preview_sha256 FROM asset a JOIN content c ON c.id=a.content_id AND c.active_version=a.content_version JOIN asset p ON p.content_id=c.id AND p.content_version=c.active_version AND p.role='catalog_preview_bw' AND p.verified=1 WHERE c.id=? AND c.status='published' AND a.role='printable_webp_bw' AND a.verified=1").bind(id).first<{sha256:string;preview_sha256:string}>();
 if(!source||source.sha256.slice(0,24)!==v)throw new AppError('NOT_FOUND','Coloring page not found.',404);
 let record:ReturnType<typeof validateColorRecord>|ReturnType<typeof validateAutomaticReference>|undefined;
 const object=await env.PUBLISHED.get(colorRecordKey(source.sha256));
 if(object){if(object.size>8000)throw new AppError('ASSET_INVALID','Color reference unavailable.',503);try{const candidate=validateColorRecord(JSON.parse(await object.text()),source.sha256,id);if(candidate.preview_sha256===source.preview_sha256)record=candidate;}catch{throw new AppError('ASSET_INVALID','Color reference unavailable.',503);}}
 if(!record){const auto=await env.PUBLISHED.get(automaticReferenceKey(id,source.sha256,source.preview_sha256));if(auto){if(auto.size>12000)throw new AppError('ASSET_INVALID','Color reference unavailable.',503);try{record=validateAutomaticReference(JSON.parse(await auto.text()),id,source.sha256,source.preview_sha256);}catch{throw new AppError('ASSET_INVALID','Color reference unavailable.',503);}}}
 const image=new URL(request.url).searchParams.get('image');
 if(!record){
  if(image)throw new AppError('NOT_FOUND','Color reference not found.',404);
  let status='pending',retryAt:string|null=null;
  if(env.COLOR_REFERENCES_ENABLED==='true'){
   // Only a verified published source can enter the bounded shared queue. Page
   // visits never call a model, change catalog data or consume inference quota.
   await env.CATALOG_DB.prepare('INSERT OR IGNORE INTO color_reference_job(job_key,content_id,source_sha256,preview_sha256,engine) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),id,source.sha256,source.preview_sha256,CONDITIONED_ENGINE).run();
   const job=await env.CATALOG_DB.prepare('SELECT state,not_before FROM color_reference_job WHERE content_id=? AND source_sha256=? AND preview_sha256=? AND engine=?').bind(id,source.sha256,source.preview_sha256,CONDITIONED_ENGINE).first<{state:string;not_before:string}>();
   status=job?.state==='running'||job?.state==='processing'?'processing':job?.state==='review_needed'?'review_needed':'queued';retryAt=job?.not_before||null;
  }
  return json({status,reference:null,retry_at:retryAt,retry_after:60},200,{'Cache-Control':'public,max-age=30,s-maxage=60'});
 }
 if(image){
  if(image!==record.reference_sha256)throw new AppError('NOT_FOUND','Color reference not found.',404);
  const file=await env.PUBLISHED.get(record.key);if(!file||file.size!==record.bytes)throw new AppError('ASSET_INVALID','Color reference unavailable.',503);
  const bytes=await file.arrayBuffer();if(await sha256(new Uint8Array(bytes))!==record.reference_sha256)throw new AppError('ASSET_INVALID','Color reference unavailable.',503);
  return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':'image/webp','Content-Length':String(record.bytes),'Cache-Control':'public,max-age=300','X-Content-Type-Options':'nosniff',ETag:`"${record.reference_sha256}"`}});
 }
 const reference=env.PUBLIC_MEDIA_BASE_URL==='https://assets.jotcoloring.com'?`https://assets.jotcoloring.com/${record.key}`:`/api/color-reference/${encodeURIComponent(id)}?v=${v}&image=${record.reference_sha256}`;
 return json({status:'ready',reference,sha256:record.reference_sha256,width:record.width,height:record.height,method:'assessment' in record?'image_conditioned_automatic':'reviewed_reference'},200,{'Cache-Control':'public,max-age=30,s-maxage=60'});
}
