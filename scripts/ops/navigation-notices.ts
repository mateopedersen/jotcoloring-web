/** Queue only reviewed public canonical changes; preserve historical receipts. */
import fs from 'node:fs/promises';import {remoteContext} from './release-context';import {backupBytes} from '../../src/server/backups';
import {COLORING_TAXONOMY,categoryPath} from '../../src/taxonomy/catalog';import {catalogLocation} from '../../src/taxonomy/catalog-location';
import {canonicalJSON,sha256} from '../../src/server/http';import {queueDiscoveryRebuild,queueDiscoveryNotices} from '../../src/server/discovery';
const [action,proofFile]=process.argv.slice(2);if(!['plan','apply','send','status'].includes(action)||!proofFile)throw Error('Use plan/apply/send/status and exact verified public proof');
const proof=JSON.parse(await fs.readFile(proofFile,'utf8'));if(proof.status!=='PASS'||!/^[a-f0-9]{40}$/.test(proof.source_commit)||!Array.isArray(proof.canonical_pages)||proof.canonical_pages.length<100)throw Error('Complete live canonical/redirect proof required');
const revision='navigation-v1:'+proof.source_commit,paths=[...new Set(proof.canonical_pages.map((p:any)=>p.path))] as string[];
if(paths.some(p=>catalogLocation(p)?.path!==p))throw Error('Only current canonical topic/collection URLs');
const redirects=COLORING_TAXONOMY.flatMap(c=>{const old='/coloring-pages/'+(c.parent?c.parent+'/':'')+c.id+'/',target=categoryPath(c.id);return old!==target?[{path:old,target}]:[];});
redirects.push({path:'/coloring-pages/animals/dinosaurs/',target:categoryPath('dinosaurs')});
if(redirects.some(r=>!proof.redirects?.some((p:any)=>p.path===r.path&&p.target===r.target&&p.status===301)))throw Error('Every legacy redirect requires actual live proof');
const plan={revision,source_commit:proof.source_commit,public_proof_sha256:await sha256(canonicalJSON(proof)),canonical_paths:paths,redirects};
if(action==='plan'){console.log(JSON.stringify({status:'PLAN_ONLY',...plan},null,2));process.exit(0);}
const {env}=await remoteContext('production',{requestLimit:3000});env.PUBLIC_SITE_URL='https://jotcoloring.com';env.PUBLIC_MEDIA_BASE_URL='https://assets.jotcoloring.com';env.DISCOVERY_ENABLED='true';
let applied:Record<string,unknown>={};
if(action==='apply'){
 if(!process.argv.includes('--apply'))throw Error('--apply required');
 const keys=[...paths,...redirects.map(r=>r.path)],previous={pages:(await env.CATALOG_DB!.prepare('SELECT * FROM discovery_page WHERE path_key IN (SELECT value FROM json_each(?))').bind(JSON.stringify(keys)).all()).results,notices:(await env.CATALOG_DB!.prepare('SELECT * FROM discovery_notice WHERE revision=?').bind(revision).all()).results},bytes=new TextEncoder().encode(canonicalJSON({plan,previous})),backup=await backupBytes(env,'navigation-discovery/'+revision.replace(':','/')+'/'+await sha256(bytes)+'.json',bytes,'application/json'),changedAt=proof.verified_at;
 if(!Number.isFinite(Date.parse(changedAt)))throw Error('Exact actual publication verification timestamp required');
 for(let start=0;start<paths.length;start+=20)await env.CATALOG_DB!.batch(paths.slice(start,start+20).flatMap(path=>[env.CATALOG_DB!.prepare('INSERT INTO discovery_page(path_key,lastmod) VALUES(?,?) ON CONFLICT(path_key) DO UPDATE SET lastmod=MAX(discovery_page.lastmod,excluded.lastmod)').bind(path,changedAt),env.CATALOG_DB!.prepare("INSERT OR IGNORE INTO discovery_notice(path_key,revision,event_type) VALUES(?,?,'upsert')").bind(path,revision)]));
 for(let start=0;start<redirects.length;start+=20)await env.CATALOG_DB!.batch(redirects.slice(start,start+20).map(r=>env.CATALOG_DB!.prepare("INSERT OR IGNORE INTO discovery_notice(path_key,revision,event_type) VALUES(?,?,'redirect')").bind(r.path,revision)));
 await env.CATALOG_DB!.prepare("INSERT INTO discovery_dirty(segment) VALUES('static') ON CONFLICT(segment) DO UPDATE SET generation=generation+1").run();await queueDiscoveryRebuild(env);applied={status:'QUEUED_NOT_SENT',...plan,backup};
}
if(action==='send'){
 if(!process.argv.includes('--apply'))throw Error('--apply required');await queueDiscoveryNotices(env,revision);
}
console.log(JSON.stringify({...applied,revision,states:(await env.CATALOG_DB!.prepare('SELECT state,COUNT(*) AS count FROM discovery_notice WHERE revision=? GROUP BY state').bind(revision).all()).results,issues:(await env.CATALOG_DB!.prepare("SELECT path_key,state,attempts,last_status,last_error,not_before FROM discovery_notice WHERE revision=? AND state NOT IN ('received','key_pending','obsolete') ORDER BY id LIMIT 30").bind(revision).all()).results},null,2));
