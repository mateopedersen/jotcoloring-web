/** Preserve supplied printable containers and the owner's existing logo verbatim. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash,createHmac} from 'node:crypto';
import sharp from 'sharp';
import {PDFDocument} from 'pdf-lib';
import {inspectSuppliedPagePixels} from './supplied-page-validation';
import {analyzeAgeImage,releaseAgeModel} from './age-vision';
import {selectPreparedCategories,preparedCategorySelection} from './category-selection';
import {ageBand} from '../../src/age/model';
import {renderSocial,siteIcon} from '../social/render';
import {socialBinding,contentSocialSpec} from '../../src/social/model';
import {BRAND_REVIEW_VERSION} from '../../src/server/branding';
import {canonicalJSON} from '../../src/server/http';
import {validateManifest} from '../../src/server/manifest';
import type {Asset,Manifest} from '../../src/server/types';
const root=path.resolve(process.argv[2]);
const shard=Number(process.argv[3]||0),shards=Number(process.argv[4]||1);
const rows=JSON.parse(await fs.readFile(path.join(root,'private-release/editorial-candidates.json'),'utf8'));
const secrets=JSON.parse(await fs.readFile(process.env.JOT_SECRETS_FILE!,'utf8')).production;
const hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const audit=JSON.parse(await fs.readFile(path.join(root,'pdf-pair-audit.json'),'utf8'));
if(audit.status!=='PASS'||audit.checked!==1700||rows.length!==1700)throw Error('Complete supplied-file audit required.');
try{for(const [i,row] of rows.entries()){
 if(i%shards!==shard)continue;
 const out=row.preparation_folder;
 try{await fs.access(path.join(out,'manifest.json'));console.log(JSON.stringify({completed:i+1,id:row.design_id,cached:true}));continue;}catch{}
 const original=await fs.readFile(row.prepare_flags['--source-original']);
 if(hash(original)!==row.source_sha256)throw Error('Source checksum changed');
 const {data,info}=await sharp(original).toColourspace('srgb').removeAlpha().raw().toBuffer({resolveWithObject:true});
 // The supplied logo is intentionally placed differently from generated pages.
 // Check its reserved source region without erasing, moving, or recoloring pixels.
 const {logoPixels,frameChroma,edgeChroma}=inspectSuppliedPagePixels(data,info.width,info.height,info.channels);
 const pdf=execFileSync('/usr/bin/unzip',['-p',row.source_zip_path,row.source_pdf_path],{maxBuffer:2_000_000});
 if(hash(pdf)!==row.source_pdf_sha256||pdf.length>1_000_000)throw Error('Source PDF changed');
 const doc=await PDFDocument.load(pdf);const pages=doc.getPages();
 if(pages.length!==1||Math.abs(pages[0].getWidth()-595.28)>1||Math.abs(pages[0].getHeight()-841.89)>1)throw Error('Supplied PDF is not one-page A4');
 await fs.mkdir(out,{recursive:true,mode:0o700});
 const assets:Asset[]=[],reviews:any[]=[],files:Record<string,string>={source_original:row.prepare_flags['--source-original'],source_processed:row.prepare_flags['--source-original']};
 async function emit(role:string,bytes:Buffer,mime:string,width:number|null,height:number|null,page_count:number|null,bw=true,preservePath?:string){
  const sha=hash(bytes),ext=mime==='application/pdf'?'pdf':mime.split('/')[1],local=preservePath||path.join(out,role+'.'+ext);
  if(!preservePath)await fs.writeFile(local,bytes,{mode:0o600});files[role]=local;
  assets.push({asset_id:`${row.content_id}-${role}-v1`,role,storage_zone:'private_incoming',object_key:`incoming/${row.content_id}/1/${role}-${sha.slice(0,24)}.${ext}`,mime,bytes:bytes.length,width,height,page_count,sha256:sha,asset_version:1,black_and_white_verified:bw});
  const review={sha256:sha,role,mime,bytes:bytes.length,width,height,page_count,bw,reviewed_at:new Date().toISOString(),review_version:BRAND_REVIEW_VERSION};
  reviews.push({review,signature:createHmac('sha256',secrets.MEDIA_VALIDATION_SECRET).update(canonicalJSON(review)).digest('hex')});
 }
 await emit('printable_webp_bw',original,'image/webp',info.width,info.height,null,true,files.source_original);
 await emit('printable_pdf_a4_bw',pdf,'application/pdf',null,null,1);
 for(const [role,width] of [['catalog_thumb_bw',400],['catalog_thumb_small_bw',240],['catalog_thumb_medium_bw',320],['catalog_preview_bw',900],['catalog_preview_mobile_bw',600]] as const){
  const resized=await sharp(original).resize({width,withoutEnlargement:true}).png().toBuffer();
  const bytes=await sharp(resized).webp({lossless:true,effort:4}).toBuffer(),meta=await sharp(bytes).metadata();
  // Lossless encoding preserves every pixel of the entire resized page, including its logo.
  const a=await sharp(resized).raw().toBuffer(),b=await sharp(bytes).raw().toBuffer();if(!a.equals(b))throw Error('Responsive encoding changed pixels');
  await emit(role,bytes,'image/webp',meta.width!,meta.height!,null);
 }
 const age=await analyzeAgeImage(original,{brandFooter:true});
 const categories=selectPreparedCategories(age.category_analysis,row.category_ids.join(','),row.category_review);
 const manifest:Manifest={schema_version:'1.0',example_only:false,import_action:'create',idempotency_key:`supplied-${row.content_id}-${row.source_sha256.slice(0,20)}`,content_id:row.content_id,locale:'en',slug:row.slug,title:row.title,description:row.description,alt_text:row.alt_text,requested_status:'ready_for_review',category_ids:categories,tags:row.tags,age_recommendation:age,category_selection:preparedCategorySelection(age.category_analysis,age.source_sha256,categories.join(','),row.category_review),age_groups:[ageBand(age.band)!.group],provenance:{source_type:'user_owned',rights_status:'documented',reference:`Source SHA-256 ${row.source_sha256}; supplied PDF SHA-256 ${row.source_pdf_sha256}; owner states JotColoring team created drawings; original PDF/WebP and supplied JotColoring logo preserved verbatim. Native raster container absent from supplied ZIP.`,license_label:'Free personal and educational use. Commercial use requires permission: jotcoloring@gmail.com.'},assets};
 const binding=socialBinding({...manifest,recommendedAge:age.band,sourceSHA256:row.source_sha256});
 const cover=await renderSocial(contentSocialSpec(binding),{logo:new Uint8Array(await fs.readFile('public/logo-3d.webp')),icon:await siteIcon(contentSocialSpec(binding).icon),art:[{slug:row.slug,title:row.title,alt:row.alt_text,line:original,sourceSHA256:row.source_sha256}]},binding);
 await emit('social_og',cover.bytes,'image/png',1200,630,null,false);assets.at(-1)!.source_asset_id=assets[0].asset_id;
 const checked=validateManifest(manifest,true);
 await fs.writeFile(path.join(out,'files.json'),JSON.stringify(files,null,2),{mode:0o600});
 await fs.writeFile(path.join(out,'reviews.json'),JSON.stringify(reviews,null,2),{mode:0o600});
 await fs.writeFile(path.join(out,'preservation.json'),JSON.stringify({original_webp_sha256:row.source_sha256,original_pdf_sha256:row.source_pdf_sha256,logo_pixels:logoPixels,source_frame_chroma_pixels:frameChroma,source_edge_chroma_pixels:edgeChroma,logo_preserved:true,printables_identical_to_supplied:true,previews:'whole-page lossless resized copies',color_assets_created:false}),{mode:0o600});
 await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(checked,null,2),{mode:0o600});
 console.log(JSON.stringify({completed:i+1,id:row.design_id,assets:assets.length}));
}}finally{await releaseAgeModel();}
