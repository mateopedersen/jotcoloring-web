import test from 'node:test';
import assert from 'node:assert/strict';
import {validateColorRecord,colorRecordKey,REFERENCE_VERSION} from '../src/coloring/reference-record';
import {resolveReviewedReference,assetHash} from '../src/coloring/references';
const source='a'.repeat(64),reference='b'.repeat(64),preview='c'.repeat(64);
const record=()=>({version:REFERENCE_VERSION,id:'test-content',source_sha256:source,preview_sha256:preview,reference_sha256:reference,key:`published/color-ideas/v1/${source}/${reference}.webp`,width:900,height:1350,bytes:350000,review:{status:'approved',source_sha256:source,reference_sha256:reference,notes:'Inspected the original and output: blue water, green leaves, original outlines and brand retained.',reviewed_at:'2026-11-01T12:00:00Z'}});
test('color manifests reject changed sources, stale reviews, private paths and unbounded images',()=>{
 assert.equal(validateColorRecord(record(),source,'test-content').reference_sha256,reference);
 for(const patch of [{source_sha256:preview},{reference_sha256:preview},{key:'private/photo.webp'},{height:90000},{bytes:9000000},{review:{...record().review,status:'pending_visual_review'}},{review:{...record().review,source_sha256:preview}}])assert.throws(()=>validateColorRecord({...record(),...patch},source,'test-content'));
 assert.throws(()=>validateColorRecord(record(),source,'other-content'));
 assert.throws(()=>colorRecordKey('../private'));
});
test('reviewed references require the reviewed source, reference and preview identities',()=>{
 const item={id:'test-content',lineArtUrl:`https://assets.jotcoloring.com/line.${source.slice(0,24)}.webp`,preview:`https://assets.jotcoloring.com/preview.${preview.slice(0,24)}.webp`,color_reference:`https://assets.jotcoloring.com/color.${reference.slice(0,24)}.webp`};
 const rows=[{id:item.id,sourceHash:source,previewHash:preview,referenceHash:reference}];
 assert.equal(resolveReviewedReference(item,rows),item.color_reference);
 assert.equal(resolveReviewedReference({...item,lineArtUrl:item.color_reference},rows),undefined);
 assert.equal(resolveReviewedReference({...item,color_reference:item.preview},rows),undefined);
 assert.equal(resolveReviewedReference({...item,preview:item.lineArtUrl},rows),undefined);
 assert.equal(resolveReviewedReference({...item,id:'new-drawing'},rows),undefined);
 assert.equal(assetHash('/api/media/id/printable_webp_bw?v='+source.slice(0,24)),source.slice(0,24));
});
