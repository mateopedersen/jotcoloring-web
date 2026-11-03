import test from 'node:test';import assert from 'node:assert/strict';
import jobs from '../workers/jobs/index';import type {Env} from '../src/server/types';
function fixture(updatedAt:string,raceStatus='processing'){
 let claims=0,storageReads=0;const sqlWrites:string[]=[];
 const db:any={prepare(sql:string){return{bind(){return this;},async first(){
  if(sql.startsWith('SELECT * FROM import_job'))return{id:'leased-job',status:'processing',owner:'operator',payload_sha256:'a'.repeat(64)};
  if(sql.startsWith('SELECT status,updated_at FROM import_job'))return{status:raceStatus,updated_at:updatedAt};
  throw Error('Unexpected lease query '+sql);
 },async run(){sqlWrites.push(sql);if(sql.startsWith("UPDATE import_job SET status='processing'")){claims++;return{success:true,meta:{changes:0}};}throw Error('Unexpected state mutation '+sql);}};}};
 const bucket:any={async get(){storageReads++;throw Error('An unclaimed import must not read media');}};
 const env={CATALOG_DB:db,ORIGINALS:bucket,PUBLISHED:bucket,BACKUPS:bucket} as Env;
 let acked=0;const retries:number[]=[];const message={body:{type:'import',job_id:'leased-job',object_key:'imports/leased-job/manifest.json'},attempts:4,ack(){acked++;},retry(options?:{delaySeconds:number}){retries.push(options!.delaySeconds);}};
 return{env,message,retries,get acked(){return acked;},get claims(){return claims;},get storageReads(){return storageReads;},sqlWrites};
}
test('normal import redelivery retains an active lease and defers instead of acknowledging unfinished work',async()=>{
 const f=fixture(new Date().toISOString());await jobs.queue({messages:[f.message]},f.env);
 assert.equal(f.acked,0);assert.equal(f.claims,1);assert.equal(f.storageReads,0);assert.equal(f.sqlWrites.length,1);
 assert.equal(f.retries.length,1);assert.ok(f.retries[0]>=899&&f.retries[0]<=901,'wait for the existing15-minute lease without short retry exhaustion');
});
test('a delivery that lost its claim to an already completed import is acknowledged',async()=>{
 const f=fixture(new Date().toISOString(),'completed');await jobs.queue({messages:[f.message]},f.env);assert.equal(f.acked,1);assert.deepEqual(f.retries,[]);assert.equal(f.storageReads,0);
});
test('a failed claim at an expired lease boundary is retained for a short safe redelivery',async()=>{
 const f=fixture(new Date(Date.now()-16*60000).toISOString());await jobs.queue({messages:[f.message]},f.env);assert.equal(f.acked,0);assert.deepEqual(f.retries,[1]);assert.equal(f.storageReads,0);
});
test('invalid processing-lease timestamps fail closed without acknowledging or reading media',async()=>{
 const f=fixture('not-a-date');await jobs.queue({messages:[f.message]},f.env);assert.equal(f.acked,0);assert.equal(f.retries.length,1);assert.equal(f.storageReads,0);
});
