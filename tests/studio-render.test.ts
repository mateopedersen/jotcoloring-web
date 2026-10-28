import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas, Path2D, loadImage, ImageData} from '@napi-rs/canvas';
import {PDFDocument} from 'pdf-lib';
import {unzipSync} from 'fflate';
import {createProject,checkpoint,undo,redo,type Project} from '../src/studio/model';
import {compose,lineMask,outlineCanvas,canvasBlob} from '../src/studio/render';
import {exportArtwork} from '../src/studio/export';
import {createObject,hitObject,localObjectPoint} from '../src/studio/objects';
import {OBJECT_LIBRARY} from '../src/studio/object-library';
import {toDisplayPoint,toArtworkPoint} from '../src/studio/branding';
import {verifyBrandedRaster,brandFooterLayout} from '../src/server/branding';
import {mergeSpans} from '../src/studio/extensions';

// Skia exercises actual pixels and encoders; browser interaction remains a separate check.
Object.assign(globalThis,{Path2D,ImageData});
(globalThis as any).document={createElement:(tag:string)=>{assert.equal(tag,'canvas');return createCanvas(1,1);}};
function fixture(width=256,height=384){
  const source=createCanvas(width,height),ctx=source.getContext('2d');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.strokeStyle='#000';ctx.lineWidth=4;
  ctx.strokeRect(20,20,width-40,height-40);ctx.beginPath();ctx.moveTo(width/2,20);ctx.lineTo(width/2,height-20);ctx.stroke();
  const p=createProject({id:'fixture',title:'Coloring fixture',revision:'immutable',url:'local:fixture',width,height,blob:new Blob([source.toBuffer('image/png') as BlobPart])});
  const mask=lineMask(source as any,width,height);return{p,mask};
}
function pixel(canvas:any,x:number,y:number){const point=toDisplayPoint({x,y},canvas.width,canvas.height);return [...canvas.getContext('2d').getImageData(Math.floor(point.x),Math.floor(point.y),1,1).data];}
function bytes(canvas:any){return [...canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data];}

test('paint, erasure, outline lock, visibility and layer order change actual composite pixels',()=>{
  const {p,mask}=fixture();const original=bytes(outlineCanvas(p,mask));
  p.layers[0].operations.push({kind:'stroke',points:[{x:128,y:80},{x:128,y:200}],color:'#ff0000',size:40,opacity:1,erase:false});
  assert.deepEqual(pixel(compose(p,mask),128,100),[0,0,0,255]);
  assert.deepEqual(pixel(compose(p,mask),118,100),[255,0,0,255]);
  p.keepOutlines=false;assert.deepEqual(pixel(compose(p,mask),128,100),[255,0,0,255]);p.keepOutlines=true;
  p.layers[0].operations.push({kind:'stroke',points:[{x:118,y:100}],color:'#fff',size:12,opacity:1,erase:true});
  assert.deepEqual(pixel(compose(p,mask),118,100),[255,255,255,255]);
  p.layers.push({id:'top',name:'Top',visible:true,operations:[{kind:'stroke',points:[{x:118,y:150}],color:'#0000ff',size:15,opacity:1,erase:false}]});
  assert.deepEqual(pixel(compose(p,mask),118,150),[0,0,255,255]);p.layers.reverse();
  assert.deepEqual(pixel(compose(p,mask),118,150),[255,0,0,255]);p.layers[1].visible=false;
  assert.deepEqual(pixel(compose(p,mask),118,150),[0,0,255,255]);
  assert.deepEqual(bytes(outlineCanvas(p,mask)),original,'edits never modify the original outline');
});

test('region grouping merges overlaps without filling unrelated pixels',()=>{
  assert.deepEqual(mergeSpans([2,8,9,1,3,6,1,1,4,2,2,4,1,7,8]),[1,1,8,2,2,4,2,8,9]);
  const {p,mask}=fixture();p.layers[0].operations.push({kind:'fill',spans:mergeSpans(Array.from({length:25},(_,i)=>[60+i,60,90]).flat()),color:'#12ab34',opacity:1});
  const result=compose(p,mask);assert.deepEqual(pixel(result,75,75),[18,171,52,255]);assert.deepEqual(pixel(result,100,100),[255,255,255,255]);
});

