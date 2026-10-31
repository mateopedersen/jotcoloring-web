import test from 'node:test';
import assert from 'node:assert/strict';
import {packProject,unpackProject,mayRetryBinary} from '../src/studio/storage-binary.ts';
import type {Project} from '../src/studio/model';

test('binary fallback preserves source and thumbnail bytes, MIME, and artwork data',async()=>{
 const project={id:'sample',title:'A drawing',source:{blob:new Blob([new Uint8Array([0,4,255])],{type:'image/png'})},thumbnail:new Blob(['preview'],{type:'image/webp'}),layers:[{operations:[{color:'#123456'}]}]} as unknown as Project;
 const packed=structuredClone(await packProject(project));
 const restored=unpackProject(packed);
 assert.equal(restored.source.blob.type,'image/png');
 assert.deepEqual([...new Uint8Array(await restored.source.blob.arrayBuffer())],[0,4,255]);
 assert.equal(restored.thumbnail?.type,'image/webp');
 assert.equal(await restored.thumbnail?.text(),'preview');
 assert.deepEqual(restored.layers,project.layers);
 assert.equal(unpackProject(project).source.blob,project.source.blob);
});

test('only binary-related storage failures can trigger a retry',()=>{
 assert.equal(mayRetryBinary(new Error('save failed',{cause:new DOMException('blob','UnknownError')})),true);
 assert.equal(mayRetryBinary(new DOMException('clone','DataCloneError')),true);
 assert.equal(mayRetryBinary(new Error('full',{cause:new DOMException('full','QuotaExceededError')})),false);
 assert.equal(mayRetryBinary(new Error('duplicate',{cause:new DOMException('duplicate','ConstraintError')})),false);
});
