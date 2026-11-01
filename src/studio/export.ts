import { safeFilename } from './model';
import { canvasBlob,makeCanvas } from './render';
import {STUDIO_FORMATS,isStudioFormat,type StudioFormat} from './formats';
import { buildPdf, enforcePdfLimit, MAX_PDF_BYTES, type PdfImage } from './export-core';
import {footerCanvas} from './branding';
export function grayscaleOutline(canvas:HTMLCanvasElement):PdfImage{
  const pixels=canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data,rowBytes=Math.ceil(canvas.width/2),bytes=new Uint8Array(rowBytes*canvas.height);
  // Sixteen gray levels preserve antialiased edges at full resolution without JPEG halos.
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const i=(y*canvas.width+x)*4,alpha=pixels[i+3]/255,luminance=(.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2])*alpha+255*(1-alpha);const shade=Math.max(0,Math.min(15,Math.round(luminance/17)));bytes[y*rowBytes+Math.floor(x/2)]|=shade<<(x%2?0:4);}
  return{type:'gray',width:canvas.width,height:canvas.height,bits:4,bytes};
}
export async function exportArtwork(art:HTMLCanvasElement,outline:HTMLCanvasElement,options:{format:StudioFormat;outline:boolean;paper:string;orientation:string;filename:string;scale?:number;quality?:number;rotation?:number},status:(message:string)=>void){
  if(!isStudioFormat(options.format))throw new Error('Choose a supported download format.');
  const name=safeFilename(options.filename),scale=options.scale??1,quality=options.quality??.92;
  if(!Number.isFinite(scale)||scale<=0||scale>1||!Number.isFinite(quality)||quality<.5||quality>1)throw new Error('Invalid export settings.');
  if(scale!==1){const resize=(source:HTMLCanvasElement)=>{const out=makeCanvas(Math.max(1,Math.round(source.width*scale)),Math.max(1,Math.round(source.height*scale)));out.getContext('2d')!.drawImage(source,0,0,out.width,out.height);return out;};art=resize(art);outline=resize(outline);}
  const rotation=options.rotation||0;if(![0,90,180,270].includes(rotation))throw new Error('Choose a valid download rotation.');if(rotation){const rotate=(source:HTMLCanvasElement)=>{const swap=rotation===90||rotation===270,out=makeCanvas(swap?source.height:source.width,swap?source.width:source.height),ctx=out.getContext('2d')!;ctx.translate(out.width/2,out.height/2);ctx.rotate(rotation*Math.PI/180);ctx.drawImage(source,-source.width/2,-source.height/2);return out;};art=rotate(art);outline=rotate(outline);options={...options,orientation:art.width>art.height?'landscape':'portrait'};}
  if(options.format!=='pdf'){
    const format=STUDIO_FORMATS.find(f=>f.id===options.format)!;status(`Preparing ${format.label} from your colored artwork…`);
    const encode=async(canvas:HTMLCanvasElement)=>{
      if(format.id==='svg'){const png=await canvasBlob(canvas,'image/png');const bytes=new Uint8Array(await png.arrayBuffer());let raw='';for(let i=0;i<bytes.length;i+=32768)raw+=String.fromCharCode(...bytes.subarray(i,i+32768));const {xml}=await import('../photo/files');return new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}" role="img"><title>${xml(name)}</title><desc>Colored JotColoring artwork. Self-contained lossless PNG embedded in SVG; paint is not editable vector paths.</desc><image width="${canvas.width}" height="${canvas.height}" href="data:image/png;base64,${btoa(raw)}"/></svg>`],{type:format.mime});}
      if(format.id==='docx'){const {wordPhoto}=await import('../photo/files');return new Blob([wordPhoto(new Uint8Array(await(await canvasBlob(canvas,'image/png')).arrayBuffer()),canvas.width,canvas.height,name,{description:'Colored artwork created in JotColoring Studio. Embedded full-color image.'}) as BlobPart],{type:format.mime});}
      // Safari can decode WEBP without offering a canvas WEBP encoder. Keep
      // previews lightweight, but use the existing local codec for real files.
      if(format.id==='webp'){
        try{return await canvasBlob(canvas,format.mime,quality);}
        catch{return(await import('../photo/webp')).losslessWebP(canvas);}
      }
      return canvasBlob(canvas,format.mime,quality);
    };
    const colored=await encode(art);if(colored.size>32_000_000)throw new Error('Choose a smaller output size for this download.');
    if(!options.outline)return{blob:colored,name:`${name}.${format.id}`,width:art.width,height:art.height};
    const original=await encode(outline),{zipSync}=await import('fflate');const bytes=zipSync({[`colored.${format.id}`]:new Uint8Array(await colored.arrayBuffer()),[`outline.${format.id}`]:new Uint8Array(await original.arrayBuffer())},{level:0});
    return{blob:new Blob([bytes as BlobPart],{type:'application/zip'}),name:`${name}.zip`,width:art.width,height:art.height};
  }
  // First keep all source pixels. Dense large canvases get a smaller print copy
  // only after the full-resolution quality choices exceed the owner's byte cap.
  const fullArt=art,fullOutline=outline;
  for(const factor of [1,.85,.7,.55,.4,Math.min(1,1000/Math.max(fullArt.width,fullArt.height))]){
    const reduce=(source:HTMLCanvasElement)=>{if(factor===1)return source;const out=makeCanvas(Math.max(1,Math.round(source.width*factor)),Math.max(1,Math.round(source.height*factor)));out.getContext('2d')!.drawImage(source,0,0,out.width,out.height);return out;};
    art=reduce(fullArt);outline=reduce(fullOutline);const original=options.outline?grayscaleOutline(outline):undefined;
    if(original?.type==='gray'&&!rotation)original.overlayPng=new Uint8Array(await(await canvasBlob(footerCanvas(outline.width,outline.height),'image/png')).arrayBuffer());
    // Rotated outlines retain the colored logo exactly where the rotation put it.
    const outlineImage=rotation&&options.outline?{bytes:new Uint8Array(await(await canvasBlob(outline,'image/jpeg',.86)).arrayBuffer()),type:'jpeg' as const}:original;
    for(const q of factor===1?[.94,.9,.86,.82,.78,.74]:[.86,.74]){
      status(`Preparing ${original?'two-page':'one-page'} PDF below 1 MB${factor<1?' · optimizing print size':''}…`);
      const images:PdfImage[]=[{bytes:new Uint8Array(await(await canvasBlob(art,'image/jpeg',q)).arrayBuffer()),type:'jpeg'}];if(outlineImage)images.push(outlineImage);
      const bytes=await buildPdf(images,options.paper,options.orientation);
      if(bytes.byteLength<=MAX_PDF_BYTES)return{blob:new Blob([enforcePdfLimit(bytes) as BlobPart],{type:'application/pdf'}),name:`${name}.pdf`,width:art.width,height:art.height,optimized:factor<1};
    }
  }
  throw new Error('The PDF could not be prepared below 1 MB. Choose PNG or WEBP to keep your full-resolution artwork.');
}
export {downloadBlob} from '../ui/download';

export async function exportAllArtwork(art:HTMLCanvasElement,outline:HTMLCanvasElement,filename:string,status:(s:string)=>void){
 const files:Record<string,Uint8Array>={};let total=0;for(const format of STUDIO_FORMATS){status(`Preparing ${format.label} for your download pack…`);const result=await exportArtwork(art,outline,{format:format.id,outline:false,paper:'a4',orientation:art.width>art.height?'landscape':'portrait',filename},status);const bytes=new Uint8Array(await result.blob.arrayBuffer());total+=bytes.length;if(total>64_000_000)throw new Error('This pack is too large. Download the formats individually.');files[result.name]=bytes;}const{zipSync}=await import('fflate');return{blob:new Blob([zipSync(files,{level:1}) as BlobPart],{type:'application/zip'}),name:safeFilename(filename)+'-all-formats.zip',width:art.width,height:art.height};
}
