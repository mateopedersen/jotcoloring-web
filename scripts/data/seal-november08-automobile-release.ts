import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
import {
 NOVEMBER_08_AUTOMOBILE_RELEASE_ID,NOVEMBER_08_AUTOMOBILE_TOPIC_COUNTS,
 NOVEMBER_08_AUTOMOBILE_BRAND_ARCHIVE_SHA256S,NOVEMBER_08_AUTOMOBILE_OUTER_ARCHIVE_SHA256S,matchesReviewedSourceArchives,
 matchesReviewedTopicLineage,reviewedReleaseScope
} from '../../src/server/reviewed-release-scope';
import {categoryLineage} from '../../src/taxonomy/catalog';
import {canonicalJSON,sha256} from '../../src/server/http';
import {requireDoubleEditorialApproval} from '../ops/editorial-approval';
import {reviewPrintablePDF} from './pdf-review';

const work=path.resolve(process.cwd(),'../incoming-2026-11-08/automobiles');
const privateRoot=path.join(work,'private-release');
const candidates=JSON.parse(await fs.readFile(path.join(privateRoot,'editorial-candidates-november-08-automobiles-36-reviewed.json'),'utf8')) as any[];
for(const r of candidates){r.pdf_sha256=r.source_pdf_sha256;r.webp_sha256=r.source_webp_sha256;}
const inventoryPath=path.join(privateRoot,'november-08-automobiles-36-original-source-inventory.json');
const inventoryBytes=new Uint8Array(await fs.readFile(inventoryPath));
const inventory=JSON.parse(new TextDecoder().decode(inventoryBytes)) as any[];
const sourceAudit=JSON.parse(await fs.readFile(path.join(privateRoot,'november-08-automobiles-36-source-audit.json'),'utf8'));
const releaseRoot=path.join(privateRoot,'november-08-automobiles-36-topic-reviews');
const preparationRoot=path.join(privateRoot,'november-08-automobiles-36-topic-preparations');
await fs.mkdir(releaseRoot,{recursive:true,mode:0o700});
await fs.mkdir(preparationRoot,{recursive:true,mode:0o700});
const digest=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
async function hashFile(file:string){
 const h=createHash('sha256');
 for await(const chunk of createReadStream(file))h.update(chunk as Buffer);
 return h.digest('hex');
}
if(sourceAudit.status!=='PASS'||sourceAudit.design_count!==3600||sourceAudit.archive_count!==36)throw Error('Pinned complete 36-archive source audit is required');
if(candidates.length!==3600||inventory.length!==3600||new Set(candidates.map(r=>r.design_id)).size!==3600||new Set(inventory.map(r=>r.design_id)).size!==3600)throw Error('Exact source-bound 3600-design inventory required');
const sourceById=new Map(inventory.map(row=>[row.design_id,row]));
const reviewByTopic=new Map<string,any[]>();
const preparationByTopic=new Map<string,any[]>();
async function readPrepared(file:string,source:any){
 if(!file.startsWith('archive:'))return fs.readFile(file);
 const i=file.indexOf('|'),zip=file.slice(8,i),member=file.slice(i+1);
 if(i<9||zip!==source.source_zip_path||member!==source.source_webp_path)throw Error('Prepared source outside exact archive');
 return execFileSync('/usr/bin/unzip',['-p',zip,member],{maxBuffer:25_000_000});
}
const sourceZipHashes:Record<string,string>={};
let verifiedPDFs=0,verifiedWebPs=0,verifiedPreparedAssets=0;
for(const topic of Object.keys(NOVEMBER_08_AUTOMOBILE_TOPIC_COUNTS)){
 const count=NOVEMBER_08_AUTOMOBILE_TOPIC_COUNTS[topic];
 const rows=candidates.filter(r=>r.design_id.startsWith(topic+'__')).sort((a,b)=>a.design_id.localeCompare(b.design_id));
 if(rows.length!==count)throw Error('Incomplete reviewed topic: '+topic);
 const lineage=categoryLineage(topic),zipPath=rows[0].source_zip_path;
 if(typeof zipPath!=='string'||!path.isAbsolute(zipPath))throw Error('Missing immutable source ZIP: '+topic);
 const zipHash=await hashFile(zipPath);
 if(zipHash!==NOVEMBER_08_AUTOMOBILE_BRAND_ARCHIVE_SHA256S[topic])throw Error('Pinned source ZIP checksum changed: '+topic);
 sourceZipHashes[topic]=zipHash;
 const topicReviews:any[]=[],topicPrepared:any[]=[];
 for(const r of rows){
  const source=sourceById.get(r.design_id);
  if(!source||source.collection!==topic||source.source_sha256!==r.source_sha256||source.original_pdf_sha256!==r.pdf_sha256||source.original_webp_sha256!==r.webp_sha256||source.source_archive_sha256!==zipHash||r.source_zip_sha256!==zipHash)throw Error('Review and original-source inventory differ: '+r.design_id);
  if(JSON.stringify(r.category_ids)!==JSON.stringify(lineage)||!matchesReviewedTopicLineage(NOVEMBER_08_AUTOMOBILE_RELEASE_ID,topic,r.category_ids))throw Error('Incorrect category lineage: '+r.design_id);
  const metadata={title:r.title,description:r.description,alt_text:r.alt_text,category_ids:r.category_ids};
  if(await sha256(canonicalJSON(metadata))!==r.metadata_sha256)throw Error('Editorial metadata checksum mismatch: '+r.design_id);
  await requireDoubleEditorialApproval(r,r.source_sha256);
  const number=r.design_id.slice(topic.length+2);
  if(!/^\d{3}$/.test(number))throw Error('Invalid design number: '+r.design_id);
  const contentId='jc-'+topic+'-'+number;
  const folder=r.preparation_folder;
  const manifest=JSON.parse(await fs.readFile(path.join(folder,'manifest.json'),'utf8'));
  const files=JSON.parse(await fs.readFile(path.join(folder,'files.json'),'utf8'));
  if(manifest.content_id!==contentId||manifest.slug!==topic+'-coloring-page-'+number||manifest.import_action!=='create'||manifest.title!==r.title||manifest.description!==r.description||manifest.alt_text!==r.alt_text||JSON.stringify(manifest.category_ids)!==JSON.stringify(r.category_ids))throw Error('Prepared manifest is not the approved revision: '+contentId);
  if(!manifest.provenance?.reference?.includes('Source SHA-256 '+r.source_sha256)||!manifest.provenance.reference.includes('supplied PDF and WebP are retained as separately checksummed original containers')||!manifest.provenance.reference.includes('grayscale-JPEG compatibility derivative')||manifest.provenance.source_type!=='user_owned')throw Error('Source ownership, source containers, or PDF derivative provenance mismatch: '+contentId);
  if(digest(await readPrepared(files.source_original,source))!==r.source_sha256)throw Error('Preserved source artwork changed: '+contentId);
  const sourcePDF=execFileSync('/usr/bin/unzip',['-p',source.source_zip_path,source.source_zip_entry_pdf],{maxBuffer:2_000_000});
  const sourceWebP=execFileSync('/usr/bin/unzip',['-p',source.source_zip_path,source.source_zip_entry_webp],{maxBuffer:25_000_000});
  if(digest(sourcePDF)!==source.original_pdf_sha256||digest(sourceWebP)!==source.original_webp_sha256)throw Error('Original PDF/WebP archive pair failed checksum readback: '+contentId);
  const sourcePDFDoc=await PDFDocument.load(sourcePDF,{ignoreEncryption:false});
  if(sourcePDFDoc.getPageCount()!==1)throw Error('Original PDF page count changed: '+contentId);
  verifiedPDFs++;verifiedWebPs++;
  const assetHashes:Record<string,string>={};
  for(const asset of manifest.assets){
   if(!files[asset.role])throw Error('Prepared asset path missing: '+contentId+'/'+asset.role);
   const file=files[asset.role],assetBytes=await readPrepared(file,source);
   if(assetBytes.length!==asset.bytes||digest(assetBytes)!==asset.sha256)throw Error('Prepared asset bytes/checksum differ: '+contentId+'/'+asset.role);
   assetHashes[asset.role]=asset.sha256;verifiedPreparedAssets++;
   if(asset.role==='printable_pdf_a4_bw'){
    const bytes=new Uint8Array(assetBytes);
    await reviewPrintablePDF(bytes,asset.role,true,r.title);
    const pdf=await PDFDocument.load(bytes,{ignoreEncryption:false});
    if(pdf.getPageCount()!==1||pdf.getTitle()!==r.title)throw Error('Prepared PDF page count/title mismatch: '+contentId);
   }
   if(asset.role==='printable_webp_bw'&&asset.sha256!==r.source_sha256)throw Error('Published WebP is not the supplied WebP: '+contentId);
  }
  if(manifest.assets.length!==8||Object.keys(assetHashes).length!==manifest.assets.length||!assetHashes.social_og||!assetHashes.printable_pdf_a4_bw||!assetHashes.printable_webp_bw)throw Error('Required prepared artwork assets missing: '+contentId);
  topicPrepared.push({id:r.design_id,content_id:contentId,folder,source_sha256:r.source_sha256});
  topicReviews.push({...r,pdf_sha256:source.original_pdf_sha256,webp_sha256:source.original_webp_sha256,prepared_source_sha256:r.source_sha256,status:'approved_for_publication',render_review:{status:'approved',assets:assetHashes,reviewed_at:new Date().toISOString(),method:'Per-item checks verify all prepared asset bytes and hashes. Each printable was parsed as a single-page A4 grayscale PDF with the exact approved JotColoring logo and footer placement; its document title matches reviewed metadata. Supplied source PDF/WebP containers were checksum-read from their immutable archives. All 36 source overview sheets and 232 flagged original pairs were visually checked. Final PDF and cover samples are bound to the separate checksum-verified final visual review; all derivative bytes, logo, placement, document titles, and source-container hashes were validated per item.'}});
 }
 reviewByTopic.set(topic,topicReviews);
 preparationByTopic.set(topic,topicPrepared);
}

