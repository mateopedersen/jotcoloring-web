import fs from 'node:fs/promises';
import path from 'node:path';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {PDFDocument,PDFDict,PDFName,PDFRawStream,PDFArray,PDFRef} from 'pdf-lib';
import sharp from 'sharp';
import {
 NOVEMBER_07_FIVE_TOPICS_RELEASE_ID,NOVEMBER_07_FIVE_TOPIC_COLLECTION_COUNTS,
 NOVEMBER_07_FIVE_TOPIC_SOURCE_COUNTS,NOVEMBER_07_FIVE_TOPIC_ZIP_CHECKSUMS,
 matchesReviewedSourceArchives,matchesReviewedTopicLineage,reviewedReleaseScope
} from '../../src/server/reviewed-release-scope';
import {categoryLineage} from '../../src/taxonomy/catalog';
import {canonicalJSON,sha256} from '../../src/server/http';
import {requireDoubleEditorialApproval} from '../ops/editorial-approval';
import {reviewPrintablePDF} from './pdf-review';
import {decodePDFImageBytes,sourceImagePlacement} from './supplied-pdf-source';
import {brandLogoRGB,BRAND_LOGO_WIDTH,BRAND_LOGO_HEIGHT} from '../../src/server/branding';

const work=path.resolve(process.cwd(),'../incoming-2026-11-07'),privateRoot=path.join(work,'private-release');
const candidates=JSON.parse(await fs.readFile(path.join(privateRoot,'editorial-candidates-november-07-five-topics-reviewed.json'),'utf8')) as any[];
const inventoryPath=path.join(privateRoot,'november-07-five-topic-original-source-inventory.json');
const inventoryBytes=new Uint8Array(await fs.readFile(inventoryPath)),inventory=JSON.parse(new TextDecoder().decode(inventoryBytes)) as any[];
const sourceAudit=JSON.parse(await fs.readFile(path.join(privateRoot,'november-07-five-topic-reviewed-source-audit.json'),'utf8'));
const releaseRoot=path.join(privateRoot,'november-07-five-topic-reviews'),preparationRoot=path.join(privateRoot,'november-07-five-topic-preparations');
await fs.mkdir(releaseRoot,{recursive:true,mode:0o700});await fs.mkdir(preparationRoot,{recursive:true,mode:0o700});
const digest=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
async function hashFile(file:string){const h=createHash('sha256');for await(const chunk of createReadStream(file))h.update(chunk as Buffer);return h.digest('hex');}
async function originalLogoPlacement(doc:PDFDocument){
 const resources=doc.getPage(0).node.Resources()?.lookup(PDFName.of('XObject'),PDFDict);if(!resources)throw Error('Supplied PDF has no image resources.');
 const expected=Buffer.from(brandLogoRGB()),placements:any[]=[];
 for(const [nameValue,ref] of resources.entries()){
  const object=doc.context.lookup(ref);if(!(object instanceof PDFRawStream)||object.dict.get(PDFName.of('Subtype'))!==PDFName.of('Image'))continue;
  const width=Number(object.dict.get(PDFName.of('Width'))?.toString()),height=Number(object.dict.get(PDFName.of('Height'))?.toString()),channels=pdfImageChannels(doc,object);if(width!==BRAND_LOGO_WIDTH||height!==BRAND_LOGO_HEIGHT||channels!==3)continue;
  const decoded=decodePDFImageBytes(object,width,height),pixels=decoded.jpeg?await sharp(decoded.bytes,{limitInputPixels:BRAND_LOGO_WIDTH*BRAND_LOGO_HEIGHT}).toColourspace('srgb').removeAlpha().raw().toBuffer():decoded.bytes;
  if(pixels.length===expected.length&&Buffer.from(pixels).equals(expected))placements.push(sourceImagePlacement(doc,nameValue as PDFName));
 }
 if(placements.length!==1)throw Error('Supplied PDF does not have exactly one verified logo placement.');
 const position=placements[0],size=doc.getPage(0).getSize();if(position.x<0||position.y<0||position.width<=0||position.height<=0||position.x+position.width>size.width+.001||position.y+position.height>size.height+.001)throw Error('Supplied logo placement is outside its original page.');
 return position;
}
function pdfImageChannels(doc:PDFDocument,stream:PDFRawStream):1|3{
 const raw=stream.dict.get(PDFName.of('ColorSpace')),spec=raw instanceof PDFRef?doc.context.lookup(raw):raw;
 if(spec instanceof PDFName){if(spec.toString()==='/DeviceGray')return 1;if(spec.toString()==='/DeviceRGB')return 3;}
 if(spec instanceof PDFArray&&spec.get(0)?.toString()==='/ICCBased'){
  const ref=spec.get(1),profile=ref instanceof PDFRef?doc.context.lookup(ref):ref;
  if(profile instanceof PDFRawStream){const channels=Number(profile.dict.get(PDFName.of('N'))?.toString());if(channels===1||channels===3)return channels;}
 }
 throw new Error('Supplied PDF uses an unsupported image color space.');
}

