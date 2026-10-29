/** Local-only derivative backfill. No remote account, credential or deployment path. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {localStorage} from './local-storage';
import {brandedColorInspirationWebP} from './brand-raster';
import {publishedKey} from '../../src/server/assets';
import {BRAND_REVIEW_VERSION} from '../../src/server/branding';
import {canonicalJSON} from '../../src/server/http';
import type {Database,Bucket,Asset,Manifest} from '../../src/server/types';
const hash=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const args=process.argv.slice(2);if(args.shift()!=='--local-only'||!args.length||args.some(s=>! /^[a-z0-9-]+$/.test(s)))throw new Error('Use --local-only followed by visually reviewed source slugs.');
const mf=localStorage(),results=[];
try{
 const db=await mf.getD1Database('CATALOG_DB') as Database,published=await mf.getR2Bucket('PUBLISHED') as Bucket,originals=await mf.getR2Bucket('ORIGINALS') as Bucket;
 for(const slug of args){
  const current=await db.prepare("SELECT id,active_version FROM content WHERE slug=? AND status='published'").bind(slug).first<{id:string;active_version:number}>();if(!current)throw new Error('Published local content required: '+slug);
  const source=await db.prepare("SELECT asset_id,sha256,width,height FROM asset WHERE content_id=? AND content_version=? AND role='printable_webp_bw' AND verified=1").bind(current.id,current.active_version).first<Asset>();if(!source?.width||!source.height)throw new Error('Verified blank source required.');
  const input=await fs.readFile(path.resolve('public/assets/colors',slug+'.png')),meta=await sharp(input).metadata();if(!meta.width||!meta.height||Math.abs(meta.width/meta.height-source.width/source.height)>.001)throw new Error('Reference aspect ratio mismatch: '+slug);
  const width=Math.min(900,meta.width),height=Math.round(width*meta.height/meta.width),bytes=await brandedColorInspirationWebP(input,width,height),sha256=hash(bytes),role='color_inspiration';
  const asset:Asset={asset_id:`${current.id}-ideas-${sha256.slice(0,20)}`,role,source_asset_id:source.asset_id,storage_zone:'private_incoming',object_key:`incoming/${current.id}/${current.active_version}/${role}-${sha256.slice(0,24)}.webp`,mime:'image/webp',bytes:bytes.length,sha256,asset_version:1,width,height,page_count:null,black_and_white_verified:false};
  const key=publishedKey(current.id,current.active_version,asset),review={sha256,role,mime:asset.mime,bytes:bytes.length,width,height,page_count:null,bw:false,review_version:BRAND_REVIEW_VERSION,reviewed_at:new Date().toISOString()};
  const revision=await db.prepare('SELECT manifest_json FROM content_revision WHERE content_id=? AND version=?').bind(current.id,current.active_version).first<{manifest_json:string}>();if(!revision)throw new Error('Current local revision required.');const manifest=JSON.parse(revision.manifest_json) as Manifest;if(!manifest.assets.some(a=>a.asset_id===source.asset_id&&a.sha256===source.sha256))throw new Error('Source changed; inspect again.');manifest.assets=[...manifest.assets.filter(a=>a.role!==role),asset];
  await originals.put(asset.object_key,bytes,{httpMetadata:{contentType:asset.mime},customMetadata:{sha256,lineSourceSHA256:source.sha256,colorSourceSHA256:hash(input)}});await published.put(key,bytes,{httpMetadata:{contentType:asset.mime},customMetadata:{sha256,lineSourceSHA256:source.sha256,colorSourceSHA256:hash(input)}});
  await db.batch([db.prepare('INSERT INTO asset(asset_id,content_id,content_version,role,object_key,original_key,mime,bytes,sha256,width,height,page_count,asset_version,verified) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,1) ON CONFLICT(content_id,content_version,role) DO UPDATE SET asset_id=excluded.asset_id,object_key=excluded.object_key,original_key=excluded.original_key,mime=excluded.mime,bytes=excluded.bytes,sha256=excluded.sha256,width=excluded.width,height=excluded.height,verified=1').bind(asset.asset_id,current.id,current.active_version,role,key,asset.object_key,asset.mime,asset.bytes,sha256,width,height,null,1),db.prepare('INSERT OR REPLACE INTO asset_review(sha256,role,mime,bytes,width,height,page_count,bw,review_version,reviewed_at) VALUES(?,?,?,?,?,?,NULL,0,?,?)').bind(sha256,role,asset.mime,bytes.length,width,height,BRAND_REVIEW_VERSION,review.reviewed_at),db.prepare('UPDATE content_revision SET manifest_json=?,manifest_sha256=? WHERE content_id=? AND version=?').bind(JSON.stringify(manifest),hash(canonicalJSON(manifest)),current.id,current.active_version)]);
  results.push({slug,width,height,bytes:bytes.length,sha256,lineSourceSHA256:source.sha256,colorSourceSHA256:hash(input),environment:'local',blankFilesChanged:false});
 }
 await fs.mkdir('outputs/color-ideas',{recursive:true});await fs.writeFile('outputs/color-ideas/local-references.json',JSON.stringify(results,null,2));console.log(JSON.stringify({references:results.length,environment:'local',maxBytes:Math.max(...results.map(r=>r.bytes)),blankFilesChanged:false}));
}finally{await mf.dispose();}
