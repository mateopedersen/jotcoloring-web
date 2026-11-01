import {test} from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';
import {verifiedManifestAssets,verifyAsset} from '../src/server/assets';import {sha256,AppError} from '../src/server/http';import {BRAND_REVIEW_VERSION} from '../src/server/branding';import type {Env,Manifest,Asset,Database} from '../src/server/types';
async function fixture(){
 const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE asset_review(sha256 TEXT,role TEXT,mime TEXT,bytes INTEGER,width INTEGER,height INTEGER,page_count INTEGER,bw INTEGER,review_version INTEGER,reviewed_at TEXT)');let queries=0,active=0,peak=0;const reads:string[]=[],objects=new Map<string,Uint8Array>();
 const db={prepare(query:string){let values:unknown[]=[];const statement={bind(...v:unknown[]){values=v;return statement},async all(){queries++;return{results:sql.prepare(query).all(...values as never[]),success:true,meta:{}}},async first(){queries++;return sql.prepare(query).get(...values as never[])||null}};return statement}} as Database;
 const roles=['catalog_thumb_bw','catalog_thumb_small_bw','catalog_thumb_medium_bw','catalog_preview_bw','catalog_preview_mobile_bw','printable_webp_bw','printable_pdf_a4_bw','home_half_color','color_inspiration'];const assets:Asset[]=[];
 for(const [i,role] of roles.entries()){const pdf=role==='printable_pdf_a4_bw',bytes=new TextEncoder().encode((pdf?'%PDF-1.7 fixture':'RIFFxxxxWEBP fixture')+i),hash=await sha256(bytes),key='incoming/fixture/'+role;objects.set(key,bytes);const asset={asset_id:'fixture-'+role,role,object_key:key,mime:pdf?'application/pdf':'image/webp',bytes:bytes.length,sha256:hash,asset_version:1,width:pdf?null:400,height:pdf?null:600,page_count:pdf?1:null};assets.push(asset);sql.prepare('INSERT INTO asset_review VALUES(?,?,?,?,?,?,?,?,?,?)').run(hash,role,asset.mime,bytes.length,asset.width,asset.height,asset.page_count,role.includes('color')?0:1,BRAND_REVIEW_VERSION,new Date().toISOString());}
 const env:Env={CATALOG_DB:db,ORIGINALS:{async get(key:string){active++;peak=Math.max(peak,active);reads.push(key);await new Promise(r=>setTimeout(r,1));active--;const bytes=objects.get(key);if(!bytes)return null;return{key,size:bytes.length,etag:'',body:new Blob([new Uint8Array(bytes)]).stream(),arrayBuffer:async()=>bytes.slice().buffer,text:async()=>new TextDecoder().decode(bytes)};}} as Env['ORIGINALS']};
 const manifest={requested_status:'published',assets} as Manifest;return{sql,env,manifest,objects,reads,stats:()=>({queries,peak})};
}
test('all source bytes and exact trusted role reviews are checked with bounded storage reads',async()=>{const f=await fixture();const verified=await verifiedManifestAssets(f.env,f.manifest);assert.equal(verified.length,9);assert.equal(new Set(f.reads).size,9);assert.equal(f.stats().queries,1);assert.ok(f.stats().peak<=2&&f.stats().peak>1);assert.equal((await verifyAsset(f.env,f.manifest.assets[0])).review.role,'catalog_thumb_bw');});
test('batch validation rejects corruption in a later group and never accepts missing or stale review evidence',async()=>{
 for(const kind of ['bytes','missing-object','missing-review','wrong-size','wrong-width','wrong-role','old-version','colored-print']){
  const f=await fixture(),a=f.manifest.assets.at(-1)!;
  if(kind==='bytes')f.objects.set(a.object_key,new TextEncoder().encode('RIFFxxxxWEBP corrupt!'));
  if(kind==='missing-object')f.objects.delete(a.object_key);
  if(kind==='missing-review')f.sql.prepare('DELETE FROM asset_review WHERE role=?').run(a.role);
  if(kind==='wrong-size')f.sql.prepare('UPDATE asset_review SET bytes=bytes+1 WHERE role=?').run(a.role);
  if(kind==='wrong-width')f.sql.prepare('UPDATE asset_review SET width=401 WHERE role=?').run(a.role);
  if(kind==='wrong-role')f.sql.prepare("UPDATE asset_review SET role='other' WHERE role=?").run(a.role);
  if(kind==='old-version')f.sql.prepare('UPDATE asset_review SET review_version=0 WHERE role=?').run(a.role);
  if(kind==='colored-print')f.sql.prepare("UPDATE asset_review SET bw=0 WHERE role='printable_webp_bw'").run();
  await assert.rejects(()=>verifiedManifestAssets(f.env,f.manifest),AppError,kind);
 }
});
