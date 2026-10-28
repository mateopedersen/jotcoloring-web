/** Prepare new immutable derivatives from the original unbranded source files.
 * This command never connects to Cloudflare or publishes content.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {BRAND_VERSION} from '../../src/server/branding';
import type {Content,Manifest} from '../../src/server/types';
const [snapshot,previousRoot,nextRoot]=process.argv.slice(2);if(!snapshot||!previousRoot||!nextRoot)throw new Error('Pass a public catalog snapshot, previous prepared root, and NEW output root.');
const publicCatalog=JSON.parse(await fs.readFile(snapshot,'utf8')) as {items:Content[]};if(!Array.isArray(publicCatalog.items)||publicCatalog.items.length===0)throw new Error('A complete catalog snapshot is required.');
if(path.resolve(previousRoot)===path.resolve(nextRoot))throw new Error('Use a new directory; preserve the accepted previous derivatives.');
await fs.mkdir(nextRoot,{recursive:true});
for(const item of publicCatalog.items){
 const previous=path.join(previousRoot,item.slug),output=path.resolve(nextRoot,item.slug),old=JSON.parse(await fs.readFile(path.join(previous,'manifest.json'),'utf8')) as Manifest,files=JSON.parse(await fs.readFile(path.join(previous,'files.json'),'utf8')) as Record<string,string>;
 if(old.content_id!==item.id||old.slug!==item.slug||old.provenance.rights_status!=='documented')throw new Error('The original rights record is missing or mismatched for '+item.id);
 const source=files.source_original||path.resolve('public/assets/originals',item.slug+'.png'),bytes=await fs.readFile(source),hash=createHash('sha256').update(bytes).digest('hex');
 if(!old.provenance.reference?.includes(hash))throw new Error('The original artwork changed since its accepted review: '+item.id);
 const args=['--import','tsx','scripts/data/prepare-media.ts','--input',source,'--id',item.id,'--slug',item.slug,'--title',old.title,'--description',old.description||'','--alt',old.alt_text||old.title,'--categories',old.category_ids.join(','),'--tags',old.tags.join(','),'--ages',(old.age_groups||[]).join(','),'--difficulty',old.difficulty||'detailed','--source-type',old.provenance.source_type,'--rights-status','documented','--rights-reference',`Original source and content review retained unchanged. ${old.provenance.reference}`,'--output',output];
 if(old.assets.some(a=>a.role==='home_half_color'))args.push('--color',path.resolve('public/assets/colors',item.slug+'.png'));
 const result=spawnSync(process.execPath,args,{encoding:'utf8',env:process.env});if(result.status!==0)throw new Error('Preparation failed for '+item.id+': '+result.stderr);
 const m=JSON.parse(await fs.readFile(path.join(output,'manifest.json'),'utf8')) as Manifest,version=item.version+1;
 m.import_action='update';m.expected_version=item.version;m.requested_status='published';m.idempotency_key=`${BRAND_VERSION}-${item.id}-${item.version}-${hash.slice(0,16)}`;
 for(const asset of m.assets){asset.asset_id=`${item.id}-${asset.role}-v${version}-${asset.sha256.slice(0,12)}`;asset.asset_version=version;asset.object_key=asset.object_key.replace('/1/',`/${version}/`);}
 await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(m,null,2),{mode:0o600});
 console.log(JSON.stringify({content:item.id,fromVersion:item.version,toVersion:version,assets:m.assets.length,maxPdfBytes:Math.max(...m.assets.filter(a=>a.mime==='application/pdf').map(a=>a.bytes)),brand:BRAND_VERSION}));
}
console.log(JSON.stringify({mode:'PREPARED_ONLY',contents:publicCatalog.items.length,output:path.resolve(nextRoot)}));
