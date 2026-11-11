import {requireSearchableTopicIdentity} from '../../src/taxonomy/topic-identity';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {preparedCategorySelection} from './category-selection';
import {validateManifest} from '../../src/server/manifest';
import {socialBinding,contentSocialSpec} from '../../src/social/model';
import {renderSocial,siteIcon} from '../social/render';
import {alignPDFDocumentTitle,reviewPrintablePDF} from './pdf-review';

/** Rebind reviewed metadata to existing, checksum-pinned printable artwork. */
export async function rebindReviewedMetadata(oldDir:string,reviewFile:string,designId:string,outDir:string,reviewRecord?:any){
 if(!oldDir||!reviewFile||!designId||!outDir)throw Error('Explicit old bundle, reviewed record, identity, and fresh output required');
 const r=reviewRecord||JSON.parse(await fs.readFile(reviewFile,'utf8')).find((v:any)=>v.design_id===designId);if(!r||r.design_id!==designId||!r.observations||r.observations.length<12)throw Error('Actual source-bound editorial observations required');
 const m=JSON.parse(await fs.readFile(path.join(oldDir,'manifest.json'),'utf8')),files=JSON.parse(await fs.readFile(path.join(oldDir,'files.json'),'utf8')),signed=JSON.parse(await fs.readFile(path.join(oldDir,'reviews.json'),'utf8'));
 const hash=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
 const cached=new Map<string,Uint8Array>();
 async function read(file:string):Promise<Uint8Array>{
  if(cached.has(file))return cached.get(file)!;
  let bytes:Uint8Array;
  if(file.startsWith('archive:')){
   const i=file.indexOf('|'),zip=file.slice(8,i),member=file.slice(i+1);
   if(i<9||zip!==r.source_zip_path||member!==r.source_webp_path||member.startsWith('/')||member.split('/').some((p:string)=>!p||p==='..'))throw Error('Prepared archive is outside the reviewed source');
   bytes=new Uint8Array(execFileSync('/usr/bin/unzip',['-p',zip,member],{maxBuffer:25_000_000}));
   if(hash(bytes)!==r.source_sha256)throw Error('Archived artwork checksum changed');
  }else bytes=new Uint8Array(await fs.readFile(file));
  cached.set(file,bytes);return bytes;
 }
 const sourceBytes=await read(files.source_original);if(!m.provenance.reference.includes('Source SHA-256 '+hash(sourceBytes)))throw Error('Native source changed');
 for(const a of m.assets){const bytes=await read(files[a.role]);if(bytes.length!==a.bytes||hash(bytes)!==a.sha256)throw Error('Prepared source asset changed');}
 try{await fs.access(path.join(outDir,'manifest.json'));throw Error('Fresh output folder required');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 const previousSlug=m.slug;m.title=r.title;m.description=r.description;m.alt_text=r.alt_text;if(r.difficulty)m.difficulty=r.difficulty;m.slug=previousSlug;m.tags=r.tags;
 const selection=preparedCategorySelection(m.age_recommendation.category_analysis,m.age_recommendation.source_sha256,r.category_ids.join(','),'Inspected artwork: '+r.observations);m.category_selection=selection;m.category_ids=selection.category_ids;
 requireSearchableTopicIdentity(m);
 const line=m.assets.find((a:any)=>a.role==='printable_webp_bw'),binding=socialBinding({...m,recommendedAge:m.age_recommendation.band,sourceSHA256:line.sha256}),spec=contentSocialSpec(binding);
 const rendered=await renderSocial(spec,{logo:new Uint8Array(await fs.readFile('public/logo-3d.webp')),icon:await siteIcon(spec.icon),art:[{slug:m.slug,title:m.title,alt:m.alt_text,line:await read(files.printable_webp_bw),sourceSHA256:line.sha256}]},binding);
 const og=m.assets.find((a:any)=>a.role==='social_og');og.sha256=hash(rendered.bytes);og.bytes=rendered.bytes.length;og.object_key=`incoming/${m.content_id}/1/social_og-${og.sha256.slice(0,24)}.png`;
 await fs.mkdir(outDir,{recursive:true});files.social_og=path.resolve(outDir,'social_og.png');await fs.writeFile(files.social_og,rendered.bytes);
 const pdf=m.assets.find((a:any)=>a.role==='printable_pdf_a4_bw'),aligned=await alignPDFDocumentTitle(new Uint8Array(await fs.readFile(files[pdf.role])),m.title);
 if(aligned.changed){await reviewPrintablePDF(aligned.bytes,pdf.role,true,m.title,r.pdf_logo_position);pdf.sha256=hash(aligned.bytes);pdf.bytes=aligned.bytes.length;pdf.object_key=`incoming/${m.content_id}/1/${pdf.role}-${pdf.sha256.slice(0,24)}.pdf`;files[pdf.role]=path.resolve(outDir,pdf.role+'.pdf');await fs.writeFile(files[pdf.role],aligned.bytes);const reviewed=signed.find((s:any)=>s.review.role===pdf.role);reviewed.review.sha256=pdf.sha256;reviewed.review.bytes=pdf.bytes;reviewed.review.reviewed_at=new Date().toISOString();delete reviewed.signature;}
 // A revised manifest creates a new content revision. Asset IDs are globally unique
 // in D1, so never carry IDs from the active revision into the next import.
 const nextAssetVersion=Math.max(...m.assets.map((a:any)=>Number(a.asset_version)||1))+1;
 m.import_action='update';m.expected_version=(Number(m.expected_version)||0)+1;
 const nextIds=new Map<string,string>(m.assets.map((a:any)=>[a.asset_id,`${m.content_id}-${a.role}-v${nextAssetVersion}`]));
 for(const a of m.assets){
  a.asset_id=nextIds.get(a.asset_id)!;
  a.asset_version=nextAssetVersion;
  if(a.source_asset_id)a.source_asset_id=nextIds.get(a.source_asset_id)||a.source_asset_id;
  const ext=a.mime==='application/pdf'?'pdf':a.mime.split('/')[1];
  a.object_key=`incoming/${m.content_id}/${nextAssetVersion}/${a.role}-${a.sha256.slice(0,24)}.${ext}`;
 }
 m.idempotency_key=`prepare-${m.content_id}-${hash(sourceBytes).slice(0,20)}-meta-${hash(JSON.stringify({title:m.title,description:m.description,alt:m.alt_text,categories:m.category_ids,assets:m.assets.map((a:any)=>[a.role,a.sha256])})).slice(0,12)}`;
 const review=signed.find((s:any)=>s.review.role==='social_og');review.review.sha256=og.sha256;review.review.bytes=og.bytes;review.review.reviewed_at=new Date().toISOString();delete review.signature;
 validateManifest(m,true);let preservation:any={source_containers_preserved_in_private_archive:false};try{preservation=JSON.parse(await fs.readFile(path.join(oldDir,'preservation.json'),'utf8'));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}const archived=preservation.source_containers_preserved_in_private_archive===true;preservation.source_containers_preserved_in_private_archive=archived;if(archived&&r.pdf_sha256)preservation.supplied_pdf_archived_sha256=r.pdf_sha256;preservation.published_pdf_sha256=pdf.sha256;preservation.published_pdf_document_title=m.title;preservation.pdf_title_alignment=aligned.changed?'metadata-only title alignment; embedded artwork streams retained':'source PDF document title already matches';preservation.printables_identical_to_supplied=!aligned.changed&&preservation.original_webp_sha256===r.webp_sha256;await fs.writeFile(path.join(outDir,'preservation.json'),JSON.stringify(preservation,null,2));await fs.writeFile(path.join(outDir,'files.json'),JSON.stringify(files,null,2));await fs.writeFile(path.join(outDir,'reviews.json'),JSON.stringify(signed,null,2));await fs.writeFile(path.join(outDir,'category-review.json'),JSON.stringify({source_sha256:selection.source_sha256,analysis_version:selection.analysis_version,selected_categories:selection.category_ids,review_note:selection.review_note},null,2));await fs.writeFile(path.join(outDir,'manifest.json'),JSON.stringify(m,null,2));
 return {id:m.content_id,design_id:designId,category_ids:m.category_ids,artworkPixelsPreserved:true,pdfDocumentTitleUpdated:aligned.changed};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [oldDir,reviewFile,designId,outDir]=process.argv.slice(2);
 console.log(JSON.stringify(await rebindReviewedMetadata(oldDir,reviewFile,designId,outDir)));
}
