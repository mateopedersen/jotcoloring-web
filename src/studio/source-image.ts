import {canvasBlob,loadSource,makeCanvas} from '../ui/canvas';
import {rasterHeader} from '../ui/raster-header';

// Keep the interactive buffers small on phones. The public original is untouched.
export const STUDIO_WORK_PIXELS=3_000_000;
export const STUDIO_WORK_EDGE=2048;
export const STUDIO_INPUT_PIXELS=64_000_000;
export const STUDIO_INPUT_BYTES=20_000_000;

export function studioWorkingSize(width:number,height:number){
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width*height>STUDIO_INPUT_PIXELS||Math.max(width,height)>32768)
    throw new Error('This image is too large to open safely. Choose a coloring image below 64 million pixels.');
  const scale=Math.min(1,STUDIO_WORK_EDGE/Math.max(width,height),Math.sqrt(STUDIO_WORK_PIXELS/(width*height)));
  const w=Math.max(1,Math.floor(width*scale)),h=Math.max(1,Math.floor(height*scale));
  if(Math.min(w,h)<16)throw new Error('This image is too narrow to color. Please choose a less extreme page shape.');
  return {width:w,height:h};
}

/** Normalize new catalog/job sources before any masks, paint buffers or project are made.
 * Existing saved projects retain their original coordinate system and paint history.
 */
export async function prepareStudioSource(blob:Blob,decode=loadSource){
  if(!blob.size||blob.size>STUDIO_INPUT_BYTES)throw new Error('Choose a coloring image no larger than 20 MB.');
  const header=rasterHeader(new Uint8Array(await blob.slice(0,262144).arrayBuffer()));
  const mime=blob.type.split(';')[0].trim().toLowerCase();
  if(mime&&mime!==header.mime&&!(mime==='image/jpg'&&header.mime==='image/jpeg'))throw new Error('The coloring image contents do not match its file type.');
  studioWorkingSize(header.width,header.height);
  const image=await decode(blob);
  try{
    // Browser dimensions include EXIF orientation; never squeeze a rotated source.
    const size=studioWorkingSize(image.naturalWidth,image.naturalHeight);
    if(size.width===image.naturalWidth&&size.height===image.naturalHeight)return {...size,blob};
    const canvas=makeCanvas(size.width,size.height);
    try{
      const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Your browser could not prepare this coloring page. Please try again.');
      ctx.fillStyle='#fff';ctx.fillRect(0,0,size.width,size.height);
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      ctx.drawImage(image,0,0,size.width,size.height);
      return {...size,blob:await canvasBlob(canvas,'image/png')};
    }finally{canvas.width=canvas.height=1;}
  }finally{image.removeAttribute?.('src');}
}
