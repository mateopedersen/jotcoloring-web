/** Publish the bounded reviewed release through the normal import/backup pipeline. */
import fs from 'node:fs/promises';
import {remoteContext} from './release-context';
import {validateManifest} from '../../src/server/manifest';
import {acceptReview,reviewSignature,publishedKey} from '../../src/server/assets';
import {createImport,processImport,projectEvent,publishContent} from '../../src/server/imports';
import {canonicalJSON,sha256} from '../../src/server/http';
const environment=process.argv[2];if(environment!=='staging'&&environment!=='production')throw new Error('Environment required');
const {env,requests}=await remoteContext(environment),root=`.local/release-content/${environment}`;
const items=[];for(const entry of await fs.readdir(root,{withFileTypes:true})){if(!entry.isDirectory())continue;const dir=`${root}/${entry.name}`,m=validateManifest(JSON.parse(await fs.readFile(`${dir}/manifest.json`,'utf8')),true);items.push({m,files:JSON.parse(await fs.readFile(`${dir}/files.json`,'utf8')),reviews:JSON.parse(await fs.readFile(`${dir}/reviews.json`,'utf8'))});}
if(items.length!==18||items.some(i=>i.m.import_action!=='update'||i.m.assets.length!==8||!i.m.age_recommendation))throw new Error('Release must contain exactly 18 complete reviewed updates');
// All preflight checks happen before any write.
for(const {m,files} of items){const row=await env.CATALOG_DB!.prepare('SELECT active_version,latest_version,status,slug FROM content WHERE id=?').bind(m.content_id).first<any>();if(!row||row.slug!==m.slug||row.status!=='published'||![m.expected_version,m.expected_version!+1].includes(row.latest_version))throw new Error('Concurrent content update: '+m.slug);for(const a of m.assets){const b=new Uint8Array(await fs.readFile(files[a.role]));if(b.length!==a.bytes||await sha256(b)!==a.sha256)throw new Error('Prepared media changed');}}
if(!process.argv.includes('--apply')){console.log(JSON.stringify({environment,mode:'PLAN',items:items.length,assets:144,requests:requests()}));process.exit(0);}
const report:any={environment,items:[],started:new Date().toISOString(),status:'RUNNING'};
try{for(const {m,files,reviews} of items){let current=await env.CATALOG_DB!.prepare('SELECT active_version,latest_version FROM content WHERE id=?').bind(m.content_id).first<any>();
if(current.active_version===m.expected_version!+1){const row=await env.CATALOG_DB!.prepare('SELECT manifest_json FROM content_revision WHERE content_id=? AND version=?').bind(m.content_id,current.active_version).first<any>();if(JSON.parse(row.manifest_json).idempotency_key!==m.idempotency_key)throw new Error('Unrelated update found');}
else if(current.latest_version===m.expected_version!+1){const saved=await env.CATALOG_DB!.prepare('SELECT manifest_json FROM content_revision WHERE content_id=? AND version=?').bind(m.content_id,current.latest_version).first<any>();if(!saved||canonicalJSON(JSON.parse(saved.manifest_json))!==canonicalJSON(m))throw new Error('Unrelated pending revision');await publishContent(env,m.content_id,current.latest_version,'operator:owner-authorized-release-20261029');await env.CATALOG_DB!.prepare("UPDATE import_job SET status='completed',error_code=NULL,updated_at=? WHERE idempotency_key=? AND owner=?").bind(new Date().toISOString(),m.idempotency_key,'operator:owner-authorized-release-20261029').run();}
else{for(const a of m.assets)await env.ORIGINALS!.put(a.object_key,new Uint8Array(await fs.readFile(files[a.role])),{httpMetadata:{contentType:a.mime}});
for(const review of reviews)await acceptReview(env,review,await reviewSignature(review,env.MEDIA_VALIDATION_SECRET!));
await createImport(env,m,'operator:owner-authorized-release-20261029');const job=await env.CATALOG_DB!.prepare('SELECT id FROM import_job WHERE idempotency_key=?').bind(m.idempotency_key).first<any>();if(!job)throw new Error('Import missing');await processImport(env,job.id,`imports/${job.id}/manifest.json`);}
const version=m.expected_version!+1,events=await env.CATALOG_DB!.prepare('SELECT event_id FROM outbox_event WHERE content_id=? AND version=? AND processed_at IS NULL').bind(m.content_id,version).all<{event_id:string}>();for(const event of events.results)await projectEvent(env,event.event_id);
current=await env.CATALOG_DB!.prepare('SELECT active_version,status FROM content WHERE id=?').bind(m.content_id).first<any>();if(current.active_version!==version||current.status!=='published')throw new Error('Publication not confirmed');
for(const a of m.assets){const o=await env.PUBLISHED!.get(publishedKey(m.content_id,version,a));if(!o||o.size!==a.bytes||await sha256(new Uint8Array(await o.arrayBuffer()))!==a.sha256)throw new Error('Published bytes differ');}
const old=await env.CATALOG_DB!.prepare('SELECT COUNT(*) AS n FROM asset WHERE content_id=? AND content_version=?').bind(m.content_id,m.expected_version).first<number>('n');if(!old)throw new Error('Previous revision missing');
report.items.push({slug:m.slug,version,assetsVerified:m.assets.length,previousRevisionPreserved:true});console.log(JSON.stringify(report.items.at(-1)));}
report.status='PASS';}catch(e){report.status='FAIL';report.error=(e as Error).message;throw e;}finally{report.requests=requests();report.finished=new Date().toISOString();await fs.writeFile(`${root}/publication.json`,JSON.stringify(report,null,2));}
