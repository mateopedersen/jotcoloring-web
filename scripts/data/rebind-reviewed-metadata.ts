/** Refresh editorial/category/social binding without re-encoding accepted print and outline pixels. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {preparedCategorySelection} from './category-selection';
import {validateManifest} from '../../src/server/manifest';
import {socialBinding,contentSocialSpec} from '../../src/social/model';
import {renderSocial,siteIcon} from '../social/render';
const [oldDir,reviewFile,designId,outDir]=process.argv.slice(2);if(!oldDir||!reviewFile||!designId||!outDir)throw Error('Explicit old bundle, reviewed record, identity, and fresh output required');
const all=JSON.parse(await fs.readFile(reviewFile,'utf8')),r=all.find((v:any)=>v.design_id===designId);if(!r||!r.observations||r.observations.length<12)throw Error('Actual source-bound editorial observations required');
const m=JSON.parse(await fs.readFile(path.join(oldDir,'manifest.json'),'utf8')),files=JSON.parse(await fs.readFile(path.join(oldDir,'files.json'),'utf8')),signed=JSON.parse(await fs.readFile(path.join(oldDir,'reviews.json'),'utf8'));
const hash=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex'),sourceBytes=new Uint8Array(await fs.readFile(files.source_original));if(!m.provenance.reference.includes('Source SHA-256 '+hash(sourceBytes)))throw Error('Native source changed');
for(const a of m.assets){const bytes=new Uint8Array(await fs.readFile(files[a.role]));if(bytes.length!==a.bytes||hash(bytes)!==a.sha256)throw Error('Prepared source asset changed');}
try{await fs.access(path.join(outDir,'manifest.json'));throw Error('Fresh output folder required');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
m.title=r.title;m.description=r.description;m.alt_text=r.alt_text;m.slug=r.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');m.tags=r.tags;
const selection=preparedCategorySelection(m.age_recommendation.category_analysis,m.age_recommendation.source_sha256,r.category_ids.join(','),'Inspected artwork: '+r.observations);m.category_selection=selection;m.category_ids=selection.category_ids;
m.idempotency_key=`prepare-${m.content_id}-${hash(sourceBytes).slice(0,20)}-meta-${hash(JSON.stringify({title:m.title,description:m.description,alt:m.alt_text,categories:m.category_ids})).slice(0,12)}`;
const line=m.assets.find((a:any)=>a.role==='printable_webp_bw'),binding=socialBinding({...m,recommendedAge:m.age_recommendation.band,sourceSHA256:line.sha256}),spec=contentSocialSpec(binding);
const rendered=await renderSocial(spec,{logo:new Uint8Array(await fs.readFile('public/logo-3d.webp')),icon:await siteIcon(spec.icon),art:[{slug:m.slug,title:m.title,alt:m.alt_text,line:new Uint8Array(await fs.readFile(files.printable_webp_bw)),sourceSHA256:line.sha256}]},binding);
const og=m.assets.find((a:any)=>a.role==='social_og');og.sha256=hash(rendered.bytes);og.bytes=rendered.bytes.length;og.object_key=`incoming/${m.content_id}/1/social_og-${og.sha256.slice(0,24)}.png`;
await fs.mkdir(outDir,{recursive:true});files.social_og=path.resolve(outDir,'social_og.png');await fs.writeFile(files.social_og,rendered.bytes);
const review=signed.find((s:any)=>s.review.role==='social_og');review.review.sha256=og.sha256;review.review.bytes=og.bytes;review.review.reviewed_at=new Date().toISOString();delete review.signature;
validateManifest(m,true);await fs.writeFile(path.join(outDir,'files.json'),JSON.stringify(files,null,2));await fs.writeFile(path.join(outDir,'reviews.json'),JSON.stringify(signed,null,2));await fs.writeFile(path.join(outDir,'category-review.json'),JSON.stringify({source_sha256:selection.source_sha256,analysis_version:selection.analysis_version,selected_categories:selection.category_ids,review_note:selection.review_note},null,2));await fs.writeFile(path.join(outDir,'manifest.json'),JSON.stringify(m,null,2));console.log(JSON.stringify({id:m.content_id,category_ids:m.category_ids,printAndOutlineBytesPreserved:true}));
