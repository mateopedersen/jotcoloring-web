import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
import {NOVEMBER_06_TOPIC_COUNTS} from '../../src/server/reviewed-release-scope';
import {rebindReviewedMetadata} from './rebind-reviewed-metadata';

const work=path.resolve(process.cwd(),'../incoming-2026-11-06');
const sourceRoot=path.join(work,'private-prepared/november-06');
const retryRoot=path.join(work,'private-prepared/november-06-rebind-retry');
const reviewFile=path.join(work,'private-release/editorial-candidates-november-06-reviewed.json');
const reportPath=path.join(work,'private-release/november-06-rebind-batch-report.json');
const input=JSON.parse(await fs.readFile(reviewFile,'utf8')) as any[];
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const expected=Object.values(NOVEMBER_06_TOPIC_COUNTS).reduce((a,b)=>a+b,0);
if(input.length!==expected||Object.keys(NOVEMBER_06_TOPIC_COUNTS).length!==18)throw Error('Exact 18-topic source review is required.');
const rows=input.slice().sort((a,b)=>a.design_id.localeCompare(b.design_id));
const report:any={release_id:'november-06-social-and-vehicle-topics-20261106',status:'running',expected:rows.length,completed:0,already_current:0,rendered_now:0,items:[],started_at:new Date().toISOString()};
async function persist(){await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');}
async function atomicJSON(target:string,value:any){const next=target+'.rebind-pending';await fs.writeFile(next,JSON.stringify(value,null,2)+'\n',{mode:0o600});await fs.rename(next,target);}
async function currentBundle(dir:string,r:any,contentId:string){
 const manifest=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
 if(manifest.content_id!==contentId||manifest.title!==r.title||manifest.description!==r.description||manifest.alt_text!==r.alt_text||JSON.stringify(manifest.category_ids)!==JSON.stringify(r.category_ids))return false;
 if(!manifest.provenance.reference.includes('Source SHA-256 '+r.source_sha256))throw Error('Current item source checksum differs: '+contentId);
 const files=JSON.parse(await fs.readFile(path.join(dir,'files.json'),'utf8'));
 for(const asset of manifest.assets){const bytes=new Uint8Array(await fs.readFile(files[asset.role]));if(bytes.byteLength!==asset.bytes||hash(bytes)!==asset.sha256)throw Error(`Current item checksum differs for ${asset.role}: ${contentId}`);}
 const pdf=await PDFDocument.load(await fs.readFile(files.printable_pdf_a4_bw));
 if(pdf.getTitle()!==r.title)return false;
 return true;
}
async function validateOutput(dir:string,r:any,contentId:string){
 const manifest=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
 const files=JSON.parse(await fs.readFile(path.join(dir,'files.json'),'utf8'));
 if(manifest.content_id!==contentId||manifest.title!==r.title||manifest.description!==r.description||manifest.alt_text!==r.alt_text||JSON.stringify(manifest.category_ids)!==JSON.stringify(r.category_ids))throw Error('Rebound metadata differs from reviewed record: '+contentId);
 const original=new Uint8Array(await fs.readFile(files.source_original));
 if(hash(original)!==r.source_sha256||!manifest.provenance.reference.includes('Source SHA-256 '+r.source_sha256))throw Error('Rebound source checksum differs: '+contentId);
 for(const asset of manifest.assets){const bytes=new Uint8Array(await fs.readFile(files[asset.role]));if(bytes.byteLength!==asset.bytes||hash(bytes)!==asset.sha256)throw Error(`Rebound checksum differs for ${asset.role}: ${contentId}`);}
 return {manifest,files};
}
async function commit(dir:string,oldDir:string){
 const newFiles=JSON.parse(await fs.readFile(path.join(dir,'files.json'),'utf8'));
 const oldFiles=JSON.parse(await fs.readFile(path.join(oldDir,'files.json'),'utf8'));
 for(const role of ['social_og','printable_pdf_a4_bw']){
  const from=path.resolve(newFiles[role]),to=path.resolve(oldFiles[role]);
  if(from!==to){await fs.rename(from,to);newFiles[role]=to;}
 }
 await atomicJSON(path.join(oldDir,'files.json'),newFiles);
 for(const name of ['preservation.json','reviews.json','category-review.json','manifest.json']){
  const value=JSON.parse(await fs.readFile(path.join(dir,name),'utf8'));
  await atomicJSON(path.join(oldDir,name),value);
 }
 await fs.rm(dir,{recursive:true,force:true});
}
await persist();
for(let i=0;i<rows.length;i++){
 const r=rows[i],split=r.design_id.lastIndexOf('__');if(split<1)throw Error(`Invalid design ID: ${r.design_id}`);
 const topic=r.design_id.slice(0,split),number=r.design_id.slice(split+2);if(!(topic in NOVEMBER_06_TOPIC_COUNTS)||!/^\d{3}$/.test(number))throw Error(`Out-of-scope design ID: ${r.design_id}`);
 const contentId=`jc-${topic}-${number}`,oldDir=path.join(sourceRoot,topic,contentId),outDir=path.join(retryRoot,topic,contentId);
 let current=false;
 try{current=await currentBundle(oldDir,r,contentId);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
 let renderedNow=false;
 if(current){report.already_current++;}
 else{
  await fs.rm(outDir,{recursive:true,force:true});
  await rebindReviewedMetadata(oldDir,reviewFile,r.design_id,outDir);
  await validateOutput(outDir,r,contentId);
  await commit(outDir,oldDir);
  renderedNow=true;report.rendered_now++;
 }
 report.items.push({id:contentId,design_id:r.design_id,rendered_now:renderedNow});report.completed=i+1;
 if((i+1)%20===0||i===rows.length-1){await persist();console.log(JSON.stringify({completed:i+1,total:rows.length,design_id:r.design_id,already_current:report.already_current,rendered_now:report.rendered_now}));}
}
report.status='PASS';report.finished_at=new Date().toISOString();await persist();
console.log(JSON.stringify({status:report.status,completed:report.completed,already_current:report.already_current,rendered_now:report.rendered_now,reportPath}));
