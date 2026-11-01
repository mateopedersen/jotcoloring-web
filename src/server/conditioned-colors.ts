import {PhotonImage,resize,SamplingFilter} from '@cf-wasm/photon';
import {CONDITIONED_ENGINE,colorPrompt,transferConditionedColor,transferPasses} from '../coloring/conditioned-transfer';
import {automaticReferencePrefix,automaticReferenceKey,validateAutomaticReference,type AutomaticReferenceRecord} from '../coloring/automatic-reference-record';
import {COLOR_VISION_MODEL,parseColorPlan,parseColorReview,planPrompt,reviewPrompt,type ColorPlan} from '../coloring/semantic-color-plan';
import reviewed from '../content/color-references.json';
import showcase from '../content/home-showcase.json';
import {colorRecordKey,validateColorRecord} from '../coloring/reference-record';
import {freeAIConfiguration,freeOnlyInference} from './free-ai';
import {GATEWAY_MODEL} from './gateway-signature';
import {brandFooterLayout} from './branding';
import {imageDimensions} from './image-processing';
import {AppError,sha256} from './http';
import type {Env} from './types';
interface Job {engine:string;job_key:string;content_id:string;source_sha256:string;preview_sha256:string;state:string;attempts:number;request_id:string|null}
interface Source {id:string;title:string;description:string;source_sha256:string;preview_sha256:string;object_key:string;width:number;height:number}
const currentSQL="SELECT c.id,c.title,c.description,a.sha256 AS source_sha256,p.sha256 AS preview_sha256,p.object_key,p.width,p.height FROM content c JOIN asset a ON a.content_id=c.id AND a.content_version=c.active_version AND a.role='printable_webp_bw' AND a.verified=1 JOIN asset p ON p.content_id=c.id AND p.content_version=c.active_version AND p.role='catalog_preview_bw' AND p.verified=1 WHERE c.status='published'";
function hasPinnedReference(s:Pick<Source,'id'|'source_sha256'|'preview_sha256'>){return reviewed.some(r=>r.id===s.id&&r.sourceHash===s.source_sha256&&(!('previewHash' in r)||r.previewHash===s.preview_sha256))||showcase.some(r=>r.id===s.id&&r.sourceHash===s.source_sha256.slice(0,24));}
export const nextFreeDay=(now=Date.now())=>new Date(Math.floor(now/86400000)*86400000+86400000+60000).toISOString();
export async function discoverColorReferences(env:Env){
 if(env.COLOR_REFERENCES_ENABLED!=='true'||!env.CATALOG_DB)return;
 const db=env.CATALOG_DB,scan=await db.prepare('SELECT after_id FROM color_reference_scan WHERE id=1').first<{after_id:string}>();
 const rows=await db.prepare(currentSQL+' AND c.id>? ORDER BY c.id LIMIT 100').bind(scan?.after_id||'').all<Source>();
 if(rows.results.length){await db.batch(rows.results.map(r=>db.prepare('INSERT OR IGNORE INTO color_reference_job(job_key,content_id,source_sha256,preview_sha256,state,engine) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),r.id,r.source_sha256,r.preview_sha256,hasPinnedReference(r)?'ready':'queued',CONDITIONED_ENGINE)));await db.prepare('UPDATE color_reference_scan SET after_id=? WHERE id=1').bind(rows.results.at(-1)!.id).run();}
 else await db.prepare("UPDATE color_reference_scan SET after_id='' WHERE id=1").run();
}
export async function scheduleColorReferences(env:Env){
 if(env.COLOR_REFERENCES_ENABLED!=='true'||env.COLOR_REFERENCES_SCAN!=='true'||!freeAIConfiguration(env).ready||!env.CATALOG_DB||!env.AI_QUEUE)return;
 await discoverColorReferences(env);const db=env.CATALOG_DB,now=new Date().toISOString();
 // An expired inference is never blindly replayed. Its saved raw output is
 // recovered by runColorReference; otherwise it waits for the next free day.
 const job=await db.prepare("SELECT job_key FROM color_reference_job WHERE engine='pixel-conditioned-v3' AND ((state IN ('queued','retry') AND not_before<=?) OR (state IN ('running','processing') AND lease_until<?)) AND NOT EXISTS (SELECT 1 FROM color_reference_job live WHERE live.state IN ('running','processing') AND live.lease_until>=?) ORDER BY CASE WHEN state IN ('running','processing') THEN 0 ELSE 1 END,created_at LIMIT 1").bind(now,now,now).first<{job_key:string}>();
 if(job)await env.AI_QUEUE.send({type:'color_reference',job_id:job.job_key});
}
async function current(env:Env,job:Job){const s=await env.CATALOG_DB!.prepare(currentSQL+' AND c.id=?').bind(job.content_id).first<Source>();return s?.source_sha256===job.source_sha256&&s.preview_sha256===job.preview_sha256?s:null;}
export async function existingColorReference(env:Env,s:Pick<Source,'id'|'source_sha256'|'preview_sha256'>){
 const approved=await env.PUBLISHED!.get(colorRecordKey(s.source_sha256));if(approved&&approved.size<8000){try{const r=validateColorRecord(JSON.parse(await approved.text()),s.source_sha256,s.id);if(r.preview_sha256===s.preview_sha256)return r;}catch{/* Stale records do not authorize another source. */}}
 const machine=await env.PUBLISHED!.get(automaticReferenceKey(s.id,s.source_sha256,s.preview_sha256));if(machine&&machine.size<12000){try{return validateAutomaticReference(JSON.parse(await machine.text()),s.id,s.source_sha256,s.preview_sha256);}catch{/* Rebuild only from the current source. */}}
 return null;
}
function decode(bytes:Uint8Array){const d=imageDimensions(bytes);if(!d.width||!d.height||d.width*d.height>2_400_000)throw new AppError('COLOR_IMAGE_LIMIT','Image exceeds the color processing limit.',422);return PhotonImage.new_from_byteslice(bytes);}
export function prepareColorInput(bytes:Uint8Array){
 const image=decode(bytes);let small:PhotonImage|undefined,frame:PhotonImage|undefined;
 try{const width=image.get_width(),height=image.get_height();if(width<64||height<64)throw new AppError('COLOR_IMAGE_LIMIT','Preview is too small.',422);
  const target=width/height>1.2?[1536,1024]:width/height<.83?[1024,1536]:[1024,1024],fw=target[0]/2,fh=target[1]/2;
  const raw=image.get_raw_pixels(),bottom=brandFooterLayout(width,height).footer.y;raw.fill(255,bottom*width*4);const clean=new PhotonImage(raw,width,height);
  const scale=Math.min(fw/width,fh/height),sw=Math.round(width*scale),sh=Math.round(height*scale),x=Math.floor((fw-sw)/2),y=Math.floor((fh-sh)/2);
  try{small=resize(clean,sw,sh,SamplingFilter.Lanczos3);}finally{clean.free();}
  const pixels=new Uint8Array(fw*fh*4).fill(255),s=small.get_raw_pixels();for(let row=0;row<sh;row++)pixels.set(s.subarray(row*sw*4,(row+1)*sw*4),((row+y)*fw+x)*4);
  frame=new PhotonImage(pixels,fw,fh);const png=frame.get_bytes();if(png.length>1_400_000)throw new AppError('COLOR_IMAGE_LIMIT','Conditioning image is too large.',422);
  return{png,width:target[0],height:target[1],sourceWidth:width,sourceHeight:height,bottom,x:x*2,y:y*2,cropWidth:sw*2,cropHeight:sh*2};
 }finally{frame?.free();small?.free();image.free();}
}
export function finishColorReference(sourceBytes:Uint8Array,priorBytes:Uint8Array){
 const layout=prepareColorInput(sourceBytes),source=decode(sourceBytes),prior=decode(priorBytes);let output:PhotonImage|undefined;
 try{if(prior.get_width()!==layout.width||prior.get_height()!==layout.height)throw new AppError('COLOR_GEOMETRY_FAILED','Model output dimensions changed.',422);
  const w=source.get_width(),h=source.get_height(),raw=source.get_raw_pixels(),p=prior.get_raw_pixels(),aligned=new Uint8Array(raw.length).fill(255);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const px=Math.min(layout.width-1,layout.x+Math.floor((x+.5)*layout.cropWidth/w)),py=Math.min(layout.height-1,layout.y+Math.floor((y+.5)*layout.cropHeight/h)),a=(y*w+x)*4,b=(py*layout.width+px)*4;aligned.set(p.subarray(b,b+4),a);}
  const result=transferConditionedColor(raw,aligned,w,h,layout.bottom);if(!transferPasses(result.metrics))throw new AppError('COLOR_QUALITY_REVIEW','This result needs another visual review.',422);
  output=new PhotonImage(result.pixels,w,h);const bytes=output.get_bytes_webp();if(bytes.length>2_000_000)throw new AppError('COLOR_IMAGE_LIMIT','Color preview exceeds its file limit.',422);
  const check=decode(bytes);try{const pixels=check.get_raw_pixels();for(let i=0;i<raw.length;i+=4){if(i>=layout.bottom*w*4||Math.min(raw[i],raw[i+1],raw[i+2])<80)for(let k=0;k<4;k++)if(pixels[i+k]!==raw[i+k])throw new AppError('COLOR_INTEGRITY_FAILED','Source ink or brand footer changed.',422);}}finally{check.free();}
  return{bytes,width:w,height:h,metrics:result.metrics};
 }finally{output?.free();prior.free();source.free();}
}
export async function runColorReference(env:Env,key:string){
 if(env.COLOR_REFERENCES_ENABLED!=='true'||!env.CATALOG_DB||!env.PUBLISHED||!env.BACKUPS||!env.JOB_ASSETS)return;
 const db=env.CATALOG_DB;let job=await db.prepare('SELECT * FROM color_reference_job WHERE job_key=?').bind(key).first<Job>();if(!job||job.engine!==CONDITIONED_ENGINE||['ready','obsolete','review_needed'].includes(job.state))return;
 const now=new Date().toISOString(),lease=new Date(Date.now()+12*60000).toISOString();
 const claimed=await db.prepare("UPDATE color_reference_job SET state='running',lease_until=?,updated_at=? WHERE job_key=? AND ((state IN ('queued','retry') AND not_before<=?) OR (state IN ('running','processing') AND lease_until<?)) AND NOT EXISTS (SELECT 1 FROM color_reference_job live WHERE live.job_key<>? AND live.state IN ('running','processing') AND live.lease_until>=?)").bind(lease,now,key,now,now,key,now).run();if(!claimed.meta.changes)return;
 const set=async(state:string,error:string|null=null,notBefore='')=>{await db.prepare('UPDATE color_reference_job SET state=?,error_code=?,not_before=?,lease_until=NULL,updated_at=? WHERE job_key=?').bind(state,error,notBefore,new Date().toISOString(),key).run();};
 let allocatedAttempt=false;const initialReservations=(await db.prepare('SELECT COUNT(*) n FROM color_ai_reservation WHERE job_key=?').bind(key).first<{n:number}>())?.n||0;
 try{
  const source=await current(env,job);if(!source){await set('obsolete');return;}
  if(hasPinnedReference(source)||await existingColorReference(env,source)){await set('ready');return;}
  const original=await env.PUBLISHED.get(source.object_key);if(!original||original.size>2_000_000)throw new AppError('COLOR_SOURCE_MISSING','The verified preview is unavailable.',422);
  const bytes=new Uint8Array(await original.arrayBuffer());if(await sha256(bytes)!==job.preview_sha256)throw new AppError('COLOR_SOURCE_CHANGED','The preview checksum changed.',422);
  const input=prepareColorInput(bytes);
  let requestId=job.request_id||'',rawKey=requestId?`color-reference-jobs/${key}/${requestId}.image`:'';
  let saved=rawKey?await env.JOB_ASSETS.get(rawKey):null;
  let plan:ColorPlan,prompt:string,promptHash:string;
  const vision=async(text:string,images:Uint8Array[])=>{
   const form=new FormData();form.set('prompt',text);images.forEach((image,i)=>form.set('input_image_'+i,new Blob([image as BlobPart],{type:'image/png'}),'source.png'));
   const encoded=new Response(form);return freeOnlyInference(env,COLOR_VISION_MODEL,crypto.randomUUID(),encoded.body!,encoded.headers.get('content-type')!,key);
  };
  if(!saved){
   if(['running','processing'].includes(job.state)){await set('retry','PREVIOUS_RESULT_UNCONFIRMED',nextFreeDay());return;}
   if(job.attempts>=3){await set('review_needed','COLOR_ATTEMPT_LIMIT');return;}
   if(!freeAIConfiguration(env).ready)throw new AppError('FREE_ONLY_UNVERIFIED','Free-only inference is unavailable.',503);
   requestId=crypto.randomUUID();rawKey=`color-reference-jobs/${key}/${requestId}.image`;
   await db.prepare('UPDATE color_reference_job SET request_id=?,attempts=attempts+1 WHERE job_key=?').bind(requestId,key).run();allocatedAttempt=true;
   try{plan=parseColorPlan(await vision(planPrompt(source.title,source.description||''),[input.png]));}
   catch(error){if(error instanceof AppError)throw error;throw new AppError('COLOR_PLAN_INVALID','The image color plan could not be verified.',422);}
   await env.JOB_ASSETS.put(rawKey+'.plan',JSON.stringify({source:job.preview_sha256,plan}));
   prompt=colorPrompt(source.title,source.description||'',plan);promptHash=await sha256(new TextEncoder().encode(prompt));
   const form=new FormData();form.set('prompt',prompt);form.set('width',String(input.width));form.set('height',String(input.height));form.set('input_image_0',new Blob([input.png as BlobPart],{type:'image/png'}),'source.png');const encoded=new Response(form);
   const response=await freeOnlyInference(env,GATEWAY_MODEL,requestId,encoded.body!,encoded.headers.get('content-type')!,key) as {image?:string};
   if(typeof response.image!=='string'||response.image.length>12_000_000)throw new AppError('COLOR_OUTPUT_INVALID','Invalid model output.',502);
   const output=Uint8Array.from(atob(response.image),c=>c.charCodeAt(0));decode(output).free();
   await env.JOB_ASSETS.put(rawKey,output,{httpMetadata:{contentType:'application/octet-stream'},customMetadata:{source_sha256:job.source_sha256,preview_sha256:job.preview_sha256,prompt_sha256:promptHash}});
   await db.prepare("UPDATE color_reference_job SET state='processing' WHERE job_key=?").bind(key).run();saved=await env.JOB_ASSETS.get(rawKey);
  }else{
   const stored=await env.JOB_ASSETS.get(rawKey+'.plan');if(!stored||stored.size>12000)throw new AppError('COLOR_PLAN_INVALID','Saved color plan unavailable.',422);
   const raw=JSON.parse(await stored.text());if(raw.source!==job.preview_sha256)throw new AppError('COLOR_PLAN_INVALID','Saved color plan belongs to another image.',422);
   plan=parseColorPlan({response:JSON.stringify(raw.plan)});prompt=colorPrompt(source.title,source.description||'',plan);promptHash=await sha256(new TextEncoder().encode(prompt));
  }
  if(!saved)throw new AppError('COLOR_OUTPUT_MISSING','Saved color result unavailable.',503);
  const output=finishColorReference(bytes,new Uint8Array(await saved.arrayBuffer())),hash=await sha256(output.bytes),prefix=automaticReferencePrefix(source.id,job.source_sha256,job.preview_sha256);
  const review=parseColorReview(await vision(reviewPrompt(),[input.png,prepareColorInput(output.bytes).png]));
  await env.JOB_ASSETS.put(rawKey+'.review',JSON.stringify(review));
  if(!review.acceptable)throw new AppError('COLOR_SEMANTIC_REVIEW','This color suggestion needs a closer visual review.',422);
  const semantic={status:'machine_passed' as const,model:COLOR_VISION_MODEL,plan_sha256:await sha256(new TextEncoder().encode(JSON.stringify(plan))),review_sha256:await sha256(new TextEncoder().encode(JSON.stringify(review)))};
  const record:AutomaticReferenceRecord={version:CONDITIONED_ENGINE,id:source.id,source_sha256:job.source_sha256,preview_sha256:job.preview_sha256,reference_sha256:hash,key:prefix+'/'+hash+'.webp',width:output.width,height:output.height,bytes:output.bytes.length,assessment:{status:'machine_checked',method:CONDITIONED_ENGINE,model:GATEWAY_MODEL,source_sha256:job.source_sha256,preview_sha256:job.preview_sha256,reference_sha256:hash,prompt_sha256:promptHash,checked_at:new Date().toISOString(),metrics:output.metrics,semantic}};
  validateAutomaticReference(record,source.id,job.source_sha256,job.preview_sha256);
  // Private source + result + honest machine assessment before public activation.
  const backup=`automatic-color-references/${key}/${hash}`;
  for(const [name,data] of [['source.webp',bytes],['color.webp',output.bytes],['assessment.json',new TextEncoder().encode(JSON.stringify(record))],['plan.json',new TextEncoder().encode(JSON.stringify(plan))],['review.json',new TextEncoder().encode(JSON.stringify(review))]] as const){await env.BACKUPS.put(backup+'/'+name,data);const check=await env.BACKUPS.get(backup+'/'+name);if(!check||await sha256(new Uint8Array(await check.arrayBuffer()))!==await sha256(data))throw new AppError('COLOR_BACKUP_FAILED','Color backup verification failed.',503);}
  if(!await current(env,job)){await set('obsolete');return;}
  // Never replace an approved or already valid color reference, even after a race.
  if(!await existingColorReference(env,source)){
   await env.PUBLISHED.put(record.key,output.bytes,{httpMetadata:{contentType:'image/webp',cacheControl:'public,max-age=31536000,immutable'}});
   const check=await env.PUBLISHED.get(record.key);if(!check||await sha256(new Uint8Array(await check.arrayBuffer()))!==hash)throw new AppError('COLOR_PUBLISH_FAILED','Published preview verification failed.',503);
   if(!await current(env,job)){await set('obsolete');return;}
   await env.PUBLISHED.put(automaticReferenceKey(source.id,job.source_sha256,job.preview_sha256),JSON.stringify(record),{httpMetadata:{contentType:'application/json',cacheControl:'public,max-age=60'}});
  }
  await set('ready');
 }catch(error){const code=error instanceof AppError?error.code:'COLOR_PROCESSING_FAILED';
  if(code==='FREE_NEURONS_EXHAUSTED'||code==='FREE_ONLY_UNVERIFIED'){if(allocatedAttempt){const spent=await db.prepare('SELECT COUNT(*) n FROM color_ai_reservation WHERE job_key=?').bind(key).first<{n:number}>();if((spent?.n||0)===initialReservations)await db.prepare('UPDATE color_reference_job SET attempts=MAX(0,attempts-1),request_id=NULL WHERE job_key=?').bind(key).run();}await set('retry',code,nextFreeDay());}
  else if(error instanceof AppError&&error.status<500)await set('review_needed',code);
  else await set('retry',code,nextFreeDay());
 }
}
