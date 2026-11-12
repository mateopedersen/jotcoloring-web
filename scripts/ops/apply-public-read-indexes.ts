/** Add only the two reviewed read indexes. No rows, triggers, routes or media
 * are changed. Keep a verified private schema before-image and migration receipt. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {canonicalJSON,sha256} from '../../src/server/http';

const environment=process.argv[2];
if(!['production','staging'].includes(environment))throw Error('Choose the exact existing environment.');
const profile=process.env.JOT_WRANGLER_AUTH_FILE,out=process.env.JOT_READ_INDEX_REPORT_DIR;
if(!profile||!out||!path.isAbsolute(profile)||!path.isAbsolute(out))throw Error('Separate Jot session and absolute private receipt directory required.');
const account='48c779c8eaa80234e0bb9d57f96e588b';
const database=environment==='production'?'d075722e-c698-4b6e-a5e4-f53ae5c9e411':'835240f5-90d7-4bf2-8a41-b67cc484fb4b';
const expectedName=`jotcoloring-${environment}-catalog`,bucket=`jotcoloring-${environment}-backups`;
const migration='0036_public_catalog_read_indexes.sql';
const bytes=new Uint8Array(await fs.readFile('migrations/catalog/'+migration)),digest=await sha256(bytes);
const expected={
 content_public_revision:'CREATE INDEX content_public_revision ON content(id,active_version,status,example_only)',
 asset_current_source:'CREATE INDEX asset_current_source ON asset(content_id,content_version,role,sha256,verified)'
};
const statements=new TextDecoder().decode(bytes).split('\n').filter(line=>line.startsWith('CREATE INDEX ')).map(line=>line.replace(/;$/,''));
if(canonicalJSON(statements)!==canonicalJSON(Object.values(expected))||new TextDecoder().decode(bytes).split('\n').some(line=>line.trim()&&!line.startsWith('--')&&!line.startsWith('CREATE INDEX ')))throw Error('Migration must contain only the exact two additive indexes.');
let requests=0;
async function request(endpoint:string,init:RequestInit={}){
 if(++requests>35)throw Error('Request bound exceeded.');
 const auth=await fs.readFile(profile!,'utf8'),token=auth.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1],expiry=auth.match(/^expiration_time\s*=\s*"([^"]+)"/m)?.[1];
 if(!token||!expiry||Date.parse(expiry)<=Date.now())throw Error('Separate JotColoring session requires renewal.');
 return fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${endpoint}`,{...init,headers:{Authorization:'Bearer '+token,...init.headers},signal:AbortSignal.timeout(60000)});
}
async function api(endpoint:string,body?:unknown){const r=await request(endpoint,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),d=await r.json() as any;if(!r.ok||!d.success)throw Error('Cloudflare operation failed HTTP '+r.status+' code '+(d.errors?.[0]?.code||0));return d.result;}
const query=async(sql:string,params:unknown[]=[])=>{const result=await api(`/d1/database/${database}/query`,{sql,params});if(result.length!==1||!result[0].success)throw Error('Exact D1 query failed.');return result[0].results;};
const details=await api('/d1/database/'+database);if(details.name!==expectedName)throw Error('Incorrect JotColoring database.');
const schema=async()=>query("SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name");
const history=async()=>query('SELECT name FROM d1_migrations ORDER BY id');
const before=await schema(),ledger=await history();
for(const [name,sql]of Object.entries(expected)){const old=before.find((r:any)=>r.name===name);if(old&&old.sql!==sql)throw Error('An index with a different definition already exists: '+name);}
async function verify(){const rows=await schema();for(const[name,sql]of Object.entries(expected))if(rows.find((r:any)=>r.name===name)?.sql!==sql)throw Error('Index readback failed: '+name);if(!(await history()).some((r:any)=>r.name===migration))throw Error('Migration ledger readback failed.');}
if(ledger.some((r:any)=>r.name===migration)){await verify();console.log(JSON.stringify({status:'ALREADY_APPLIED_VERIFIED',environment,migration,sha256:digest}));process.exit(0);}
if(!process.argv.includes('--apply')){console.log(JSON.stringify({status:'PLAN',environment,migration,sha256:digest,indexes:Object.keys(expected)}));process.exit(0);}
const snapshot={format:'jotcoloring-additive-index-before-image/1',environment,database,name:details.name,migration,migration_sha256:digest,schema:before,migration_history:ledger,captured_at:new Date().toISOString(),scope:'Schema only; this migration does not alter content rows or artwork.'};
const snapshotBytes=new TextEncoder().encode(canonicalJSON(snapshot)),snapshotSHA=await sha256(snapshotBytes),key=`operator-snapshots/public-read-indexes/${snapshotSHA}.json`,endpoint=`/r2/buckets/${bucket}/objects/${key}`;
const put=await request(endpoint,{method:'PUT',headers:{'Content-Type':'application/json'},body:new Blob([snapshotBytes])});if(!put.ok)throw Error('Private schema before-image upload failed.');
const readback=await request(endpoint);if(!readback.ok||await sha256(await readback.arrayBuffer())!==snapshotSHA)throw Error('Private schema before-image readback failed.');
if(canonicalJSON(await schema())!==canonicalJSON(before)||canonicalJSON(await history())!==canonicalJSON(ledger))throw Error('Concurrent schema migration; take a fresh before-image.');
const missing=statements.filter(sql=>!before.some((r:any)=>r.name===sql.split(' ')[2]));
const batch=[...missing.map(sql=>({sql,params:[]})),{sql:'INSERT INTO d1_migrations(name) VALUES(?)',params:[migration]}];
const result=await api(`/d1/database/${database}/query`,{batch});if(result.length!==batch.length||result.some((r:any)=>!r.success))throw Error('Index migration batch failed.');
await query('PRAGMA optimize');await verify();
const receipt={status:'MIGRATION_APPLIED_AND_VERIFIED',environment,database,migration,migration_sha256:digest,indexes:Object.keys(expected),content_rows_changed:false,artwork_changed:false,backup_key:key,backup_sha256:snapshotSHA,backup_readback:'PASS',schema_readback:'PASS',requests,at:new Date().toISOString()};
await fs.mkdir(out!,{recursive:true});await fs.writeFile(path.join(out!,`read-indexes-${environment}.json`),JSON.stringify(receipt,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(receipt));
