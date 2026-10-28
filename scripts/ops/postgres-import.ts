/** Local PostgreSQL/WASM import CLI. It never connects to a remote database. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {PGlite} from '@electric-sql/pglite';
import {inspectSnapshot,importSnapshot,compareSnapshot,rebuildSearch,type Pg} from './postgres-transfer';
const argv=process.argv.slice(2),option=(key:string)=>{const i=argv.indexOf(key);return i<0?undefined:argv[i+1];};
const file=option('--snapshot');if(!file)throw new Error('Usage: node --import tsx scripts/ops/postgres-import.ts --snapshot file.ndjson [--target local-directory --apply]');
const snapshot=await inspectSnapshot(file);
if(!argv.includes('--apply'))console.log(JSON.stringify({mode:'DRY_RUN',valid:true,schema:snapshot.schema,rows:snapshot.rows,tables:snapshot.tables.length,snapshot_sha256:snapshot.file_sha256,outbox_watermark:snapshot.outbox_watermark},null,2));
else {
 const requested=option('--target');if(!requested)throw new Error('--target is required for a local import');
 const target=path.resolve(requested),marker=path.join(target,'.jotcoloring-transfer.json');
 try{const entries=await fs.readdir(target);if(entries.length){const owner=JSON.parse(await fs.readFile(marker,'utf8'));if(owner.schema!=='jotcoloring-local-postgres-target/1')throw new Error('Unknown target marker');}}
 catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;try{if((await fs.readdir(target)).length)throw new Error('Refusing an existing nonempty unmarked directory');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}}
 await fs.mkdir(target,{recursive:true});await fs.writeFile(marker,JSON.stringify({schema:'jotcoloring-local-postgres-target/1'}));
 const db=await PGlite.create(target);try{await db.exec(await fs.readFile('scripts/ops/postgres-schema.sql','utf8'));const imported=await importSnapshot(db as unknown as Pg,file);const parity=await compareSnapshot(db as unknown as Pg,imported.snapshot);if(parity.some(t=>t.status!=='PASS'))throw new Error('Parity failed; target must not be used');await rebuildSearch(db as unknown as Pg);console.log(JSON.stringify({mode:'LOCAL_APPLY',status:imported.status,rows:snapshot.rows,tables:snapshot.tables.length,parity:'PASS',snapshot_sha256:snapshot.file_sha256,remote:false},null,2));}finally{await db.close();}
}
