/** Add only the exact 36 Cars topics, after a private before-image readback. */
import fs from 'node:fs/promises';import path from 'node:path';import {remoteContext} from './release-context';import {canonicalJSON,sha256} from '../../src/server/http';import {NOVEMBER_08_AUTOMOBILE_BRAND_TOPICS as topics} from '../../src/taxonomy/november-08-automobile-brands';
const migration='0030_november_08_automobile_brand_topics.sql',bytes=new Uint8Array(await fs.readFile('migrations/catalog/'+migration)),migrationSHA=await sha256(bytes);
const {env,api,requests}=await remoteContext('production',{requestLimit:80}),db=env.CATALOG_DB!;
const categoryRows=async()=>(await db.prepare('SELECT id,name,parent_id,sort_order FROM category ORDER BY id').all<any>()).results;
const historyRows=async()=>(await db.prepare('SELECT name FROM d1_migrations ORDER BY id').all<any>()).results;
const before=await categoryRows(),history=await historyRows(),ids=new Map(before.map((r:any)=>[r.id,r]));
if(topics.length!==36||!ids.has('cars'))throw Error('Exact topic scope and Cars parent required');
for(const t of topics){const old=ids.get(t.id);if(old&&(old.name!==t.name||old.parent_id!=='cars'))throw Error('Existing topic identity conflict: '+t.id);}
async function verify(){const current=new Map((await categoryRows()).map((r:any)=>[r.id,r]));for(const [i,t]of topics.entries()){const r=current.get(t.id);if(!r||r.name!==t.name||r.parent_id!=='cars'||r.sort_order!==500+i)throw Error('Category readback failed: '+t.id);}if(!(await historyRows()).some((r:any)=>r.name===migration))throw Error('Migration ledger readback failed');}
if(history.some((r:any)=>r.name===migration)){await verify();console.log(JSON.stringify({status:'ALREADY_APPLIED_VERIFIED',topics:36}));process.exit(0);}
if(!process.argv.includes('--apply')){console.log(JSON.stringify({status:'PLAN',topics:36,new_topics:topics.filter(t=>!ids.has(t.id)).length,migration_sha256:migrationSHA}));process.exit(0);}
const details=await api('/d1/database/d075722e-c698-4b6e-a5e4-f53ae5c9e411');if(details.name!=='jotcoloring-production-catalog')throw Error('Incorrect production database');
const snapshot={format:'jotcoloring-category-before-image/1',source_database:details.name,source_database_id:details.uuid||'d075722e-c698-4b6e-a5e4-f53ae5c9e411',category_rows:before,migration_history:history,migration,migration_sha256:migrationSHA,captured_at:new Date().toISOString()};
const snapshotBytes=new TextEncoder().encode(canonicalJSON(snapshot)),snapshotSHA=await sha256(snapshotBytes),key='operator-snapshots/november08-automobile-categories/'+snapshotSHA+'.json';
await env.BACKUPS!.put(key,snapshotBytes,{httpMetadata:{contentType:'application/json'}});const readback=await env.BACKUPS!.get(key);if(!readback||readback.size!==snapshotBytes.length||await sha256(new Uint8Array(await readback.arrayBuffer()))!==snapshotSHA)throw Error('Private before-image readback failed');
if(canonicalJSON(await categoryRows())!==canonicalJSON(before)||canonicalJSON(await historyRows())!==canonicalJSON(history))throw Error('Concurrent category update; restart with a fresh before-image');
const statements=new TextDecoder().decode(bytes).split(/\r?\n/).filter(s=>s.startsWith('INSERT INTO category('));if(statements.length!==36)throw Error('Migration is not exactly 36 topic inserts');
await db.batch([...statements.map(s=>db.prepare(s)),db.prepare('INSERT INTO d1_migrations(name) VALUES(?)').bind(migration)]);await verify();
const receipt={status:'MIGRATION_APPLIED_AND_VERIFIED',migration,migration_sha256:migrationSHA,topics:36,backup_key:key,backup_sha256:snapshotSHA,backup_readback:'PASS',category_readback:'PASS',requests:requests()};const out=path.resolve('../incoming-2026-11-08/automobiles/private-release/category-migration-receipt.json');await fs.writeFile(out,JSON.stringify(receipt,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(receipt));
