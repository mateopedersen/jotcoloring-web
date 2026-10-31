/** Add only the three new collection covers; preserve all accepted existing social assets. */
import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
import {SOCIAL_PAGES,OG_VERSION} from '../../src/social/model';import {renderSocial,siteIcon} from './render';
const registry=JSON.parse(await fs.readFile('src/social/generated.json','utf8'));const logo=new Uint8Array(await fs.readFile('public/logo-3d.webp'));
for(const id of ['cartoons','dolls-toys','video-games']){const spec=SOCIAL_PAGES.find(p=>p.key==='category-'+id)!;if(!spec)throw Error('Missing root');
 const result=await renderSocial(spec,{logo,icon:await siteIcon(spec.icon),art:[]},{version:OG_VERSION,key:spec.key,path:spec.paths[0]});
 const hash=createHash('sha256').update(result.bytes).digest('hex'),src=`/og/pages/${spec.key}-${hash.slice(0,16)}.png`;
 await fs.writeFile('public'+src,result.bytes);registry[spec.key]={src,alt:result.alt,sha256:hash,title:spec.headline,description:spec.description};console.log(spec.key,hash);
}
await fs.writeFile('src/social/generated.json',JSON.stringify(registry,null,2)+'\n');
