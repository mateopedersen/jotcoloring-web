import {PhotonImage,resize,SamplingFilter} from '@cf-wasm/photon';
import {automaticColorPixels,AUTOMATIC_COLOR_VERSION} from '../coloring/automatic';
import {compactColorPixels} from '../coloring/compact';
import {brandFooterLayout,stampBrandFooterRGBA,verifyBrandedRaster,BRAND_REVIEW_VERSION} from './branding';
import {verifyAsset} from './assets';
import {imageDimensions} from './image-processing';
import {AppError,canonicalJSON,sha256} from './http';
import type {Asset,Env,Manifest} from './types';

export const AUTOMATIC_COLOR_ROLES=['home_half_color','home_half_color_small','home_half_color_medium','color_inspiration'] as const;
/** Trusted publication-time fallback. Normal local preparation supplies these
 * already. Never runs on catalog reads, never calls AI, never replaces an
 * accepted color asset. Generated files go through normal backups/CDN indexing.
 */
export async function ensureAutomaticColors(env:Env,manifest:Manifest):Promise<Manifest>{
 const missing=AUTOMATIC_COLOR_ROLES.filter(role=>!manifest.assets.some(a=>a.role===role));if(!missing.length)return manifest;
 if(!env.ORIGINALS||!env.CATALOG_DB)throw new AppError('STORAGE_UNAVAILABLE','Color preview storage is unavailable.',503);
 const line=manifest.assets.find(a=>a.role==='printable_webp_bw');if(!line)return manifest; // Incomplete drafts remain drafts.
 const accepted=manifest.assets.find(a=>a.role==='color_inspiration')||manifest.assets.find(a=>a.role==='home_half_color');
 const source=accepted||['catalog_preview_bw','catalog_preview_mobile_bw','catalog_thumb_bw','printable_webp_bw'].map(role=>manifest.assets.find(a=>a.role===role)).find(a=>a?.width&&a.height&&a.width*a.height<=2_000_000);
 if(!source)throw new AppError('COLOR_PREVIEW_REQUIRED','Prepare a preview of at most 2 megapixels before publishing this artwork.',422);
 const {bytes}=await verifyAsset(env,source),dims=imageDimensions(bytes);
 if(dims.width!==source.width||dims.height!==source.height||dims.width*dims.height>2_000_000||dims.width<16||dims.height<16)throw new AppError('ASSET_INVALID','Color preview source dimensions do not match the verified image.',422);
 const decoded=PhotonImage.new_from_byteslice(bytes);let master:PhotonImage|undefined;
 try{
  const scale=Math.min(1,900/dims.width,1400/dims.height),width=Math.max(16,Math.round(dims.width*scale)),height=Math.max(16,Math.round(dims.height*scale));
  const sized=resize(decoded,width,height,SamplingFilter.Lanczos3);
  try{
   const raw=sized.get_raw_pixels();verifyBrandedRaster(stampBrandFooterRGBA(raw,width,height),width,height,4,!accepted);
   const suggestion=accepted?null:automaticColorPixels(raw,width,height,{...manifest,seed:line.sha256,artBottom:brandFooterLayout(width,height).footer.y});
   if(suggestion&&!suggestion.coloredRegions)throw new AppError('COLOR_AREAS_NOT_FOUND','No enclosed coloring spaces were found. Repair the outline before publication.',422);
   const result=suggestion?.pixels||raw;
   master=new PhotonImage(stampBrandFooterRGBA(result,width,height),width,height);
  }finally{sized.free();}
  const identity=await sha256(canonicalJSON({id:manifest.content_id,revision:manifest.expected_version??0,source:line.asset_id}));
  const generated:Asset[]=[];
  for(const role of missing){
   const baseWidth=Math.min(width,role==='color_inspiration'?900:role==='home_half_color'?400:role==='home_half_color_small'?240:320);let completed=false;
   for(const factor of [1,.9,.8,.7,.6]){
   let targetWidth=factor===1?baseWidth:Math.max(16,Math.floor(baseWidth*factor/2)*2),targetHeight=Math.max(16,Math.round(height*targetWidth/width));
   const minimum=Math.max(16,targetWidth-32);while(targetWidth>minimum&&Math.abs(targetWidth/targetHeight-line.width!/line.height!)>.001){targetWidth--;targetHeight=Math.max(16,Math.round(height*targetWidth/width));}
   if(Math.abs(targetWidth/targetHeight-line.width!/line.height!)>.001)continue;
   const scaled=resize(master,targetWidth,targetHeight,SamplingFilter.Lanczos3);let image:PhotonImage|undefined;
   try{
    image=new PhotonImage(stampBrandFooterRGBA(scaled.get_raw_pixels(),targetWidth,targetHeight),targetWidth,targetHeight);
    let output=image.get_bytes_webp(),mime='image/webp';const limit=role==='color_inspiration'?900_000:250_000;
    const choose=(candidate:Uint8Array,type:string)=>{if(candidate.length<output.length){output=candidate;mime=type;}};
    // Pick a genuine smaller PNG when this lossless WebP encoder is inefficient.
    // Dimensions below are measured and source proportions stay unchanged.
    choose(image.get_bytes(),'image/png');
    if(output.length>limit){const raw=image.get_raw_pixels();for(const step of [8,16] as const){const compact=new PhotonImage(compactColorPixels(raw,targetWidth,targetHeight,brandFooterLayout(targetWidth,targetHeight).footer.y,step),targetWidth,targetHeight);try{choose(compact.get_bytes_webp(),'image/webp');choose(compact.get_bytes(),'image/png');}finally{compact.free();}if(output.length<=limit)break;}}
    if(output.length>limit)continue;
    const check=PhotonImage.new_from_byteslice(output);try{verifyBrandedRaster(check.get_raw_pixels(),targetWidth,targetHeight,4,false);}finally{check.free();}
    const hash=await sha256(output),key=`incoming/automatic-colors/${line.sha256}/${AUTOMATIC_COLOR_VERSION}/${role}-${hash.slice(0,24)}.${mime==='image/png'?'png':'webp'}`;
    await env.ORIGINALS.put(key,output,{httpMetadata:{contentType:mime},customMetadata:{sha256:hash,source_sha256:line.sha256,color_method:AUTOMATIC_COLOR_VERSION}});
    // This is a machine pixel/geometry/checksum review of our own derivative,
    // not a human visual review or a bypass for unverified external uploads.
    await env.CATALOG_DB.prepare('INSERT INTO asset_review(sha256,role,mime,bytes,width,height,page_count,bw,review_version,reviewed_at) VALUES(?,?,?,?,?,?,NULL,0,?,?) ON CONFLICT(sha256,role) DO UPDATE SET review_version=excluded.review_version,reviewed_at=excluded.reviewed_at').bind(hash,role,mime,output.length,targetWidth,targetHeight,BRAND_REVIEW_VERSION,new Date().toISOString()).run();
    generated.push({asset_id:`ac-${identity.slice(0,16)}-${hash.slice(0,16)}-${role}`,role,storage_zone:'private_incoming',object_key:key,mime,bytes:output.length,sha256:hash,width:targetWidth,height:targetHeight,page_count:null,asset_version:line.asset_version,black_and_white_verified:false,source_asset_id:line.asset_id,source_sha256:line.sha256});completed=true;break;
   }finally{image?.free();scaled.free();}
   }
   if(!completed)throw new AppError('COLOR_PREVIEW_SIZE','The color preview cannot meet its size and clarity limits. Prepare this image locally before publication.',422);
  }
  return{...manifest,assets:[...manifest.assets,...generated]};
 }finally{master?.free();decoded.free();}
}
