/** Updates responsive promotional cards only; never rewrites blank files or PDFs. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {brandedColorCardWebP} from './brand-raster';
import {BRAND_REVIEW_VERSION} from '../../src/server/branding';
import type {Manifest} from '../../src/server/types';
const slugs=process.argv.slice(2);
if(!slugs.length)throw new Error('Pass reviewed colored artwork slugs.');
for(const slug of slugs){
 if(!/^[a-z0-9-]+$/.test(slug))throw new Error('Invalid slug');
 const dir=path.resolve('../../media',slug),m=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8')) as Manifest;
 const thumbnail=m.assets.find(a=>a.role==='catalog_thumb_bw');
 if(!thumbnail?.width||!thumbnail.height)throw new Error('Prepared line art thumbnail required');
 const bytes=await brandedColorCardWebP(await fs.readFile(path.join('public/assets/colors',slug+'.png')),thumbnail.width,thumbnail.height);
 const hash=createHash('sha256').update(bytes).digest('hex'),role='home_half_color',file=path.join(dir,role+'.webp'),previous=m.assets.find(a=>a.role===role);
 const version=previous?.sha256===hash?previous.asset_version:(previous?.asset_version||0)+1;
 await fs.writeFile(file,bytes);
 m.assets=m.assets.filter(a=>a.role!==role);
 m.assets.push({asset_id:`${m.content_id}-${role}-v${version}`,role,storage_zone:'private_incoming',object_key:`incoming/${m.content_id}/${version}/${role}-${hash.slice(0,24)}.webp`,mime:'image/webp',bytes:bytes.length,sha256:hash,asset_version:version,width:thumbnail.width,height:thumbnail.height,page_count:null,black_and_white_verified:false});
 const files=JSON.parse(await fs.readFile(path.join(dir,'files.json'),'utf8'));files[role]=file;
 const old=JSON.parse(await fs.readFile(path.join(dir,'reviews.json'),'utf8')) as {review:{role:string}}[];
 const reviews=[...old.filter(r=>r.review.role!==role),{review:{sha256:hash,role,mime:'image/webp',bytes:bytes.length,width:thumbnail.width,height:thumbnail.height,page_count:null,bw:false,reviewed_at:new Date().toISOString(),review_version:BRAND_REVIEW_VERSION}}];
 await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify(m,null,2));
 await fs.writeFile(path.join(dir,'files.json'),JSON.stringify(files,null,2));
 await fs.writeFile(path.join(dir,'reviews.json'),JSON.stringify(reviews,null,2));
 console.log(JSON.stringify({content_id:m.content_id,color_bytes:bytes.length,width:thumbnail.width,height:thumbnail.height,asset_version:version,blank_files_changed:false}));
}
