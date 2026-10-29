import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {PGlite} from '@electric-sql/pglite';
import {inspectSnapshot,importSnapshot,compareSnapshot,TABLES,type Pg} from '../scripts/ops/postgres-transfer';

async function fixture(legacy=false){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'jotcoloring-migration-test-')),sqlite=path.join(dir,'source.sqlite'),snapshot=path.join(dir,'catalog.ndjson');
 const script=`import sqlite3,pathlib,sys\ndb=sqlite3.connect(sys.argv[1])\nfor p in sorted(pathlib.Path('migrations/catalog').glob('*.sql')): db.executescript(p.read_text())\ndb.execute("INSERT INTO content(id,slug,title,status,provenance_json) VALUES(?,?,?,?,?)",('fixture-id','unicode-fixture','Çiçek 🐇 \\\"quoted\\\"\\nsecond line','draft','{\\\"source\\\":\\\"test\\\"}'))\ndb.execute("INSERT INTO outbox_event(seq,event_id,content_id,version,event_type) VALUES(?,?,?,?,?)",(9007199254740995,'large-sequence','fixture-id',1,'draft'))\ndb.execute("INSERT INTO age_recommendation(content_id,content_version,source_sha256,band,score_hundredths,method_version) VALUES(?,?,?,?,?,?)",('fixture-id',1,'a'*64,'adults',8347,'jot-age-vision-1.0.0'))\n${legacy?'db.execute("DROP TABLE age_recommendation")\n':''}db.commit();db.close()\n`;
 const made=spawnSync('python3',['-c',script,sqlite],{encoding:'utf8'});assert.equal(made.status,0,made.stderr);
 const exported=spawnSync('python3',['scripts/ops/catalog-transfer.py',sqlite,snapshot],{encoding:'utf8'});assert.equal(exported.status,0,exported.stderr);
 return{dir,snapshot};
}
async function database(){const db=await PGlite.create();await db.exec(await fs.readFile('scripts/ops/postgres-schema.sql','utf8'));return db;}

test('PostgreSQL transfer preserves Unicode, exact large integers, checkpoint resume and every table checksum',async()=>{
 const f=await fixture(),db=await database(),pg=db as unknown as Pg;
 try{
  await assert.rejects(importSnapshot(pg,f.snapshot,{batchSize:3,stopAfterBatches:1}),/SIMULATED_INTERRUPTION/);
  const imported=await importSnapshot(pg,f.snapshot,{batchSize:3});assert.equal(imported.status,'complete');
  assert.equal((await importSnapshot(pg,f.snapshot)).status,'already-complete');
  const compared=await compareSnapshot(pg,imported.snapshot);assert.equal(compared.length,TABLES.length);assert.ok(compared.every(r=>r.status==='PASS'));assert.equal((await db.query<{score_hundredths:string}>("SELECT score_hundredths::text AS score_hundredths FROM age_recommendation WHERE content_id='fixture-id'")).rows[0].score_hundredths,'8347');
  const result=await db.query<{seq:string}>("SELECT seq::text FROM outbox_event WHERE event_id='large-sequence'");assert.equal(result.rows[0].seq,'9007199254740995');
  const title=(await db.query<{title:string}>("SELECT title FROM content WHERE id='fixture-id'")).rows[0].title;assert.match(title,/Çiçek 🐇/);assert.ok(title.includes('\n'));
 }finally{await db.close();await fs.rm(f.dir,{recursive:true,force:true});}
});

test('Corrupt snapshots and existing-row conflicts cannot silently overwrite a target',async()=>{
 const f=await fixture(),db=await database(),pg=db as unknown as Pg;
 try{
  const source=await fs.readFile(f.snapshot,'utf8'),corrupt=path.join(f.dir,'corrupt.ndjson');
  await fs.writeFile(corrupt,source.replace('Çiçek','Altered'));
  await assert.rejects(importSnapshot(pg,corrupt),/checksum mismatch/);
  assert.equal((await db.query<{count:number}>('SELECT COUNT(*)::int AS count FROM category')).rows[0].count,0);
  await db.query("INSERT INTO category(id,name,parent_id,sort_order) VALUES('animals','Preserve target value',NULL,1)");
  await assert.rejects(importSnapshot(pg,f.snapshot),/Existing row conflicts/);
  assert.equal((await db.query<{name:string}>("SELECT name FROM category WHERE id='animals'")).rows[0].name,'Preserve target value');
  const partial=path.join(f.dir,'partial.ndjson');await fs.writeFile(partial,source.split('\n').slice(0,-2).join('\n')+'\n');await assert.rejects(inspectSnapshot(partial),/Incomplete snapshot/);
 }finally{await db.close();await fs.rm(f.dir,{recursive:true,force:true});}
});

test('pre-age version 1 snapshots remain restorable without fabricating age labels',async()=>{const f=await fixture(true),db=await database();try{const snapshot=await inspectSnapshot(f.snapshot);assert.equal(snapshot.schema,'jotcoloring-catalog-transfer/1');assert.equal(snapshot.tables.length,21);await importSnapshot(db as unknown as Pg,f.snapshot);assert.equal((await db.query<{n:number}>('SELECT COUNT(*)::int AS n FROM age_recommendation')).rows[0].n,0);}finally{await db.close();await fs.rm(f.dir,{recursive:true,force:true});}});
