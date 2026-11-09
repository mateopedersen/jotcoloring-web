/** Render source-bound topic covers from three supplied drawings per brand. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {NOVEMBER_09_AUTO29_RELEASE_ID as release_id} from '../../src/server/november-09-automobile-29-source';
import {NOVEMBER_09_AUTO29_TOPICS as topics} from '../../src/taxonomy/november-09-auto29';
import {SOCIAL_PAGES,OG_VERSION} from '../../src/social/model';
import {renderSocial,siteIcon} from './render';

const root=path.resolve('../incoming-2026-11-09/automobiles/automobile-brands-29-20261109');
const candidates=JSON.parse(await fs.readFile(path.join(root,'private-release/editorial-candidates-november-09-auto29.json'),'utf8')).rows as any[];
const generatedPath='src/social/generated.json',generated=JSON.parse(await fs.readFile(generatedPath,'utf8'));
const logo=new Uint8Array(await fs.readFile('public/logo-3d.webp')),outputs:any[]=[];
const digest=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');

for(const topic of topics){
 const key='topic-'+topic.id,spec=SOCIAL_PAGES.find(p=>p.key===key);
 if(!spec)throw Error('Missing topic identity '+key);
 const chosen=[1,50,100].map(n=>candidates.find(r=>r.design_id===topic.id+'__'+String(n).padStart(3,'0')));
 const art=[];
 for(const row of chosen){
  if(!row)throw Error('Missing reviewed source: '+topic.id);
  const line=new Uint8Array(execFileSync('/usr/bin/unzip',['-p',row.source_zip_path,row.source_webp_path],{maxBuffer:25_000_000}));
  if(digest(line)!==row.source_sha256)throw Error('Changed source bytes: '+row.design_id);
  art.push({slug:row.slug,title:row.title,alt:row.alt_text,line,sourceSHA256:row.source_sha256});
 }
 const result=await renderSocial(spec,{art,logo,icon:await siteIcon(spec.icon)},{version:OG_VERSION,key:spec.key,path:spec.paths[0]});
 if(result.report.descriptionTruncated)throw Error('Truncated topic cover: '+topic.id);
 const sha=result.report.sha256,src='/og/pages/'+key+'-'+sha.slice(0,16)+'.png';
 await fs.writeFile('public'+src,result.bytes);
 generated[key]={src,alt:result.alt,sha256:sha,title:spec.headline,description:spec.description};
 outputs.push({topic:topic.id,key,src,sha256:sha,bytes:result.bytes.length,sources:chosen.map(row=>({design_id:row.design_id,sha256:row.source_sha256}))});
}
await fs.writeFile(generatedPath,JSON.stringify(generated,null,2)+'\n');
const sheets=[];
for(let i=0;i<outputs.length;i+=6){
 const group=outputs.slice(i,i+6),tiles=await Promise.all(group.map(async(o,index)=>({input:await sharp('public'+o.src).resize(600,315).png().toBuffer(),left:index%2*600,top:Math.floor(index/2)*315})));
 const file=path.join(root,'private-review','auto29-topic-cover-sheet-'+(i/6+1)+'.png');
 await sharp({create:{width:1200,height:Math.ceil(group.length/2)*315,channels:3,background:'#fff'}}).composite(tiles).png().toFile(file);
 sheets.push(file);
}
const auditPath=path.join(root,'private-review/auto29-topic-cover-audit.json');
await fs.writeFile(auditPath,JSON.stringify({status:'RENDERED_PENDING_VISUAL_REVIEW',release_id,outputs,sheets},null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({status:'RENDERED_PENDING_VISUAL_REVIEW',topics:outputs.length,sheets,release_id}));
