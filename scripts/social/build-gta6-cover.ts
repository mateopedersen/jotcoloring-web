/** Render the GTA 6 collection cover from three checksum-pinned reviewed artworks. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {SOCIAL_PAGES,OG_VERSION} from '../../src/social/model';
import {renderSocial,siteIcon} from './render';

const root='/private/tmp/jotcoloring-auto29-stage/private-release';
const inventory=JSON.parse(await fs.readFile(path.join(root,'gta6-publish-source-inventory.json'),'utf8')) as any[];
const reviews=JSON.parse(await fs.readFile(path.join(root,'approved-reviews/gta-6.json'),'utf8')) as any[];
const ids=['gta-6__001','gta-6__050','gta-6__120'];
const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const spec=SOCIAL_PAGES.find(page=>page.key==='topic-gta-6');
if(!spec||spec.paths[0]!=='/coloring-pages/gta-6/')throw new Error('Reviewed GTA 6 page identity is missing.');
const art=[];
for(const id of ids){
 const source=inventory.find(row=>row.design_id===id),review=reviews.find(row=>row.design_id===id);
 if(!source||!review||review.status!=='approved_for_publication'||!review.second_editorial_review)throw new Error('Missing double reviewed GTA 6 source: '+id);
 const line=new Uint8Array(execFileSync('/usr/bin/unzip',['-p',source.source_zip_path,source.source_webp_path],{maxBuffer:25_000_000}));
 if(digest(line)!==source.original_webp_sha256||source.source_sha256!==source.original_webp_sha256||review.webp_sha256!==source.original_webp_sha256)throw new Error('GTA 6 cover source checksum mismatch: '+id);
 art.push({slug:review.slug,title:review.title,alt:review.alt_text,line,sourceSHA256:source.original_webp_sha256});
}
const logo=new Uint8Array(await fs.readFile('public/logo-3d.webp'));
const result=await renderSocial(spec,{art,logo,icon:await siteIcon(spec.icon)},{version:OG_VERSION,key:spec.key,path:spec.paths[0],title:spec.headline,description:spec.description,sources:art.map(item=>({slug:item.slug,sha256:item.sourceSHA256}))});
if(result.report.descriptionTruncated)throw new Error('GTA 6 cover copy was truncated.');
const source='/og/pages/topic-gta-6-'+result.report.sha256.slice(0,16)+'.png';
await fs.writeFile('public'+source,result.bytes);
const generatedPath='src/social/generated.json',generated=JSON.parse(await fs.readFile(generatedPath,'utf8'));
generated['topic-gta-6']={src:source,alt:result.alt,sha256:result.report.sha256,title:spec.headline,description:spec.description};
await fs.writeFile(generatedPath,JSON.stringify(generated,null,2)+'\n');
const receipt={status:'rendered_pending_visual_review',key:spec.key,path:spec.paths[0],src:source,sha256:result.report.sha256,bytes:result.bytes.length,sources:ids.map(id=>({design_id:id,sha256:inventory.find(row=>row.design_id===id).original_webp_sha256}))};
const receiptPath=path.join(root,'gta6-social-cover-review.json');
await fs.writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify(receipt));
