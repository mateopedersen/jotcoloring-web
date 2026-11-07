import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import sharp from 'sharp';
import {MODEL,runGeneration,uploadPhoto,generationResult} from '../src/server/ai';
import {cleanupPrivateJobs} from '../src/server/ai-cleanup';
import {rateLimit} from '../src/server/limits';
import jobsWorker from '../workers/jobs/index';
import type {Bucket,Database,D1Result,Env,Statement,StoredObject} from '../src/server/types';

class TestD1 implements Database{
 sql=new DatabaseSync(':memory:');
 failReadyUpdate=false;
 constructor(){for(const file of fs.readdirSync('migrations/catalog').sort())this.sql.exec(fs.readFileSync('migrations/catalog/'+file,'utf8'));}
 prepare(sql:string):Statement{
  let values:unknown[]=[];
  const statement:Statement={
   bind:(...next)=>{values=next;return statement;},
   first:async<T>(column?:string)=>{const row=this.sql.prepare(sql).get(...values as never[]) as Record<string,unknown>|undefined;return (row?(column?row[column]:row):null) as T|null;},
   all:async<T>()=>({results:this.sql.prepare(sql).all(...values as never[]) as T[],success:true,meta:{}}),
   run:async<T>()=>{
    if(this.failReadyUpdate&&sql.startsWith("UPDATE creator_upload SET status='ready'"))throw Error('simulated D1 update failure');
    const result=this.sql.prepare(sql).run(...values as never[]);
    return {results:[],success:true,meta:{changes:Number(result.changes)}} as D1Result<T>;
   },
  };
  return statement;
 }
 async batch<T>(statements:Statement[]){this.sql.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run<T>());this.sql.exec('COMMIT');return results;}catch(error){this.sql.exec('ROLLBACK');throw error;}}
 async exec(sql:string){this.sql.exec(sql);return {};}
}

function fixture(){
 const db=new TestD1(),objects=new Map<string,Uint8Array>(),puts:string[]=[],deleted:string[]=[];
 let failPut=false,failDelete=false,providerCalls=0;
 const bucket:Bucket={
  get:async key=>{const bytes=objects.get(key);return bytes?{key,size:bytes.length,etag:'test',body:new Response(bytes).body!,arrayBuffer:async()=>bytes.slice().buffer,text:async()=>new TextDecoder().decode(bytes)} as StoredObject:null;},
  head:async key=>bucket.get(key),
  put:async(key,value)=>{if(failPut)throw Error('simulated R2 put failure');const bytes=typeof value==='string'?new TextEncoder().encode(value):new Uint8Array(await new Response(value as BodyInit).arrayBuffer());objects.set(key,bytes);puts.push(key);},
  delete:async keys=>{if(failDelete)throw Error('simulated R2 delete failure');for(const key of typeof keys==='string'?[keys]:keys){objects.delete(key);deleted.push(key);}},
  list:async options=>{const keys=[...objects.keys()].filter(key=>key.startsWith(options?.prefix||'')).slice(0,options?.limit||100);return {objects:(await Promise.all(keys.map(key=>bucket.get(key)))) as StoredObject[],truncated:false};},
 };
 const env:Env={CATALOG_DB:db,JOB_ASSETS:bucket,APP_ENV:'local',DISCOVERY_ENABLED:'false',COLOR_REFERENCES_ENABLED:'false',AI_ENABLED:'true',AI_BILLING_MODE:'free_only',AI_FREE_DAILY_NEURONS:'9000',AI_FREE_MAX_JOB_NEURONS:'300',AI_MAX_CONCURRENT_JOBS:'1',AI_PER_SESSION_DAILY_LIMIT:'3',AI_MODEL_ID:MODEL,SESSION_SIGNING_SECRET:'dummy-local-session-secret-over-32-characters',AI_QUEUE:{send:async()=>{}},AI_FREE_ONLY_GATEWAY:{fetch:async()=>{providerCalls++;throw Error('provider must not run');}}};
 return {db,bucket,objects,puts,deleted,env,providerCalls:()=>providerCalls,setFailPut:(value:boolean)=>{failPut=value;},setFailDelete:(value:boolean)=>{failDelete=value;}};
}

