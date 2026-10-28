/** Actual PostgreSQL/WASM migration rehearsal. Local only; never Hyperdrive proof. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {PGlite} from '@electric-sql/pglite';
import {importSnapshot,compareSnapshot,rebuildSearch,searchPostgres,applyContentEvent,loadRows,canonical,sha,type Pg,type ContentEvent} from './postgres-transfer';
const root=path.resolve('.local/postgres-rehearsal-'+Date.now());await fs.mkdir(root,{recursive:true});
const source=process.argv[2];if(!source)throw new Error('Pass the actual local canonical SQLite database path');
const snapshotFile=path.join(root,'catalog.ndjson');
const exported=spawnSync('python3',['scripts/ops/catalog-transfer.py',source,snapshotFile],{encoding:'utf8'});
if(exported.status!==0)throw new Error(exported.stderr);const sourceRecord=JSON.parse(exported.stdout);
const db=await PGlite.create(path.join(root,'pgdata')),pg=db as unknown as Pg;
const evidence:any={measured_at:new Date().toISOString(),engine:'PGlite PostgreSQL WASM, isolated local filesystem',package_version:JSON.parse(await fs.readFile('node_modules/@electric-sql/pglite/package.json','utf8')).version,source_kind:'actual local D1/SQLite seeded catalog snapshot',snapshot_sha256:sourceRecord.sha256,production_hyperdrive_tested:false,remote_database_created:false,load_5m_tested:false,checks:[]};
const check=(name:string,pass:boolean,detail?:unknown)=>{evidence.checks.push({name,status:pass?'PASS':'FAIL',detail});if(!pass)throw new Error(name);};
try{
 await pg.exec(await fs.readFile('scripts/ops/postgres-schema.sql','utf8'));
 evidence.postgresql_version=(await pg.query<{version:string}>('SELECT version()')).rows[0].version;
 let interrupted=false;try{await importSnapshot(pg,snapshotFile,{batchSize:7,stopAfterBatches:2});}catch(e){interrupted=(e as Error).message==='SIMULATED_INTERRUPTION_AFTER_COMMIT';if(!interrupted)throw e;}
 check('Simulated interruption after committed bounded batches',interrupted);
 const resumed=await importSnapshot(pg,snapshotFile,{batchSize:7});check('Interrupted import resumes to completion',resumed.status==='complete',{batches:resumed.batches,rows:resumed.rows});
 const repeated=await importSnapshot(pg,snapshotFile);check('Same snapshot reimport is idempotent',repeated.status==='already-complete');
 const compared=await compareSnapshot(pg,resumed.snapshot);check('Every canonical table count and full-row checksum matches',compared.every(r=>r.status==='PASS'),compared);
 await rebuildSearch(pg);
 const search=JSON.parse(await fs.readFile('docs/evidence/search-acceptance.json','utf8'));
 const queryResults=[];for(const test of search.results){const actual=(await searchPostgres(pg,test.query)).map(r=>r.slug).sort();queryResults.push({id:test.id,q:test.query.q,expected:test.expected.slice().sort(),actual,status:canonical(actual)===canonical(test.expected.slice().sort())?'PASS':'FAIL'});}
 check('50 predefined queries match D1 expected results',queryResults.every(r=>r.status==='PASS'),queryResults);
 const records=await loadRows(snapshotFile);const content=records.content.find(c=>c.slug==='woodland-friends')!;
 const byID=(await pg.query('SELECT slug FROM content WHERE id=$1',[content.id])).rows[0];const bySlug=(await pg.query('SELECT id FROM content WHERE slug=$1',[content.slug])).rows[0];
 check('Lookup by immutable id and slug',canonical(byID)===canonical({slug:content.slug})&&canonical(bySlug)===canonical({id:content.id}));
 const category=(await pg.query('SELECT c.id FROM content c JOIN content_category cc ON cc.content_id=c.id WHERE cc.category_id=$1 AND c.status=\'published\' ORDER BY c.id',['woodland'])).rows;
 check('Category relation query',category.length===4);
 const missingActive=(await pg.query("SELECT c.id FROM content c WHERE status='published' AND (SELECT COUNT(DISTINCT role) FROM asset a WHERE a.content_id=c.id AND a.content_version=c.active_version AND verified=1 AND role IN ('catalog_thumb_bw','catalog_preview_bw','printable_webp_bw','printable_pdf_a4_bw'))<>4")).rows;
 check('All published content resolves four required verified active asset roles',missingActive.length===0);
 const watermark=BigInt(resumed.snapshot.outbox_watermark),nextVersion=String(BigInt(content.latest_version!)+1n),oldSlug=content.slug!;
 const newContent={...content,slug:oldSlug+'-migration-replay',title:'Woodland friends migration replay',latest_version:nextVersion,active_version:nextVersion,updated_at:new Date().toISOString()};
 const related:ContentEvent['related']={};for(const table of ['content_category','content_tag','content_age'])related[table]=records[table].filter(r=>r.content_id===content.id).map(r=>({...r}));
 const categoryIds=new Set(related.content_category.map(r=>r.category_id));related.category=records.category.filter(r=>categoryIds.has(r.id));
 related.asset=records.asset.filter(r=>r.content_id===content.id&&r.content_version===content.active_version).map(r=>({...r,asset_id:r.asset_id+'-migration-replay',content_version:nextVersion}));
 related.content_revision=records.content_revision.filter(r=>r.content_id===content.id&&r.version===content.active_version).map(r=>{const manifest=JSON.parse(r.manifest_json!);manifest.version=Number(nextVersion);manifest.title=newContent.title;manifest.slug=newContent.slug;const json=canonical(manifest);return {...r,version:nextVersion,manifest_json:json,manifest_sha256:sha(json)};});
 related.slug_redirect=[{old_slug:oldSlug,content_id:content.id,created_at:newContent.updated_at}];
 const published:ContentEvent={event_id:'local-migration-publish-2',seq:String(watermark+1n),content_id:content.id!,version:nextVersion,event_type:'published',content:newContent,related};
 check('New version and slug replay atomically publishes',await applyContentEvent(pg,resumed.snapshot,published)==='applied');
 check('Exact repeated event has no second effect',await applyContentEvent(pg,resumed.snapshot,published)==='duplicate');
 check('New slug and old redirect are present',(await pg.query('SELECT c.slug FROM slug_redirect r JOIN content c ON c.id=r.content_id WHERE r.old_slug=$1',[oldSlug])).rows[0]?.slug===newContent.slug);
 const archive:ContentEvent={...published,event_id:'local-migration-archive-3',seq:String(watermark+2n),version:String(BigInt(nextVersion)+1n),event_type:'archived',content:{...newContent,status:'archived',latest_version:String(BigInt(nextVersion)+1n)}};
 check('Archive tombstone replays',await applyContentEvent(pg,resumed.snapshot,archive)==='applied');
 check('Archived content excluded from search',(await searchPostgres(pg,{q:'fox'})).length===0);
 const stale={...published,event_id:'local-migration-stale-publish',seq:String(watermark+3n)};
 check('Late old publication cannot revive archive',await applyContentEvent(pg,resumed.snapshot,stale)==='stale'&&(await searchPostgres(pg,{q:'fox'})).length===0);
 let conflict=false;try{await applyContentEvent(pg,resumed.snapshot,{...archive,content:{...archive.content,title:'Conflicting payload'}});}catch(e){conflict=(e as Error).message==='Event ID payload conflict';}
 check('Event id with different payload is rejected',conflict);
 const rollback=await PGlite.create();try{const rb=rollback as unknown as Pg;await rb.exec(await fs.readFile('scripts/ops/postgres-schema.sql','utf8'));await importSnapshot(rb,snapshotFile);const matches=await compareSnapshot(rb,resumed.snapshot);check('Independent restore reproduces exact pre-replay snapshot',matches.every(r=>r.status==='PASS'));}finally{await rollback.close();}
 evidence.rollback_scope='Independent restore proves the pre-replay snapshot boundary only. Replaying later PostgreSQL writes back into D1 and production cutover are NOT RUN.';
 evidence.overall='PASS';
}catch(error){evidence.overall='FAIL';evidence.error=(error as Error).message;process.exitCode=1;console.error(evidence.error);}
finally{await db.close();await fs.mkdir('docs/evidence',{recursive:true});await fs.writeFile('docs/evidence/postgres-rehearsal.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({status:evidence.overall,checks:evidence.checks.map((c:any)=>({name:c.name,status:c.status})),engine:evidence.postgresql_version},null,2));}
