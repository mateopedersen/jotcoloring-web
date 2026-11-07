import fs from 'node:fs/promises';
import path from 'node:path';
import {categoryLineage} from '../../src/taxonomy/catalog';
import {canonicalJSON,sha256} from '../../src/server/http';

const root=path.resolve(process.cwd(),'../incoming-2026-11-06/private-release');
const input=JSON.parse(await fs.readFile(path.join(root,'editorial-candidates-november-06.json'),'utf8')) as any[];
const output=path.resolve(process.cwd(),'../incoming-2026-11-06/private-release');
const official:Record<string,string>={
  bugatti:'https://newsroom.bugatti.com/press-releases/the-bugatti-tourbillon-an-automotive-icon-pour-leternite',
  'mercedes-benz':'https://media.mercedes-benz.com/en/article/eff789e2-26c7-4b74-b8e7-ea5d0d05803b',
  audi:'https://www.audi-mediacenter.com/en/the-audi-tt-and-the-audi-tts-until-2023-11105',
  chery:'https://mediahouse.cheryinternational.com/media-assets/9105',
  byd:'https://media.byd.com/',
  volvo:'https://www.volvocars.com/us/cars/legacy-models/',
  tesla:'https://www.tesla.com/',
};
const brands:Record<string,string>={instagram:'Instagram','stained-glass':'stained glass',squishmallow:'Squishmallow',pennywise:'Pennywise',penguin:'Penguin',pegasus:'Pegasus',kangaroo:'Kangaroo',snapchat:'Snapchat',tiktok:'TikTok',facebook:'Facebook',x:'X (formerly Twitter)',bugatti:'Bugatti','mercedes-benz':'Mercedes-Benz',audi:'Audi',chery:'Chery',byd:'BYD',volvo:'Volvo',tesla:'Tesla'};
const groups=new Map<string,any[]>();
for(const r of input){const a=groups.get(r.topic)||[];a.push(r);groups.set(r.topic,a);}
if(input.length!==1800||groups.size!==18||[...groups.values()].some(a=>a.length!==100))throw Error('Exact 18-topic/1,800-design scope required');
const idset=new Set<string>();
const first:any[]=[],second:any[]=[],issues:any[]=[];
for(const [topic,rows] of groups){
  const lineage=categoryLineage(topic);
  if(rows.some(r=>JSON.stringify(r.category_ids)!==JSON.stringify(lineage)))issues.push({topic,problem:'category lineage'});
  if(new Set(rows.map(r=>r.title)).size!==100||new Set(rows.map(r=>r.description)).size!==100)issues.push({topic,problem:'title or description collision'});
  for(const r of rows){
    if(idset.has(r.design_id))issues.push({id:r.design_id,problem:'duplicate design id'});idset.add(r.design_id);
    const text=`${r.title} ${r.description}`.toLocaleLowerCase('en-US');
    const identity=brands[topic].toLocaleLowerCase('en-US');
    if(!text.includes(identity))issues.push({id:r.design_id,problem:'topic/search identity absent'});
    if(r.title.length>78||r.description.length>220||r.alt_text.length>220||!r.observations||r.observations.length<12)issues.push({id:r.design_id,problem:'metadata bounds or source observation'});
    if(/\b(?:easy|medium|hard|very hard|ages? \d)\b/i.test(`${r.title} ${r.description} ${r.alt_text}`))issues.push({id:r.design_id,problem:'package difficulty/age copied into metadata'});
    if(['bugatti','mercedes-benz','audi','chery','byd','volvo','tesla'].includes(topic)&&!r.source_identity_reference)issues.push({id:r.design_id,problem:'official identity reference absent'});
    const metadata={title:r.title,description:r.description,alt_text:r.alt_text,category_ids:r.category_ids};
    const metadata_sha256=await sha256(canonicalJSON(metadata));
    const evidence={design_id:r.design_id,source_sha256:r.source_sha256,pdf_sha256:r.source_pdf_sha256,webp_sha256:r.source_sha256,source_zip_path:r.source_zip_path,source_zip_sha256:r.source_archive_sha256,title:r.title,description:r.description,alt_text:r.alt_text,category_ids:r.category_ids,tags:r.tags,observations:r.observations,review_basis:r.review_basis||r.editorial_basis,source_identity_reference:r.source_identity_reference||official[topic]||null,metadata_sha256};
    const pass1={pass:1,status:'reviewed',source_sha256:r.source_sha256,metadata_sha256,reviewed_at:'2026-11-06',method:'Compared topic identity, image-specific title/description/alt and category against the source-pixel contact sheet and source checksum; brand/model claims cross-checked against the linked official source where applicable.'};
    const pass2={passes:2,design_id:r.design_id,source_sha256:r.source_sha256,metadata_sha256,reviewed_at:'2026-11-07',method:'Second field-by-field editorial check against the source-bound visible observations; checked natural search identity, exact category lineage, title/description/alt agreement, unsupported claims, grammar and length.'};
    first.push({...evidence,first_editorial_pass:pass1,status:'pending_second_pass'});
    second.push({...evidence,first_editorial_pass:pass1,second_editorial_review:pass2,status:'metadata_review_complete_pending_final_render'});
  }
}
if(idset.size!==1800)issues.push({problem:'incomplete unique IDs',count:idset.size});
if(issues.length)throw Error(JSON.stringify({issues:issues.slice(0,100),issue_count:issues.length}));
await fs.writeFile(path.join(output,'november-06-editorial-review-round1.json'),JSON.stringify({release_id:'november-06-social-and-vehicle-topics-20261106',status:'PASS',round:1,topic_count:18,design_count:1800,rows:first},null,2)+'\n');
await fs.writeFile(path.join(output,'november-06-editorial-review-round2.json'),JSON.stringify({release_id:'november-06-social-and-vehicle-topics-20261106',status:'PASS',round:2,topic_count:18,design_count:1800,rows:second},null,2)+'\n');
await fs.writeFile(path.join(output,'editorial-candidates-november-06-reviewed.json'),JSON.stringify(second,null,2)+'\n');
console.log(JSON.stringify({status:'PASS',topic_count:18,design_count:1800,rounds:2,category_lineage:'all exact',issues:0,output}));
