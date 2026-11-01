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
 const palette=await sharp(source).png({palette:true,colours:256,dither:0,effort:10}).toBuffer();
 const bytes=await sharp(palette).webp({lossless:true,effort:6}).toBuffer();
 const {data,info}=await sharp(bytes).toColourspace('srgb').removeAlpha().raw().toBuffer({resolveWithObject:true});
 const original=await sharp(source).toColourspace('srgb').removeAlpha().raw().toBuffer();
 let absoluteError=0;for(let i=0;i<original.length;i++)absoluteError+=Math.abs(original[i]-data[i]);
 if(absoluteError/original.length>maxMeanError)throw new Error('Color card palette exceeded its visual error limit.');
 const {verifyBrandedRaster}=await import('../../src/server/branding');verifyBrandedRaster(data,width,height,info.channels,false);
 if(bytes.length>maxBytes)throw new Error(`Color derivative exceeds ${maxBytes} bytes; inspect before publication.`);
 return bytes;
}

/** Larger inspiration previews retain crisp line work with bounded palette error. */
export async function brandedColorInspirationWebP(input:Uint8Array,width:number,height:number){return brandedColorCardWebP(input,width,height,900_000,4.5);}

/** Add the protected footer around native outline pixels, without a shrink/expand cycle.
 * A lossless full-size printable is the Studio boundary source, so interpolation or
 * a lossy encode must not open formerly enclosed coloring spaces.
 */
export async function nativeOutlineWebP(input:Uint8Array){
 const clean=await sharp(input,{limitInputPixels:25_000_000}).rotate().flatten({background:'#fff'}).greyscale().toColourspace('srgb').removeAlpha().raw().toBuffer({resolveWithObject:true});
 const nw=clean.info.width,nh=clean.info.height;let frame:{width:number;height:number;layout:ReturnType<typeof brandFooterLayout>}|undefined;
 for(let height=nh+8;height<=nh+Math.ceil(nw*.12)+32&&!frame;height++){
  const center=Math.round(nw*height/nh);
  for(let width=Math.max(nw,center-2);width<=center+2;width++){
   const layout=brandFooterLayout(width,height);
   if(layout.artwork.width===nw&&layout.artwork.height===nh){frame={width,height,layout};break;}
  }
 }
 if(!frame||frame.width*frame.height>25_000_000)throw Error('Cannot preserve native outline within the protected footer bounds.');
 const footer=brandFooterRGBA(frame.width,frame.height);
 const bytes=await sharp({create:{width:frame.width,height:frame.height,channels:3,background:'#fff'}}).composite([{input:clean.data,raw:{width:nw,height:nh,channels:clean.info.channels},left:frame.layout.artwork.x,top:0},{input:Buffer.from(footer.raw),raw:{width:footer.width,height:footer.height,channels:4},left:0,top:footer.top}]).webp({lossless:true,effort:6}).toBuffer();
 const restored=await sharp(bytes).extract({left:frame.layout.artwork.x,top:0,width:nw,height:nh}).greyscale().raw().toBuffer();
 if(!restored.equals(clean.data))throw Error('Printable export changed native outline pixels.');
 return {bytes,width:frame.width,height:frame.height,nativeWidth:nw,nativeHeight:nh,artwork:frame.layout.artwork};
}
