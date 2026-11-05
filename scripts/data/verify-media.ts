/** Re-decode every published rendition. Byte signatures alone are not a media test. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {verifyBrandedRaster,BRAND_VERSION} from '../../src/server/branding';
import {reviewPrintablePDF} from './pdf-review';
import {pngBinding} from '../../src/social/png';
import {socialBinding} from '../../src/social/model';
import {canonicalJSON} from '../../src/server/http';
import {validateManifest} from '../../src/server/manifest';
import {inspectSuppliedPagePixels} from './supplied-page-validation';
import {forEachInPairs} from '../../src/server/bounded';
const args=process.argv.slice(2);let outputPath:string|undefined;
if(args[0]==='--output'){outputPath=path.resolve(args[1]);args.splice(0,2)}
const explicit=args[0]==='--folders-json',folderList=explicit?JSON.parse(await fs.readFile(args[1]!, 'utf8')):undefined;
if(explicit&&(!Array.isArray(folderList)||!folderList.length||folderList.length>10000||folderList.some((v:unknown)=>typeof v!=='string'||!path.isAbsolute(v))||new Set(folderList).size!==folderList.length))throw Error('Explicit unique prepared folders are required.');
const roots=(explicit?[]:args.length?args:['../../media']).map(root=>path.resolve(root));const folders:string[]=explicit?folderList:[];const entries:any[]=[];
for(const root of roots)for(const dir of await fs.readdir(root,{withFileTypes:true}))if(dir.isDirectory())folders.push(path.join(root,dir.name));
async function verifyFolder(folder:string){
 let manifest;
 try{manifest=validateManifest(JSON.parse(await fs.readFile(path.join(folder,'manifest.json'),'utf8')),true)}catch(error){if(!explicit&&(error as NodeJS.ErrnoException).code==='ENOENT')return;throw new Error('Invalid prepared manifest '+path.basename(folder),{cause:error})}
 const files=JSON.parse(await fs.readFile(path.join(folder,'files.json'),'utf8'));
 const sourceBound=manifest.provenance.reference?.includes('supplied JotColoring logo')===true;
 const sourceBytes=sourceBound?await fs.readFile(files.source_original):undefined;
 for(const a of manifest.assets){
  const bytes=await fs.readFile(files[a.role]);
  if(bytes.length!==a.bytes||createHash('sha256').update(bytes).digest('hex')!==a.sha256)throw new Error('Checksum mismatch '+a.asset_id);
  if(a.mime==='application/pdf'){
   await reviewPrintablePDF(bytes,a.role,true,manifest.title);
   entries.push({id:manifest.content_id,role:a.role,bytes:bytes.length,pages:1,artwork_grayscale:true,brand_version:BRAND_VERSION});
  }else{
   const {data,info}=await sharp(bytes,{limitInputPixels:25_000_000}).toColourspace('srgb').removeAlpha().raw().toBuffer({resolveWithObject:true});
   const meta=await sharp(bytes).metadata();
   if(meta.format!==a.mime.split('/')[1]||info.width!==a.width||info.height!==a.height)throw new Error('Invalid image dimensions '+a.asset_id);
   let checked;
   try{
    if(a.role==='social_og'){
     const source=manifest.assets.find(x=>x.role==='printable_webp_bw')!;
     if(canonicalJSON(pngBinding(bytes))!==canonicalJSON(socialBinding({...manifest,recommendedAge:manifest.age_recommendation?.band,sourceSHA256:source.sha256})))throw new Error('Social source binding mismatch');
     checked={social_source_verified:true};
    }else if(sourceBound&&a.role==='printable_webp_bw'){
     if(!sourceBytes||!bytes.equals(sourceBytes))throw new Error('Published WebP differs from supplied source bytes');
     checked=inspectSuppliedPagePixels(data,info.width,info.height,info.channels);
     checked={...checked,supplied_source_pixels_verified:true};
    }else if(sourceBound&&['catalog_thumb_bw','catalog_thumb_small_bw','catalog_thumb_medium_bw','catalog_preview_bw','catalog_preview_mobile_bw'].includes(a.role)){
     if(!sourceBytes)throw new Error('Supplied source raster is unavailable');
     const expected=await sharp(sourceBytes).resize({width:a.width!,withoutEnlargement:true}).png().toBuffer();
     const expectedPixels=await sharp(expected).toColourspace('srgb').removeAlpha().raw().toBuffer();
     if(!expectedPixels.equals(data))throw new Error('Responsive page pixels differ from the whole-page source resize');
     checked={whole_page_source_pixels_verified:true,logo_position_preserved:true};
    }else checked=verifyBrandedRaster(data,info.width,info.height,info.channels,a.role.endsWith('_bw'));
   }catch(error){throw new Error(a.asset_id+': '+String(error))}
   entries.push({id:manifest.content_id,role:a.role,bytes:bytes.length,width:info.width,height:info.height,...checked});
  }
 }
}
await forEachInPairs(folders,verifyFolder);
const report={measured_at:new Date().toISOString(),environment:'local prepared actual media',provider_generation_tested:false,brand_policy:BRAND_VERSION,grayscale_scope:'Drawing area only; the supplied JotColoring logo remains in its source position',contents:new Set(entries.map(e=>e.id)).size,assets:entries.length,pdfs:entries.filter(e=>e.role.startsWith('printable_pdf')).length,max_pdf_bytes:Math.max(...entries.filter(e=>e.role.startsWith('printable_pdf')).map(e=>e.bytes)),home_color:entries.filter(e=>e.role==='home_half_color').length,entries};const reportFile=outputPath||path.join(roots[0]||path.dirname(args[1]!), 'media-verification.json');await fs.mkdir(path.dirname(reportFile),{recursive:true});await fs.writeFile(reportFile,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,entries:undefined,report:reportFile}));
