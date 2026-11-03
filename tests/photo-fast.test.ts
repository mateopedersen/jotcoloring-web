import test from 'node:test';import assert from 'node:assert/strict';
import {fastPhotoDrawing} from '../src/photo/fast';import {DEFAULT_SETTINGS} from '../src/photo/outline';
function photo(w:number,h:number){const raw=new Uint8ClampedArray(w*h*4).fill(255);for(let y=Math.round(h*.2);y<h*.8;y++)for(let x=Math.round(w*.25);x<w*.75;x++){const i=(y*w+x)*4;raw[i]=24;raw[i+1]=140;raw[i+2]=210;}return raw;}
test('fast photo conversion follows source geometry and makes a colored object fillable without a model',()=>{
 const w=160,h=112,raw=photo(w,h),copy=raw.slice(),r=fastPhotoDrawing(raw,w,h,DEFAULT_SETTINGS);
 assert.deepEqual(raw,copy);assert.equal(r.width,w);assert.equal(r.height,h);assert.equal(r.method,'fast');assert.ok(r.regions>=1);assert.ok(r.inkPixels>100&&r.inkPixels<w*h*.2);
 assert.equal(r.mask[56*w+80],0);assert.equal(r.mask[5*w+5],0);assert.ok(r.mask[56*w+39]||r.mask[56*w+40]||r.mask[56*w+41]);
});
test('existing black and white outlines remain line drawings, rather than being redrawn on both sides',()=>{
 const w=128,h=128,raw=new Uint8ClampedArray(w*h*4).fill(255);for(let y=24;y<104;y++)for(let x=24;x<104;x++)if(x===24||x===103||y===24||y===103){const p=(y*w+x)*4;raw[p]=raw[p+1]=raw[p+2]=0;}
 const r=fastPhotoDrawing(raw,w,h,DEFAULT_SETTINGS);assert.equal(r.method,'drawing');assert.ok(r.regions>=1);assert.equal(r.mask[64*w+24],1);assert.equal(r.mask[64*w+64],0);
});
test('featureless images and invalid dimensions return a clear failure instead of an empty successful drawing',()=>{
 assert.throws(()=>fastPhotoDrawing(new Uint8ClampedArray(64*64*4).fill(255),64,64,DEFAULT_SETTINGS),/contour|outline/i);
 assert.throws(()=>fastPhotoDrawing(new Uint8ClampedArray(4),NaN,1,DEFAULT_SETTINGS),/dimensions/i);
});
