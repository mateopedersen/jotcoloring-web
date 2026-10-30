import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createCanvas,Path2D,ImageData,loadImage} from '@napi-rs/canvas';
import {unzipSync} from 'fflate';
import {PDFDocument} from 'pdf-lib';
import {paintOperation} from '../src/studio/paint-render';
import {symmetryPoints,harmonies,extractPalette,replacePaintColor,smoothPoint} from '../src/studio/creative';
import {createProject,drawingOf,checkpoint,undo,redo,type Stroke,type Shape} from '../src/studio/model';
import {compose,lineMask,outlineCanvas} from '../src/studio/render';
import {exportArtwork,exportAllArtwork} from '../src/studio/export';
import {STUDIO_FORMATS} from '../src/studio/formats';
import {validateImportedProject,makeBackup,readBackup} from '../src/artwork/backup';
import {libraryItems,emptyLibrary} from '../src/artwork/model';
Object.assign(globalThis,{Path2D,ImageData});
(globalThis as any).document={createElement:(tag:string)=>{assert.equal(tag,'canvas');return createCanvas(1,1);}};
const pixel=(c:any,x:number,y:number)=>[...c.getContext('2d').getImageData(x,y,1,1).data];
const signature=(c:any)=>createHash('sha256').update(c.getContext('2d').getImageData(0,0,c.width,c.height).data).digest('hex');
const stroke:Stroke={kind:'stroke',points:[{x:25,y:40},{x:85,y:65}],color:'#ee3344',size:22,opacity:1,erase:false};
function render(op:any){const c=createCanvas(128,128);paintOperation(c.getContext('2d') as any,op,128,128);return c;}
function fixture(){const source=createCanvas(128,160),ctx=source.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,128,160);ctx.strokeStyle='#000';ctx.strokeRect(10,10,108,140);const p=createProject({id:'creative-test',title:'A colorful page',revision:'1',url:'local:fixture',width:128,height:160,blob:new Blob([source.toBuffer('image/png') as BlobPart],{type:'image/png'})});return{p,mask:lineMask(source as any,128,160)};}

