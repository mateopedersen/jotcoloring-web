import test from 'node:test';
import assert from 'node:assert/strict';
import {ACTIVE_IDS,assertRestoreTarget,assertPrivateBucket,signedURL,run} from '../scripts/ops/cloud-backup-restore';
import {DatabaseSync} from 'node:sqlite';
import {tablePageSQL} from '../scripts/ops/cloud-restore-verifier';
test('cloud restore refuses active IDs, unrelated names and unknown privacy state',()=>{
  for(const id of ACTIVE_IDS)assert.throws(()=>assertRestoreTarget(id,'jotcoloring-restore-staging-test20261028'));
  assert.throws(()=>assertRestoreTarget('00000000-0000-0000-0000-000000000000','unrelated-site'));
  assert.doesNotThrow(()=>assertRestoreTarget('00000000-0000-0000-0000-000000000000','jotcoloring-restore-staging-test20261028'));
  assert.throws(()=>assertPrivateBucket({enabled:true},{domains:[]}));
  assert.throws(()=>assertPrivateBucket({enabled:false},{domains:[{enabled:true}]}));
  assert.throws(()=>assertPrivateBucket({},{}));
  assert.doesNotThrow(()=>assertPrivateBucket({enabled:false},{domains:[]}));
});
test('presigned transfers allow only HTTPS Cloudflare storage, never arbitrary hosts',()=>{
  assert.throws(()=>signedURL('https://example.com/private'));
  assert.throws(()=>signedURL('http://test.r2.cloudflarestorage.com/object'));
  assert.throws(()=>signedURL('https://cloudflarestorage.com.evil.example/object'));
  assert.doesNotThrow(()=>signedURL('https://test.r2.cloudflarestorage.com/object?signature=not-logged'));
});
test('default cloud backup command never calls fetch and does not need credentials',async()=>{
  const old=globalThis.fetch,log=console.log;let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('Network forbidden in plan');};console.log=()=>{};
  try{const plan=await run(['--environment','staging']);assert.equal(plan.mode,'PLAN_ONLY');assert.equal(calls,0);assert.equal(plan.remote_acceptance,'NOT RUN until --apply completes');}finally{globalThis.fetch=old;console.log=log;}
});
test('backup-only plan cannot create or resume a restore database',async()=>{
  const log=console.log;console.log=()=>{};
  try{
    const plan=await run(['--environment','staging','--backup-only','--snapshot-name','jotcoloring-backup-staging-test20261028']);
    assert.equal(plan.backup_only,true);assert.ok(plan.operations.every((op:string)=>!op.includes('Create NEW separate D1')&&!op.includes('Import SQL')));
    await assert.rejects(()=>run(['--environment','staging','--backup-only','--resume-empty-target']));
    await assert.rejects(()=>run(['--environment','staging','--backup-only','--snapshot-name','jotcoloring-backup-production-test20261028']));
  }finally{console.log=log;}
});
test('integer-primary-key parity keeps numeric order despite lossless text projection',()=>{
  const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE events(seq INTEGER PRIMARY KEY,label TEXT);INSERT INTO events VALUES(1,\'one\'),(2,\'two\'),(10,\'ten\'),(11,\'eleven\');');
  const cols=[{name:'seq',type:'INTEGER'},{name:'label',type:'TEXT'}];
  assert.deepEqual(db.prepare(tablePageSQL('events',cols,['seq'],false,2)).all().map(r=>r.seq),['1','2']);
  assert.deepEqual(db.prepare(tablePageSQL('events',cols,['seq'],true,2)).all('2').map(r=>r.seq),['10','11']);
  db.close();
});
