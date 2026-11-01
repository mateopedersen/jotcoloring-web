/** Bounded, immutable derivative release. Reads current catalog identity, keeps
 * originals untouched, verifies private recovery copies before public activation.
 * Requires explicit pixel reviews; model output is never its own approval. */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {remoteContext} from './release-context';
import {colorRecordKey,validateColorRecord,type ColorReferenceRecord} from '../../src/coloring/reference-record';
import {sha256} from '../../src/server/http';
const args=process.argv.slice(2),option=(key:string)=>{const n=args.indexOf(key);return n<0?undefined:args[n+1]};
const environment=option('--environment'),input=option('--reviewed-batch');
if(!['staging','production'].includes(environment||'')||!input)throw new Error('Explicit environment and --reviewed-batch are required.');
const batch=JSON.parse(await fs.readFile(input,'utf8')) as {record:ColorReferenceRecord;file:string;report:string;sourceFile:string}[];
if(!Array.isArray(batch)||batch.length<1||batch.length>100||new Set(batch.map(r=>r.record.id)).size!==batch.length)throw new Error('Use 1–100 unique, reviewed drawings.');
const prepared=[];
for(const item of batch){
 const record=validateColorRecord(item.record,item.record.source_sha256,item.record.id),bytes=new Uint8Array(await fs.readFile(item.file)),reportBytes=new Uint8Array(await fs.readFile(item.report)),report=JSON.parse(new TextDecoder().decode(reportBytes));
 const meta=await sharp(bytes).metadata();
 if(await sha256(bytes)!==record.reference_sha256||bytes.length!==record.bytes||meta.format!=='webp'||meta.width!==record.width||meta.height!==record.height||report.source_sha256!==record.preview_sha256||report.reference_sha256!==record.reference_sha256||report.metrics.changed_dark_pixels!==0||report.metrics.footer_unchanged!==true)throw new Error('Reference bytes, original ink or footer failed verification: '+record.id);
 const original=await fs.readFile(item.sourceFile),sourceMeta=await sharp(original).metadata();
 if(await sha256(original)!==record.preview_sha256||sourceMeta.width!==record.width||sourceMeta.height!==record.height||!Number.isSafeInteger(report.art_height)||report.art_height<record.height*.9||report.art_height>record.height)throw new Error('Source pixel identity or footer bound failed');
 const sourcePixels=await sharp(original).removeAlpha().toColourspace('srgb').raw().toBuffer(),outputPixels=await sharp(bytes).removeAlpha().toColourspace('srgb').raw().toBuffer();
 for(let p=0;p<sourcePixels.length;p+=3)if(p>=report.art_height*record.width*3||Math.min(sourcePixels[p],sourcePixels[p+1],sourcePixels[p+2])<80){if(!sourcePixels.subarray(p,p+3).equals(outputPixels.subarray(p,p+3)))throw new Error('Actual source ink or footer changed: '+record.id);}
 prepared.push({record,bytes,reportBytes});
}
const {env,requests}=await remoteContext(environment as 'staging'|'production',{requestLimit:4000});
async function checkCurrent(record:ColorReferenceRecord){
 const rows=await env.CATALOG_DB!.prepare("SELECT a.role,a.sha256 FROM asset a JOIN content c ON c.id=a.content_id AND c.active_version=a.content_version WHERE c.id=? AND c.status='published' AND a.role IN ('printable_webp_bw','catalog_preview_bw') AND a.verified=1").bind(record.id).all<{role:string;sha256:string}>();
 if(rows.results.find(a=>a.role==='printable_webp_bw')?.sha256!==record.source_sha256||rows.results.find(a=>a.role==='catalog_preview_bw')?.sha256!==record.preview_sha256)throw new Error('Published drawing changed; review the new source: '+record.id);
}
for(const {record} of prepared)await checkCurrent(record);
if(!args.includes('--apply')){console.log(JSON.stringify({status:'plan',references:prepared.length,requests:requests()}));process.exit(0);}
const receipt:{environment:string;items:unknown[];status:string;requests?:number}={environment:environment!,items:[],status:'running'};
const verifiedPut=async(bucket:NonNullable<typeof env.PUBLISHED>,key:string,bytes:Uint8Array,mime:string,published=false)=>{
 await bucket.put(key,bytes,{httpMetadata:{contentType:mime,...(published?{cacheControl:'public,max-age=31536000,immutable'}:{})}});
 const stored=await bucket.get(key);if(!stored||await sha256(new Uint8Array(await stored.arrayBuffer()))!==await sha256(bytes))throw new Error('Storage read-back mismatch');
};
try{
 for(const {record,bytes,reportBytes} of prepared){
  await checkCurrent(record);
  const manifest=new TextEncoder().encode(JSON.stringify(record)),key=colorRecordKey(record.source_sha256);
  for(const bucket of [env.ORIGINALS!,env.BACKUPS!]){
   await verifiedPut(bucket,record.key,bytes,'image/webp');
   await verifiedPut(bucket,key,manifest,'application/json');
   await verifiedPut(bucket,record.key+'.report.json',reportBytes,'application/json');
  }
  await verifiedPut(env.PUBLISHED!,record.key,bytes,'image/webp',true);
  // The manifest is written last: a public pointer never precedes its bytes.
  await checkCurrent(record);
  await verifiedPut(env.PUBLISHED!,key,manifest,'application/json',true);
  receipt.items.push({id:record.id,source_sha256:record.source_sha256,reference_sha256:record.reference_sha256,key:record.key});
 }
 receipt.status='published_pending_http_verification';
}finally{
 receipt.requests=requests();await fs.writeFile(path.resolve(path.dirname(input),`publication-${environment}.json`),JSON.stringify(receipt,null,2));
 console.log(JSON.stringify({status:receipt.status,references:receipt.items.length,requests:requests()}));
}
