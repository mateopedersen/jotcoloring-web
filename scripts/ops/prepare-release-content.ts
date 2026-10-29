/** Read-only remote preparation. The actual publication is a separate explicit step. */
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {remoteContext} from './release-context';
import {localStorage} from '../data/local-storage';
import {validateManifest} from '../../src/server/manifest';
import {pngBinding} from '../../src/social/png';
import {socialBinding,contentSocialSpec} from '../../src/social/model';
import {renderSocial,siteIcon} from '../social/render';
import {AGE_VERSION,ageBand} from '../../src/age/model';
import {canonicalJSON} from '../../src/server/http';
import type {Database,Bucket,Manifest} from '../../src/server/types';
const environment=process.argv[2];if(environment!=='staging'&&environment!=='production')throw new Error('Environment required');
const {env}=await remoteContext(environment),mf=localStorage(),hash=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
try{
const db=await mf.getD1Database('CATALOG_DB') as Database,published=await mf.getR2Bucket('PUBLISHED') as Bucket;
const local=await db.prepare("SELECT c.id,c.slug,r.manifest_json FROM content c JOIN content_revision r ON r.content_id=c.id AND r.version=c.active_version WHERE c.status='published'").all<any>();
if(local.results.length!==18)throw new Error('Unexpected local catalog size');
const root=`.local/release-content/${environment}`;await fs.mkdir(root,{recursive:true,mode:0o700});const summary=[];
for(const row of local.results){const lm=JSON.parse(row.manifest_json) as Manifest;
const remote=await env.CATALOG_DB!.prepare('SELECT c.*,r.manifest_json FROM content c JOIN content_revision r ON r.content_id=c.id AND r.version=c.active_version WHERE c.id=?').bind(row.id).first<any>();
if(!remote||remote.slug!==row.slug||remote.status!=='published'||remote.active_version!==remote.latest_version)throw new Error('Current remote content is not an unmodified published revision: '+row.slug);
const rm=JSON.parse(remote.manifest_json) as Manifest;
const localLine=lm.assets.find(a=>a.role==='printable_webp_bw')!,remoteLine=rm.assets.find(a=>a.role==='printable_webp_bw')!;
if(localLine.sha256!==remoteLine.sha256&&!(environment==='staging'&&process.argv.includes('--promote-reviewed-local')))throw new Error('Remote/local source pixels differ: '+row.slug);
const m:Manifest={...lm,provenance:rm.provenance,import_action:'update',expected_version:remote.latest_version,idempotency_key:`release-20261029-${row.id}-v${remote.latest_version+1}`,assets:[]};
m.age_recommendation=JSON.parse(await fs.readFile(`.local/age-vision/assessments/${AGE_VERSION}-${localLine.sha256}-branded.json`,'utf8'));m.age_groups=[ageBand(m.age_recommendation!.band)!.group];
const idMap=new Map(lm.assets.map(a=>[a.asset_id,`${row.id}-r${remote.latest_version+1}-${a.role}`]));
const dir=`${root}/${row.slug}`;await fs.mkdir(dir,{recursive:true,mode:0o700});const files:Record<string,string>={},reviews=[];
for(const a of lm.assets){
const stored=await db.prepare('SELECT a.object_key FROM asset a JOIN content c ON c.id=a.content_id AND c.active_version=a.content_version WHERE c.id=? AND a.role=?').bind(row.id,a.role).first<any>();
const obj=await published.get(stored.object_key);if(!obj)throw new Error('Missing reviewed local bytes');const bytes=new Uint8Array(await obj.arrayBuffer());if(hash(bytes)!==a.sha256)throw new Error('Local asset checksum mismatch');
const ext=a.mime==='application/pdf'?'pdf':a.mime==='image/png'?'png':'webp';
const next={...a,asset_id:idMap.get(a.asset_id)!,source_asset_id:a.source_asset_id?idMap.get(a.source_asset_id):undefined,object_key:`incoming/${row.id}/release-20261029-v${remote.latest_version+1}/${a.role}-${a.sha256.slice(0,24)}.${ext}`};m.assets.push(next);files[a.role]=`${dir}/${a.role}.${ext}`;await fs.writeFile(files[a.role],bytes);
const review=await db.prepare('SELECT * FROM asset_review WHERE sha256=? AND role=?').bind(a.sha256,a.role).first<any>();if(!review||review.review_version!==3)throw new Error('Current media review missing');reviews.push({sha256:a.sha256,role:a.role,mime:a.mime,bytes:a.bytes,width:a.width??null,height:a.height??null,page_count:a.page_count??null,bw:!!review.bw,review_version:review.review_version,reviewed_at:new Date().toISOString()});
}
const binding=socialBinding({...m,recommendedAge:m.age_recommendation!.band,sourceSHA256:localLine.sha256}),spec=contentSocialSpec(binding);const rendered=await renderSocial(spec,{logo:new Uint8Array(await fs.readFile('public/logo-3d.webp')),icon:await siteIcon(spec.icon),art:[{slug:m.slug,title:m.title,alt:m.alt_text||m.title,line:new Uint8Array(await fs.readFile(files.printable_webp_bw)),color:new Uint8Array(await fs.readFile(files.color_inspiration)),sourceSHA256:localLine.sha256}]},binding);const oa=m.assets.find(a=>a.role==='social_og')!;oa.sha256=hash(rendered.bytes);oa.bytes=rendered.bytes.length;oa.object_key=`incoming/${m.content_id}/release-20261029-v${remote.latest_version+1}/social_og-${oa.sha256.slice(0,24)}.png`;await fs.writeFile(files.social_og,rendered.bytes);const or=reviews.find(r=>r.role==='social_og')!;or.sha256=oa.sha256;or.bytes=oa.bytes;
validateManifest(m,true);const og=new Uint8Array(await fs.readFile(files.social_og));if(canonicalJSON(pngBinding(og))!==canonicalJSON(socialBinding({...m,recommendedAge:m.age_recommendation?.band,sourceSHA256:localLine.sha256})))throw new Error('Editorial metadata differs; social cover must be regenerated: '+row.slug);
await fs.writeFile(`${dir}/reviews.json`,JSON.stringify(reviews,null,2));await fs.writeFile(`${dir}/manifest.json`,JSON.stringify(m,null,2));await fs.writeFile(`${dir}/files.json`,JSON.stringify(files,null,2));summary.push({slug:row.slug,from:remote.active_version,to:remote.active_version+1,assets:m.assets.length,age:m.age_recommendation?.band,sourceMatched:localLine.sha256===remoteLine.sha256});
}
await fs.writeFile(`${root}/preparation.json`,JSON.stringify(summary,null,2));console.log(JSON.stringify({environment,prepared:summary.length,assets:summary.reduce((n,r)=>n+r.assets,0),sourcesMatched:summary.every(i=>i.sourceMatched),reviewedLocalPromotion:environment==='staging'&&process.argv.includes('--promote-reviewed-local')}));
}finally{await mf.dispose();}
