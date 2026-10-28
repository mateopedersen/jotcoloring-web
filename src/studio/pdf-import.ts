import {MAX_PIXELS} from './model';
import {canvasBlob,makeCanvas} from './render';
export const MAX_PDF_INPUT_BYTES=20_000_000;
export async function openColoringPdf(file:File,renderer?:typeof import('pdfjs-dist')){
  if(file.size<8||file.size>MAX_PDF_INPUT_BYTES)throw new Error('Choose a PDF up to 20 MB.');
  const data=new Uint8Array(await file.arrayBuffer());if(!new TextDecoder().decode(data.subarray(0,1024)).includes('%PDF-'))throw new Error('This file is not a valid PDF.');
  const pdfjs=renderer||await import('pdfjs-dist');if(!renderer){const worker=await import('pdfjs-dist/build/pdf.worker.min.mjs?url');pdfjs.GlobalWorkerOptions.workerSrc=worker.default;}
  const task=pdfjs.getDocument({data,enableXfa:false,useWorkerFetch:false,useWasm:false,disableFontFace:true,maxImageSize:MAX_PIXELS,canvasMaxAreaInBytes:32_000_000,stopAtErrors:true,verbosity:0});let encrypted=false;task.onPassword=()=>{encrypted=true;void task.destroy();};
  const timer=setTimeout(()=>void task.destroy(),20_000);
  let document;
  try{document=await task.promise;}catch{clearTimeout(timer);throw new Error(encrypted?'Password-protected PDFs cannot be imported. Export an unlocked coloring page first.':'This PDF could not be read safely. It may be damaged or too complex.');}
  clearTimeout(timer);
  try{if(document.numPages>100)throw new Error('Choose a PDF with 100 pages or fewer.');if(await document.getPermissions()!==null)throw new Error('Encrypted or restricted PDFs cannot be imported. Export an unlocked coloring page first.');if(document.isPureXfa||await document.hasJSActions()||Object.keys(await document.getAttachments()||{}).length)throw new Error('PDFs with scripts, active forms, or attachments cannot be imported. Export a plain coloring page first.');}catch(error){await task.destroy();throw error;}
  let renderTask:ReturnType<Awaited<ReturnType<typeof document.getPage>>['render']>|undefined,sequence=0,closed=false;
  return {
    pages:document.numPages,
    async render(pageNumber:number){
      if(closed)throw new Error('This PDF was closed. Choose the file again.');if(!Number.isInteger(pageNumber)||pageNumber<1||pageNumber>document.numPages)throw new Error('Choose a valid page number.');const request=++sequence;renderTask?.cancel();const page=await document.getPage(pageNumber);if(await page.getJSActions())throw new Error('This PDF page includes active actions and cannot be imported.');
      const annotations=await page.getAnnotations();if(annotations.some((a:Record<string,unknown>)=>a.actions||a.file||a.subtype==='RichMedia'||a.subtype==='Screen'))throw new Error('This PDF page includes active content and cannot be imported.');
      const natural=page.getViewport({scale:1});if(!Number.isFinite(natural.width)||!Number.isFinite(natural.height)||natural.width<=0||natural.height<=0)throw new Error('This PDF page has invalid dimensions.');const scale=Math.min(2048/Math.max(natural.width,natural.height),Math.sqrt(4_000_000/(natural.width*natural.height)));const viewport=page.getViewport({scale});const canvas=makeCanvas(Math.floor(viewport.width),Math.floor(viewport.height));const ctx=canvas.getContext('2d',{willReadFrequently:true})!;
      if(closed||request!==sequence)throw new Error('Page selection changed.');const rendering=page.render({canvas:canvas as HTMLCanvasElement,canvasContext:ctx,viewport,annotationMode:pdfjs.AnnotationMode.DISABLE,background:'rgb(255,255,255)',intent:'print'});renderTask=rendering;const timeout=setTimeout(()=>rendering.cancel(),20_000);try{await rendering.promise;}finally{clearTimeout(timeout);}
      const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);let chromatic=0,ink=0,count=0;const brandBounds={x:canvas.width,y:canvas.height,right:0,bottom:0};for(let i=0;i<pixels.data.length;i+=16){const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2],x=(i/4)%canvas.width,y=Math.floor(i/4/canvas.width),colored=Math.max(r,g,b)-Math.min(r,g,b)>16;const footerMark=colored&&x>=canvas.width*.5&&y>=canvas.height*.9&&r>170&&r>g&&g>b;if(footerMark){brandBounds.x=Math.min(brandBounds.x,x);brandBounds.y=Math.min(brandBounds.y,y);brandBounds.right=Math.max(brandBounds.right,x);brandBounds.bottom=Math.max(brandBounds.bottom,y);}else{if(colored)chromatic++;if((r+g+b)/3<220)ink++;}count++;}if(chromatic/count>.005)throw new Error('Choose a black-and-white coloring PDF. A small orange brand footer is allowed; color in the drawing is not converted to outlines.');if(ink/count<.0001||ink/count>.98)throw new Error('This page does not contain a usable black-and-white outline.');if(brandBounds.right>0){ctx.fillStyle='#fff';ctx.fillRect(brandBounds.x-5,brandBounds.y-3,brandBounds.right-brandBounds.x+10,brandBounds.bottom-brandBounds.y+6);}
      return {blob:await canvasBlob(canvas,'image/png'),width:canvas.width,height:canvas.height,page:pageNumber,title:`${file.name.replace(/\.pdf$/i,'')} — page ${pageNumber}`,hasBrandFooter:false};
    },
    async close(){closed=true;sequence++;renderTask?.cancel();await task.destroy();}
  };
}
