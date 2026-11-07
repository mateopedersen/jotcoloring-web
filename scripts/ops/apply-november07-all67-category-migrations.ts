/** Apply the two exact, backed-up category migrations and verify their lineage. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {remoteContext} from './release-context';
import {canonicalJSON,sha256} from '../../src/server/http';
import {categoryLineage} from '../../src/taxonomy/catalog';
import {NOVEMBER_07_ALL_67_TOPIC_COUNTS} from '../../src/server/reviewed-release-scope';

const environment='production';
const migrations=['0027_november_07_additional_car_brands.sql','0028_november_07_additional_topics.sql'];
const snapshotPath=path.resolve('.local/cloud-backup/targeted-catalog/production/november07-all67-category-migration-snapshot.json');
const receipt=JSON.parse(await fs.readFile(snapshotPath,'utf8'));
if(receipt.status!=='BACKUP_VERIFIED'||receipt.source_database!=='jotcoloring-production-catalog'||receipt.r2_readback!=='PASS')throw new Error('Verified private migration backup required.');
const config=JSON.parse(await fs.readFile('wrangler.jsonc','utf8'));
const database=config.env.production.d1_databases.find((row:any)=>row.binding==='CATALOG_DB');
const {env,api,requests}=await remoteContext(environment,{requestLimit:200});
const details=await api(`/d1/database/${database.database_id}`);
if(details.name!==receipt.source_database||database.database_id!==receipt.source_database_id)throw new Error('Production catalog identity changed.');
const backup=await env.BACKUPS!.get(receipt.key);
if(!backup||backup.size!==receipt.bytes||await sha256(new Uint8Array(await backup.arrayBuffer()))!==receipt.sha256)throw new Error('Immutable private migration backup no longer verifies.');
const before=JSON.parse(new TextDecoder().decode(await backup.arrayBuffer()));
const migrationRows:any[]=[],statements:any[]=[],names:string[]=[];
for(const name of migrations){
 const bytes=new Uint8Array(await fs.readFile(`migrations/catalog/${name}`)),digest=await sha256(bytes);
 const pinned=receipt.migrations.find((row:any)=>row.name===name);
 if(!pinned||pinned.sha256!==digest)throw new Error('Migration bytes differ from the backed up review: '+name);
 names.push(name);
 for(const line of new TextDecoder().decode(bytes).split(/\r?\n/)){
  const match=line.match(/^INSERT INTO category\(id,name,parent_id,sort_order\) VALUES\('([^']+)','([^']+)','([^']+)',(\d+)\) ON CONFLICT\(id\) DO NOTHING;$/);
  if(match){migrationRows.push({id:match[1],name:match[2],parent_id:match[3],sort_order:Number(match[4]),migration:name});statements.push(env.CATALOG_DB!.prepare(line));}
 }
}
if(migrationRows.length!==67||new Set(migrationRows.map(row=>row.id)).size!==67)throw new Error('Expected exactly 67 new category rows.');
const migrationsTable=(await env.CATALOG_DB!.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='d1_migrations'").all()).results;
if(migrationsTable.length!==1)throw new Error('D1 migration ledger is unavailable.');
const history=(await env.CATALOG_DB!.prepare('SELECT name FROM d1_migrations ORDER BY id').all<{name:string}>()).results;
if(names.some(name=>history.some(row=>row.name===name)))throw new Error('Target migration was applied by another process; reconcile the live state first.');
const currentRows=(await env.CATALOG_DB!.prepare('SELECT id,name,parent_id,sort_order FROM category ORDER BY id').all()).results as any[];
if(canonicalJSON(currentRows)!==canonicalJSON(before.category_rows)||canonicalJSON(history)!==canonicalJSON(before.migration_history))throw new Error('Production categories or migration history changed after the private before-image.');
const expectedParents=[...new Set(migrationRows.map(row=>row.parent_id))];
if(expectedParents.some(parent=>!currentRows.some(row=>row.id===parent)))throw new Error('A reviewed parent category is missing.');
for(const name of migrations)statements.push(env.CATALOG_DB!.prepare('INSERT INTO d1_migrations(name) VALUES(?)').bind(name));
await env.CATALOG_DB!.batch(statements);
const afterRows=(await env.CATALOG_DB!.prepare('SELECT id,name,parent_id,sort_order FROM category ORDER BY id').all()).results as any[];
const afterHistory=(await env.CATALOG_DB!.prepare('SELECT name FROM d1_migrations ORDER BY id').all<{name:string}>()).results;
const afterByID=new Map(afterRows.map(row=>[row.id,row]));
for(const row of migrationRows){const actual=afterByID.get(row.id);if(!actual||actual.name!==row.name||actual.parent_id!==row.parent_id||actual.sort_order!==row.sort_order)throw new Error('Live category row readback mismatch: '+row.id);}
if(names.some(name=>!afterHistory.some(row=>row.name===name)))throw new Error('Migration ledger readback mismatch.');
for(const [topic,count] of Object.entries(NOVEMBER_07_ALL_67_TOPIC_COUNTS)){
 if(count!==100)throw new Error('Unexpected release topic count: '+topic);
 const chain:string[]=[];let current=afterByID.get(topic);while(current){chain.unshift(current.id);current=current.parent_id?afterByID.get(current.parent_id):undefined;}
 if(chain.at(-1)!==topic||canonicalJSON(chain)!==canonicalJSON(categoryLineage(topic)))throw new Error('Live taxonomy lineage differs from the reviewed site hierarchy: '+topic);
}
const result={status:'MIGRATIONS_APPLIED_AND_VERIFIED',environment,source_database:details.name,migrations:migrations.map(name=>({name,sha256:receipt.migrations.find((row:any)=>row.name===name).sha256})),categories:67,topics:Object.keys(NOVEMBER_07_ALL_67_TOPIC_COUNTS).length,private_before_image_sha256:receipt.sha256,private_before_image_readback:'PASS',live_category_rows_readback:'PASS',live_full_parent_lineage:'PASS',requests:requests()};
await fs.writeFile(path.join(path.dirname(snapshotPath),'november07-all67-category-migration-applied.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify(result));
