import test from 'node:test';
import assert from 'node:assert/strict';
import {automaticColorPixels,automaticColorTheme} from '../src/coloring/automatic';
import {compactColorPixels} from '../src/coloring/compact';
const fixture=()=>{
 const w=160,h=180,raw=new Uint8Array(w*h*4).fill(255);
 const rect=(l:number,t:number,r:number,b:number)=>{for(let x=l;x<=r;x++){raw.set([0,0,0,255],(t*w+x)*4);raw.set([0,0,0,255],(b*w+x)*4);}for(let y=t;y<=b;y++){raw.set([0,0,0,255],(y*w+l)*4);raw.set([0,0,0,255],(y*w+r)*4);}};
 rect(20,20,70,90);rect(85,30,140,135);
 // Thin, antialiased boundary; one-pixel hole is deliberate.
 raw.set([255,255,255,255],(20*w+45)*4);raw.set([138,138,138,255],(31*w+86)*4);
 for(let y=166;y<h;y++)for(let x=10;x<80;x++)raw.set([239,110,23,255],(y*w+x)*4);
 return{raw,w,h};
};
test('automatic colors fill enclosed regions while preserving source, ink, exterior and footer byte for byte',()=>{
 const{raw,w,h}=fixture(),before=raw.slice(),result=automaticColorPixels(raw,w,h,{title:'Flower garden',artBottom:166,seed:'source-one'});
 assert.deepEqual(raw,before);assert.ok(result.coloredRegions>=2);assert.ok(result.coverage>.1);
 for(let p=0;p<w*166;p++)if(raw[p*4]===0)assert.deepEqual(result.pixels.slice(p*4,p*4+4),raw.slice(p*4,p*4+4));
 assert.deepEqual(result.pixels.slice(w*166*4),raw.slice(w*166*4));
 assert.deepEqual(result.pixels.slice(0,4),raw.slice(0,4));assert.notDeepEqual(result.pixels.slice((50*w+40)*4,(50*w+40)*4+3),[255,255,255]);
 assert.deepEqual(result.pixels,automaticColorPixels(raw,w,h,{title:'Flower garden',artBottom:166,seed:'source-one'}).pixels);
});
test('subject palettes differ without changing image geometry, alpha or original contours',()=>{
 const{raw,w,h}=fixture(),fingerprints=new Set<string>();
 for(const title of ['Ocean and coral reef','Flower garden','Rocket and planets','Fox and rabbit','Cupcake with strawberries','Snowman and gifts','Camper van','Dragon and castle','Botanical mandala']){
  const result=automaticColorPixels(raw,w,h,{title,artBottom:166});assert.equal(result.pixels.length,raw.length);fingerprints.add(Buffer.from(result.pixels).toString('base64'));
  for(let p=3;p<raw.length;p+=4)assert.equal(result.pixels[p],raw[p]);
 }assert.equal(fingerprints.size,9);assert.equal(automaticColorTheme({title:'Botanical mandala',category_ids:['flowers']}),'patterns');
});
test('blank paper and transparent areas are never fabricated into a colored drawing',()=>{
 const raw=new Uint8Array(64*64*4).fill(255);assert.equal(automaticColorPixels(raw,64,64).coloredRegions,0);assert.deepEqual(automaticColorPixels(raw,64,64).pixels,raw);
 raw.fill(0);assert.deepEqual(automaticColorPixels(raw,64,64).pixels,raw);
 assert.throws(()=>automaticColorPixels(raw,4000,4000));assert.throws(()=>automaticColorPixels(raw,64,64,{artBottom:100}));
});
test('bounded compression keeps ink, alpha and the brand band exact, with no more than eight levels of channel error',()=>{
 const{raw,w,h}=fixture(),colored=automaticColorPixels(raw,w,h,{title:'Flower garden',artBottom:166}).pixels;
 for(const step of [8,16] as const){const compact=compactColorPixels(colored,w,h,166,step);assert.deepEqual(compact.slice(w*166*4),colored.slice(w*166*4));for(let p=0;p<colored.length;p+=4){assert.equal(compact[p+3],colored[p+3]);for(let c=0;c<3;c++)assert.ok(Math.abs(compact[p+c]-colored[p+c])<=step/2);if(Math.max(colored[p],colored[p+1],colored[p+2])<43)assert.deepEqual(compact.slice(p,p+4),colored.slice(p,p+4));}}
});
