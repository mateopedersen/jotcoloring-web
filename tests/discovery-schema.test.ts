import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';
import {upgradeDiscoverySchema} from '../scripts/ops/discovery-schema';
function fixture(){
 const sql=new DatabaseSync(':memory:');sql.exec("CREATE TABLE discovery_state(id INTEGER PRIMARY KEY,epoch INTEGER NOT NULL DEFAULT 0,reconcile_after INTEGER NOT NULL DEFAULT 0);INSERT INTO discovery_state VALUES(1,42,7);CREATE TABLE d1_migrations(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE NOT NULL,applied_at TEXT DEFAULT CURRENT_TIMESTAMP)");
 const db:any={prepare(query:string){let values:any[]=[];return{bind(...args:any[]){values=args;return this},async first(){return sql.prepare(query).get(...values)||null},async all(){return{results:sql.prepare(query).all(...values),success:true}},async run(){return{results:[],success:true,meta:{changes:Number(sql.prepare(query).run(...values).changes)}}}}},async batch(statements:any[]){sql.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sql.exec('COMMIT');return results;}catch(error){sql.exec('ROLLBACK');throw error;}}};
 const files=new Map<string,Uint8Array>(),bucket:any={async put(key:string,value:Uint8Array){files.set(key,value.slice())},async get(key:string){const bytes=files.get(key);return bytes?{size:bytes.length,arrayBuffer:async()=>bytes.slice().buffer}:null}};
 return{sql,files,env:{APP_ENV:'staging',CATALOG_DB:db,BACKUPS:bucket} as any};
}
test('discovery migration plans without writes, backs up exact old state, preserves its epoch and is idempotent',async(t)=>{
 const f=fixture();t.after(()=>f.sql.close());assert.equal((await upgradeDiscoverySchema(f.env)).status,'PLAN_ONLY');assert.equal(f.files.size,0);
 const applied=await upgradeDiscoverySchema(f.env,true);assert.equal(applied.status,'APPLIED');assert.equal(f.files.size,1);
 const original=JSON.parse(new TextDecoder().decode([...f.files.values()][0]));assert.deepEqual(original.rows,[{id:1,epoch:42,reconcile_after:7}]);
 const current=f.sql.prepare('SELECT * FROM discovery_state').get()!;assert.equal(current.epoch,42);assert.equal(current.reconcile_after,7);assert.equal(current.rebuild_state,'idle');assert.equal(current.rebuild_completed_at,'');
 assert.equal((await upgradeDiscoverySchema(f.env,true)).status,'READY');assert.equal(f.files.size,1);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM d1_migrations').get()!.n,1);
});
test('a failed private backup blocks schema mutation and a partial additive upgrade can safely resume',async(t)=>{
 const f=fixture();t.after(()=>f.sql.close());const get=f.env.BACKUPS.get;f.env.BACKUPS.get=async()=>null;
 await assert.rejects(()=>upgradeDiscoverySchema(f.env,true),/Recovery copy/);assert.equal(f.sql.prepare('PRAGMA table_info(discovery_state)').all().length,3);
 f.env.BACKUPS.get=get;f.sql.exec("ALTER TABLE discovery_state ADD COLUMN rebuild_state TEXT NOT NULL DEFAULT 'idle'");
 assert.equal((await upgradeDiscoverySchema(f.env,true)).status,'APPLIED');assert.equal(f.sql.prepare('PRAGMA table_info(discovery_state)').all().length,10);
});
