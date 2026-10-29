import {validAgeAssessment,ageLabel} from '../age/model';
import type {Asset,Manifest} from '../server/types';

type SignedReview={review:{role:string;sha256:string;bytes:number;mime:string};signature:string};
type Checkpoint={sourceKey?:string;uploads:Record<string,string>};
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
async function digest(bytes:ArrayBuffer){return hex(await crypto.subtle.digest('SHA-256',bytes));}
async function post(route:string,body:BodyInit,mime:string,extra:Record<string,string>={}) {
  const response=await fetch('/api/admin/'+route,{method:'POST',headers:{'Content-Type':mime,...extra},body});
  const value=await response.json() as Record<string,any>;
  if(!response.ok)throw new Error(value.error?.message||'The import request failed.');
  return value;
}
function one(files:File[],name:string){const found=files.filter(f=>f.name===name);if(found.length!==1)throw new Error(`Select exactly one ${name} file.`);return found[0];}

/** Uploads only pre-inspected, signed files through the owner's existing Access session. */
export function setupPreparedImport(report:(e:unknown)=>void){
  const button=document.querySelector<HTMLButtonElement>('#prepared-submit');
  if(!button)return;
  const fileInput=document.querySelector<HTMLInputElement>('#prepared-files')!;
  const analysis=document.createElement('p');analysis.setAttribute('role','status');analysis.id='prepared-analysis';fileInput.after(analysis);
  let selection=0;
  fileInput.addEventListener('change',async()=>{const ticket=++selection;analysis.textContent='';try{const file=Array.from(fileInput.files||[]).find(f=>f.name==='manifest.json');if(!file)return;if(file.size>256000)throw new Error('The manifest is too large.');const manifest=JSON.parse(await file.text()) as Manifest;if(ticket!==selection)return;const age=manifest.age_recommendation,source=manifest.assets?.find(a=>a.role==='printable_webp_bw');if(!validAgeAssessment(age,source?.sha256))throw new Error('Prepare this image with the current visual analysis before uploading.');const category=age.category_analysis;analysis.textContent=`${ageLabel(age.band)}. Image suggests: ${category.category_ids.join(', ')||'a topic outside the current automatic catalog'}. Selected: ${manifest.category_ids.join(', ')}.${category.review_required?' Check the selected category against the original image.':''}`;}catch(error){if(ticket===selection)analysis.textContent=error instanceof Error?error.message:'The image analysis could not be read.';}});
  button.addEventListener('click',async()=>{
    const status=document.querySelector<HTMLElement>('#prepared-status')!;
    button.disabled=true;
    try{
      const files=Array.from(document.querySelector<HTMLInputElement>('#prepared-files')!.files||[]);
      const source=document.querySelector<HTMLInputElement>('#prepared-original')!.files?.[0];
      if(!source)throw new Error('Select the original artwork as well as the prepared files.');
      if(source.size<1||source.size>25_000_000)throw new Error('The original artwork must be at most 25 MB.');
      const manifestFile=one(files,'manifest.json'),reviewsFile=one(files,'reviews.json');
      if(manifestFile.size>256_000||reviewsFile.size>256_000)throw new Error('The manifest or reviews file is too large.');
      const manifestBytes=await manifestFile.arrayBuffer();
      const manifest=JSON.parse(new TextDecoder().decode(manifestBytes)) as Manifest;
      const reviews=JSON.parse(await reviewsFile.text()) as SignedReview[];
      if(!manifest||!Array.isArray(manifest.assets)||!manifest.assets.length||manifest.assets.length>30||!Array.isArray(reviews))throw new Error('The prepared manifest or reviews file is invalid.');
      if(!validAgeAssessment(manifest.age_recommendation,manifest.assets.find(a=>a.role==='printable_webp_bw')?.sha256))throw new Error('A current image-bound age and category analysis is required. Prepare the files again before uploading.');
      const sourceHash=await digest(await source.arrayBuffer());
      if(!manifest.provenance?.reference?.includes(sourceHash))throw new Error('The selected original does not match the source checksum in the manifest.');
      const extensions:Record<string,string>={'image/webp':'webp','image/png':'png','image/avif':'avif','application/pdf':'pdf'};
      const prepared:{asset:Asset;file:File;signed:SignedReview}[]=[];
      for(const asset of manifest.assets){
        const extension=extensions[asset.mime];if(!extension)throw new Error(`Unsupported format for ${asset.role}.`);
        const file=one(files,`${asset.role}.${extension}`),matching=reviews.filter(r=>r.review?.role===asset.role&&r.review?.sha256===asset.sha256);
        if(matching.length!==1||!/^[0-9a-f]{64}$/.test(matching[0].signature||'')||matching[0].review.bytes!==asset.bytes||matching[0].review.mime!==asset.mime)throw new Error(`A signed review is required for ${asset.role}.`);
        if(file.size!==asset.bytes||await digest(await file.arrayBuffer())!==asset.sha256)throw new Error(`The ${asset.role} file changed after preparation.`);
        prepared.push({asset,file,signed:matching[0]});
      }
      // Fingerprinted checkpoints keep the exact private keys stable across a reload/retry.
      const checkpointKey=`jot-prepared-import:${await digest(manifestBytes)}:${sourceHash}`;
      let checkpoint:Checkpoint={uploads:{}};
      const saved=sessionStorage.getItem(checkpointKey);
      if(saved){const parsed=JSON.parse(saved) as Checkpoint;if(parsed&&typeof parsed.uploads==='object'&&parsed.uploads)checkpoint=parsed;}
      const save=()=>sessionStorage.setItem(checkpointKey,JSON.stringify(checkpoint));
      if(!checkpoint.sourceKey){
        status.textContent='Saving the original and its backup…';
        const result=await post('sources',source,source.type||'application/octet-stream',{'X-Content-Id':manifest.content_id});
        if(result.sha256!==sourceHash||typeof result.source_key!=='string')throw new Error('The uploaded original did not match its checksum.');
        checkpoint.sourceKey=result.source_key;save();
      }
      const assets:Asset[]=[];
      for(const [i,item] of prepared.entries()){
        status.textContent=`Uploading and checking ${i+1} of ${prepared.length} files…`;
        let key=checkpoint.uploads[item.asset.role];
        if(!key){const uploaded=await post('uploads',item.file,item.asset.mime);if(typeof uploaded.object_key!=='string'||uploaded.bytes!==item.asset.bytes)throw new Error('Uploaded file length did not match.');key=uploaded.object_key;checkpoint.uploads[item.asset.role]=key;save();}
        await post('media-reviews',JSON.stringify(item.signed),'application/json');
        assets.push({...item.asset,object_key:key});
      }
      const payload:Manifest={...manifest,requested_status:'ready_for_review',provenance:{...manifest.provenance,reference:`${manifest.provenance.reference}; private source ${checkpoint.sourceKey}`},assets};
      // The import endpoint performs full validation after its idempotency
      // lookup, so a completed submission can be safely retried unchanged.
      status.textContent='Checking and queuing the complete import…';
      const job=await post('imports',JSON.stringify(payload),'application/json');
      status.textContent=`Import queued: ${String(job.job_id)}. Open Content and refresh to review it before publishing.`;
    }catch(error){status.textContent='Import was not completed. Correct the issue and retry; verified uploads in this tab are retained.';report(error)}
    finally{button.disabled=false;}
  });
}