test('object transforms, semantic colors and undo survive the same project serialization used by storage',()=>{
  const {p,mask}=fixture();const definition=OBJECT_LIBRARY.find(o=>o.baseId==='rabbit')!;const object=createObject(definition,256,384);object.scale=.7;object.rotation=32;object.x=110;object.y=170;p.objects.push(object);
  checkpoint(p);object.colors.ears='#ee3344';checkpoint(p);object.x=140;
  assert.equal(undo(p),true);assert.equal(p.objects[0].x,110);assert.equal(p.objects[0].colors.ears,'#ee3344');assert.equal(undo(p),true);assert.deepEqual(p.objects[0].colors,{});assert.equal(redo(p),true);assert.equal(redo(p),true);
  const restored=structuredClone(p) as Project;assert.deepEqual(restored.objects,p.objects);assert.deepEqual(bytes(compose(restored,mask)),bytes(compose(p,mask)));
  const ctx=createCanvas(256,384).getContext('2d'),target=p.objects[0];let hitCount=0;
  for(let y=0;y<384;y+=2)for(let x=0;x<256;x+=2){const hit=hitObject([target],{x,y},ctx as any);if(hit?.region.id==='ears'){const local=localObjectPoint(target,{x,y});assert.ok(local.x>=0&&local.x<=256&&local.y>=0&&local.y<=256);hitCount++;}}
  assert.ok(hitCount>30,'rotated semantic ear regions remain selectable');
  const other=structuredClone(target);other.id='overlapping';other.colors.ears='#1122ee';restored.objects=[target,other];
  let earPoint:{x:number;y:number}|undefined;for(let y=0;y<384&&!earPoint;y+=2)for(let x=0;x<256;x+=2)if(hitObject([target],{x,y},ctx as any)?.region.id==='ears'){earPoint={x,y};break;}
  assert.equal(hitObject(restored.objects,earPoint!,ctx as any)?.object.id,'overlapping');
  other.visible=false;assert.equal(hitObject(restored.objects,earPoint!,ctx as any)?.object.id,target.id);
  assert.deepEqual(bytes(compose(restored,mask)),bytes(compose({...restored,objects:[target]},mask)),'hidden objects are omitted from the actual export composition');
});

test('full resolution WEBP and outline ZIP contain painted pixels and immutable outline',async()=>{
  const {p,mask}=fixture(1024,1536);p.layers[0].operations.push({kind:'stroke',points:[{x:250,y:300}],color:'#ed283b',size:180,opacity:1,erase:false});
  const art=compose(p,mask),outline=outlineCanvas(p,mask),options={format:'webp' as const,outline:false,paper:'a4',orientation:'portrait',filename:'My painted page'};
  const single=await exportArtwork(art,outline,options,()=>{});assert.equal(single.name,'My painted page.webp');assert.equal(single.blob.type,'image/webp');
  const image=await loadImage(Buffer.from(await single.blob.arrayBuffer()));assert.equal(image.width,1024);assert.equal(image.height,1536);
  const decoded=createCanvas(1024,1536);decoded.getContext('2d').drawImage(image,0,0);const red=pixel(decoded,250,300);assert.ok(red[0]>220&&red[1]<60&&red[2]<80);
  const zip=await exportArtwork(art,outline,{...options,outline:true},()=>{});assert.equal(zip.name,'My painted page.zip');const files=unzipSync(new Uint8Array(await zip.blob.arrayBuffer()));assert.deepEqual(Object.keys(files).sort(),['My painted page-colored.webp','My painted page-outline.webp']);
  const lineImage=await loadImage(Buffer.from(files['My painted page-outline.webp']));decoded.getContext('2d').drawImage(lineImage,0,0);const white=pixel(decoded,250,300);assert.ok(white[0]>250&&white[1]>250&&white[2]>250);
});

