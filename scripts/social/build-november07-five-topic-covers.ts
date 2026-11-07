/** Build source-bound covers for five new catalog collections and refresh Dogs. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {SOCIAL_PAGES,OG_VERSION} from '../../src/social/model';
import {renderSocial,siteIcon} from './render';

const repo=process.cwd();
const intake=path.resolve(repo,'../incoming-2026-11-07/private-release');
const candidates=JSON.parse(await fs.readFile(path.join(intake,'editorial-candidates-november-07-five-topics-reviewed.json'),'utf8')) as any[];
const inventory=JSON.parse(await fs.readFile(path.join(intake,'november-07-five-topic-original-source-inventory.json'),'utf8')) as any[];
const bySource=new Map(inventory.map(item=>[item.design_id,item]));
const generatedPath=path.join(repo,'src/social/generated.json');
const generated=JSON.parse(await fs.readFile(generatedPath,'utf8')) as Record<string,any>;
const logo=new Uint8Array(await fs.readFile(path.join(repo,'public/logo-3d.webp')));
const review=[
 {key:'animals-rhino',sourceTopic:'rhino'},
 {key:'category-gymnastics',sourceTopic:'gymnastics'},
 {key:'category-rescue-bots',sourceTopic:'rescue-bots'},
 {key:'category-pusheen',sourceTopic:'pusheen'},
 {key:'animals-dogs',sourceTopic:'puppy'}
];
const outputs:any[]=[];
const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
for(const entry of review){
 const spec=SOCIAL_PAGES.find(item=>item.key===entry.key);
 if(!spec)throw new Error('Missing live collection identity '+entry.key);
 const chosen=candidates.filter(item=>item.source_topic===entry.sourceTopic).sort((a,b)=>Number(a.design_id.match(/(\d{3})$/)?.[1])-Number(b.design_id.match(/(\d{3})$/)?.[1])).slice(0,3);
 if(chosen.length!==3)throw new Error('Expected three source reviewed drawings for '+entry.sourceTopic);
 const art:any[]=[];
 for(const item of chosen){
  const source=bySource.get(item.design_id);
  if(!source?.private_webp_path)throw new Error('Missing preserved WebP source for '+item.design_id);
  const line=new Uint8Array(await fs.readFile(source.private_webp_path));
  const sha=digest(line);
  if(sha!==item.source_sha256||sha!==source.original_webp_sha256)throw new Error('Source checksum mismatch for '+item.design_id);
  art.push({slug:item.slug,title:item.title,alt:item.alt_text,line,sourceSHA256:sha});
 }
 const result=await renderSocial(spec,{art,logo,icon:await siteIcon(spec.icon)},{version:OG_VERSION,key:spec.key,path:spec.paths[0]});
 const sha=result.report.sha256,src=`/og/pages/${spec.key}-${sha.slice(0,16)}.png`;
 await fs.writeFile(path.join(repo,'public',src),result.bytes);
 generated[entry.key]={src,alt:result.alt,sha256:sha,title:spec.headline,description:spec.description};
 outputs.push({key:entry.key,source_topic:entry.sourceTopic,page:spec.paths[0],src,sha256:sha,bytes:result.bytes.length,description:spec.description,descriptionTruncated:result.report.descriptionTruncated,sources:chosen.map((item:any)=>({design_id:item.design_id,slug:item.slug,sha256:item.source_sha256}))});
}
await fs.writeFile(generatedPath,JSON.stringify(generated,null,2)+'\n');
const tiles=await Promise.all(outputs.map(async(item,index)=>({input:await sharp(path.join(repo,'public',item.src)).resize(360,189).png().toBuffer(),left:(index%3)*360,top:Math.floor(index/3)*189})));
const contact=await sharp({create:{width:1080,height:Math.ceil(outputs.length/3)*189,channels:3,background:'#fff'}}).composite(tiles).png().toBuffer();
const contactPath=path.join(intake,'november-07-five-topic-social-covers-contact-sheet.png');
await fs.writeFile(contactPath,contact);
await fs.writeFile(path.join(intake,'november-07-five-topic-social-cover-audit.json'),JSON.stringify({status:'rendered_pending_visual_review',release_id:'november-07-five-topics-20261107',outputs,contact_sheet:contactPath},null,2)+'\n');
console.log(JSON.stringify({status:'rendered_pending_visual_review',covers:outputs.length,descriptionTruncated:outputs.filter(item=>item.descriptionTruncated).map(item=>item.key),contact_sheet:contactPath}));