test('six brush finishes produce distinct real pixels; symmetry keeps every reflected mark equally strong',()=>{
 const outputs=['round','pencil','crayon','marker','watercolor','airbrush'].map(brush=>signature(render({...stroke,brush})));
 assert.equal(new Set(outputs).size,6);
 for(const brush of ['round','pencil','crayon','marker','watercolor','airbrush']){
  const c=render({...stroke,brush,points:[{x:30,y:64}],symmetry:'horizontal'});
  const left=pixel(c,30,64),right=pixel(c,98,64);if(['pencil','crayon'].includes(brush))assert.ok(left[3]>0&&right[3]>0);else assert.deepEqual(left,right,brush);
 }
});
test('pressure changes stroke width; area clipping constrains painting and erasing',()=>{
 const low=render({...stroke,points:[{x:50,y:50,pressure:.2}],pressure:true}),high=render({...stroke,points:[{x:50,y:50,pressure:1}],pressure:true});
 assert.equal(pixel(low,58,50)[3],0);assert.ok(pixel(high,58,50)[3]>250);
 const clip=Array.from({length:20},(_,i)=>[40+i,40,59]).flat();const c=render({...stroke,points:[{x:50,y:50}],size:100,clip});
 assert.equal(pixel(c,30,50)[3],0);assert.equal(pixel(c,50,50)[3],255);
 paintOperation(c.getContext('2d') as any,{...stroke,points:[{x:50,y:50}],size:4,erase:true,clip},128,128);assert.equal(pixel(c,50,50)[3],0);assert.equal(pixel(c,56,50)[3],255);
});
test('all five shape tools and five fill effects render, and patterned fill never escapes its selected area',()=>{
 const base:Shape={kind:'shape',shape:'rectangle',start:{x:20,y:20},end:{x:100,y:100},color:'#ee3344',size:5,opacity:1,filled:true};
 const images=['line','rectangle','ellipse','star','heart'].map(shape=>signature(render({...base,shape})));assert.equal(new Set(images).size,5);
 assert.equal(pixel(render(base),60,60)[3],255);assert.equal(pixel(render({...base,filled:false}),60,60)[3],0);
 const spans=Array.from({length:80},(_,i)=>[20+i,20,99]).flat();const signatures=[];
 for(const type of ['solid','linear','radial','stripes','dots','checks']){const c=render({kind:'fill',spans,color:'#ee3344',opacity:1,effect:{type,secondary:'#2288ee',angle:0,spacing:20}});assert.equal(pixel(c,10,50)[3],0);assert.equal(pixel(c,120,50)[3],0);assert.ok(pixel(c,50,50)[3]>0);signatures.push(signature(c));}
 assert.equal(new Set(signatures).size,6);assert.equal(pixel(render({kind:'fill',spans:[],color:'#ff0000',opacity:1}),0,0)[3],0);
 const gradient=render({kind:'fill',spans,color:'#ff0000',opacity:1,effect:{type:'linear',secondary:'#0000ff',angle:0,spacing:20}});assert.ok(pixel(gradient,25,60)[0]>220);assert.ok(pixel(gradient,95,60)[2]>220);
});
test('symmetry geometry, smoothing, harmony, and reference palette honor their inputs',()=>{
 for(const[mode,count]of [['none',1],['horizontal',2],['vertical',2],['both',4],['radial-4',4],['radial-8',8]]as const){const points=symmetryPoints({x:30,y:40,pressure:.7},mode,128,128);assert.equal(points.length,count);for(const p of points){assert.equal(p.pressure,.7);assert.ok(Math.abs(Math.hypot(p.x-64,p.y-64)-Math.hypot(34,24))<1e-8);}}
 assert.deepEqual(smoothPoint({x:0,y:0},{x:100,y:50},.5),{x:50,y:25});assert.ok(harmonies('#ff0000','complementary').includes('#00ffff'));
 assert.deepEqual(extractPalette(new Uint8ClampedArray([255,0,0,255,255,0,0,255,0,0,255,255,255,255,255,255,0,0,0,0])),['#ff0000','#0000ff']);
});
test('layer opacity, blend, paper, line strength and recoloring survive Undo and Redo',()=>{
 const{p,mask}=fixture();p.layers[0].operations=[{...stroke,points:[{x:50,y:60}],color:'#ff0000',size:40}];p.layers[0].opacity=.5;const faded=compose(p,mask);assert.notEqual(signature(faded),signature(compose({...p,layers:[{...p.layers[0],opacity:1}]},mask)));
 checkpoint(p);p.background='#aaccee';p.lineOpacity=.35;p.layers[0].blend='multiply';const changed=signature(compose(p,mask));assert.ok(undo(p));assert.equal(p.background,undefined);assert.ok(redo(p));assert.equal(signature(compose(p,mask)),changed);
 p.layers.push({...structuredClone(p.layers[0]),id:'locked',locked:true});assert.equal(replacePaintColor(p,'#ff0000','#0088ff','all'),1);assert.equal(p.layers[1].operations[0].color,'#ff0000');
 p.texts.push({id:'t',text:'Color',x:10,y:80,size:24,scale:1,rotation:0,align:'left',color:'#111111',visible:true,font:'serif',weight:700,italic:true,outline:true});assert.notEqual(signature(compose(p,mask)),changed);
});
test('schema-2 artwork and new checkpoints, brush settings, shapes and custom palettes round-trip safely',async()=>{
 const{p}=fixture();p.schema=2;assert.equal(validateImportedProject(structuredClone(p),p.source.blob).schema,3);p.schema=3;
 p.layers[0].operations=[{...stroke,brush:'crayon',symmetry:'both',clip:[40,10,100],pressure:true},{kind:'shape',shape:'heart',start:{x:10,y:10},end:{x:90,y:90},color:'#ee3344',size:3,opacity:1,filled:true,effect:{type:'dots',secondary:'#ffee99',angle:45,spacing:20}}];
 p.customPalette=['#112233'];p.versions=[{id:'v1',name:'First colors',createdAt:Date.now(),drawing:drawingOf(p)}];checkpoint(p);p.background='#ffeecc';
 const backup=await makeBackup(libraryItems([p],[]),emptyLibrary(),true),restored=(await readBackup(backup)).projects[0];assert.deepEqual(restored.layers,p.layers);assert.deepEqual(JSON.parse(JSON.stringify(restored.versions)),JSON.parse(JSON.stringify(p.versions)));assert.deepEqual(restored.customPalette,p.customPalette);assert.equal(restored.undo.length,1);
 const malformed=structuredClone(p);malformed.layers[0].operations[0].opacity=NaN;assert.throws(()=>validateImportedProject(malformed,p.source.blob),/Invalid paint/);
 const invalidShape=structuredClone(p);(invalidShape.layers[0].operations[1]as any).shape='unknown';assert.throws(()=>validateImportedProject(invalidShape,p.source.blob),/Invalid shape/);
});
test('all seven formats contain colored artwork, correct bytes and dimensions; SVG and Word embed the identical PNG',async()=>{
 const{p,mask}=fixture();p.layers[0].operations=[{...stroke,points:[{x:60,y:65}],color:'#ff0000',size:45}];const art=compose(p,mask),outline=outlineCanvas(p,mask),encoded=new Map<string,Uint8Array>();
 for(const format of STUDIO_FORMATS){const out=await exportArtwork(art,outline,{format:format.id,outline:false,paper:'a4',orientation:'portrait',filename:'My work'},()=>{});assert.equal(out.blob.type,format.mime);assert.ok(out.name.endsWith('.'+format.id));encoded.set(format.id,new Uint8Array(await out.blob.arrayBuffer()));}
 const png=encoded.get('png')!,svg=new TextDecoder().decode(encoded.get('svg')),embedded=Buffer.from(svg.match(/base64,([^\"]+)/)![1],'base64');assert.deepEqual(embedded,Buffer.from(png));
 const word=unzipSync(encoded.get('docx')!);const media=Object.keys(word).find(n=>n.startsWith('word/media/'))!;assert.deepEqual(word[media],png);assert.match(new TextDecoder().decode(word['word/document.xml']),/drawing/);
 for(const format of ['png','jpg','jpeg','webp']){const img=await loadImage(Buffer.from(encoded.get(format)!));assert.equal(img.width,128);assert.equal(img.height,160);const c=createCanvas(128,160);c.getContext('2d').drawImage(img,0,0);const color=pixel(c,60,60);assert.ok(color[0]>220&&color[1]<60&&color[2]<60,format);}
 assert.deepEqual(encoded.get('jpg'),encoded.get('jpeg'));const pdf=await PDFDocument.load(encoded.get('pdf')!);assert.equal(pdf.getPageCount(),1);assert.ok(encoded.get('pdf')!.length<1_000_000);
 const small=await exportArtwork(art,outline,{format:'png',outline:false,paper:'a4',orientation:'portrait',filename:'Small',scale:.5},()=>{});const smallImage=await loadImage(Buffer.from(await small.blob.arrayBuffer()));assert.equal(smallImage.width,64);assert.equal(smallImage.height,80);
 const pack=await exportAllArtwork(art,outline,'My work',()=>{}),files=unzipSync(new Uint8Array(await pack.blob.arrayBuffer()));assert.equal(Object.keys(files).length,7);for(const format of STUDIO_FORMATS)assert.ok(files['My work.'+format.id]?.length);
});

test('a dense large artwork automatically optimizes its print copy to honor the strict 1 MB PDF cap',async()=>{const art=createCanvas(1750,2000),ctx=art.getContext('2d'),data=ctx.createImageData(1750,2000);let seed=52813;for(let i=0;i<data.data.length;i+=4){for(let k=0;k<3;k++){seed=(seed*16807)%2147483647;data.data[i+k]=seed%256;}data.data[i+3]=255;}ctx.putImageData(data,0,0);const outline=createCanvas(1750,2000);outline.getContext('2d').fillStyle='#fff';outline.getContext('2d').fillRect(0,0,1750,2000);const result=await exportArtwork(art as any,outline as any,{format:'pdf',outline:true,paper:'a4',orientation:'portrait',filename:'Dense artwork'},()=>{});assert.ok(result.blob.size<=1_000_000);assert.ok('optimized'in result&&result.optimized);assert.ok(result.width<1750);assert.equal((await PDFDocument.load(await result.blob.arrayBuffer())).getPageCount(),2);});
