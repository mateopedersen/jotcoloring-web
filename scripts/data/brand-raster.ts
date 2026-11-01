import sharp from 'sharp';
import {brandFooterLayout,brandFooterRGBA} from '../../src/server/branding';
/** Preserves declared dimensions and fits the complete artwork above its footer. */
export async function brandedRaster(input:Uint8Array,width:number,height:number,gray=false){const layout=brandFooterLayout(width,height),footer=brandFooterRGBA(width,height);let pipeline=sharp(input,{limitInputPixels:25_000_000}).rotate().flatten({background:'#ffffff'});if(gray)pipeline=pipeline.greyscale();const art=await pipeline.resize(layout.artwork.width,layout.artwork.height,{fit:'fill'}).png().toBuffer();return sharp({create:{width,height,channels:3,background:'#ffffff'}}).composite([{input:art,left:layout.artwork.x,top:0},{input:Buffer.from(footer.raw),raw:{width:footer.width,height:footer.height,channels:4},left:0,top:footer.top}]).png().toBuffer();}
/** Lossy encodes may bleed colored artwork into the white band; reject those encodes. */
export async function brandedColorWebP(input:Uint8Array,width:number,height:number){const source=await brandedRaster(input,width,height,false);let best=await sharp(source).webp({lossless:true,effort:6}).toBuffer();const {verifyBrandedRaster}=await import('../../src/server/branding');for(const quality of [88,92,96]){const candidate=await sharp(source).webp({quality,effort:6}).toBuffer();if(candidate.length>=best.length)continue;const {data,info}=await sharp(candidate).toColourspace('srgb').removeAlpha().raw().toBuffer({resolveWithObject:true});try{verifyBrandedRaster(data,width,height,info.channels,false);best=candidate}catch{/* Keep the smaller verified encoding, including lossless when needed. */}}return best;}
/** Responsive color cards share the blank thumbnail's full composition and footer.
 * A 256-color palette reduces transfer size. The complete result is then encoded
 * losslessly, with no chroma subsampling that could bleed artwork into the footer.
 * Decoder QA verifies the footer geometry, clean white band and orange wordmark.
 */
export async function brandedColorCardWebP(input:Uint8Array,width:number,height:number,maxBytes=250_000,maxMeanError=12){
 const source=await brandedRaster(input,width,height,false);
 const original=await sharp(source).toColourspace('srgb').removeAlpha().raw().toBuffer();
 const {verifyBrandedRaster}=await import('../../src/server/branding');
 let best:Buffer|undefined;
 const accept=async(bytes:Buffer)=>{if(bytes.length>maxBytes||(best&&bytes.length>=best.length))return;
  const {data,info}=await sharp(bytes).toColourspace('srgb').removeAlpha().raw().toBuffer({resolveWithObject:true});
  let absoluteError=0;for(let i=0;i<original.length;i++)absoluteError+=Math.abs(original[i]-data[i]);
  if(absoluteError/original.length>maxMeanError)return;
  try{verifyBrandedRaster(data,width,height,info.channels,false);best=bytes}catch{/* Reject footer bleed and retain a verified encode. */}
 };
 // Detailed pencil references may exceed the palette error bound. Preserve
 // that bound and try a true-color encoding instead of rejecting good art.
 await accept(await sharp(source).webp({lossless:true,effort:6}).toBuffer());
 const palette=await sharp(source).png({palette:true,colours:256,dither:0,effort:10}).toBuffer();
 await accept(await sharp(palette).webp({lossless:true,effort:6}).toBuffer());
 // Retain thousands of colors and the exact footer. Every candidate must
 // meet the unchanged mean-error limit, including textured pencil references.
 for(const step of [8,12,16]){if(best)break;const bounded=Buffer.from(original),end=brandFooterLayout(width,height).footer.y*width*3;
  for(let i=0;i<end;i++)bounded[i]=Math.min(255,Math.round(bounded[i]/step)*step);
  await accept(await sharp(bounded,{raw:{width,height,channels:3}}).webp({lossless:true,effort:6}).toBuffer());
 }
 for(const quality of [94,97])await accept(await sharp(source).webp({quality,effort:6}).toBuffer());
 if(!best)throw new Error(`No color encoding satisfies the ${maxBytes}-byte or visual error limit with the required footer; inspect before publication.`);
 return Buffer.from(best);
}

/** Larger inspiration previews retain crisp line work with bounded palette error. */
export async function brandedColorInspirationWebP(input:Uint8Array,width:number,height:number){return brandedColorCardWebP(input,width,height,900_000,4.5);}
