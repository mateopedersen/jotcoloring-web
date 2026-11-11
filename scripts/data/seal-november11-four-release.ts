/** Seal only the complete, already reviewed four-topic release. No remote writes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {NOVEMBER_11_FOUR_RELEASE_ID,NOVEMBER_11_FOUR_TOPIC_COUNTS,NOVEMBER_11_FOUR_ZIP_SHA256S} from '../../src/server/november-11-four-scope';
import {matchesReviewedSourceArchives,matchesReviewedTopicLineage,reviewedReleaseScope} from '../../src/server/reviewed-release-scope';
import {canonicalJSON} from '../../src/server/http';
import {validateManifest} from '../../src/server/manifest';
import {requireDoubleEditorialApproval} from '../../src/server/editorial-approval';
import {reviewPrintablePDF} from './pdf-review';
import {verifiedSuppliedPDFLogoPlacement} from './supplied-pdf-source';

const root=path.resolve('../incoming-2026-11-11/four-topics'),out=path.join(root,'private-release');
const digest=(data:Uint8Array|string)=>createHash('sha256').update(data).digest('hex');
const files=process.argv.slice(2);if(!files.length)throw Error('Provide explicit completed editorial/render review files.');
const reviews:any[]=[];
for(const file of files){const rows=JSON.parse(await fs.readFile(file,'utf8'));if(!Array.isArray(rows))throw Error('Completed review array required');reviews.push(...rows);}
if(reviews.length!==400||new Set(reviews.map(r=>r.design_id)).size!==400)throw Error('All four topics and 400 unique completed reviews are required before sealing or publishing.');
const scope=reviewedReleaseScope(NOVEMBER_11_FOUR_RELEASE_ID);if(scope.collections!==4||scope.designs!==400)throw Error('Artist release scope changed');
const inventoryPath=path.join(root,'private-review/original-source-inventory.json'),inventoryBytes=await fs.readFile(inventoryPath),inventory=JSON.parse(inventoryBytes.toString());
if(inventory.length!==400||new Set(inventory.map((r:any)=>r.design_id)).size!==400)throw Error('Exact original-source inventory required');
const sourceByID=new Map(inventory.map((r:any)=>[r.design_id,r]));
const audit=JSON.parse(await fs.readFile(path.join(root,'private-review/source-audit.json'),'utf8'));
if(audit.status!=='PASS'||audit.release_id!==NOVEMBER_11_FOUR_RELEASE_ID||audit.archive_count!==4||audit.design_count!==400)throw Error('Complete four-topic archive audit required');
async function hashFile(file:string){const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk as Buffer);return hash.digest('hex');}
const evidenceCache=new Map<string,string>();
async function evidenceHash(file:string){if(!evidenceCache.has(file))evidenceCache.set(file,await hashFile(file));return evidenceCache.get(file)!;}
const zipHashes:Record<string,string>={},collections:any[]=[],validated=new Map<string,{reviews:any[];prepared:any[]}>();let assetCount=0;
for(const [topic,count] of Object.entries(NOVEMBER_11_FOUR_TOPIC_COUNTS)){
 const selected=reviews.filter(r=>r.topic===topic).sort((a,b)=>a.design_id.localeCompare(b.design_id));if(selected.length!==count)throw Error('Incomplete approved topic: '+topic);
 const zip=selected[0].source_zip_path;if(!path.isAbsolute(zip))throw Error('Private immutable ZIP required');const zipHash=await hashFile(zip);if(zipHash!==NOVEMBER_11_FOUR_ZIP_SHA256S[topic])throw Error('Source ZIP checksum changed');zipHashes[topic]=zipHash;
 const prepared:any[]=[];
 for(const r of selected){
  const source:any=sourceByID.get(r.design_id);if(!source||source.collection!==topic||source.source_sha256!==r.source_sha256||source.source_zip_path!==zip||r.source_zip_sha256!==zipHash||source.original_pdf_sha256!==r.pdf_sha256||source.original_webp_sha256!==r.webp_sha256)throw Error('Approved source identity differs: '+r.design_id);
  if(r.status!=='approved_for_publication'||r.prepared_source_sha256!==source.source_sha256||r.render_review?.status!=='approved')throw Error('Completed final editorial/render review required');
  await requireDoubleEditorialApproval(r,source.source_sha256);
  if(!matchesReviewedTopicLineage(NOVEMBER_11_FOUR_RELEASE_ID,topic,r.category_ids))throw Error('Exact reviewed topic lineage required');
  if(/#\s*\d|\b(?:page|design)\s*#?\s*\d/i.test([r.title,r.description,r.alt_text].join(' ')))throw Error('Artificial numbering in topic metadata');
  const folder=r.preparation_folder,m=validateManifest(JSON.parse(await fs.readFile(path.join(folder,'manifest.json'),'utf8')),true),local=JSON.parse(await fs.readFile(path.join(folder,'files.json'),'utf8'));
  if(m.content_id!==source.content_id||m.slug!==source.slug||m.import_action!=='create'||canonicalJSON(Object.fromEntries(['title','description','alt_text','category_ids'].map(k=>[k,(m as any)[k]])))!==canonicalJSON(Object.fromEntries(['title','description','alt_text','category_ids'].map(k=>[k,r[k]]))))throw Error('Reviewed and prepared copy differs');
  if(m.assets.length!==8||Object.keys(r.render_review.assets||{}).length!==8||m.assets.some(a=>r.render_review.assets[a.role]!==a.sha256))throw Error('Exact final-render approval changed');
  if(!m.provenance.reference?.includes('Source SHA-256 '+source.source_sha256)||!m.provenance.reference?.includes('supplied PDF and WebP are retained as separately checksummed original containers')||!m.provenance.reference?.includes('grayscale-JPEG compatibility derivative'))throw Error('Original container/derivative provenance required');
  async function read(role:string){const file=local[role];if(typeof file!=='string')throw Error('Missing prepared file');if(!file.startsWith('archive:'))return fs.readFile(file);if(file!=='archive:'+source.source_zip_path+'|'+source.source_webp_path)throw Error('Prepared ZIP member is outside exact source');return execFileSync('/usr/bin/unzip',['-p',zip,source.source_webp_path],{maxBuffer:25_000_000});}
  if(digest(await read('source_original'))!==source.source_sha256||digest(await read('source_processed'))!==source.source_sha256)throw Error('Original artwork changed');
  const pdf=execFileSync('/usr/bin/unzip',['-p',zip,source.source_pdf_path],{maxBuffer:1_000_000});if(digest(pdf)!==source.original_pdf_sha256)throw Error('Original PDF changed');
  const position=await verifiedSuppliedPDFLogoPlacement({...source,original_pdf_sha256:source.original_pdf_sha256});
  for(const a of m.assets){const bytes=await read(a.role);if(bytes.length!==a.bytes||digest(bytes)!==a.sha256)throw Error('Final asset bytes changed');if(a.role==='printable_webp_bw'&&a.sha256!==source.source_sha256)throw Error('Native WebP changed');if(a.role==='printable_pdf_a4_bw')await reviewPrintablePDF(new Uint8Array(bytes),a.role,true,m.title,position);assetCount++;}
  if(!Array.isArray(r.render_review.cover_sheets)||r.render_review.cover_sheets.length!==20)throw Error('Complete actual cover-review evidence required');
  for(const sheet of r.render_review.cover_sheets)if(await evidenceHash(sheet.file)!==sheet.sha256)throw Error('Cover review sheet changed');
  prepared.push({id:r.design_id,content_id:m.content_id,folder,source_sha256:source.source_sha256});
 }
 validated.set(topic,{reviews:selected,prepared});
}
if(!matchesReviewedSourceArchives({release_id:NOVEMBER_11_FOUR_RELEASE_ID,source_zip_sha256s:zipHashes}))throw Error('Exact complete four-topic archive scope required');
const reviewDir=path.join(out,'four-topic-reviews'),prepDir=path.join(out,'four-topic-preparations');await fs.mkdir(reviewDir,{recursive:true,mode:0o700});await fs.mkdir(prepDir,{recursive:true,mode:0o700});
for(const [topic,data] of validated){const reviewPath=path.join(reviewDir,topic+'.json'),prepPath=path.join(prepDir,topic+'-preparation-report.json'),reviewBytes=JSON.stringify(data.reviews,null,2)+'\n',prepBytes=JSON.stringify({status:'prepared_pending_render_review',prepared:data.prepared,failed:[],source_review:'PASS',release_id:NOVEMBER_11_FOUR_RELEASE_ID},null,2)+'\n';await fs.writeFile(reviewPath,reviewBytes,{mode:0o600});await fs.writeFile(prepPath,prepBytes,{mode:0o600});collections.push({collection:topic,review_path:reviewPath,review_sha256:digest(reviewBytes),preparation_path:prepPath,preparation_sha256:digest(prepBytes),designs:data.reviews.length});}
const release={release_id:NOVEMBER_11_FOUR_RELEASE_ID,status:'ready_for_publication',expected_collections:4,expected_designs:400,source_zip_sha256s:zipHashes,source_inventory_path:inventoryPath,source_inventory_sha256:digest(inventoryBytes),completed_review_inputs:await Promise.all(files.map(async file=>({file:path.resolve(file),sha256:await hashFile(file)}))),sealed_at:new Date().toISOString(),collections};
const output=path.join(out,'full-release-four-topics-nov11.json');await fs.writeFile(output,JSON.stringify(release,null,2)+'\n',{mode:0o600});console.log(JSON.stringify({status:'PASS',topics:4,designs:400,verified_assets:assetCount,output}));
