import test from 'node:test';
import assert from 'node:assert/strict';
import {publicCatalogDatabase,isTransientCatalogReadError} from '../src/server/catalog-reads';
import type {Database,Statement} from '../src/server/types';

function fixture(operation:()=>Promise<unknown>){
 let calls=0,writes=0,batches=0;
 const db:Database={
  prepare(){
   const execute=async()=>{calls++;return operation();};
   const statement:Statement={bind(){return statement;},first:execute as Statement['first'],all:execute as Statement['all'],async run(){writes++;return{results:[],success:true,meta:{}};}};
   return statement;
  },
  async batch(){batches++;return [];},async exec(){writes++;}
 };
 return{db,get calls(){return calls;},get writes(){return writes;},get batches(){return batches;}};
}

test('concurrent identical reads share the database operation, with independent returned objects',async()=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
 const f=fixture(async()=>{await gate;return{count:42};}),db=publicCatalogDatabase(f.db);
 assert.notEqual(db,publicCatalogDatabase(f.db),'a shared Workers binding must not retain request I/O');
 const reads=Array.from({length:30},()=>db.prepare('SELECT COUNT(*) AS count FROM content WHERE status=?').bind('published').first<{count:number}>());
 assert.equal(f.calls,1);release();const results=await Promise.all(reads);
 assert.ok(results.every(value=>value?.count===42));results[0]!.count=0;assert.equal(results[1]!.count,42);
 await db.prepare('SELECT COUNT(*) AS count FROM content WHERE status=?').bind('published').first();assert.equal(f.calls,2,'completed data is not cached');
});

test('independent requests on the same binding never share pending I/O or failures',async()=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
 const f=fixture(async()=>{const call=f.calls;await gate;if(call===1)throw new Error('The originating request was canceled');return{count:call};});
 const first=publicCatalogDatabase(f.db),second=publicCatalogDatabase(f.db);
 const one=first.prepare('SELECT COUNT(*) AS count FROM content').first(),two=second.prepare('SELECT COUNT(*) AS count FROM content').first();
 assert.equal(f.calls,2,'identical SQL in another request needs its own I/O');release();
 const results=await Promise.allSettled([one,two]);assert.equal(results[0].status,'rejected');assert.deepEqual(results[1],{status:'fulfilled',value:{count:2}});
});

test('parameters, result method, column selection and databases keep independent reads',async()=>{
 const f=fixture(async()=>({count:1})),other=fixture(async()=>({count:2})),db=publicCatalogDatabase(f.db);
 const results=await Promise.all([
  db.prepare('SELECT count FROM content WHERE status=?').bind('published').first(),
  db.prepare('SELECT count FROM content WHERE status=?').bind('draft').first(),
  db.prepare('SELECT count FROM content WHERE status=?').bind('published').all(),
  db.prepare('SELECT count FROM content WHERE status=?').bind('published').first('count'),
  publicCatalogDatabase(other.db).prepare('SELECT count FROM content WHERE status=?').bind('published').first()
 ]);
 assert.equal(f.calls,4);assert.equal(other.calls,1);assert.deepEqual(results.at(-1),{count:2});
});

test('transient overload gets one shared retry and a later request reads fresh data',async()=>{
 let attempts=0;const f=fixture(async()=>{if(++attempts===1)throw Error('D1_ERROR: D1 DB is overloaded. Too many resources consumed within a 10 second window');return{count:attempts};}),db=publicCatalogDatabase(f.db);
 const results=await Promise.all(Array.from({length:20},()=>db.prepare('SELECT count FROM content').first()));
 assert.equal(f.calls,2);assert.ok(results.every(value=>(value as {count:number}).count===2));
 await db.prepare('SELECT count FROM content').first();assert.equal(f.calls,3);
});

test('persistent overload is bounded and rejected operations do not poison later requests',async()=>{
 let failing=true;const f=fixture(async()=>{if(failing)throw Error('D1_ERROR: D1 DB is overloaded');return{count:7};}),db=publicCatalogDatabase(f.db);
 await assert.rejects(()=>db.prepare('SELECT count FROM content').first(),/overloaded/);assert.equal(f.calls,2);
 failing=false;assert.deepEqual(await db.prepare('SELECT count FROM content').first(),{count:7});assert.equal(f.calls,3);
});

test('validation, permanent failures, writes, CTE mutations and batches are never retried or coalesced',async()=>{
 const f=fixture(async()=>{throw Error('SQLITE_ERROR: no such table');}),db=publicCatalogDatabase(f.db);
 await assert.rejects(()=>db.prepare('SELECT * FROM missing').first(),/no such table/);assert.equal(f.calls,1);
 await Promise.all([db.prepare('UPDATE content SET title=?').bind('one').run(),db.prepare('UPDATE content SET title=?').bind('one').run()]);
 await db.exec('DELETE FROM content WHERE id=1');await db.batch([db.prepare('UPDATE content SET title=?').bind('two')]);
 assert.equal(f.writes,3);assert.equal(f.batches,1);
 const cte=db.prepare('WITH old AS (SELECT id FROM content) DELETE FROM content RETURNING id');
 await assert.rejects(()=>cte.first(),/no such table/);assert.equal(f.calls,2);
});

test('D1 wrapped connection resets receive exactly one shared read retry',async()=>{
 for(const cause of ['Network connection lost.','The code was updated.','The replica was disconnected.','A transient error on a remote node.','The storage caused the object to be reset.']){
  let attempts=0;const f=fixture(async()=>{if(++attempts===1)throw new Error('D1_ERROR: Database read failed',{cause:new Error(cause)});return{count:9};}),db=publicCatalogDatabase(f.db);
  const results=await Promise.all(Array.from({length:8},()=>db.prepare('SELECT count FROM content').first()));
  assert.equal(f.calls,2,cause);assert.ok(results.every(value=>(value as {count:number}).count===9));
 }
});

test('transient classification handles cycles and rejects unknown or permanent failures',()=>{
 const cyclic=new Error('D1_ERROR: request failed');cyclic.cause=cyclic;
 assert.equal(isTransientCatalogReadError(cyclic),false);
 assert.equal(isTransientCatalogReadError({cause:{message:'D1 DB is overloaded'}}),true);
 for(const error of [new Error('D1_ERROR: unknown failure'),new Error('SQLITE_ERROR: no such table',{cause:new Error('Network connection lost.')}),new Error('VALIDATION_ERROR: invalid input'),null])assert.equal(isTransientCatalogReadError(error),false);
});

test('a persistent wrapped connection reset is bounded without retrying CTE or write operations',async()=>{
 const f=fixture(async()=>{throw new Error('D1_ERROR: Database read failed',{cause:new Error('Network connection lost.')});}),db=publicCatalogDatabase(f.db);
 await assert.rejects(()=>db.prepare('SELECT count FROM content').all(),/Database read failed/);assert.equal(f.calls,2);
 await assert.rejects(()=>db.prepare('WITH ids AS (SELECT id FROM content) DELETE FROM content RETURNING id').first(),/Database read failed/);assert.equal(f.calls,3);
 await db.prepare('UPDATE content SET title=?').bind('One').run();assert.equal(f.writes,1);
});
