import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as ort from 'onnxruntime-web';
import {photoExposureGain,neuralDimensions,preparePhotoTensor,normalizeEdges,thinContours,connectSupportedGaps,countColoringRegions,preserveLineDrawing,smartContours} from '../src/photo/contours';
import {DEFAULT_SETTINGS,maskRGBA} from '../src/photo/outline';
import {floodRegion} from '../src/studio/flood-fill';

function rectangle(width=128,height=96){const p=new Float32Array(width*height);for(let y=20;y<=76;y++)for(let x=25;x<=104;x++)if(x<29||x>100||y<24||y>72)p[y*width+x]=.95;return {data:p,width,height};}
test('underexposure compensation preserves coordinates and never amplifies a flat field',()=>{
 const pixels=new Uint8ClampedArray(64*64*4);for(let i=0;i<64*64;i++){const p=i*4;pixels[p]=pixels[p+1]=pixels[p+2]=10+Math.floor(i/64);pixels[p+3]=255;}
 const gain=photoExposureGain(pixels);assert.ok(gain>2&&gain<=4);const tensor=preparePhotoTensor(pixels,64,64);
 assert.ok(Math.abs(tensor.data[32*64+32]-(42*gain-104.007))<.001);
 for(let p=0;p<pixels.length;p+=4)pixels[p]=pixels[p+1]=pixels[p+2]=30;assert.equal(photoExposureGain(pixels),1);
 pixels.fill(0);assert.equal(photoExposureGain(pixels),1);
});
test('neural preparation preserves non-square coordinates, RGB order and white transparency',()=>{
 const w=99,h=65,rgba=new Uint8ClampedArray(w*h*4);for(let i=0;i<w*h;i++){rgba[i*4]=200;rgba[i*4+1]=90;rgba[i*4+2]=20;rgba[i*4+3]=255;}
 const r=preparePhotoTensor(rgba,w,h);assert.equal(r.width,w);assert.equal(r.height,h);assert.equal(r.paddedWidth,104);assert.equal(r.paddedHeight,72);const n=r.paddedWidth*r.paddedHeight;
 assert.ok(Math.abs(r.data[0]-(20-104.007))<.001);assert.ok(Math.abs(r.data[n]-(90-116.669))<.001);assert.ok(Math.abs(r.data[n*2]-(200-122.679))<.001);
 assert.equal(r.data[r.paddedWidth-1],r.data[w-1]);rgba.fill(0);const clear=preparePhotoTensor(rgba,w,h);assert.ok(Math.abs(clear.data[0]-(255-104.007))<.001);
 for(const [x,y]of[[2200,1000],[1000,2200],[1024,768],[65,99]]){const d=neuralDimensions(x,y);assert.ok(Math.abs(d.width/d.height-x/y)<.01);assert.ok(d.width*d.height<=786432);assert.equal(d.paddedWidth%8,0);assert.equal(d.paddedHeight%8,0);}
 assert.throws(()=>neuralDimensions(2000,2000));
});
test('normalization excludes padding and refuses corrupt or flat model outputs',()=>{
 const p=new Float32Array(40*40).fill(.99);for(let y=0;y<32;y++)for(let x=0;x<32;x++)p[y*40+x]=x===10?.9:.44;
 const r=normalizeEdges(p,32,32,40,40);assert.equal(r.data[10],1);assert.equal(r.data[0],0);assert.equal(normalizeEdges(new Float32Array(32*32).fill(.44),32,32,32,32).data.some(Boolean),false);
 p[1]=NaN;assert.throws(()=>normalizeEdges(p,32,32,40,40));
});
test('thinning retains closed coloring spaces and does not turn strokes into doubled contours',()=>{
 const r=rectangle(),mask=Uint8Array.from(r.data,v=>v>.5?1:0),thin=thinContours(mask,r.width,r.height);
 assert.equal(countColoringRegions(thin,r.width,r.height),1);assert.ok(thin.reduce((a,b)=>a+b,0)<mask.reduce((a,b)=>a+b,0)/2);
});
test('gap closure requires nearby original-image evidence and never bridges distant objects',()=>{
 const w=64,h=64,mask=new Uint8Array(w*h),evidence=new Float32Array(w*h);mask[20*w+20]=mask[20*w+23]=1;
 let joined=connectSupportedGaps(mask,evidence,w,h,.1);assert.equal(joined[20*w+21],0);
 evidence[20*w+21]=evidence[20*w+22]=.2;joined=connectSupportedGaps(mask,evidence,w,h,.1);assert.equal(joined[20*w+21],1);assert.equal(joined[20*w+22],1);
 mask[30*w+20]=mask[30*w+30]=1;evidence.fill(1);joined=connectSupportedGaps(mask,evidence,w,h,.1);assert.equal(joined[30*w+25],0);
});
test('scaled contours retain geometry, white spaces and a paint-bucket boundary',()=>{
 const r=rectangle(),out=smartContours(r,undefined,256,192,DEFAULT_SETTINGS);assert.equal(out.regions,1);assert.equal(out.mask[96*256+128],0);
 for(let y=0;y<192;y++)for(let x=0;x<256;x++)if(out.mask[y*256+x])assert.ok(x>=45&&x<=211&&y>=35&&y<=157);
 const mask=new Uint8ClampedArray(out.mask.length*4);for(let i=0;i<out.mask.length;i++)mask[i*4+3]=out.mask[i]?255:0;
 const spans=floodRegion(mask,256,192,128,96);assert.ok(spans.length>20);for(let i=0;i<spans.length;i+=3){assert.ok(spans[i]>40&&spans[i]<153);assert.ok(spans[i+1]>50&&spans[i+2]<208);}
});
test('existing black line drawings retain original pixels instead of being redrawn',()=>{
 const r=rectangle(),mask=Uint8Array.from(r.data,v=>v>.5?1:0),rgba=maskRGBA(mask,r.width,r.height),result=preserveLineDrawing(rgba,r.width,r.height,DEFAULT_SETTINGS);
 assert.ok(result);assert.equal(result.method,'drawing');assert.deepEqual(result.mask,mask);assert.equal(result.regions,1);
 for(let i=0;i<rgba.length;i+=4){rgba[i]=110;rgba[i+1]=85;rgba[i+2]=60;}assert.equal(preserveLineDrawing(rgba,r.width,r.height,DEFAULT_SETTINGS),null);
});
test('detail controls retain the scene; blank maps do not produce a fake coloring page',()=>{
 const r=rectangle(),fine=smartContours(r,undefined,128,96,{...DEFAULT_SETTINGS,weight:'fine'}),bold=smartContours(r,undefined,128,96,{...DEFAULT_SETTINGS,weight:'bold'});
 assert.ok(bold.inkPixels>fine.inkPixels);for(let i=0;i<fine.mask.length;i++)if(fine.mask[i])assert.equal(bold.mask[i],1);
 assert.throws(()=>smartContours({data:new Float32Array(128*96),width:128,height:96},undefined,128,96,DEFAULT_SETTINGS),/No clear contours/);
});
test('the shipped model has verified provenance and really runs in the same WASM runtime',async()=>{
 const bytes=await readFile('public/models/photo/teed-biped-7-9f7e3406.onnx');assert.equal(createHash('sha256').update(bytes).digest('hex'),'9f7e3406f561ddd5d25fea1f09c36cb4a4bf4efcbe983a3ed3548788445e8c05');
 ort.env.wasm.numThreads=1;const engine=await ort.InferenceSession.create(new Uint8Array(bytes),{executionProviders:['wasm']});
 try{const width=192,height=128,rgba=new Uint8ClampedArray(width*height*4).fill(255);for(let y=27;y<101;y++)for(let x=45;x<148;x++){const p=(y*width+x)*4;rgba[p]=190;rgba[p+1]=70;rgba[p+2]=30;}
  const p=preparePhotoTensor(rgba,width,height),output=await engine.run({photo:new ort.Tensor('float32',p.data,[1,3,p.paddedHeight,p.paddedWidth])});
  const e=normalizeEdges(output.edges.data as Float32Array,width,height,p.paddedWidth,p.paddedHeight),result=smartContours(e,undefined,width,height,DEFAULT_SETTINGS);
  assert.ok(result.inkPixels>100);assert.ok(result.regions>=1);assert.equal(result.mask[64*width+96],0);
  let near=0;for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(result.mask[y*width+x]&&(Math.min(Math.abs(x-45),Math.abs(x-147))<6||Math.min(Math.abs(y-27),Math.abs(y-100))<6))near++;
  assert.ok(near/result.inkPixels>.95,'The real model must trace the uploaded rectangle in its original position.');
 }finally{await engine.release();}
});
