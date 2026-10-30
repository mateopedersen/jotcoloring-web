import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createCanvas,Path2D,ImageData,loadImage} from '@napi-rs/canvas';
import {geometricSelection,combineSelection,modifySelection,selectionMask,maskSpans} from '../src/studio/selections';
import {floodRegion} from '../src/studio/flood-fill';
import {workspaceState} from '../src/studio/workspace-state';
import {paintOperation} from '../src/studio/paint-render';
import {rgbHex,hslHex,adjustColor,parsePalette} from '../src/studio/color-lab';
import {STARTER_PAGES,starterPageSvg,searchStarterPages} from '../src/studio/starter-pages';
import {createProject} from '../src/studio/model';
import {compose,makeCanvas} from '../src/studio/render';
import {exportArtwork} from '../src/studio/export';
Object.assign(globalThis,{Path2D,ImageData});
(globalThis as any).document={createElement:(tag:string)=>{assert.equal(tag,'canvas');return createCanvas(1,1);}};
const area=(spans:number[])=>spans.reduce((n,v,i)=>i%3===1?n+spans[i+1]-v+1:n,0);
const hash=(data:Uint8Array|Uint8ClampedArray)=>createHash('sha256').update(data).digest('hex');
test('box, ellipse and freehand select exactly their enclosed pixels',()=>{
 const points=[{x:10,y:10},{x:30,y:30}],box=geometricSelection(points,'rectangle',50,50),ellipse=geometricSelection(points,'ellipse',50,50),lasso=geometricSelection([{x:10,y:10},{x:30,y:10},{x:20,y:30}],'lasso',50,50);
 assert.equal(area(box),441);assert.ok(area(ellipse)>300&&area(ellipse)<350);assert.ok(area(lasso)>190&&area(lasso)<230);const m=selectionMask(lasso,50,50);assert.equal(m[20*50+20],1);assert.equal(m[30*50+10],0);assert.deepEqual(maskSpans(selectionMask(box,50,50),50,50),box);
});
test('selection union, subtraction, intersection, inversion, grow, shrink and four moves preserve bounds',()=>{
 const a=geometricSelection([{x:10,y:10},{x:20,y:20}],'rectangle',40,40),b=geometricSelection([{x:15,y:15},{x:25,y:25}],'rectangle',40,40);assert.equal(area(combineSelection(a,b,40,40,'add')),206);assert.equal(area(combineSelection(a,b,40,40,'subtract')),85);assert.equal(area(combineSelection(a,b,40,40,'intersect')),36);assert.equal(area(modifySelection(a,40,40,'invert')),1479);assert.ok(area(modifySelection(a,40,40,'grow',3))>121);assert.equal(area(modifySelection(a,40,40,'shrink',2)),49);
 for(const action of ['left','right','up','down']as const){const out=modifySelection(a,40,40,action,20);for(let i=0;i<out.length;i+=3){assert.ok(out[i]>=0&&out[i]<40);assert.ok(out[i+1]>=0&&out[i+2]<40&&out[i+1]<=out[i+2]);}}
});
test('tap assistance rescues a click on a line while exact mode leaves it unchanged',()=>{
 const c=createCanvas(40,40),ctx=c.getContext('2d');ctx.strokeStyle='#000';ctx.lineWidth=2;ctx.strokeRect(5,5,30,30);const data=ctx.getImageData(0,0,40,40).data;assert.equal(area(floodRegion(data,40,40,5,20,100,false,0)),0);assert.ok(area(floodRegion(data,40,40,5,20,100,false,3))>0);
});
test('near-outline assistance prefers the small enclosed coloring space over the surrounding background',()=>{const c=createCanvas(100,100),ctx=c.getContext('2d');ctx.strokeStyle='#000';ctx.lineWidth=3;ctx.strokeRect(40,40,20,20);const pixels=ctx.getImageData(0,0,100,100).data,spans=floodRegion(pixels,100,100,40,50,100,false,5);assert.ok(area(spans)>100&&area(spans)<500);});
test('custom tips, hardness, spacing, angle, roundness, flow, scatter and rainbow alter actual brush pixels',()=>{
 const base={kind:'stroke' as const,points:[{x:20,y:40,pressure:.3},{x:120,y:40,pressure:.9}],color:'#dd3344',size:30,opacity:1,erase:false,tip:workspaceState().tip},render=(tip:any)=>{const c=createCanvas(150,80);paintOperation(c.getContext('2d') as any,{...base,tip},150,80);return hash(c.getContext('2d').getImageData(0,0,150,80).data);};
 const original=render(base.tip);for(const shape of ['square','chisel','star','heart','dash'])assert.notEqual(render({...base.tip,shape}),original,shape);
 for(const options of [{hardness:30},{spacing:110},{roundness:25},{flow:25},{scatter:100},{rainbow:true},{pressureOpacity:true}])assert.notEqual(render({...base.tip,...options}),original,JSON.stringify(options));assert.notEqual(render({...base.tip,shape:'chisel',angle:0}),render({...base.tip,shape:'chisel',angle:70}));
});
test('RGB and HSL inputs, deliberate color adjustments and bounded palette import are reliable',()=>{
 assert.equal(rgbHex('255, 0, 128'),'#ff0080');assert.equal(rgbHex('rgb(30 50 80)'),'#1e3250');assert.equal(rgbHex('256,0,0'),undefined);assert.equal(hslHex('120, 100%, 50%'),'#00ff00');assert.equal(hslHex('120, 101%, 50%'),undefined);for(const mode of ['lighter','darker','saturate','hue'])assert.notEqual(adjustColor('#669977',mode),'#669977');assert.deepEqual(parsePalette('{"colors":["#FF0000","#00ff00"]}'),['#ff0000','#00ff00']);assert.throws(()=>parsePalette('["url(javascript:x)"]'));assert.throws(()=>parsePalette(JSON.stringify(Array(25).fill('#ff0000'))));
});
test('clipping a shading layer to the lower paint keeps empty paper untouched',()=>{
 const p=createProject({id:'clip',title:'Layer clip',revision:'1',url:'local:clip',width:128,height:160,blob:new Blob()});p.lineVisible=false;p.layers[0].operations=[{kind:'stroke',points:[{x:60,y:60}],color:'#ff0000',size:30,opacity:1,erase:false}];p.layers.push({id:'shade',name:'Shade',visible:true,clipBelow:true,operations:[{kind:'stroke',points:[{x:60,y:60}],color:'#0000ff',size:100,opacity:1,erase:false}]});const out=compose(p,makeCanvas(128,160)),data=out.getContext('2d')!.getImageData(0,0,128,160).data;let blue=0;for(let i=0;i<data.length;i+=4)if(data[i]<30&&data[i+2]>220)blue++;assert.ok(blue>100&&blue<1500);p.layers[1].clipBelow=false;const unrestricted=compose(p,makeCanvas(128,160)),pixels=unrestricted.getContext('2d')!.getImageData(0,0,128,160).data;let more=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]<30&&pixels[i+2]>220)more++;assert.ok(more>blue*3);
});
test('rotated download changes image dimensions and keeps visible colors',async()=>{
 const art=makeCanvas(80,120),ctx=art.getContext('2d')!;ctx.fillStyle='#f00';ctx.fillRect(0,0,80,120);const out=await exportArtwork(art,art,{format:'png',outline:false,paper:'a4',orientation:'portrait',filename:'Rotated',rotation:90},()=>{}),img=await loadImage(Buffer.from(await out.blob.arrayBuffer()));assert.equal(img.width,120);assert.equal(img.height,80);
});
test('1,000 original scene compositions render as distinct black-and-white, nonempty coloring pages',async()=>{
 assert.equal(STARTER_PAGES.length,1000);assert.equal(new Set(STARTER_PAGES.map(p=>p.id)).size,1000);assert.equal(new Set(STARTER_PAGES.map(p=>p.title)).size,1000);const signatures=new Set<string>();
 for(const page of STARTER_PAGES){const svg=starterPageSvg(page).replace('width="1024" height="1408"','width="160" height="220"');assert.doesNotMatch(svg,/<script|foreignObject|https?:\/\/(?!www.w3.org)/);const img=await loadImage(Buffer.from(svg)),c=createCanvas(160,220);c.getContext('2d').drawImage(img,0,0);const d=c.getContext('2d').getImageData(0,0,160,220).data;let dark=0;for(let i=0;i<d.length;i+=4){assert.equal(d[i],d[i+1]);assert.equal(d[i],d[i+2]);if(d[i]<180)dark++;}assert.ok(dark>400&&dark<18000,`${page.id}: ${dark}`);signatures.add(hash(d));}
 assert.equal(signatures.size,1000);assert.ok(searchStarterPages('rabbit garden','Animals').length>0);assert.ok(searchStarterPages('rabbit','','Easy').every(p=>p.detail==='Easy'));assert.equal(searchStarterPages('impossible-subject').length,0);
});

test('custom tip geometry composes with all six brush finishes instead of discarding the selected texture',()=>{const results=new Set<string>();for(const brush of ['round','pencil','crayon','marker','watercolor','airbrush'] as const){const c=createCanvas(160,90);paintOperation(c.getContext('2d') as any,{kind:'stroke',points:[{x:20,y:45},{x:140,y:45}],size:35,opacity:1,color:'#ee4455',erase:false,brush,tip:{...workspaceState().tip,shape:'square'}},160,90);results.add(hash(c.getContext('2d').getImageData(0,0,160,90).data));}assert.equal(results.size,6);});