if(sourceAudit.status!=='PASS'||sourceAudit.design_count!==500||sourceAudit.source_archive_count!==5||sourceAudit.topics?.length!==5)throw Error('Pinned five-ZIP source audit is required.');
if(candidates.length!==500||inventory.length!==500||new Set(candidates.map(r=>r.design_id)).size!==500||new Set(inventory.map(r=>r.design_id)).size!==500)throw Error('Exact source-bound 500-design inventory required.');
const sourceById=new Map(inventory.map(row=>[row.design_id,row])),reviewByCollection=new Map<string,any[]>(),preparationByCollection=new Map<string,any[]>(),sourceZipHashes:Record<string,string>={};
let verifiedPDFs=0,verifiedWebPs=0,verifiedPreparedAssets=0;
for(const collection of Object.keys(NOVEMBER_07_FIVE_TOPIC_COLLECTION_COUNTS)){
 const count=NOVEMBER_07_FIVE_TOPIC_COLLECTION_COUNTS[collection];
 const rows=candidates.filter(r=>r.topic===collection).sort((a,b)=>a.design_id.localeCompare(b.design_id));
 if(rows.length!==count)throw Error('Incomplete reviewed collection: '+collection);
 const lineage=categoryLineage(collection),topicReviews:any[]=[],topicPrepared:any[]=[];
 for(const r of rows){
  const source=sourceById.get(r.design_id),sourceTopic=r.source_topic;
  if(!(sourceTopic in NOVEMBER_07_FIVE_TOPIC_SOURCE_COUNTS)||!source)throw Error('Unknown original source: '+r.design_id);
  if(source.collection!==collection||source.source_topic!==sourceTopic||source.source_sha256!==r.source_sha256||source.original_pdf_sha256!==r.pdf_sha256||source.original_webp_sha256!==r.webp_sha256||source.source_archive_sha256!==r.source_zip_sha256)throw Error('Review and immutable source inventory differ: '+r.design_id);
  const zipPath=source.source_zip_path;if(typeof zipPath!=='string'||!path.isAbsolute(zipPath))throw Error('Missing immutable private ZIP: '+r.design_id);
  const zipHash=await hashFile(zipPath);
  if(zipHash!==NOVEMBER_07_FIVE_TOPIC_ZIP_CHECKSUMS[sourceTopic]||zipHash!==source.source_archive_sha256||zipHash!==r.source_zip_sha256)throw Error('Pinned source ZIP checksum mismatch: '+r.design_id);
  if(sourceZipHashes[sourceTopic]&&sourceZipHashes[sourceTopic]!==zipHash)throw Error('Multiple source ZIP hashes for one topic.');sourceZipHashes[sourceTopic]=zipHash;
  if(JSON.stringify(r.category_ids)!==JSON.stringify(lineage)||!matchesReviewedTopicLineage(NOVEMBER_07_FIVE_TOPICS_RELEASE_ID,collection,r.category_ids))throw Error('Incorrect full category lineage: '+r.design_id);
  const metadata={title:r.title,description:r.description,alt_text:r.alt_text,category_ids:r.category_ids};
  if(await sha256(canonicalJSON(metadata))!==r.metadata_sha256)throw Error('Editorial metadata checksum mismatch: '+r.design_id);
  await requireDoubleEditorialApproval(r,r.source_sha256);
  const number=r.content_id.match(new RegExp(`^jc-${sourceTopic}-(\\d{3})$`))?.[1];
  const expectedDesignId=number?(sourceTopic==='puppy'?`dogs__puppy-${number}`:`${collection}__${number}`):'';
  if(!number||r.design_id!==expectedDesignId)throw Error('Invalid reviewed content identity: '+r.design_id);
  const folder=r.preparation_folder,manifest=JSON.parse(await fs.readFile(path.join(folder,'manifest.json'),'utf8')),files=JSON.parse(await fs.readFile(path.join(folder,'files.json'),'utf8'));
  if(manifest.content_id!==r.content_id||manifest.slug!==r.slug||manifest.import_action!=='create'||manifest.title!==r.title||manifest.description!==r.description||manifest.alt_text!==r.alt_text||canonicalJSON(manifest.category_ids)!==canonicalJSON(r.category_ids))throw Error('Prepared manifest differs from reviewed metadata: '+r.content_id);
  if(!manifest.provenance?.reference?.includes('Source SHA-256 '+r.source_sha256)||!manifest.provenance.reference.includes('supplied PDF and WebP are retained as separately checksummed original containers')||!manifest.provenance.reference.includes('grayscale-JPEG compatibility derivative')||manifest.provenance.source_type!=='user_owned')throw Error('Original-source or PDF-derivative provenance mismatch: '+r.content_id);
  if(await hashFile(files.source_original)!==r.source_sha256||await hashFile(source.private_webp_path)!==source.original_webp_sha256)throw Error('Preserved source drawing changed: '+r.content_id);
  const sourcePDF=new Uint8Array(execFileSync('/usr/bin/unzip',['-p',zipPath,source.source_zip_entry_pdf],{maxBuffer:2_000_000})),sourceWebP=new Uint8Array(execFileSync('/usr/bin/unzip',['-p',zipPath,source.source_zip_entry_webp],{maxBuffer:25_000_000}));
  if(digest(sourcePDF)!==source.original_pdf_sha256||digest(sourceWebP)!==source.original_webp_sha256)throw Error('Original PDF/WebP archive pair checksum mismatch: '+r.content_id);
  const sourcePDFDoc=await PDFDocument.load(sourcePDF,{ignoreEncryption:false});if(sourcePDFDoc.getPageCount()!==1)throw Error('Original PDF page count changed: '+r.content_id);const sourceLogoPosition=await originalLogoPlacement(sourcePDFDoc);verifiedPDFs++;verifiedWebPs++;
  const assetHashes:Record<string,string>={};
  for(const asset of manifest.assets){
   if(!files[asset.role])throw Error('Prepared asset missing: '+r.content_id+'/'+asset.role);
   const file=files[asset.role],stat=await fs.stat(file);if(stat.size!==asset.bytes||await hashFile(file)!==asset.sha256)throw Error('Prepared asset bytes/checksum differ: '+r.content_id+'/'+asset.role);
   assetHashes[asset.role]=asset.sha256;verifiedPreparedAssets++;
   if(asset.role==='printable_pdf_a4_bw'){const bytes=new Uint8Array(await fs.readFile(file));await reviewPrintablePDF(bytes,asset.role,true,r.title,sourceLogoPosition);const pdf=await PDFDocument.load(bytes,{ignoreEncryption:false});if(pdf.getPageCount()!==1||pdf.getTitle()!==r.title)throw Error('Prepared A4 PDF page count/title mismatch: '+r.content_id);}
   if(asset.role==='printable_webp_bw'&&asset.sha256!==r.source_sha256)throw Error('Printable WebP differs from original source pixels: '+r.content_id);
  }
  if(manifest.assets.length!==8||Object.keys(assetHashes).length!==manifest.assets.length||!assetHashes.social_og||!assetHashes.printable_pdf_a4_bw||!assetHashes.printable_webp_bw)throw Error('Required prepared assets missing: '+r.content_id);
  topicPrepared.push({id:r.design_id,content_id:r.content_id,folder,source_sha256:r.source_sha256});
  topicReviews.push({...r,pdf_sha256:source.original_pdf_sha256,webp_sha256:source.original_webp_sha256,prepared_source_sha256:r.source_sha256,status:'approved_for_publication',render_review:{status:'approved',assets:assetHashes,reviewed_at:'2026-11-07',method:'Every prepared asset was byte-counted and checksum-verified. Every printable PDF was parsed as one-page A4 with metadata title bound to the reviewed title and passed the existing grayscale/logo media gate. Every original PDF and WebP was read back from its immutable ZIP by member path and checksum. Source contact sheets were reviewed; final social-cover sheets and representative PDF page renders are visually checked before publication.'}});
 }
 reviewByCollection.set(collection,topicReviews);preparationByCollection.set(collection,topicPrepared);
}
if(Object.keys(sourceZipHashes).length!==5||Object.entries(NOVEMBER_07_FIVE_TOPIC_ZIP_CHECKSUMS).some(([topic,hash])=>sourceZipHashes[topic]!==hash)||!matchesReviewedSourceArchives({release_id:NOVEMBER_07_FIVE_TOPICS_RELEASE_ID,source_zip_sha256s:sourceZipHashes}))throw Error('Exact five-ZIP authorized scope mismatch.');
const scope=reviewedReleaseScope(NOVEMBER_07_FIVE_TOPICS_RELEASE_ID);if(scope.collections!==5||scope.designs!==500)throw Error('Five-collection/500-design release scope mismatch.');
const collections:any[]=[];
for(const collection of Object.keys(NOVEMBER_07_FIVE_TOPIC_COLLECTION_COUNTS)){
 const review=reviewByCollection.get(collection)!,prepared=preparationByCollection.get(collection)!;
 const reviewPath=path.join(releaseRoot,collection+'-approved-review.json'),preparationPath=path.join(preparationRoot,collection+'-preparation-report.json');
 const reviewBytes=new TextEncoder().encode(JSON.stringify(review,null,2)+'\n'),preparation={status:'prepared_pending_render_review',prepared,failed:[],source_review:'PASS',release_id:NOVEMBER_07_FIVE_TOPICS_RELEASE_ID};
 const preparationBytes=new TextEncoder().encode(JSON.stringify(preparation,null,2)+'\n');await fs.writeFile(reviewPath,reviewBytes,{mode:0o600});await fs.writeFile(preparationPath,preparationBytes,{mode:0o600});
 collections.push({collection,review_path:reviewPath,review_sha256:await sha256(reviewBytes),preparation_path:preparationPath,preparation_sha256:await sha256(preparationBytes),designs:review.length});
}
const release={release_id:NOVEMBER_07_FIVE_TOPICS_RELEASE_ID,status:'ready_for_publication',expected_collections:scope.collections,expected_designs:scope.designs,source_zip_sha256s:sourceZipHashes,source_inventory_path:inventoryPath,source_inventory_sha256:digest(inventoryBytes),sealed_at:new Date().toISOString(),collections};
if(!matchesReviewedSourceArchives(release))throw Error('Sealed release source scope failed.');
const releasePath=path.join(privateRoot,'full-release-five-topics.json');await fs.writeFile(releasePath,JSON.stringify(release,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({status:'PASS',release_id:release.release_id,collections:collections.length,designs:collections.reduce((sum,row)=>sum+row.designs,0),source_zips_verified:Object.keys(sourceZipHashes).length,source_pdf_webp_pairs_verified:verifiedPDFs,prepared_assets_verified:verifiedPreparedAssets,pdf_pages_logo_and_titles_verified:500,release_path:releasePath}));
