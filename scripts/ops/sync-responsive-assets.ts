/** Add immutable R2 display copies; preserve existing metadata, print files and objects. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {remoteContext} from './release-context';
import {responsiveCopy} from '../data/responsive-raster';
import type {Manifest} from '../../src/server/types';
import type {DisplaySource} from '../../src/server/responsive-assets';
const environment=process.argv[2];if(environment!=='staging'&&environment!=='production')throw new Error('Environment required.');
const apply=process.argv.includes('--apply'),{env,requests}=await remoteContext(environment);
const origin=environment==='production'?'https://jotcoloring.com':'https://staging.jotcoloring.com';
const root=`.local/responsive-media/${environment}`;await fs.mkdir(root,{recursive:true,mode:0o700});
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex'),registry:DisplaySource[]=[],report:any={environment,mode:apply?'APPLY':'PLAN',items:[],started:new Date().toISOString()};
const entries=(await fs.readdir(`.local/release-content/${environment}`,{withFileTypes:true})).filter(e=>e.isDirectory());if(entries.length!==18)throw new Error('This migration is bounded to 18 existing reviewed artworks.');
// Validate every current public source and prepare all files before any R2 write.
for(const entry of entries){
 const dir=`.local/release-content/${environment}/${entry.name}`,m=JSON.parse(await fs.readFile(dir+'/manifest.json','utf8')) as Manifest;
 const response=await fetch(`${origin}/api/content/${m.slug}`,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error('Current public record unavailable.');
 const item:any=await response.json();if(item.id!==m.content_id||item.version!==m.expected_version!+1)throw new Error('Catalog changed: '+m.slug);
 for(const [role,field,width,gray]of [['catalog_thumb_bw','thumbnail',240,true],['catalog_preview_bw','preview',600,true],['home_half_color','home_color',240,false]] as const){
  const source=m.assets.find(a=>a.role===role);if(!source||!item[field])throw new Error('Reviewed source missing.');
  const sourceURL=new URL(item[field],origin);if(!['assets.jotcoloring.com',new URL(origin).hostname].includes(sourceURL.hostname)||sourceURL.protocol!=='https:')throw new Error('Unexpected media host.');
  const sourceResponse=await fetch(sourceURL,{signal:AbortSignal.timeout(30000)});if(!sourceResponse.ok)throw new Error('Public media not available.');
  const bytes=new Uint8Array(await sourceResponse.arrayBuffer());if(bytes.length!==source.bytes||hash(bytes)!==source.sha256)throw new Error('Source pixels changed: '+m.slug+'/'+role);
  const copy=await responsiveCopy(bytes,width,gray);if(copy.bytes.length>=source.bytes)continue;
  const sha=hash(copy.bytes),key=`responsive/v1/${source.sha256}/${copy.width}-${sha}.webp`;
  const file=path.join(root,sha+'.webp');await fs.writeFile(file,copy.bytes);registry.push({source_role:role,source_sha256:source.sha256,copies:[{key,sha256:sha,bytes:copy.bytes.length,width:copy.width,height:copy.height}]});
  report.items.push({slug:m.slug,sourceRole:role,sourceSHA:source.sha256,sourceBytes:source.bytes,file,key,sha256:sha,bytes:copy.bytes.length,width:copy.width,height:copy.height});
 }
}
if(apply){
 for(const item of report.items){const bytes=new Uint8Array(await fs.readFile(item.file));if(hash(bytes)!==item.sha256)throw new Error('Prepared bytes changed.');await env.PUBLISHED!.put(item.key,bytes,{httpMetadata:{contentType:'image/webp'}});const stored=await env.PUBLISHED!.get(item.key);if(!stored||stored.size!==bytes.length||hash(new Uint8Array(await stored.arrayBuffer()))!==item.sha256)throw new Error('R2 read-back mismatch.');}
 // This registry is eligible for deployment only after every R2 read-back passed.
 await fs.writeFile('src/server/responsive-assets.json',JSON.stringify(registry,null,2)+'\n');
}
report.status='PASS';report.requests=requests();report.finished=new Date().toISOString();await fs.writeFile(path.join(root,'sync-report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({environment,mode:report.mode,files:report.items.length,sourceBytes:report.items.reduce((n:number,i:any)=>n+i.sourceBytes,0),displayBytes:report.items.reduce((n:number,i:any)=>n+i.bytes,0),requests:requests(),status:report.status}));
