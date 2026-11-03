/** Rebuild only the public catalog entrance cover from accepted showcase derivatives. */
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import showcase from '../../src/content/home-showcase.json';
import captions from '../../src/content/home-captions.json';
import {SOCIAL_PAGES,OG_VERSION} from '../../src/social/model';
import {renderSocial,siteIcon} from './render';
const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const spec=SOCIAL_PAGES.find(page=>page.key==='collection')!;
const read=async(url:string)=>{
 if(!/^https:\/\/assets\.jotcoloring\.com\/published\/[a-z0-9-]+\/\d+\/(?:catalog_thumb_bw|home_half_color)-[a-f0-9]{24}\.webp$/.test(url))throw new Error('Only accepted public showcase derivatives may be read.');
 const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error('Source image read failed: '+response.status);
 const bytes=new Uint8Array(await response.arrayBuffer()),hash=digest(bytes);if(bytes.length>2_000_000||!url.endsWith('-'+hash.slice(0,24)+'.webp'))throw new Error('Source image checksum mismatch.');return bytes;
};
const art=[];
for(const slug of spec.art){const pinned=showcase.find(item=>item.id==='jc-'+slug),copy=captions[('jc-'+slug) as keyof typeof captions];if(!pinned||!copy||pinned.sourceHash!==copy.sourceHash)throw new Error('The showcase source review is missing or stale.');
 const line=await read(pinned.thumbnail),color=await read(pinned.home_color);art.push({slug,title:copy.title,alt:copy.summary,line,color,sourceSHA256:digest(line)});
}
const result=await renderSocial(spec,{art,logo:new Uint8Array(await fs.readFile('public/logo-3d.webp')),icon:await siteIcon('all')},{version:OG_VERSION,key:spec.key,path:spec.paths[0]}),file='/og/pages/collection-'+result.report.sha256.slice(0,16)+'.png';
await fs.writeFile('public'+file,result.bytes);
const registry=JSON.parse(await fs.readFile('src/social/generated.json','utf8'));registry.collection={src:file,alt:result.alt,sha256:result.report.sha256,title:spec.headline,description:spec.description};
await fs.writeFile('src/social/generated.json',JSON.stringify(registry,null,2)+'\n');
await fs.mkdir('outputs/og',{recursive:true});await fs.writeFile('outputs/og/directory-report.json',JSON.stringify({...result.report,file},null,2));
console.log(JSON.stringify({file,bytes:result.bytes.length,sha256:result.report.sha256,verifiedSourceDrawings:art.length}));