function seed(db:TestD1,id:string,status='processing'){
 db.sql.prepare('INSERT INTO creator_job(id,owner_id,idempotency_key,payload_sha256,parameters_json,source_revision,model,status,reservation_micros,daily_limit_micros,monthly_limit_micros,concurrent_limit,session_limit,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,'dummy-owner',id,'a','{}','source',MODEL,status,3000,1000000,1000000,20,20,'2000-01-01T00:00:00.000Z','2999-01-01T00:00:00.000Z');
}
function row(db:TestD1,id:string){return db.sql.prepare('SELECT * FROM creator_job WHERE id=?').get(id)!;}
function gate(){let resolve!:()=>void;const promise=new Promise<void>(done=>{resolve=done;});return {promise,resolve};}
async function source(){const width=96,height=128,pixels=Buffer.alloc(width*height,255);for(let y=20;y<100;y++)for(let x=20;x<76;x++)if(x<24||x>71||y<24||y>95)pixels[y*width+x]=0;return new Uint8Array(await sharp(pixels,{raw:{width,height,channels:1}}).png().toBuffer());}

test('duplicate queue delivery cannot process the same saved provider result twice',async()=>{
 const f=fixture(),id='duplicate-processing';seed(f.db,id);f.objects.set(`jobs/dummy-owner/${id}/provider-image`,await source());
 const entered=gate(),release=gate(),get=f.bucket.get;let reads=0;
 f.bucket.get=async key=>{if(key.endsWith('/provider-image')&&++reads===1){entered.resolve();await release.promise;}return get(key);};
 const first=runGeneration(f.env,id);await entered.promise;
 try{await runGeneration(f.env,id);assert.equal(reads,1);assert.equal(row(f.db,id).status,'processing');}
 finally{release.resolve();await first;}
 await runGeneration(f.env,id);
 const accepted=row(f.db,id);assert.equal(accepted.status,'succeeded');assert.match(String(accepted.line_art_key),/\/processed\/[0-9a-f-]+\/line-art.webp$/);assert.equal(accepted.processing_token,null);assert.equal(f.puts.length,3);assert.equal(reads,1);assert.equal(f.providerCalls(),0);
});

test('a failed expired lease holder cannot replace a newer successful result',async(t)=>{
 const f=fixture(),id='stale-failure';seed(f.db,id);f.objects.set(`jobs/dummy-owner/${id}/provider-image`,await source());
 let now=Date.now();t.mock.method(Date,'now',()=>now);
 const entered=gate(),release=gate(),get=f.bucket.get;let reads=0;
 f.bucket.get=async key=>{if(key.endsWith('/provider-image')&&++reads===1){entered.resolve();await release.promise;throw Error('old delivery failed late');}return get(key);};
 const first=runGeneration(f.env,id);await entered.promise;now+=21*60*1000;
 await runGeneration(f.env,id);const accepted=row(f.db,id);assert.equal(accepted.status,'succeeded');
 release.resolve();await first;
 assert.deepEqual(row(f.db,id),accepted);assert.equal(f.providerCalls(),0);
});

test('a late successful lease holder uses separate keys and removes its unaccepted outputs',async(t)=>{
 const f=fixture(),id='stale-output';seed(f.db,id);f.objects.set(`jobs/dummy-owner/${id}/provider-image`,await source());
 let now=Date.now();t.mock.method(Date,'now',()=>now);
 const entered=gate(),release=gate(),get=f.bucket.get;let reads=0;
 f.bucket.get=async key=>{if(key.endsWith('/provider-image')&&++reads===1){entered.resolve();await release.promise;}return get(key);};
 const first=runGeneration(f.env,id);await entered.promise;now+=21*60*1000;
 await runGeneration(f.env,id);const accepted=row(f.db,id),acceptedBytes=f.objects.get(String(accepted.pdf_key))!.slice();
 release.resolve();await first;
 assert.deepEqual(row(f.db,id),accepted);assert.deepEqual(f.objects.get(String(accepted.pdf_key)),acceptedBytes);assert.equal(f.puts.length,6);assert.equal(f.deleted.length,3);assert.equal([...f.objects.keys()].filter(key=>key.includes('/processed/')).length,3);assert.equal(f.providerCalls(),0);
});

test('existing successful private downloads keep their stored object keys',async()=>{
 const f=fixture(),id='legacy-result';seed(f.db,id,'succeeded');const key=`jobs/dummy-owner/${id}/line-art.webp`,bytes=new Uint8Array([1,2,3]);f.objects.set(key,bytes);f.db.sql.prepare('UPDATE creator_job SET line_art_key=? WHERE id=?').run(key,id);
 const response=await generationResult(new Request('https://jot.test/result?format=webp'),f.env,'dummy-owner',id);
 assert.equal(response.headers.get('Content-Type'),'image/webp');assert.deepEqual(new Uint8Array(await response.arrayBuffer()),bytes);await assert.rejects(()=>generationResult(new Request('https://jot.test/result'),f.env,'other-owner',id),{code:'NOT_FOUND'});assert.equal(f.providerCalls(),0);
});

test('photo upload tracks R2 and ready-update failures until expiry cleanup succeeds',async()=>{
 for(const failure of ['put','ready'] as const){
  const f=fixture(),bytes=await source();f.setFailPut(failure==='put');f.db.failReadyUpdate=failure==='ready';
  await assert.rejects(()=>uploadPhoto(new Request('https://jot.test/upload',{method:'POST',body:bytes}),f.env,'dummy-owner'));
  const upload=f.db.sql.prepare('SELECT * FROM creator_upload').get()!;assert.equal(upload.status,'uploading');assert.equal(f.objects.size,failure==='put'?0:1);assert.equal(f.providerCalls(),0);
  f.setFailPut(false);f.db.failReadyUpdate=false;f.setFailDelete(true);const afterExpiry='2999-01-01T00:00:00.000Z';
  await assert.rejects(()=>cleanupPrivateJobs(f.env,afterExpiry));assert.equal(f.db.sql.prepare('SELECT status FROM creator_upload').get()!.status,'uploading');
  f.setFailDelete(false);await cleanupPrivateJobs(f.env,afterExpiry);assert.equal(f.objects.size,0);assert.equal(f.db.sql.prepare('SELECT status FROM creator_upload').get()!.status,'expired');
 }
});

test('two client addresses have separate photo admission windows and share the bounded upload budget',async()=>{
 const f=fixture(),bytes=await source();
 const upload=async(ip:string)=>{const request=new Request('https://jot.test/api/creator/uploads',{method:'POST',headers:{'cf-connecting-ip':ip},body:bytes});await rateLimit(request,f.env,'photo-upload',4);return uploadPhoto(request,f.env,'dummy-owner');};
 for(const ip of ['192.0.2.1','192.0.2.2']){for(let n=0;n<4;n++)await upload(ip);await assert.rejects(()=>upload(ip),{code:'RATE_LIMITED'});}
 assert.equal(f.objects.size,8);assert.equal(f.db.sql.prepare('SELECT COUNT(*) AS count FROM creator_upload').get()!.count,8);assert.equal(f.db.sql.prepare("SELECT count FROM request_limit WHERE scope='photo-upload-admission'").get()!.count,8);assert.equal(f.providerCalls(),0);
});

test('scheduled recovery requeues only eligible jobs and expires old private uploads',async()=>{
 const f=fixture(),queued:string[]=[];f.env.AI_QUEUE={send:async message=>{queued.push((message as {job_id:string}).job_id);}};
 for(const [id,status]of [['waiting','queued'],['busy','processing'],['recoverable','processing'],['unknown','running']] as const)seed(f.db,id,status);
 f.db.sql.prepare("UPDATE creator_job SET processing_token='live-token',processing_lease_until='2998-01-01' WHERE id='busy'").run();
 f.db.sql.prepare("UPDATE creator_job SET processing_token='expired-token',processing_lease_until='2000-01-01' WHERE id='recoverable'").run();
 f.db.sql.prepare("UPDATE creator_job SET started_at='2000-01-01' WHERE id='unknown'").run();
 f.db.sql.exec("INSERT INTO creator_upload VALUES('old-upload','dummy-owner','uploads/dummy-owner/old.png','image/png',1,'sha','uploading','2000-01-01')");f.objects.set('uploads/dummy-owner/old.png',new Uint8Array([1]));
 await jobsWorker.scheduled({},f.env);
 assert.deepEqual(queued.sort(),['recoverable','waiting']);assert.equal(row(f.db,'busy').status,'processing');assert.equal(row(f.db,'unknown').status,'billing_unknown');assert.equal(f.objects.size,0);assert.equal(f.db.sql.prepare("SELECT status FROM creator_upload WHERE id='old-upload'").get()!.status,'expired');assert.equal(f.providerCalls(),0);
});
