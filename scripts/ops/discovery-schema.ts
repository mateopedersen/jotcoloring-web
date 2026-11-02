import fs from 'node:fs/promises';
import type {Env} from '../../src/server/types';
import {backupBytes} from '../../src/server/backups';
import {canonicalJSON,sha256} from '../../src/server/http';
const name='0016_discovery_rebuild_queue.sql';
const required=['rebuild_state','rebuild_token','rebuild_lease_until','rebuild_queued_at','rebuild_completed_at','rebuild_completed_by','rebuild_last_error'];
/** Only this additive migration is allowed; private verified backup precedes DDL. */
export async function upgradeDiscoverySchema(env:Env,apply=false){
 if(apply&&!['production','staging'].includes(env.APP_ENV||''))throw Error('Exact existing environment required');
 const db=env.CATALOG_DB;if(!db)throw Error('Catalog binding required');
 const source=await fs.readFile(new URL('../../migrations/catalog/'+name,import.meta.url),'utf8');
 const lines=source.split('\n').map(line=>line.trim()).filter(line=>line&&!line.startsWith('--'));
 const additions=lines.map(sql=>{const match=sql.match(/^ALTER TABLE discovery_state ADD COLUMN (rebuild_[a-z_]+) TEXT NOT NULL DEFAULT '(?:idle|)'(?: CHECK\(rebuild_state IN \('idle','queued','processing'\)\))?;$/);if(!match)throw Error('Only the reviewed additive discovery migration is allowed');return{name:match[1],sql};});
 if(additions.length!==required.length||new Set(additions.map(row=>row.name)).size!==required.length||additions.some(row=>!required.includes(row.name)))throw Error('Unexpected discovery columns');
 const columns=(await db.prepare('PRAGMA table_info(discovery_state)').all<{name:string;type:string;notnull:number}>()).results;
 if(!['id','epoch','reconcile_after'].every(key=>columns.some(column=>column.name===key)))throw Error('Existing discovery state is unavailable');
 for(const column of columns.filter(column=>required.includes(column.name)))if(column.type.toUpperCase()!=='TEXT'||column.notnull!==1)throw Error('Conflicting existing discovery column');
 const missing=additions.filter(row=>!columns.some(column=>column.name===row.name));
 const plan={migration:name,migration_sha256:await sha256(source),columns_to_add:missing.map(row=>row.name)};
 if(!missing.length)return{status:'READY',...plan};if(!apply)return{status:'PLAN_ONLY',...plan};
 const schema=await db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='discovery_state'").first<{sql:string}>(),rows=(await db.prepare('SELECT * FROM discovery_state').all()).results;
 if(rows.length!==1||(rows[0] as {id:number}).id!==1)throw Error('Exact discovery singleton required');
 const snapshot=new TextEncoder().encode(canonicalJSON({environment:env.APP_ENV,migration:name,schema,columns,rows})),hash=await sha256(snapshot);
 const backup=await backupBytes(env,`operator-schema/discovery-queue/${env.APP_ENV}/${hash}.json`,snapshot,'application/json');
 const statements=missing.map(row=>db.prepare(row.sql));
 const tracking=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='d1_migrations'").first();
 if(tracking&&!await db.prepare('SELECT id FROM d1_migrations WHERE name=?').bind(name).first())statements.push(db.prepare('INSERT INTO d1_migrations(name) VALUES(?)').bind(name));
 await db.batch(statements);
 const after=(await db.prepare('PRAGMA table_info(discovery_state)').all<{name:string}>()).results;
 if(!required.every(key=>after.some(column=>column.name===key)))throw Error('Discovery schema readback failed');
 return{status:'APPLIED',...plan,backup};
}
