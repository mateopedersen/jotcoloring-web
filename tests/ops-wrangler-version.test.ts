/** Exercise the pinned CLI against a local fake API, never Cloudflare. */
import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {createServer} from 'node:http';import {spawn} from 'node:child_process';
import {publishWorkerVersion,type WorkerTarget} from '../scripts/ops/worker-version-release';
for(const grouped of [true,false])test('actual pinned Wrangler avoids resource/trigger/settings APIs: '+(grouped?'grouped':'ungrouped'), {timeout:60000}, async()=>{
  const root=JSON.parse(await fs.readFile('workers/jobs/wrangler.jsonc','utf8')),stage='staging',name='jotcoloring-staging-jobs',account=root.account_id;
  const target:WorkerTarget={stage,name,config:{...root,...root.env.staging},originalConfig:'workers/jobs/wrangler.jsonc',originalEnvironment:stage,topLevelName:root.name};
  const version='11111111-1111-4111-8111-111111111111',deployment='22222222-2222-4222-8222-222222222222';
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'jot-wrangler-protocol-'));
  const requests:{method:string;path:string}[]=[],unexpected:string[]=[],prefix=`/accounts/${account}/workers`,script=prefix+'/scripts/'+name;
  let uploadedQueues:any[]=[],activated:any;
  const server=createServer(async(req,res)=>{
    const url=new URL(req.url!,'http://localhost'),method=req.method||'GET';requests.push({method,path:url.pathname});
    const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));const bytes=Buffer.concat(chunks);
    let result:any;
    if(method==='GET'&&url.pathname===prefix+'/services/'+name)result={default_environment:{environment:'production',script:{tag:'local-test-worker',tags:grouped?['cf:service='+root.name,'cf:environment=staging']:[],last_deployed_from:'wrangler'}}};
    else if(method==='GET'&&url.pathname===script+'/secrets')result=[];
    else if(method==='POST'&&url.pathname===script+'/versions'){
      const form=await new Response(bytes,{headers:{'Content-Type':req.headers['content-type']!}}).formData();const metadata=JSON.parse(String(form.get('metadata')));
      uploadedQueues=metadata.bindings.filter((b:any)=>b.type==='queue');
      result={id:version,number:1,metadata:{has_preview:false,created_on:'2026-10-28T00:00:00Z'},startup_time_ms:1};
    }else if(method==='GET'&&url.pathname===script+'/deployments')result={deployments:[]};
    else if(method==='GET'&&url.pathname===script+'/versions/'+version)result={id:version,number:1,metadata:{created_on:'2026-10-28T00:00:00Z',source:'wrangler'},annotations:{},resources:{bindings:[],script_runtime:{compatibility_date:'2026-10-26',compatibility_flags:['nodejs_compat']}}};
    else if(method==='POST'&&url.pathname===script+'/deployments'){activated=JSON.parse(bytes.toString());result={id:deployment};}
    else {unexpected.push(method+' '+url.pathname);res.statusCode=403;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({success:false,errors:[{code:10000,message:'Local test denies every unreviewed endpoint'}]}));return;}
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({success:true,errors:[],messages:[],result}));
  });
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>resolve())});
  const address=server.address();assert.ok(address&&typeof address!=='string');
  const apiOrigin=`http://127.0.0.1:${address.port}`;
  try{
    const runner=async(args:string[],file:string)=>{
      await fs.writeFile(file,'',{flag:'wx'});
      const env:NodeJS.ProcessEnv={...process.env,CLOUDFLARE_API_BASE_URL:apiOrigin,CLOUDFLARE_ACCOUNT_ID:account,CLOUDFLARE_API_TOKEN:'local-test-placeholder',WRANGLER_OUTPUT_FILE_PATH:file,WRANGLER_LOG_PATH:path.join(directory,'wrangler.log'),WRANGLER_SEND_METRICS:'false',CI:'true',NO_COLOR:'1'};
      for(const key of ['CLOUDFLARE_API_KEY','CLOUDFLARE_EMAIL','CF_API_TOKEN','CF_API_KEY','CF_EMAIL','WRANGLER_CI_MATCH_TAG','HTTP_PROXY','HTTPS_PROXY','ALL_PROXY'])delete env[key];
      await new Promise<void>((resolve,reject)=>{
        const child=spawn(process.execPath,[path.resolve('node_modules/wrangler/bin/wrangler.js'),...args],{env,stdio:['ignore','pipe','pipe']});let output='';
        child.stdout.on('data',chunk=>output+=chunk.toString());child.stderr.on('data',chunk=>output+=chunk.toString());
        child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error('Pinned Wrangler local protocol failed: '+output.slice(-5000))));
      });
    };
    await publishWorkerVersion(target,'a'.repeat(40),path.join(directory,'release'),runner,async()=>({id:deployment,strategy:'percentage',versions:[{version_id:version,percentage:100}]}),async()=>grouped);
    assert.deepEqual(unexpected,[]);
    assert.deepEqual(requests.filter(r=>r.method!=='GET'),[{method:'POST',path:script+'/versions'},{method:'POST',path:script+'/deployments'}]);
    assert.equal(requests.some(r=>/\/queues(?:\/|$)|\/routes(?:\/|$)|\/schedules(?:\/|$)/.test(r.path)),false);
    assert.deepEqual(uploadedQueues,[{name:'INGEST_QUEUE',type:'queue',queue_name:'jotcoloring-staging-ingest'},{name:'AI_QUEUE',type:'queue',queue_name:'jotcoloring-staging-ai'}]);
    assert.deepEqual(activated.versions,[{version_id:version,percentage:100}]);assert.equal(activated.strategy,'percentage');
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));await fs.rm(directory,{recursive:true,force:true});}
});
