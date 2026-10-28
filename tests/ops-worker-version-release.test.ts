import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {versionUploadConfig,versionDeployConfig,serviceGrouping,parseVersionOutput,assertDeployment,assertBundleMetadataUnchanged,publishWorkerVersion,type WorkerTarget} from '../scripts/ops/worker-version-release';
const root=JSON.parse(await fs.readFile('workers/jobs/wrangler.jsonc','utf8'));
const target:WorkerTarget={stage:'staging',name:'jotcoloring-staging-jobs',config:{...root,...root.env.staging},originalConfig:'workers/jobs/wrangler.jsonc',originalEnvironment:'staging',topLevelName:root.name};
const version='11111111-1111-4111-8111-111111111111',deployment='22222222-2222-4222-8222-222222222222',commit='a'.repeat(40);
test('version config preserves runtime binding values and removes all trigger management',()=>{
  const before=JSON.stringify(target),generated=versionUploadConfig(target),c=generated.env.staging;
  assert.equal(JSON.stringify(target),before);assert.equal(generated.name,root.name);
  for(const key of ['vars','d1_databases','r2_buckets','limits','compatibility_date','compatibility_flags'])assert.deepEqual(c[key],target.config[key]);
  for(const key of ['queues','triggers','routes','observability','tail_consumers','streaming_tail_consumers','logpush'])assert.equal(c[key],undefined);
  assert.deepEqual(c.unsafe.bindings,[{name:'INGEST_QUEUE',type:'queue',queue_name:'jotcoloring-staging-ingest'},{name:'AI_QUEUE',type:'queue',queue_name:'jotcoloring-staging-ai'}]);
  assert.deepEqual(versionDeployConfig(target),{name:target.name,account_id:root.account_id});
  assert.equal(serviceGrouping(target,[]),false);assert.equal(serviceGrouping(target,['retained-owner-label']),false);
  assert.equal(serviceGrouping(target,['retained-owner-label','cf:service='+root.name,'cf:environment=staging']),true);
  assert.throws(()=>serviceGrouping(target,['cf:service=another-worker','cf:environment=staging']),/stopped/);
  assert.throws(()=>serviceGrouping(target,['cf:environment=staging','cf:service='+root.name]),/stopped/);
  assert.equal(versionUploadConfig(target,false).env,undefined);assert.equal(versionUploadConfig(target,false).name,target.name);
  const changed=structuredClone(target);changed.config.queues.producers[0].queue='jotcoloring-production-ingest';assert.throws(()=>versionUploadConfig(changed),/producer/);
  const unsafe=structuredClone(target);unsafe.config.unsafe={bindings:[{name:'AI',type:'ai'}]};assert.throws(()=>versionUploadConfig(unsafe),/capability/);
  assert.throws(()=>versionUploadConfig({...target,name:'unrelated-worker'}),/target/);
});
test('NDJSON requires exactly one matching Worker success UUID, never a latest-version guess',()=>{
  const row={type:'version-upload',version:1,worker_name:target.name,version_id:version};
  assert.equal(parseVersionOutput(JSON.stringify({type:'assets-upload'})+'\n'+JSON.stringify(row)+'\n','version-upload',target.name),version);
  for(const value of ['',JSON.stringify({...row,version_id:null}),JSON.stringify({...row,worker_name:'jotcoloring-production-jobs'}),JSON.stringify({...row,version_id:'latest'}),JSON.stringify(row)+'\n'+JSON.stringify(row),JSON.stringify({...row,version:2}),'not-json'])assert.throws(()=>parseVersionOutput(value,'version-upload',target.name));
});
test('bundle parity rejects lost or retargeted queue bindings and missing preserved secrets',()=>{
  const original={bindings:[{name:'AI_QUEUE',type:'queue',queue_name:'jotcoloring-staging-ai'},{name:'INGEST_QUEUE',type:'queue',queue_name:'jotcoloring-staging-ingest'}],keep_bindings:['secret_text']};
  assert.equal(assertBundleMetadataUnchanged(original,{...original,bindings:[...original.bindings].reverse()}).keeps_existing_secrets,true);
  const changed=structuredClone(original);changed.bindings[0].queue_name='jotcoloring-production-ai';assert.throws(()=>assertBundleMetadataUnchanged(original,changed),/differs/);
  assert.throws(()=>assertBundleMetadataUnchanged(original,{...original,bindings:original.bindings.slice(0,1)}),/differs/);
  assert.throws(()=>assertBundleMetadataUnchanged({...original,keep_bindings:[]},{...original,keep_bindings:[]}),/secret/);
});
test('only the uploaded UUID is activated at100%, then exact deployment readback is verified',async()=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'jot-version-test-')),calls:string[][]=[];
  try{
    const result=await publishWorkerVersion(target,commit,path.join(directory,'worker'),async(args,file)=>{
      calls.push(args);
      const record=args[1]==='upload'?{type:'version-upload',version:1,worker_name:target.name,version_id:version}:{type:'version-deploy',version:1,worker_name:target.name,deployment_id:deployment};
      await fs.writeFile(file,JSON.stringify(record)+'\n');
    },async(name,id)=>{assert.equal(name,target.name);assert.equal(id,deployment);return{id,strategy:'percentage',versions:[{version_id:version,percentage:100}]}},async()=>true);
    assert.equal(calls.length,2);assert.deepEqual(calls[0].slice(0,2),['versions','upload']);assert.deepEqual(calls[1].slice(0,3),['versions','deploy',version+'@100%']);
    assert.ok(calls[0].includes('--experimental-provision=false'));assert.ok(calls[0].includes('--experimental-auto-create=false'));
    assert.equal(calls.some(args=>args.includes('triggers')||args.includes('queues')||args.includes('--force')),false);
    assert.equal(result.status,'VERSION_ACTIVATED_AND_VERIFIED');assert.equal(result.version_id,version);
    assert.throws(()=>assertDeployment({id:deployment,strategy:'percentage',versions:[{version_id:version,percentage:50}]},version,deployment),/100%/);
    assert.throws(()=>assertDeployment({id:deployment,strategy:'percentage',versions:[{version_id:deployment,percentage:100}]},version,deployment),/100%/);
  }finally{await fs.rm(directory,{recursive:true,force:true})}
});
test('upload failure or absent version record prevents activation; readback failure is not success',async()=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'jot-version-fail-'));
  try{
    let calls=0;
    await assert.rejects(()=>publishWorkerVersion(target,commit,path.join(directory,'upload-fails'),async()=>{calls++;throw new Error('simulated upload failed')},async()=>{throw new Error('must not read')},async()=>true),/upload failed/);assert.equal(calls,1);
    calls=0;await assert.rejects(()=>publishWorkerVersion(target,commit,path.join(directory,'no-id'),async(_,file)=>{calls++;await fs.writeFile(file,'{}\n')},async()=>{throw new Error('must not read')},async()=>true),/version record/);assert.equal(calls,1);
    await assert.rejects(()=>publishWorkerVersion(target,commit,path.join(directory,'bad-readback'),async(args,file)=>{await fs.writeFile(file,JSON.stringify({type:args[1]==='upload'?'version-upload':'version-deploy',version:1,worker_name:target.name,version_id:version,deployment_id:deployment})+'\n')},async()=>({id:deployment,strategy:'percentage',versions:[{version_id:deployment,percentage:100}]}),async()=>true),/readback/);
  }finally{await fs.rm(directory,{recursive:true,force:true})}
});
