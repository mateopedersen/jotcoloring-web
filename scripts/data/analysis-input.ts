import sharp from 'sharp';
export const ANALYSIS_INPUT_VERSION='native-line-art-trim-v2';
/** Decode orientation first, then remove only the documented brand footer and
 * blank paper margins. Square letterboxing keeps every edge in CLIP's view. */
export async function prepareAnalysisImage(bytes:Uint8Array,brandFooter=false){
 const decoded=await sharp(bytes,{limitInputPixels:25_000_000}).rotate().flatten({background:'#fff'}).toColourspace('srgb').removeAlpha().raw().toBuffer({resolveWithObject:true});
 const {width,height}=decoded.info;if(width<64||height<64)throw new Error('The image is too small for visual analysis.');
 const contentHeight=brandFooter?Math.floor(height*.935):height;
 const cropped=await sharp(decoded.data,{raw:{width,height,channels:3}}).extract({left:0,top:0,width,height:contentHeight}).raw().toBuffer();
 const content=sharp(cropped,{raw:{width,height:contentHeight,channels:3}});
 // Normalize actual drawing size so extra white paper does not change its age.
 const trimmed=await content.trim({background:'#ffffff',threshold:12,lineArt:true}).png().toBuffer();
 const normalized=await sharp(trimmed).extend({top:8,bottom:8,left:8,right:8,background:'#fff'}).resize({width:768,height:768,fit:'inside',withoutEnlargement:false}).raw().toBuffer({resolveWithObject:true});
 if(normalized.info.width<32||normalized.info.height<32)throw new Error('The drawing is too narrow to analyze reliably.');
 const square=await sharp(normalized.data,{raw:{width:normalized.info.width,height:normalized.info.height,channels:3}}).resize(224,224,{fit:'contain',background:'#fff'}).raw().toBuffer();
 return {rgb:new Uint8Array(normalized.data),width:normalized.info.width,height:normalized.info.height,vision:new Uint8ClampedArray(square)};
}