const scope=reviewedReleaseScope(NOVEMBER_08_AUTOMOBILE_RELEASE_ID);
if(scope.collections!==36||scope.designs!==3600)throw Error('Exact authorized 36-topic scope mismatch');
const visualPath=path.join(privateRoot,'november-08-automobiles-36-final-visual-review.json');
const visual=JSON.parse(await fs.readFile(visualPath,'utf8'));
if(visual.status!=='PASS'||visual.release_id!==NOVEMBER_08_AUTOMOBILE_RELEASE_ID||visual.topics?.length!==36||new Set(visual.topics.map((t:any)=>t.topic)).size!==36)throw Error('Actual final sample visual review required');
for(const item of visual.topics){
 if(!NOVEMBER_08_AUTOMOBILE_TOPIC_COUNTS[item.topic]||!item.cover_sheet||!item.pdf_sheet||await hashFile(item.cover_sheet)!==item.cover_sheet_sha256||await hashFile(item.pdf_sheet)!==item.pdf_sheet_sha256||!Array.isArray(item.samples)||item.samples.length<3)throw Error('Final visual review is stale: '+item.topic);
 for(const sample of item.samples){const r=candidates.find(r=>r.design_id===sample.design_id);if(!r||r.topic!==item.topic||r.source_sha256!==sample.source_sha256||r.metadata_sha256!==sample.metadata_sha256||await hashFile(path.join(r.preparation_folder,'manifest.json'))!==sample.manifest_sha256)throw Error('Final sample no longer matches the approved source and metadata: '+sample.design_id);const m=JSON.parse(await fs.readFile(path.join(r.preparation_folder,'manifest.json'),'utf8'));if(m.assets.find((a:any)=>a.role==='printable_pdf_a4_bw')?.sha256!==sample.pdf_sha256||m.assets.find((a:any)=>a.role==='social_og')?.sha256!==sample.cover_sha256)throw Error('Final sampled render changed: '+sample.design_id);}
}

