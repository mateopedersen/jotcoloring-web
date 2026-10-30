import sharp from 'sharp';
import {brandFooterLayout,verifyBrandedRaster} from '../../src/server/branding';
import {brandedRaster,brandedColorCardWebP,brandedColorWebP} from './brand-raster';

/** Compact display copies only. Print files retain their original pixels. */
export async function compactOutline(source:Uint8Array,width:number,height:number){
 const {data:original}=await sharp(source).removeAlpha().toColourspace('srgb').raw().toBuffer({resolveWithObject:true});
 verifyBrandedRaster(original,width,height,3,true);
 const pixels=Buffer.from(original),bottom=brandFooterLayout(width,height).footer.y;
 for(let i=0;i<bottom*width*3;i+=3){
  const value=original[i];let shade=Math.round(value/4)*4;shade=Math.min(255,shade);
  // Preserve the line/space boundary used by the coloring engine.
  if(value<110&&shade>=110)shade=108;if(value>=110&&shade<110)shade=112;
  pixels[i]=pixels[i+1]=pixels[i+2]=shade;
 }
 const bytes=await sharp(pixels,{raw:{width,height,channels:3}}).webp({lossless:true,effort:6}).toBuffer();
 const decoded=await sharp(bytes).removeAlpha().toColourspace('srgb').raw().toBuffer();
 let error=0;for(let i=0;i<original.length;i++)error+=Math.abs(original[i]-decoded[i]);
 if(error/original.length>1.5)throw new Error('Compact preview exceeded its pixel error limit.');
 verifyBrandedRaster(decoded,width,height,3,true);
 return bytes;
}

/** Derive from a previously verified image without shrinking its footer twice. */
export async function responsiveCopy(input:Uint8Array,targetWidth:number,gray:boolean){
 const meta=await sharp(input).metadata();if(!meta.width||!meta.height)throw new Error('Image dimensions missing.');
 const width=Math.min(meta.width,targetWidth),height=Math.round(meta.height*width/meta.width);
 const {data,info}=await sharp(input).removeAlpha().toColourspace('srgb').raw().toBuffer({resolveWithObject:true});
 verifyBrandedRaster(data,meta.width,meta.height,info.channels,gray);
 const art=brandFooterLayout(meta.width,meta.height).artwork;
 const cropped=await sharp(input).extract({left:art.x,top:art.y,width:art.width,height:art.height}).png().toBuffer();
 const source=await brandedRaster(cropped,width,height,gray);
 let bytes:Buffer;
 if(gray)bytes=await compactOutline(source,width,height);
 else{
  bytes=await sharp(source).webp({lossless:true,effort:6}).toBuffer();
  const candidates=[await brandedColorWebP(cropped,width,height)];
  try{candidates.push(await brandedColorCardWebP(cropped,width,height,250_000,4.5));}catch(error){if(!(error instanceof Error)||!/(visual error limit|exceeds.*bytes)/.test(error.message))throw error;}
  const before=await sharp(source).removeAlpha().toColourspace('srgb').raw().toBuffer();
  for(const candidate of candidates){const decoded=await sharp(candidate).removeAlpha().toColourspace('srgb').raw().toBuffer();let error=0;for(let i=0;i<before.length;i++)error+=Math.abs(before[i]-decoded[i]);if(error/before.length<=4.5&&candidate.length<bytes.length)bytes=candidate;}
 }
 const decoded=await sharp(bytes).removeAlpha().toColourspace('srgb').raw().toBuffer();
 verifyBrandedRaster(decoded,width,height,3,gray);
 return {bytes,width,height};
}
