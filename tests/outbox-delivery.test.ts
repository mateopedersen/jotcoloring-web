import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {dispatchOutbox} from '../src/server/imports';
import type {Database,Statement,D1Result,Env} from '../src/server/types';

class LocalD1 implements Database {
 sql=new DatabaseSync(':memory:'); afterSelect?:()=>void;
 constructor(){this.sql.exec(fs.readFileSync('migrations/catalog/0001_catalog.sql','utf8'));}
 prepare(sql:string):Statement {
  let values:unknown[]=[];const self=this;
  const statement:Statement={
   bind(...v:unknown[]){values=v;return statement;},
   async all<T>(){const rows=self.sql.prepare(sql).all(...values as never[]) as T[];if(sql.startsWith('SELECT event_id,content_id,version FROM outbox_event')){const hook=self.afterSelect;self.afterSelect=undefined;hook?.();}return {results:rows,success:true,meta:{}};},
   async first<T>(column?:string){const row=self.sql.prepare(sql).get(...values as never[]) as Record<string,unknown>|undefined;return (column?row?.[column]:row||null) as T|null;},
   async run<T>(){const result=self.sql.prepare(sql).run(...values as never[]);return {results:[],success:true,meta:{changes:Number(result.changes)}} as D1Result<T>;},
  };return statement;
 }
 async batch<T>(statements:Statement[]){return Promise.all(statements.map(s=>s.run<T>()));}
 async exec(sql:string){this.sql.exec(sql);return {};}
}
function setup(){const db=new LocalD1(),messages:unknown[]=[];const env={CATALOG_DB:db,INGEST_QUEUE:{async send(message:unknown){messages.push(message);}}} as Env;return {db,env,messages};}
function insert(db:LocalD1,id:string,delivered:string|null=null,processed:string|null=null){db.sql.prepare("INSERT INTO outbox_event(event_id,content_id,version,event_type,delivered_at,processed_at) VALUES(?,?,1,'published',?,?)").run(id,'content-'+id,delivered,processed);}

test('repeated publication dispatch does not enqueue an unprocessed event again within its lease',async()=>{
 const {db,env,messages}=setup();insert(db,'one');await dispatchOutbox(env);await dispatchOutbox(env);await dispatchOutbox(env);
 assert.deepEqual(messages,[{type:'projection',event_id:'one'}]);assert.equal(db.sql.prepare('SELECT attempts FROM outbox_event').get()?.attempts,1);
});
test('concurrent dispatchers acquire one delivery claim for the same pending event',async()=>{
 const {db,env,messages}=setup();insert(db,'one');await Promise.all([dispatchOutbox(env),dispatchOutbox(env),dispatchOutbox(env)]);assert.equal(messages.length,1);assert.equal(db.sql.prepare('SELECT attempts FROM outbox_event').get()?.attempts,1);
});
test('expired delivery leases retry while fresh leases and processed events stay untouched',async()=>{
 const {db,env,messages}=setup();insert(db,'stale',new Date(Date.now()-16*60000).toISOString());insert(db,'fresh',new Date().toISOString());insert(db,'processed',null,new Date().toISOString());await dispatchOutbox(env);await dispatchOutbox(env);assert.deepEqual(messages,[{type:'projection',event_id:'stale'}]);
});
test('a queue send failure releases its claim so the next dispatch can recover',async()=>{
 const {db,env,messages}=setup();insert(db,'one');const send=env.INGEST_QUEUE!.send;env.INGEST_QUEUE!.send=async()=>{throw Error('Queue temporarily unavailable');};await assert.rejects(dispatchOutbox(env),/Queue temporarily unavailable/);const failed=db.sql.prepare('SELECT delivered_at,attempts,last_error FROM outbox_event').get();assert.equal(failed?.delivered_at,null);assert.equal(failed?.attempts,1);assert.equal(failed?.last_error,'QUEUE_DELIVERY_FAILED');env.INGEST_QUEUE!.send=send;await dispatchOutbox(env);assert.equal(messages.length,1);assert.equal(db.sql.prepare('SELECT attempts FROM outbox_event').get()?.attempts,2);
});
test('failure cleanup cannot remove a newer delivery claim',async()=>{
 const {db,env}=setup();insert(db,'one');const newer=new Date(Date.now()+60000).toISOString();env.INGEST_QUEUE!.send=async()=>{db.sql.prepare("UPDATE outbox_event SET delivered_at=? WHERE event_id='one'").run(newer);throw Error('Queue temporarily unavailable');};await assert.rejects(dispatchOutbox(env));assert.equal(db.sql.prepare('SELECT delivered_at FROM outbox_event').get()?.delivered_at,newer);
});
test('an event processed after selection is not sent again',async()=>{
 const {db,env,messages}=setup();insert(db,'one');db.afterSelect=()=>db.sql.prepare("UPDATE outbox_event SET processed_at=? WHERE event_id='one'").run(new Date().toISOString());await dispatchOutbox(env);assert.equal(messages.length,0);assert.equal(db.sql.prepare('SELECT attempts FROM outbox_event').get()?.attempts,0);
});
test('the existing 25-event bound advances to later undelivered events without resending the first batch',async()=>{
 const {db,env,messages}=setup();for(let n=0;n<30;n++)insert(db,String(n));await dispatchOutbox(env);assert.equal(messages.length,25);await dispatchOutbox(env);assert.equal(messages.length,30);assert.equal(new Set(messages.map(x=>(x as {event_id:string}).event_id)).size,30);
});