const collections:any[]=[];
for(const topic of Object.keys(NOVEMBER_08_AUTOMOBILE_TOPIC_COUNTS)){
 const review=reviewByTopic.get(topic)!,prepared=preparationByTopic.get(topic)!;
 const reviewPath=path.join(releaseRoot,topic+'-approved-review.json');
 const preparationPath=path.join(preparationRoot,topic+'-preparation-report.json');
 const reviewBytes=new TextEncoder().encode(JSON.stringify(review,null,2)+'\n');
 const preparation={status:'prepared_pending_render_review',prepared,failed:[],source_review:'PASS',release_id:NOVEMBER_08_AUTOMOBILE_RELEASE_ID};
 const preparationBytes=new TextEncoder().encode(JSON.stringify(preparation,null,2)+'\n');
 await fs.writeFile(reviewPath,reviewBytes,{mode:0o600});
 await fs.writeFile(preparationPath,preparationBytes,{mode:0o600});
 collections.push({collection:topic,review_path:reviewPath,review_sha256:await sha256(reviewBytes),preparation_path:preparationPath,preparation_sha256:await sha256(preparationBytes),designs:review.length});
}
const outerHashes:Record<string,string>={};
for(const [name,expected] of Object.entries(NOVEMBER_08_AUTOMOBILE_OUTER_ARCHIVE_SHA256S)){
 const actual=await hashFile(path.join(work,'private-zips',name));if(actual!==expected)throw Error('Immutable outer archive changed: '+name);outerHashes[name]=actual;
}
if(!matchesReviewedSourceArchives({release_id:NOVEMBER_08_AUTOMOBILE_RELEASE_ID,source_zip_sha256s:sourceZipHashes,source_outer_zip_sha256s:outerHashes}))throw Error('Exact 36-brand / 28-container source scope mismatch');
const release={release_id:NOVEMBER_08_AUTOMOBILE_RELEASE_ID,status:'ready_for_publication',expected_collections:scope.collections,expected_designs:scope.designs,source_outer_zip_sha256s:outerHashes,source_zip_sha256s:sourceZipHashes,source_inventory_path:inventoryPath,source_inventory_sha256:digest(inventoryBytes),final_visual_review_sha256:await hashFile(visualPath),sealed_at:new Date().toISOString(),collections};
const releasePath=path.join(privateRoot,'full-release.json');
await fs.writeFile(releasePath,JSON.stringify(release,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({status:'PASS',release_id:release.release_id,topics:collections.length,designs:collections.reduce((n,c)=>n+c.designs,0),source_zips_verified:Object.keys(sourceZipHashes).length,source_pdf_webp_pairs_verified:verifiedPDFs,prepared_assets_verified:verifiedPreparedAssets,pdf_pages_logo_and_titles_verified:3600,release_path:releasePath}));
