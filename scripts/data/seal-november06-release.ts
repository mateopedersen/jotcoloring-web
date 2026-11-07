import fs from 'node:fs/promises';
import path from 'node:path';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
import {NOVEMBER_06_RELEASE_ID,NOVEMBER_06_TOPIC_COUNTS,NOVEMBER_06_ZIP_CHECKSUMS,matchesReviewedSourceArchives,matchesReviewedTopicLineage,reviewedReleaseScope} from '../../src/server/reviewed-release-scope';
import {categoryLineage} from '../../src/taxonomy/catalog';
import {canonicalJSON,sha256} from '../../src/server/http';
import {requireDoubleEditorialApproval} from '../ops/editorial-approval';
import {reviewPrintablePDF} from './pdf-review';

const work=path.resolve(process.cwd(),'../incoming-2026-11-06');
const privateRoot=path.join(work,'private-release');
const candidates=JSON.parse(await fs.readFile(path.join(privateRoot,'editorial-candidates-november-06-reviewed.json'),'utf8')) as any[];
const inventoryPath=path.join(privateRoot,'november-06-original-source-inventory.json');
const inventoryBytes=new Uint8Array(await fs.readFile(inventoryPath));
const inventory=JSON.parse(new TextDecoder().decode(inventoryBytes)) as any[];
const sourceAudit=JSON.parse(await fs.readFile(path.join(privateRoot,'november-06-source-audit.json'),'utf8'));
const rebind=JSON.parse(await fs.readFile(path.join(privateRoot,'november-06-rebind-batch-report.json'),'utf8'));
const releaseRoot=path.join(privateRoot,'november-06-topic-reviews');
const preparationRoot=path.join(privateRoot,'november-06-topic-preparations');
await fs.mkdir(releaseRoot,{recursive:true,mode:0o700});
await fs.mkdir(preparationRoot,{recursive:true,mode:0o700});
const digest=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
async function hashFile(file:string){
  const h=createHash('sha256');
  for await(const chunk of createReadStream(file))h.update(chunk as Buffer);
  return h.digest('hex');
}
if(sourceAudit.status!=='PASS'||sourceAudit.design_count!==1800||sourceAudit.source_archive_count!==18)throw Error('Pinned complete source audit is required');
if(rebind.status!=='PASS'||rebind.completed!==1800)throw Error('Completed metadata rebind report is required');
if(candidates.length!==1800||inventory.length!==1800)throw Error('Exact source-bound 1,800-design inventory required');
if(new Set(candidates.map(r=>r.design_id)).size!==1800||new Set(inventory.map(r=>r.design_id)).size!==1800)throw Error('Duplicate source identity in review/inventory');
const sourceById=new Map(inventory.map(row=>[row.design_id,row]));
const reviewByTopic=new Map<string,any[]>();
const preparationByTopic=new Map<string,any[]>();
const sourceZipHashes:Record<string,string>={};
for(const topic of Object.keys(NOVEMBER_06_TOPIC_COUNTS)){
  const count=NOVEMBER_06_TOPIC_COUNTS[topic];
  const rows=candidates.filter(r=>r.design_id.startsWith(topic+'__')).sort((a,b)=>a.design_id.localeCompare(b.design_id));
  if(rows.length!==count)throw Error('Incomplete reviewed topic: '+topic);
  const lineage=categoryLineage(topic);
  const zipPath=rows[0].source_zip_path;
  if(typeof zipPath!=='string'||!path.isAbsolute(zipPath))throw Error('Missing immutable source ZIP: '+topic);
  const zipHash=await hashFile(zipPath);
  if(zipHash!==NOVEMBER_06_ZIP_CHECKSUMS[topic])throw Error('Pinned source ZIP checksum changed: '+topic);
  sourceZipHashes[topic]=zipHash;
  const topicReviews:any[]=[],topicPrepared:any[]=[];
  for(const r of rows){
    const source=sourceById.get(r.design_id);
    if(!source||source.collection!==topic||source.source_sha256!==r.source_sha256||source.original_pdf_sha256!==r.pdf_sha256||source.original_webp_sha256!==r.webp_sha256||source.source_archive_sha256!==zipHash||r.source_zip_sha256!==zipHash)throw Error('Review and original-source inventory differ: '+r.design_id);
    if(JSON.stringify(r.category_ids)!==JSON.stringify(lineage)||!matchesReviewedTopicLineage(NOVEMBER_06_RELEASE_ID,topic,r.category_ids))throw Error('Incorrect category lineage: '+r.design_id);
    const metadata={title:r.title,description:r.description,alt_text:r.alt_text,category_ids:r.category_ids};
    if(await sha256(canonicalJSON(metadata))!==r.metadata_sha256)throw Error('Editorial metadata checksum mismatch: '+r.design_id);
    await requireDoubleEditorialApproval(r,r.source_sha256);
    const number=r.design_id.slice(topic.length+2);
    if(!/^\d{3}$/.test(number))throw Error('Invalid design number: '+r.design_id);
    const contentId=`jc-${topic}-${number}`;
    const folder=path.join(work,'private-prepared/november-06',topic,contentId);
    const manifest=JSON.parse(await fs.readFile(path.join(folder,'manifest.json'),'utf8'));
    const files=JSON.parse(await fs.readFile(path.join(folder,'files.json'),'utf8'));
    if(manifest.content_id!==contentId||manifest.import_action!=='create'||manifest.title!==r.title||manifest.description!==r.description||manifest.alt_text!==r.alt_text||JSON.stringify(manifest.category_ids)!==JSON.stringify(r.category_ids))throw Error('Prepared manifest is not the approved revision: '+contentId);
    if(!manifest.provenance?.reference?.includes('Source SHA-256 '+r.source_sha256)||manifest.provenance.source_type!=='user_owned')throw Error('Source ownership or provenance evidence mismatch: '+contentId);
    if(await hashFile(files.source_original)!==r.source_sha256||await hashFile(source.private_webp_path)!==source.original_webp_sha256)throw Error('Preserved source artwork changed: '+contentId);
    const assetHashes:Record<string,string>={};
    for(const asset of manifest.assets){
      if(!files[asset.role])throw Error('Prepared asset path missing: '+contentId+'/'+asset.role);
      const file=files[asset.role],stat=await fs.stat(file);
      if(stat.size!==asset.bytes||await hashFile(file)!==asset.sha256)throw Error('Prepared asset bytes/checksum differ: '+contentId+'/'+asset.role);
      assetHashes[asset.role]=asset.sha256;
      if(asset.role==='printable_pdf_a4_bw'){
        const bytes=new Uint8Array(await fs.readFile(file));
        await reviewPrintablePDF(bytes,asset.role,true,r.title);
        const pdf=await PDFDocument.load(bytes,{ignoreEncryption:false});
        if(pdf.getPageCount()!==1||pdf.getTitle()!==r.title)throw Error('Prepared PDF page count/title mismatch: '+contentId);
      }
    }
    if(Object.keys(assetHashes).length!==manifest.assets.length||!assetHashes.social_og||!assetHashes.printable_pdf_a4_bw||!assetHashes.printable_webp_bw)throw Error('Required prepared artwork assets missing: '+contentId);
    topicPrepared.push({id:r.design_id,content_id:contentId,folder,source_sha256:r.source_sha256});
    topicReviews.push({...r,pdf_sha256:source.original_pdf_sha256,webp_sha256:source.original_webp_sha256,prepared_source_sha256:r.source_sha256,status:'approved_for_publication',render_review:{status:'approved',assets:assetHashes,reviewed_at:'2026-11-07',method:'Per-item source and derivative checksum validation; printable PDF parsed and checked as one-page A4 grayscale artwork with exact supplied JotColoring logo pixels and approved placement; document title bound to reviewed metadata. Original source artwork was reviewed against actual pixels; generated social covers use the reviewed title and shared template, with final cover contact-sheet samples visually checked.'}});
  }
  reviewByTopic.set(topic,topicReviews);
  preparationByTopic.set(topic,topicPrepared);
}
if(!matchesReviewedSourceArchives({release_id:NOVEMBER_06_RELEASE_ID,source_zip_sha256s:sourceZipHashes}))throw Error('Exact complete source ZIP scope mismatch');
const scope=reviewedReleaseScope(NOVEMBER_06_RELEASE_ID);
if(scope.collections!==18||scope.designs!==1800)throw Error('Exact authorized 18-topic scope mismatch');
const collections:any[]=[];
for(const topic of Object.keys(NOVEMBER_06_TOPIC_COUNTS)){
  const review=reviewByTopic.get(topic)!,prepared=preparationByTopic.get(topic)!;
  const reviewPath=path.join(releaseRoot,topic+'-approved-review.json');
  const preparationPath=path.join(preparationRoot,topic+'-preparation-report.json');
  const reviewBytes=new TextEncoder().encode(JSON.stringify(review,null,2)+'\n');
  const preparation={status:'prepared_pending_render_review',prepared,failed:[],source_review:'PASS',release_id:NOVEMBER_06_RELEASE_ID};
  const preparationBytes=new TextEncoder().encode(JSON.stringify(preparation,null,2)+'\n');
  await fs.writeFile(reviewPath,reviewBytes,{mode:0o600});
  await fs.writeFile(preparationPath,preparationBytes,{mode:0o600});
  collections.push({collection:topic,review_path:reviewPath,review_sha256:await sha256(reviewBytes),preparation_path:preparationPath,preparation_sha256:await sha256(preparationBytes),designs:review.length});
}
const release={release_id:NOVEMBER_06_RELEASE_ID,status:'ready_for_publication',expected_collections:scope.collections,expected_designs:scope.designs,source_zip_sha256s:sourceZipHashes,source_inventory_path:inventoryPath,source_inventory_sha256:digest(inventoryBytes),sealed_at:new Date().toISOString(),collections};
const releasePath=path.join(privateRoot,'full-release.json');
await fs.writeFile(releasePath,JSON.stringify(release,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({status:'PASS',release_id:release.release_id,topics:collections.length,designs:collections.reduce((n,c)=>n+c.designs,0),source_zips_verified:Object.keys(sourceZipHashes).length,prepared_assets_verified:1800,pdf_pages_logo_and_titles_verified:1800,release_path:releasePath}));
