import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {remoteContext} from '../scripts/ops/release-context';
test('operator sitemap wakes use the real scoped queue while inline import/projection delivery remains suppressed',async(t)=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'jot-discovery-adapter-')),auth=process.env.JOT_WRANGLER_AUTH_FILE,secrets=process.env.JOT_SECRETS_FILE,native=globalThis.fetch;
 t.after(async()=>{globalThis.fetch=native;if(auth===undefined)delete process.env.JOT_WRANGLER_AUTH_FILE;else process.env.JOT_WRANGLER_AUTH_FILE=auth;if(secrets===undefined)delete process.env.JOT_SECRETS_FILE;else process.env.JOT_SECRETS_FILE=secrets;await fs.rm(temp,{recursive:true,force:true});});
 process.env.JOT_WRANGLER_AUTH_FILE=path.join(temp,'auth.toml');process.env.JOT_SECRETS_FILE=path.join(temp,'secrets.json');
 await fs.writeFile(process.env.JOT_WRANGLER_AUTH_FILE,'oauth_token = "test-only"\nexpiration_time = "'+new Date(Date.now()+3600000).toISOString()+'"\n');await fs.writeFile(process.env.JOT_SECRETS_FILE,JSON.stringify({staging:{MEDIA_VALIDATION_SECRET:'test-only',CURSOR_SIGNING_SECRET:'test-only'}}));
 const calls:{url:string;body:any}[]=[];
 globalThis.fetch=async(input,init)=>{const url=String(input),body=init?.body?JSON.parse(String(init.body)):null;calls.push({url,body});return new Response(JSON.stringify({success:true,result:url.includes('/messages')?{message_id:'test-only'}:[{queue_name:'jotcoloring-staging-ingest',queue_id:'existing-staging-queue'}]}),{headers:{'Content-Type':'application/json'}});};
 const {env}=await remoteContext('staging',{requestLimit:10});assert.equal(env.DISCOVERY_ENABLED,'true');
 await env.INGEST_QUEUE!.send({type:'import',job_id:'inline-import'});await env.INGEST_QUEUE!.send({type:'projection',event_id:'inline-event'});assert.equal(calls.length,0);
 const message={type:'discovery_rebuild',job_id:'sitemap'};await env.INGEST_QUEUE!.send(message);await env.INGEST_QUEUE!.send(message);
 assert.equal(calls.length,3);assert.ok(calls[0].url.endsWith('/queues?name=jotcoloring-staging-ingest'));
 for(const call of calls.slice(1)){assert.ok(call.url.endsWith('/queues/existing-staging-queue/messages'));assert.deepEqual(call.body,{body:message,content_type:'json'});}
 await assert.rejects(()=>env.INGEST_QUEUE!.send({type:'discovery_rebuild',job_id:'another-project'}),/Unreviewed discovery job/);assert.equal(calls.length,3);
 const notice={type:'discovery_notify',job_id:'indexnow',revision:'navigation-v1:'+'a'.repeat(40)};await env.INGEST_QUEUE!.send(notice);assert.deepEqual(calls.at(-1)!.body,{body:notice,content_type:'json'});
 await assert.rejects(()=>env.INGEST_QUEUE!.send({...notice,job_id:'other'}),/Unreviewed discovery job/);await assert.rejects(()=>env.INGEST_QUEUE!.send({...notice,revision:'unreviewed'}),/Unreviewed discovery job/);assert.equal(calls.length,4);
});
