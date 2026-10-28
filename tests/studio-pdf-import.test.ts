import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas,DOMMatrix,ImageData,Path2D,loadImage} from '@napi-rs/canvas';
import {PDFDocument,rgb} from 'pdf-lib';
import {openColoringPdf,MAX_PDF_INPUT_BYTES} from '../src/studio/pdf-import';
import {grayscaleOutline,exportArtwork} from '../src/studio/export';
import {buildPdf} from '../src/studio/export-core';
import {createProject} from '../src/studio/model';
import {compose,lineMask,outlineCanvas} from '../src/studio/render';
Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});
(globalThis as any).document={createElement:(tag:string)=>{assert.equal(tag,'canvas');return createCanvas(1,1);}};
const renderer=await import('pdfjs-dist/legacy/build/pdf.mjs');
async function pdfFile(kind:'outline'|'color'|'blank'|'script',pages=2){
  const pdf=await PDFDocument.create();for(let i=0;i<pages;i++){const page=pdf.addPage([300,400]);if(kind!=='blank')page.drawRectangle({x:30+i*10,y:40,width:200,height:280,borderWidth:3,borderColor:rgb(0,0,0),color:kind==='color'?rgb(1,0,0):rgb(1,1,1)});}
  if(kind==='script')pdf.addJavaScript('untrusted','globalThis.shouldNeverExecute=true;');
  return new File([await pdf.save() as BlobPart],'test-coloring.pdf',{type:'application/pdf'});
}
test('PDF import renders the selected real page locally at bounded resolution',async()=>{
  const session=await openColoringPdf(await pdfFile('outline'),renderer);try{assert.equal(session.pages,2);const page=await session.render(2);assert.equal(page.page,2);assert.match(page.title,/page 2/);assert.equal(page.width,1536);assert.equal(page.height,2048);assert.ok(page.width*page.height<=4_000_000);assert.equal(page.blob.type,'image/png');const image=await loadImage(Buffer.from(await page.blob.arrayBuffer()));assert.equal(image.width,page.width);assert.equal(image.height,page.height);await assert.rejects(session.render(0),/valid page/);await assert.rejects(session.render(3),/valid page/);}finally{await session.close();}await assert.rejects(session.render(1),/closed/);
});
test('PDF importer rejects active content, colored artwork, blank pages and too many pages',async()=>{
  await assert.rejects(openColoringPdf(await pdfFile('script'),renderer),/scripts/);assert.equal((globalThis as any).shouldNeverExecute,undefined);
  for(const [kind,message] of [['color',/black-and-white/],['blank',/usable/]] as const){const session=await openColoringPdf(await pdfFile(kind),renderer);try{await assert.rejects(session.render(1),message);}finally{await session.close();}}
  await assert.rejects(openColoringPdf(await pdfFile('outline',101),renderer),/100 pages/);
});
test('PDF importer refuses oversized, invalid or damaged files before opening a canvas',async()=>{
  await assert.rejects(openColoringPdf(new File([new Uint8Array(MAX_PDF_INPUT_BYTES+1)],'too-large.pdf'),renderer),/20 MB/);
  await assert.rejects(openColoringPdf(new File(['a random text string'],'fake.pdf'),renderer),/not a valid PDF/);
  await assert.rejects(openColoringPdf(new File(['%PDF-1.7 broken'],'broken.pdf'),renderer),/could not be read safely/);
});
test('compact grayscale outline PDF keeps full resolution, orientation and antialiased gray levels',async()=>{
  const source=createCanvas(65,96),ctx=source.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,65,96);ctx.fillStyle='#000';ctx.fillRect(0,0,32,48);ctx.fillStyle='#888';ctx.fillRect(0,48,65,48);
  const encoded=grayscaleOutline(source as any);assert.equal(encoded.type,'gray');if(encoded.type!=='gray')return;assert.equal(encoded.width,65);assert.equal(encoded.height,96);assert.equal(encoded.bits,4);assert.equal(encoded.bytes.length,33*96);
  const bytes=await buildPdf([encoded],'a4','portrait');const session=await openColoringPdf(new File([bytes as BlobPart],'outline.pdf'),renderer);
  try{const result=await session.render(1),image=await loadImage(Buffer.from(await result.blob.arrayBuffer())),canvas=createCanvas(result.width,result.height),c=canvas.getContext('2d');c.drawImage(image,0,0);const at=(x:number,y:number)=>c.getImageData(Math.floor(x*canvas.width),Math.floor(y*canvas.height),1,1).data[0];assert.ok(at(.25,.25)<5);assert.ok(at(.75,.25)>250);assert.ok(Math.abs(at(.5,.75)-136)<3);}finally{await session.close();}
});
test('orange footer survives both PDF pages and own branded outline imports while colored painting is rejected',async()=>{
  const source=createCanvas(512,768),ctx=source.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,512,768);ctx.strokeStyle='#000';ctx.lineWidth=4;ctx.strokeRect(30,40,450,680);
  const p=createProject({id:'brand-test',title:'Test',revision:'1',url:'local',width:512,height:768,blob:new Blob()}),mask=lineMask(source as any,512,768);p.layers[0].operations.push({kind:'stroke',points:[{x:256,y:384}],color:'#ee3333',size:140,opacity:1,erase:false});
  const output=await exportArtwork(compose(p,mask),outlineCanvas(p,mask),{format:'pdf',outline:true,paper:'a4',orientation:'portrait',filename:'brand'},()=>{}),raw=new Uint8Array(await output.blob.arrayBuffer()),task=renderer.getDocument({data:raw.slice(),useSystemFonts:false});
  try{const doc=await task.promise;for(const pageNumber of [1,2]){const page=await doc.getPage(pageNumber),viewport=page.getViewport({scale:1}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height)),c=canvas.getContext('2d');await page.render({canvas:canvas as any,canvasContext:c as any,viewport}).promise;const pixels=c.getImageData(0,0,canvas.width,canvas.height).data;let orange=0;for(let y=Math.floor(canvas.height*.9);y<canvas.height;y++)for(let x=Math.floor(canvas.width*.5);x<canvas.width;x++){const i=(y*canvas.width+x)*4;if(pixels[i]>190&&pixels[i]-pixels[i+1]>45&&pixels[i+1]-pixels[i+2]>15)orange++;}assert.ok(orange>20,`page ${pageNumber} has orange wordmark pixels`);}}finally{await task.destroy();}
  const session=await openColoringPdf(new File([raw],'branded.pdf'),renderer);try{await assert.rejects(session.render(1),/black-and-white/);const outline=await session.render(2);assert.ok(outline.blob.size>1000);}finally{await session.close();}
});
