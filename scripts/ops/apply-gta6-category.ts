/** Add the single reviewed GTA 6 category after a verified private before-image. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {remoteContext} from './release-context';
import {canonicalJSON,sha256} from '../../src/server/http';
import {GTA6_TOPICS} from '../../src/taxonomy/gta6';

const environment='production';
const migration='0032_gta_6_topic.sql';
const source=new Uint8Array(await fs.readFile(`migrations/catalog/${migration}`));
const migrationSHA=await sha256(source);
const sql=new TextDecoder().decode(source);
const inserts=sql.split(/\r?\n/).filter(line=>line.startsWith('VALUES('));
const match=inserts[0]?.match(/^VALUES\('([^']+)','([^']+)','([^']+)',(\d+)\)$/);
if(inserts.length!==1||!match||GTA6_TOPICS.length!==1)throw new Error('The GTA 6 migration must contain exactly one reviewed category.');
const expected={id:match[1],name:match[2],parent_id:match[3],sort_order:Number(match[4])};
if(expected.id!=='gta-6'||expected.name!=='GTA 6'||expected.parent_id!=='video-games'||expected.sort_order!==600)throw new Error('The migration does not match the exact reviewed GTA 6 taxonomy.');

const {env,api,requests}=await remoteContext(environment,{requestLimit:100});
const db=env.CATALOG_DB!;
const details=await api('/d1/database/d075722e-c698-4b6e-a5e4-f53ae5c9e411');
if(details.name!=='jotcoloring-production-catalog')throw new Error('Incorrect production catalog database.');
const categoryRows=async()=>(await db.prepare('SELECT id,name,parent_id,sort_order FROM category ORDER BY id').all<any>()).results;
const historyRows=async()=>(await db.prepare('SELECT name FROM d1_migrations ORDER BY id').all<any>()).results;
const before=await categoryRows();
const history=await historyRows();
const byID=new Map(before.map((row:any)=>[row.id,row]));
if(!byID.has('video-games'))throw new Error('The reviewed Video Games parent is missing.');

async function verify(){
 const actual=byID.get(expected.id);
 const current=new Map((await categoryRows()).map((row:any)=>[row.id,row]));
 const topic=current.get(expected.id);
 if(!topic||topic.name!==expected.name||topic.parent_id!==expected.parent_id||topic.sort_order!==expected.sort_order)throw new Error('Live GTA 6 category readback mismatch.');
 if(!(await historyRows()).some((row:any)=>row.name===migration))throw new Error('Live migration ledger readback mismatch.');
 return actual;
}

if(history.some((row:any)=>row.name===migration)){
 await verify();
 console.log(JSON.stringify({status:'ALREADY_APPLIED_VERIFIED',topic:expected.id,migration_sha256:migrationSHA}));
 process.exit(0);
}
if(byID.has(expected.id))throw new Error('The GTA 6 category exists without its migration receipt; reconcile live state before proceeding.');
if(!process.argv.includes('--apply')){
 console.log(JSON.stringify({status:'PLAN',environment,database:details.name,topic:expected.id,parent:expected.parent_id,migration,migration_sha256:migrationSHA,requests:requests()}));
 process.exit(0);
}

const snapshot={format:'jotcoloring-category-before-image/1',source_database:details.name,source_database_id:details.uuid||'d075722e-c698-4b6e-a5e4-f53ae5c9e411',category_rows:before,migration_history:history,migration,migration_sha256:migrationSHA,captured_at:new Date().toISOString()};
const snapshotBytes=new TextEncoder().encode(canonicalJSON(snapshot));
const snapshotSHA=await sha256(snapshotBytes);
const key=`operator-snapshots/gta6-category/${snapshotSHA}.json`;
if(await env.BACKUPS!.get(key))throw new Error('Immutable GTA 6 migration backup key already exists.');
await env.BACKUPS!.put(key,snapshotBytes,{httpMetadata:{contentType:'application/json'}});
const readback=await env.BACKUPS!.get(key);
if(!readback||readback.size!==snapshotBytes.length||await sha256(new Uint8Array(await readback.arrayBuffer()))!==snapshotSHA)throw new Error('Private production category before-image readback failed.');
if(canonicalJSON(await categoryRows())!==canonicalJSON(before)||canonicalJSON(await historyRows())!==canonicalJSON(history))throw new Error('Production category state changed after the before-image; restart from a fresh snapshot.');

await db.batch([db.prepare(sql),db.prepare('INSERT INTO d1_migrations(name) VALUES(?)').bind(migration)]);
await verify();
const receipt={status:'MIGRATION_APPLIED_AND_VERIFIED',environment,database:details.name,topic:expected.id,parent:expected.parent_id,migration,migration_sha256:migrationSHA,backup_key:key,backup_sha256:snapshotSHA,backup_readback:'PASS',category_readback:'PASS',requests:requests()};
const output=path.resolve('.local/gta6-category-migration/production/receipt.json');
await fs.mkdir(path.dirname(output),{recursive:true,mode:0o700});
await fs.writeFile(output,JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify(receipt));
