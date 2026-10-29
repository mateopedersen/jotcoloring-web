/** Deterministic local asset build. Never connects to remote Cloudflare resources. */
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {localStorage} from '../data/local-storage';
import {createCatalog} from '../../src/server/catalog';
import {SOCIAL_PAGES,OG_VERSION,socialBinding,contentSocialSpec} from '../../src/social/model';
import {renderSocial,siteIcon,componentArt,type SocialArtwork} from './render';
import {publishedKey} from '../../src/server/assets';
import {canonicalJSON} from '../../src/server/http';
import {BRAND_REVIEW_VERSION} from '../../src/server/branding';
import type {Database,Bucket,Asset,Manifest,Env} from '../../src/server/types';
const args=new Set(process.argv.slice(2));if(!args.has('--local-only'))throw new Error('Explicit --local-only required.');
const hash=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const mf=localStorage();
try{
 const db=await mf.getD1Database('CATALOG_DB') as Database,published=await mf.getR2Bucket('PUBLISHED') as Bucket,originals=await mf.getR2Bucket('ORIGINALS') as Bucket;
 const repo=createCatalog({CATALOG_DB:db} as Env),catalog=await repo.list({limit:48}),items=catalog.items;if(catalog.total>48)throw new Error('This local design build is limited to 48 seed pages. Use the media preparation pipeline for catalog-scale covers.');
 const logo=await fs.readFile('public/logo-3d.webp'),art=new Map<string,SocialArtwork>(),manifests=new Map<string,Manifest>();
 for(const item of items){const revision=await db.prepare('SELECT manifest_json FROM content_revision WHERE content_id=? AND version=?').bind(item.id,item.version).first<{manifest_json:string}>();if(!revision)throw new Error('Missing local revision.');const m=JSON.parse(revision.manifest_json) as Manifest;manifests.set(item.slug,m);
  const read=async(role:string)=>{const a=await db.prepare('SELECT * FROM asset WHERE content_id=? AND content_version=? AND role=? AND verified=1').bind(item.id,item.version,role).first<Asset>();if(!a)return;const o=await published.get(a.object_key);if(!o)throw new Error('Missing local object: '+role);const bytes=new Uint8Array(await o.arrayBuffer());if(hash(bytes)!==a.sha256)throw new Error('Local source checksum mismatch.');return{bytes,sha256:a.sha256};};
  const source=await read('printable_webp_bw');if(!source)throw new Error('Original outline required.');const color=await read('color_inspiration');art.set(item.slug,{slug:item.slug,title:item.title,alt:item.alt,line:source.bytes,color:color?.bytes,sourceSHA256:source.sha256});
 }
 await fs.mkdir('public/og/pages',{recursive:true});await fs.mkdir('public/og/coloring',{recursive:true});await fs.mkdir('outputs/og',{recursive:true});
 const registry:Record<string,{src:string;alt:string;sha256:string;title:string;description:string}>= {};const reports:Array<Awaited<ReturnType<typeof renderSocial>>['report']&{file:string}>=[];
 const save=async(spec:typeof SOCIAL_PAGES[number],selected:SocialArtwork[],binding:any,content=false)=>{let icon=await siteIcon(spec.icon);if(spec.kind==='privacy'||spec.kind==='cookies')icon=await componentArt('CookieArt');if(spec.kind==='notfound')icon=await componentArt('LostColoringArt');const screen=spec.screen?new Uint8Array(await fs.readFile(`public/guides/walkthrough/${spec.screen}.webp`)):undefined;const result=await renderSocial(spec,{art:selected,logo,icon,screen},binding),file=`/og/${content?'coloring':'pages'}/${spec.key}-${result.report.sha256.slice(0,16)}.png`;await fs.writeFile('public'+file,result.bytes);registry[spec.key]={src:file,alt:result.alt,sha256:result.report.sha256,title:spec.headline,description:spec.description};reports.push({...result.report,file});return result;};
 for(const spec of SOCIAL_PAGES){if(args.has('--sample')&&!['home','category-animals','photo','notfound','cookies'].includes(spec.key))continue;
  let selected=spec.art.map(slug=>art.get(slug)).filter((a):a is SocialArtwork=>!!a);
  if(spec.kind==='category'){const category=spec.paths[0].split('/').filter(Boolean).at(-1);selected=items.filter(i=>i.category===category||i.subcategory===category).map(i=>art.get(i.slug)!);}
  if(spec.age)selected=items.filter(i=>i.recommendedAge?.band===spec.age).map(i=>art.get(i.slug)!);
  // Empty categories use their own illustration; unrelated drawings are never represented as category members.
  await save(spec,selected.slice(0,3),{version:OG_VERSION,key:spec.key,path:spec.paths[0]});
 }
 for(const item of items){if(args.has('--sample')&&item.slug!=='woodland-friends')continue;const source=art.get(item.slug)!,m=manifests.get(item.slug)!;const binding=socialBinding({...m,recommendedAge:m.age_recommendation?.band,sourceSHA256:source.sourceSHA256}),result=await save(contentSocialSpec(binding),[source],binding,true);
  if(args.has('--apply-content')){const sha256=result.report.sha256,role='social_og',base=m.assets.find(a=>a.role==='printable_webp_bw')!;const asset:Asset={asset_id:`${item.id}-og-${sha256.slice(0,20)}`,role,source_asset_id:base.asset_id,storage_zone:'private_incoming',object_key:`incoming/${item.id}/${item.version}/${role}-${sha256.slice(0,24)}.png`,mime:'image/png',bytes:result.bytes.length,sha256,asset_version:1,width:1200,height:630,page_count:null,black_and_white_verified:false};const key=publishedKey(item.id,item.version,asset);m.assets=[...m.assets.filter(a=>a.role!==role),asset];
   await originals.put(asset.object_key,result.bytes,{httpMetadata:{contentType:'image/png'},customMetadata:{sha256,lineSourceSHA256:source.sourceSHA256}});await published.put(key,result.bytes,{httpMetadata:{contentType:'image/png'},customMetadata:{sha256,lineSourceSHA256:source.sourceSHA256}});
   await db.batch([db.prepare('INSERT INTO asset(asset_id,content_id,content_version,role,object_key,original_key,mime,bytes,sha256,width,height,page_count,asset_version,verified) VALUES(?,?,?,?,?,?,?,?,?,?,?,NULL,1,1) ON CONFLICT(content_id,content_version,role) DO UPDATE SET asset_id=excluded.asset_id,object_key=excluded.object_key,original_key=excluded.original_key,mime=excluded.mime,bytes=excluded.bytes,sha256=excluded.sha256,width=excluded.width,height=excluded.height,verified=1').bind(asset.asset_id,item.id,item.version,role,key,asset.object_key,asset.mime,asset.bytes,sha256,1200,630),db.prepare('INSERT OR REPLACE INTO asset_review(sha256,role,mime,bytes,width,height,page_count,bw,review_version,reviewed_at) VALUES(?,?,?,?,1200,630,NULL,0,?,?)').bind(sha256,role,asset.mime,asset.bytes,BRAND_REVIEW_VERSION,new Date().toISOString()),db.prepare('UPDATE content_revision SET manifest_json=?,manifest_sha256=? WHERE content_id=? AND version=?').bind(JSON.stringify(m),hash(canonicalJSON(m)),item.id,item.version)]);
  }
 }
 if(!args.has('--sample')){await fs.writeFile('src/social/generated.json',JSON.stringify(registry,null,2)+'\n');const keep=new Set(Object.values(registry).map(c=>c.src));for(const dir of ['pages','coloring'])for(const name of await fs.readdir('public/og/'+dir))if(name.endsWith('.png')&&!keep.has('/og/'+dir+'/'+name))await fs.unlink('public/og/'+dir+'/'+name);}
 await fs.writeFile('outputs/og/build-report.json',JSON.stringify({environment:'local',cards:reports.length,reports},null,2));
 const thumbs=await Promise.all(reports.map(async(r,i)=>({input:await sharp('public'+r.file).resize(400,210).png().toBuffer(),left:(i%3)*400,top:Math.floor(i/3)*210})));await sharp({create:{width:1200,height:Math.ceil(reports.length/3)*210,channels:3,background:'#fff'}}).composite(thumbs).png().toFile('outputs/og/contact-sheet.png');
 console.log(JSON.stringify({environment:'local',cards:reports.length,maxBytes:Math.max(...reports.map(r=>r.bytes)),contentAttached:args.has('--apply-content'),truncatedHeadlines:reports.filter(r=>r.headlineTruncated).map(r=>r.key)}));
}finally{await mf.dispose();}
