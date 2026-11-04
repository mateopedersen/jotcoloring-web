import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import sharp from 'sharp';
import {prepareStudioSource,studioWorkingSize,STUDIO_WORK_PIXELS,STUDIO_WORK_EDGE} from '../src/studio/source-image';
import {photoHeader} from '../src/photo/input';
import {lineMask} from '../src/studio/render';
import {floodRegion} from '../src/studio/flood-fill';

(globalThis as any).document={createElement:(tag:string)=>{assert.equal(tag,'canvas');return createCanvas(1,1);}};
const decode=async(blob:Blob)=>await loadImage(Buffer.from(await blob.arrayBuffer())) as any;

test('large studio pages fit bounded buffers without cropping, stretching or upscaling',()=>{
  for(const [width,height] of [[3000,4000],[4000,3000],[8000,8000],[12000,2000],[2000,12000],[1097,1551],[1024,1536],[64,64]]){
    const size=studioWorkingSize(width,height);
    assert.ok(size.width*size.height<=STUDIO_WORK_PIXELS);
    assert.ok(Math.max(size.width,size.height)<=STUDIO_WORK_EDGE);
    assert.ok(size.width<=width&&size.height<=height);
    assert.ok(Math.abs(size.width/size.height-width/height)<=2/size.height);
  }
  assert.deepEqual(studioWorkingSize(1024,1536),{width:1024,height:1536});
  for(const size of [[NaN,100],[Infinity,100],[0,100],[-1,100],[100.5,100],[100000,100000]])assert.throws(()=>studioWorkingSize(...size as [number,number]));
});

test('a 12 MP source keeps all four edges and closed fillable spaces after normalization',async()=>{
  const source=createCanvas(3000,4000),ctx=source.getContext('2d');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,3000,4000);ctx.strokeStyle='#000';ctx.lineWidth=12;
  ctx.strokeRect(60,60,2880,3880);ctx.beginPath();ctx.moveTo(1500,60);ctx.lineTo(1500,3940);ctx.stroke();
  const blob=new Blob([source.toBuffer('image/png') as BlobPart],{type:'image/png'}),original=await blob.arrayBuffer();
  const prepared=await prepareStudioSource(blob,decode);
  assert.deepEqual([prepared.width,prepared.height],[1500,2000]);assert.equal(prepared.blob.type,'image/png');
  assert.deepEqual(await blob.arrayBuffer(),original,'the downloaded source bytes are immutable');
  const image=await loadImage(Buffer.from(await prepared.blob.arrayBuffer()));
  const page=createCanvas(prepared.width,prepared.height);page.getContext('2d').drawImage(image,0,0);
  for(const [x,y]of[[30,500],[1470,500],[500,30],[500,1970]]){
    const p=page.getContext('2d').getImageData(x,y,1,1).data;assert.ok(p[0]<50,'a source edge was lost');
  }
  const mask=lineMask(image as any,prepared.width,prepared.height,false);
  const pixels=mask.getContext('2d')!.getImageData(0,0,prepared.width,prepared.height).data;
  const result=floodRegion(pixels,prepared.width,prepared.height,500,1000,48);
  assert.ok(result.length>1000);for(let i=0;i<result.length;i+=3)assert.ok(result[i+2]<750,'fill crossed the retained dividing outline');
});

test('safe source bytes stay unchanged and transparent inputs keep a white drawing surface when resized',async()=>{
  const small=new Blob([await sharp({create:{width:100,height:200,channels:3,background:'#fff'}}).webp().toBuffer() as BlobPart],{type:'image/webp'});
  assert.equal((await prepareStudioSource(small,decode)).blob,small);
  const transparent=new Blob([await sharp({create:{width:3000,height:3000,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).png().toBuffer() as BlobPart],{type:'image/png'});
  const prepared=await prepareStudioSource(transparent,decode),image=await loadImage(Buffer.from(await prepared.blob.arrayBuffer()));
  const c=createCanvas(prepared.width,prepared.height);c.getContext('2d').drawImage(image,0,0);
  assert.deepEqual([...c.getContext('2d').getImageData(100,100,1,1).data],[255,255,255,255]);
});

test('malformed, oversized and mislabeled files fail before pixel decoding or creating a project',async()=>{
  let calls=0;const decoder=async()=>{calls++;throw Error('must not decode');};
  const png=await sharp({create:{width:100,height:100,channels:3,background:'#fff'}}).png().toBuffer();
  const huge=Buffer.from(png);huge.writeUInt32BE(1000000,16);
  for(const blob of [new Blob([]),new Blob(['<svg/>'],{type:'image/png'}),new Blob([png as BlobPart],{type:'image/jpeg'}),new Blob([huge as BlobPart],{type:'image/png'})])await assert.rejects(prepareStudioSource(blob,decoder));
  assert.equal(calls,0);
});

test('photo input keeps its separate 32 MP bound after sharing header inspection',async()=>{
  const png=await sharp({create:{width:100,height:100,channels:3,background:'#fff'}}).png().toBuffer();png.writeUInt32BE(6000,16);png.writeUInt32BE(6000,20);
  assert.throws(()=>photoHeader(png),/32 megapixels/);
  assert.doesNotThrow(()=>studioWorkingSize(6000,6000));
});
