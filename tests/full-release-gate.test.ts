import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
test('production refuses partial publication before opening any cloud session',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'jot-full-release-'));
 try{
  const reviewFile=path.join(dir,'reviews.json'),preparationFile=path.join(dir,'preparation.json'),releaseFile=path.join(dir,'full-release.json');
  const review=JSON.stringify([{design_id:'test-design',status:'approved_for_publication',prepared_source_sha256:'0'.repeat(64),render_review:{}}]);
  const preparation=JSON.stringify({status:'prepared_pending_render_review',prepared:[{id:'test-design'}],failed:[]});
  await writeFile(reviewFile,review);await writeFile(preparationFile,preparation);
  const args=['--import','tsx','scripts/ops/import-reviewed-batch.ts','--environment','production','--review',reviewFile,'--preparation',preparationFile,'--start','0','--limit','1','--apply'];
  const run=(extra:string[])=>spawnSync(process.execPath,[...args,...extra],{encoding:'utf8',env:{...process.env,JOT_WRANGLER_AUTH_FILE:'',JOT_SECRETS_FILE:''}});
  let result=run([]);assert.notEqual(result.status,0);assert.match(result.stderr,/all 24 packages together.*full-release/);
  await writeFile(releaseFile,JSON.stringify({status:'pending_full_review',collections:[]}));
  result=run(['--full-release',releaseFile]);assert.notEqual(result.status,0);assert.match(result.stderr,/All 24 collections must be ready/);
  const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
  await writeFile(releaseFile,JSON.stringify({status:'ready_for_publication',collections:Array.from({length:24},()=>({review_path:reviewFile,preparation_path:preparationFile,review_sha256:hash(review),preparation_sha256:hash(preparation)}))}));
  result=run(['--full-release',releaseFile]);assert.notEqual(result.status,0);assert.match(result.stderr,/Incomplete collection in full release/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
