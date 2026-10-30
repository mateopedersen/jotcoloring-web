import test from 'node:test';import assert from 'node:assert/strict';
import {refineDrawingMap} from '../src/photo/refine';
import {createRetouchSession} from '../src/photo/retouch';
import {DEFAULT_SETTINGS,validateSettings} from '../src/photo/outline';
test('source-supported cleanup keeps a closed contour and removes isolated weak noise without changing the grid',()=>{
 const w=96,h=96,n=w*h,gray=new Float32Array(n).fill(1),raw=new Uint8ClampedArray(n*4).fill(255);
 for(let y=20;y<=75;y++)for(let x=20;x<=75;x++){const i=y*w+x;raw[i*4]=50;raw[i*4+1]=120;raw[i*4+2]=80;if(x<22||x>73||y<22||y>73)gray[i]=.5;}
 gray[7*w+7]=.95;const before=gray.slice(),r=refineDrawingMap({gray,width:w,height:h},raw,w,h,DEFAULT_SETTINGS);assert.deepEqual(gray,before);assert.equal(r.width,w);assert.equal(r.height,h);assert.equal(r.gray[7*w+7],1);assert.ok(r.gray[20*w+40]<.8);assert.equal(r.gray[48*w+48],1);
});
test('blank images stay blank and invalid refinement settings cannot pass validation',()=>{const w=64,gray=new Float32Array(w*w).fill(1),r=refineDrawingMap({gray,width:w,height:w},new Uint8ClampedArray(w*w*4).fill(255),w,w,DEFAULT_SETTINGS);assert.ok(r.gray.every(v=>v===1));assert.throws(()=>validateSettings({...DEFAULT_SETTINGS,cleanup:Infinity}));assert.throws(()=>refineDrawingMap({gray,width:w,height:w},new Uint8ClampedArray(4),w,w,DEFAULT_SETTINGS));});
test('retouch erases, restores and closes lines with bounded undo while preserving untouched pixels',()=>{
 const w=80,h=80,gray=new Uint8Array(w*h).fill(255);for(let y=20;y<60;y++)gray[y*w+40]=0;const mask=Uint8Array.from(gray,v=>v<155?1:0),source={gray,mask,width:w,height:h,inkPixels:40,threshold:155,method:'faithful' as const,regions:0},s=createRetouchSession(source);s.begin();s.paint({x:40,y:32},{x:40,y:40},4,'erase');let r=s.finish();assert.equal(r.gray![35*w+40],255);assert.equal(gray[35*w+40],0);assert.equal(r.gray![22*w+40],0);r=s.undo();assert.equal(r.gray![35*w+40],0);
 s.begin();s.paint({x:20,y:10},{x:50,y:10},2,'ink');r=s.finish();assert.equal(r.gray![10*w+30],0);s.begin();s.paint({x:20,y:10},{x:50,y:10},2,'restore');r=s.finish();assert.equal(r.gray![10*w+30],255);assert.throws(()=>s.paint({x:NaN,y:0},{x:0,y:0},2,'ink'));assert.throws(()=>s.paint({x:1,y:0},{x:1,y:0},200,'ink'));
});
