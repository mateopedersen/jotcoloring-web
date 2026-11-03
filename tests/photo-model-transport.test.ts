import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
import {fastPhotoTensor} from '../src/photo/fast-input';
const hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
test('compact drawing transport is bounded, checksum verified and derived from the licensed source',async()=>{
 const receipt=JSON.parse(await fs.readFile('public/models/photo/drawing-webgl.json','utf8')),bytes=await fs.readFile('public/models/photo/'+receipt.file);
 assert.ok(bytes.length<9_000_000);assert.equal(bytes.length,receipt.bytes);assert.equal(hash(bytes),receipt.transportSHA256);
 const decoded=gunzipSync(bytes);assert.equal(decoded.length,receipt.decodedBytes);assert.equal(hash(decoded),receipt.decodedSHA256);
 assert.equal(hash(await fs.readFile('public/models/photo/informative-drawing-544fb9a4.onnx')),receipt.sourceSHA256);
 assert.match(await fs.readFile('public/models/photo/LICENSE-INFORMATIVE-DRAWINGS.txt','utf8'),/MIT/);
});
test('fixed GPU inputs keep uniform photo scaling and fill only unused rows and columns with edge pixels',()=>{
 const w=128,h=64,raw=new Uint8ClampedArray(w*h*4).fill(255);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=(y*w+x)*4;raw[p]=x;raw[p+1]=y;raw[p+2]=50;}
 const input=fastPhotoTensor(raw,w,h);assert.equal(input.width,w);assert.equal(input.height,h);assert.equal(input.data.length,3*512*512);
 for(let c=0;c<3;c++){assert.equal(input.data[c*512*512+20*512+500],input.data[c*512*512+20*512+127]);assert.equal(input.data[c*512*512+500*512+20],input.data[c*512*512+63*512+20]);}
 assert.throws(()=>fastPhotoTensor(raw,w,h,1024));
});
