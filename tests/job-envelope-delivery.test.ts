import test from 'node:test';import assert from 'node:assert/strict';
import jobs from '../workers/jobs/index';import type {Env} from '../src/server/types';
function delivery(body:unknown,attempts=4){let acknowledged=0;const retries:number[]=[];return{body,attempts,ack(){acknowledged++;},retry(options?:{delaySeconds:number}){retries.push(options!.delaySeconds);},get acknowledged(){return acknowledged;},retries};}
test('malformed queue envelopes are acknowledged without reading storage or retrying',async()=>{
 const values:unknown[]=[null,undefined,false,0,'ai',[],{}, {type:null},{type:9},{type:'ai',job_id:7},{type:'projection',event_id:{}},{type:'reviewed_bundle',sha256:[]},{type:'reviewed_bundle',signature:false},{type:'import',object_key:{}},{type:'discovery_notify',revision:7},{type:'unsupported'}];
 const messages=values.map(value=>delivery(value));
 const env=new Proxy({},{get(){throw Error('Malformed deliveries must not touch a service binding');}}) as Env;
 await assert.doesNotReject(()=>jobs.queue({messages},env));
 for(const message of messages){assert.equal(message.acknowledged,1);assert.deepEqual(message.retries,[]);}
});
test('a malformed delivery cannot prevent the following valid projection from completing',async()=>{
 const ids:string[]=[];const db:any={prepare(sql:string){assert.match(sql,/^SELECT \* FROM outbox_event WHERE event_id=/);return{bind(id:string){ids.push(id);return this;},async first(){return null;}};}};
 const invalid=delivery(null),valid=delivery({type:'projection',event_id:'missing-event'});
 await jobs.queue({messages:[invalid,valid]}, {CATALOG_DB:db,SEARCH_DB:db} as Env);
 assert.equal(invalid.acknowledged,1);assert.equal(valid.acknowledged,1);assert.deepEqual(valid.retries,[]);assert.deepEqual(ids,['missing-event']);
});
test('a valid transient failure retains its retry and does not block a later valid delivery',async()=>{
 const ids:string[]=[];const db:any={prepare(sql:string){assert.match(sql,/^SELECT \* FROM outbox_event WHERE event_id=/);let current='';return{bind(id:string){current=id;ids.push(id);return this;},async first(){if(current==='temporary-failure')throw Error('Synthetic transient database failure');return null;}};}};
 const failed=delivery({type:'projection',event_id:'temporary-failure'}),next=delivery({type:'projection',event_id:'missing-event'});
 await jobs.queue({messages:[failed,next]},{CATALOG_DB:db,SEARCH_DB:db} as Env);
 assert.equal(failed.acknowledged,0);assert.equal(failed.retries.length,1);assert.ok(failed.retries[0]>=160&&failed.retries[0]<=170);
 assert.equal(next.acknowledged,1);assert.deepEqual(next.retries,[]);assert.deepEqual(ids,['temporary-failure','missing-event']);
});