test('actual 1024 × 1536 artwork exports all eight one/two-page PDF combinations under 1 MB',async()=>{
  const {p,mask}=fixture(1024,1536);for(let n=0;n<20;n++){const object=createObject(OBJECT_LIBRARY[n*23],1024,1536);object.x=120+n%4*255;object.y=120+Math.floor(n/4)*285;object.scale=.8;object.colors={body:['#ea5159','#ffcf55','#73c7a5','#9e7bd4'][n%4],ears:'#f69fbd'};p.objects.push(object);}
  p.texts.push({id:'text',text:'My colorful page',x:60,y:1450,size:48,scale:1,rotation:0,align:'left',color:'#287eae',visible:true});
  const art=compose(p,mask),outline=outlineCanvas(p,mask);for(const paper of ['a4','letter'])for(const orientation of ['portrait','landscape'])for(const includeOutline of [false,true]){
    const result=await exportArtwork(art,outline,{format:'pdf',outline:includeOutline,paper,orientation,filename:'canvas'},()=>{});assert.ok(result.blob.size<=1_000_000,`${paper} ${orientation} ${includeOutline}: ${result.blob.size}`);assert.ok(result.blob.size>20_000);assert.equal(result.width,1024);assert.equal(result.height,1536);const pdf=await PDFDocument.load(await result.blob.arrayBuffer());assert.equal(pdf.getPageCount(),includeOutline?2:1);for(const page of pdf.getPages()){assert.equal(page.getWidth()>page.getHeight(),orientation==='landscape');assert.ok(Math.abs(Math.min(page.getWidth(),page.getHeight())-(paper==='a4'?595.2756:612))<.001);}
  }
});

test('unsupported browser encoders fail explicitly rather than renaming the bytes',async()=>{
  const fallback={toBlob(callback:(blob:Blob)=>void){callback(new Blob(['PNG'],{type:'image/png'}));}} as HTMLCanvasElement;
  await assert.rejects(canvasBlob(fallback,'image/webp'),/cannot export WEBP/);
});
test('brand footer is protected from painting and coordinate transforms keep the entire drawing reachable',()=>{
  const {p,mask}=fixture(1024,1536),outline=outlineCanvas(p,mask);p.layers[0].operations.push({kind:'stroke',points:[{x:512,y:768}],color:'#ff00ff',size:4000,opacity:1,erase:false});
  const result=compose(p,mask),data=result.getContext('2d')!.getImageData(0,0,1024,1536).data;assert.doesNotThrow(()=>verifyBrandedRaster(new Uint8Array(data),1024,1536,4,false));
  const original=outline.getContext('2d')!.getImageData(0,0,1024,1536).data;assert.doesNotThrow(()=>verifyBrandedRaster(new Uint8Array(original),1024,1536,4,true));
  const footer=brandFooterLayout(1024,1536).footer;for(const point of [{x:0,y:0},{x:1023,y:1535},{x:500.5,y:600.75}]){const screen=toDisplayPoint(point,1024,1536),back=toArtworkPoint(screen,1024,1536);assert.ok(screen.y<footer.y);assert.ok(Math.abs(back.x-point.x)<1e-8);assert.ok(Math.abs(back.y-point.y)<1e-8);}
  const reopened=outlineCanvas(p,lineMask(outline,1024,1536,true));const bounds=(canvas:HTMLCanvasElement)=>{const pixels=canvas.getContext('2d')!.getImageData(0,0,1024,1536).data;let left=1024,right=0,top=1536,bottom=0;for(let y=0;y<footer.y;y++)for(let x=0;x<1024;x++){const i=(y*1024+x)*4;if(pixels[i]<60&&pixels[i+1]<60&&pixels[i+2]<60){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}return[left,right,top,bottom];};const before=bounds(outline),after=bounds(reopened);for(let i=0;i<4;i++)assert.ok(Math.abs(before[i]-after[i])<=2,'reopening an already branded page does not shrink the artwork again');
});
