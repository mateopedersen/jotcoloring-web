/** Private before-image for the additive November 7 category migrations. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {remoteContext} from './release-context';
import {canonicalJSON,sha256} from '../../src/server/http';

const environment='production';
const migrations=['0027_november_07_additional_car_brands.sql','0028_november_07_additional_topics.sql'];
const config=JSON.parse(await fs.readFile('wrangler.jsonc','utf8'));
const database=config.env.production.d1_databases.find((row:any)=>row.binding==='CATALOG_DB');
const {env,api,requests}=await remoteContext(environment,{requestLimit:200});
const details=await api(`/d1/database/${database.database_id}`);
if(details.name!=='jotcoloring-production-catalog')throw new Error('Production catalog identity changed.');
const ledger=(await env.CATALOG_DB!.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='d1_migrations'").all()).results;
if(ledger.length!==1)throw new Error('D1 migration ledger is unavailable.');
const history=(await env.CATALOG_DB!.prepare('SELECT name FROM d1_migrations ORDER BY id').all<{name:string}>()).results;
const migrationRows:any[]=[],migrationHashes:Record<string,string>={};
for(const name of migrations){
 if(history.some(row=>row.name===name))throw new Error('A target migration is already applied: '+name);
 const bytes=new Uint8Array(await fs.readFile(`migrations/catalog/${name}`));migrationHashes[name]=await sha256(bytes);
 const sql=new TextDecoder().decode(bytes);
 for(const line of sql.split(/\r?\n/)){
  const match=line.match(/^INSERT INTO category\(id,name,parent_id,sort_order\) VALUES\('([^']+)','([^']+)','([^']+)',(\d+)\) ON CONFLICT\(id\) DO NOTHING;$/);
  if(match)migrationRows.push({id:match[1],name:match[2],parent_id:match[3],sort_order:Number(match[4]),migration:name});
 }
}
if(migrationRows.length!==67||new Set(migrationRows.map(row=>row.id)).size!==67)throw new Error('Expected exactly 67 distinct category rows.');
const rows=(await env.CATALOG_DB!.prepare('SELECT id,name,parent_id,sort_order FROM category ORDER BY id').all()).results as any[];
const ids=new Set(rows.map(row=>row.id));
if(migrationRows.some(row=>ids.has(row.id)))throw new Error('A target category already exists before migration.');
const parents=[...new Set(migrationRows.map(row=>row.parent_id))];
if(parents.some(parent=>!ids.has(parent)))throw new Error('One or more reviewed category parents are missing.');
const schema=(await env.CATALOG_DB!.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='category'").all()).results;
if(schema.length!==1||typeof (schema[0] as any).sql!=='string')throw new Error('Category table schema is unavailable.');
const state={schema:'jotcoloring-targeted-migration-before-image/v1',captured_at:new Date().toISOString(),environment,database:{id:database.database_id,name:details.name},migrations:migrations.map(name=>({name,sha256:migrationHashes[name]})),scope:{tables:['category','d1_migrations'],category_ids:migrationRows.map(row=>row.id).sort()},category_schema:schema,category_rows:rows,migration_history:history};
const bytes=new TextEncoder().encode(canonicalJSON(state)),digest=await sha256(bytes);
const key=`operator-schema/catalog-migrations/${environment}/november-07-all-67/${digest}.json`;
if(await env.BACKUPS!.get(key))throw new Error('Immutable migration snapshot key already exists.');
await env.BACKUPS!.put(key,bytes,{httpMetadata:{contentType:'application/json'}});
const readback=await env.BACKUPS!.get(key);
if(!readback||readback.size!==bytes.length||await sha256(new Uint8Array(await readback.arrayBuffer()))!==digest)throw new Error('Private R2 migration snapshot readback failed.');
const directory=path.resolve('.local/cloud-backup/targeted-catalog/production');
await fs.mkdir(directory,{recursive:true,mode:0o700});
const receipt={status:'BACKUP_VERIFIED',scope:'Category table and D1 migration ledger before the exact two additive topic migrations; no content or artwork rows are altered.',bucket:'jotcoloring-production-backups',key,bytes:bytes.length,sha256:digest,r2_readback:'PASS',source_database:details.name,source_database_id:database.database_id,migrations:migrations.map(name=>({name,sha256:migrationHashes[name],category_rows:migrationRows.filter(row=>row.migration===name).length})),requests:requests()};
await fs.writeFile(path.join(directory,'november07-all67-category-migration-snapshot.json'),JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify(receipt));
