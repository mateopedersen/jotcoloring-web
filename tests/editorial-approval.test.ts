import test from 'node:test';import assert from 'node:assert/strict';
import {requireDoubleEditorialApproval} from '../scripts/ops/editorial-approval';import {canonicalJSON,sha256} from '../src/server/http';
test('a changed title or source cannot reuse two-pass editorial approval',async()=>{
 const r:any={design_id:'art-1',title:'Sonic Waters a Sunflower',description:'Sonic tips a watering can over a potted sunflower.',alt_text:'Sonic watering a potted sunflower.',category_ids:['sonic']};
 const metadata={...r};delete metadata.design_id;
 r.second_editorial_review={design_id:r.design_id,passes:2,source_sha256:'a'.repeat(64),metadata_sha256:await sha256(canonicalJSON(metadata))};
 await requireDoubleEditorialApproval(r,'a'.repeat(64));
 await assert.rejects(()=>requireDoubleEditorialApproval({...r,title:'Invented scene'},'a'.repeat(64)),/stale/);
 await assert.rejects(()=>requireDoubleEditorialApproval(r,'b'.repeat(64)),/source-bound/);
 await assert.rejects(()=>requireDoubleEditorialApproval({...r,second_editorial_review:null},'a'.repeat(64)),/Two source-bound/);
});
