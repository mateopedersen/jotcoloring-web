import test from 'node:test';
import assert from 'node:assert/strict';
import {canvasBlob,canvasPreviewBlob} from '../src/ui/canvas.ts';

test('internal previews fall back to PNG when WEBP encoding is unavailable',async()=>{
  const calls:string[]=[];
  const canvas={toBlob(callback:(blob:Blob)=>void,type:string){calls.push(type);callback(new Blob(['pixels'],{type:'image/png'}));}} as HTMLCanvasElement;
  const preview=await canvasPreviewBlob(canvas);
  assert.equal(preview.type,'image/png');
  assert.deepEqual(calls,['image/webp','image/png']);
  await assert.rejects(canvasBlob(canvas,'image/webp'),/cannot export WEBP/);
});

test('internal previews use WEBP when supported and report genuine encoder failure',async()=>{
  const supported={toBlob(callback:(blob:Blob)=>void,type:string){callback(new Blob(['pixels'],{type}));}} as HTMLCanvasElement;
  assert.equal((await canvasPreviewBlob(supported)).type,'image/webp');
  const failed={toBlob(callback:(blob:null)=>void){callback(null);}} as unknown as HTMLCanvasElement;
  await assert.rejects(canvasPreviewBlob(failed),/empty file/);
});
