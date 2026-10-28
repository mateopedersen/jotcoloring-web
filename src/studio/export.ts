import { safeFilename } from './model';
import { canvasBlob } from './render';
import { buildPdf, enforcePdfLimit, MAX_PDF_BYTES, type PdfImage } from './export-core';
import {footerCanvas} from './branding';
export function grayscaleOutline(canvas:HTMLCanvasElement):PdfImage{
  const pixels=canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data,rowBytes=Math.ceil(canvas.width/2),bytes=new Uint8Array(rowBytes*canvas.height);
  // Sixteen gray levels preserve antialiased edges at full resolution without JPEG halos.
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const i=(y*canvas.width+x)*4,alpha=pixels[i+3]/255,luminance=(.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2])*alpha+255*(1-alpha);const shade=Math.max(0,Math.min(15,Math.round(luminance/17)));bytes[y*rowBytes+Math.floor(x/2)]|=shade<<(x%2?0:4);}
  return{type:'gray',width:canvas.width,height:canvas.height,bits:4,bytes};
}
export async function exportArtwork(art:HTMLCanvasElement,outline:HTMLCanvasElement,options:{format:'pdf'|'webp';outline:boolean;paper:string;orientation:string;filename:string},status:(message:string)=>void){
  const name=safeFilename(options.filename);
  if(options.format==='webp'){
    status('Encoding WEBP at the original canvas resolution…');const colored=await canvasBlob(art,'image/webp',.9);
    if(!options.outline)return {blob:colored,name:`${name}.webp`,width:art.width,height:art.height};
    const original=await canvasBlob(outline,'image/webp',.94);const {zipSync}=await import('fflate');const bytes=zipSync({'colored.webp':new Uint8Array(await colored.arrayBuffer()),'outline.webp':new Uint8Array(await original.arrayBuffer())},{level:0});
    return {blob:new Blob([bytes as BlobPart],{type:'application/zip'}),name:`${name}.zip`,width:art.width,height:art.height};
  }
  const original=options.outline?grayscaleOutline(outline):undefined;
  if(original?.type==='gray')original.overlayPng=new Uint8Array(await(await canvasBlob(footerCanvas(outline.width,outline.height),'image/png')).arrayBuffer());
  // Preserve all source pixels. Choose the highest tested JPEG quality that meets the strict cap.
  for(const quality of [.94,.9,.86,.82,.78,.74]){
    status(`Preparing ${original?'two-page':'one-page'} PDF below 1 MB…`);
    const images:PdfImage[]=[{bytes:new Uint8Array(await (await canvasBlob(art,'image/jpeg',quality)).arrayBuffer()),type:'jpeg'}];if(original)images.push(original);
    const bytes=await buildPdf(images,options.paper,options.orientation);
    if(bytes.byteLength<=MAX_PDF_BYTES)return {blob:new Blob([enforcePdfLimit(bytes) as BlobPart],{type:'application/pdf'}),name:`${name}.pdf`,width:art.width,height:art.height};
  }
  throw new Error('This artwork cannot fit in a clear PDF under 1 MB at its current resolution. Download WEBP or simplify the artwork. No oversized PDF was created.');
}
export function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60_000);}
