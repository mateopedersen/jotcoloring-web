/** Version-only publication for existing Workers. No resource/trigger provisioning. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const ACCOUNT='48c779c8eaa80234e0bb9d57f96e588b';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export type Stage='staging'|'production';
export type WorkerTarget={stage:Stage;name:string;config:any;originalConfig:string;originalEnvironment?:Stage;topLevelName:string};
export function assertWorkerName(stage:Stage,name:string){
  if(!['staging','production'].includes(stage)||!new Set([`jotcoloring-${stage}`,`jotcoloring-${stage}-jobs`]).has(name))throw new Error('Unreviewed Worker version target');
}
export function versionUploadConfig(target:WorkerTarget,grouped=true){
  assertWorkerName(target.stage,target.name);
  const c=target.config;
  if(c.account_id!==ACCOUNT||c.name!==target.name||c.vars?.APP_ENV!==target.stage)throw new Error('Version config identity mismatch');
  if(target.topLevelName!==(target.name.endsWith('-jobs')?'jotcoloring-jobs-local':'jotcoloring-web'))throw new Error('Service/environment grouping changed; requires operator review');
  if(c.unsafe||c.containers?.length||c.durable_objects?.bindings?.length||c.migrations?.length||Object.keys(c.exports||{}).length||c.services?.length||c.workflows?.length)throw new Error('Unsupported version deployment capability requires review');
  const producers=c.queues?.producers||[];
  const wanted=[`AI_QUEUE:jotcoloring-${target.stage}-ai`,`INGEST_QUEUE:jotcoloring-${target.stage}-ingest`].sort();
  if(JSON.stringify(producers.map((q:any)=>q.binding+':'+q.queue).sort())!==JSON.stringify(wanted)||producers.some((q:any)=>Object.keys(q).some(k=>!['binding','queue'].includes(k))))throw new Error('Version producer bindings differ from reviewed target');
  const selected:any={};
  for(const key of ['name','account_id','main','compatibility_date','compatibility_flags','rules','assets','limits','vars','d1_databases','r2_buckets','upload_source_maps','no_bundle','find_additional_modules','workers_dev','preview_urls'])if(c[key]!==undefined)selected[key]=structuredClone(c[key]);
  const base=path.dirname(path.resolve(target.originalConfig));
  selected.main=path.resolve(base,c.main);
  if(selected.assets?.directory)selected.assets.directory=path.resolve(base,selected.assets.directory);
  // The API's native queue metadata preserves exactly the reviewed runtime
  // producer bindings. Wrangler's normal queues config also requests an account
  // queue list, which an individual-Worker Editor deliberately cannot access.
  selected.unsafe={bindings:producers.map((q:any)=>({name:q.binding,type:'queue',queue_name:q.queue}))};
  // Preserve service/environment labels by retaining the original envelope.
  // Route, cron, consumer and observability settings are deliberately omitted.
  return grouped?{name:target.topLevelName,account_id:ACCOUNT,env:{[target.stage]:selected}}:selected;
}
export function serviceGrouping(target:WorkerTarget,tags:unknown){
  if(!Array.isArray(tags)||tags.some(tag=>typeof tag!=='string'))throw new Error('Existing Worker grouping is not readable');
  const reserved=tags.filter(tag=>tag.startsWith('cf:service=')||tag.startsWith('cf:environment='));
  if(!reserved.length)return false;
  const expected=[...tags.filter(tag=>!tag.startsWith('cf:service=')&&!tag.startsWith('cf:environment=')),`cf:service=${target.topLevelName}`,`cf:environment=${target.stage}`];
  if(JSON.stringify(tags)!==JSON.stringify(expected))throw new Error('Existing Worker grouping differs; stopped before any upload or settings write');
  return true;
}
export function versionDeployConfig(target:WorkerTarget){assertWorkerName(target.stage,target.name);return{name:target.name,account_id:ACCOUNT};}
export function parseVersionOutput(text:string,type:'version-upload'|'version-deploy',name:string){
  const rows=text.trim().split('\n').filter(Boolean).map(line=>{try{return JSON.parse(line)}catch{throw new Error('Malformed Wrangler operation record')}});
  const matches=rows.filter(row=>row.type===type);
  if(matches.length!==1||matches[0].version!==1||matches[0].worker_name!==name)throw new Error('Missing, ambiguous or wrong-Worker version record');
  const row=matches[0],id=type==='version-upload'?row.version_id:row.deployment_id;
  if(typeof id!=='string'||!UUID.test(id))throw new Error('Wrangler did not return an exact version/deployment UUID');
  return id;
}
export function assertDeployment(result:any,version:string,deployment:string){
  if(!UUID.test(version)||!UUID.test(deployment)||result?.id!==deployment||result?.strategy!=='percentage'||result?.versions?.length!==1||result.versions[0].version_id!==version||result.versions[0].percentage!==100)throw new Error('Deployment readback does not assign100% to the uploaded version');
  return{version_id:version,deployment_id:deployment,percentage:100};
}
type Runner=(args:string[],outputFile:string)=>Promise<void>;
type DeploymentReader=(name:string,deployment:string)=>Promise<unknown>;
type GroupingReader=(target:WorkerTarget)=>Promise<boolean>;
type Reporter=(event:Record<string,unknown>)=>void;
export async function activateVersion(target:WorkerTarget,configFile:string,uploadedVersion:string,commit:string,directory:string,runner:Runner,reader:DeploymentReader,report:Reporter=()=>{}){
  assertWorkerName(target.stage,target.name);
  if(!UUID.test(uploadedVersion)||!/^[a-f0-9]{40}$/.test(commit))throw new Error('Exact version and commit are required');
  const outputFile=path.join(directory,'deploy.ndjson');
  await runner(['versions','deploy',uploadedVersion+'@100%','--config',configFile,'--name',target.name,'--yes','--message',`JotColoring ${target.stage} ${commit}`],outputFile);
  const deployment=parseVersionOutput(await fs.readFile(outputFile,'utf8'),'version-deploy',target.name);
  report({status:'ACTIVATION_ACCEPTED_READBACK_PENDING',worker:target.name,commit,version_id:uploadedVersion,deployment_id:deployment});
  return assertDeployment(await reader(target.name,deployment),uploadedVersion,deployment);
}
export async function publishWorkerVersion(target:WorkerTarget,commit:string,directory:string,runner:Runner=runWrangler,reader:DeploymentReader=readDeployment,groupingReader:GroupingReader=readServiceGrouping,report:Reporter=()=>{}){
  assertWorkerName(target.stage,target.name);
  if(!/^[a-f0-9]{40}$/.test(commit))throw new Error('Actual release commit required');
  versionUploadConfig(target); // Validate before the read-only preflight, too.
  const grouped=await groupingReader(target);
  await fs.mkdir(directory,{recursive:false});
  const uploadFile=path.join(directory,'upload.json'),deployFile=path.join(directory,'activate.json'),outputFile=path.join(directory,'upload.ndjson');
  await fs.writeFile(uploadFile,JSON.stringify(versionUploadConfig(target,grouped),null,2)+'\n',{flag:'wx'});
  await fs.writeFile(deployFile,JSON.stringify(versionDeployConfig(target),null,2)+'\n',{flag:'wx'});
  await runner(['versions','upload','--config',uploadFile,...grouped?['--env',target.stage]:[],'--name',target.name,'--experimental-provision=false','--experimental-auto-create=false','--tag',commit,'--message',`JotColoring ${target.stage} ${commit}`],outputFile);
  const version=parseVersionOutput(await fs.readFile(outputFile,'utf8'),'version-upload',target.name);
  await fs.writeFile(path.join(directory,'receipt.json'),JSON.stringify({status:'UPLOADED_ACTIVATION_NOT_CONFIRMED',worker:target.name,commit,version_id:version},null,2)+'\n');
  report({status:'UPLOADED_ACTIVATION_NOT_CONFIRMED',worker:target.name,commit,version_id:version});
  const result=await activateVersion(target,deployFile,version,commit,directory,runner,reader,report);
  const receipt={status:'VERSION_ACTIVATED_AND_VERIFIED',worker:target.name,commit,...result};
  await fs.writeFile(path.join(directory,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
  return receipt;
}
export async function runWrangler(args:string[],outputFile:string){
  // Each subprocess gets a fresh file; no prior successful UUID can be reused.
  await fs.writeFile(outputFile,'',{flag:'wx'});
  // versions deploy prints prior version authors. Keep raw CLI output out of
  // public GitHub logs; the structured UUID receipts provide release evidence.
  const result=spawnSync('pnpm',['exec','wrangler',...args],{stdio:'pipe',encoding:'utf8',maxBuffer:16*1024*1024,env:{...process.env,CLOUDFLARE_API_BASE_URL:'https://api.cloudflare.com/client/v4',WRANGLER_OUTPUT_FILE_PATH:path.resolve(outputFile),WRANGLER_SEND_METRICS:'false'}});
  if(result.status!==0){const codes=[...new Set([...((result.stdout||'')+(result.stderr||'')).matchAll(/\[code:\s*(\d+)\]/g)].map(m=>m[1]))];throw new Error(`Worker ${args.slice(0,2).join(' ')} failed (exit ${result.status??'unknown'}; API codes ${codes.join(',')||'unavailable'}); later publication steps were not run`);}
}
export async function readBundleMetadata(file:string){
  const bytes=await fs.readFile(file),boundary=bytes.subarray(0,bytes.indexOf('\r\n')).toString();
  if(!boundary.startsWith('--'))throw new Error('Wrangler bundle lacks a multipart boundary');
  const form=await new Response(bytes,{headers:{'Content-Type':'multipart/form-data; boundary='+boundary.slice(2)}}).formData();
  const value=form.get('metadata');
  if(typeof value!=='string')throw new Error('Wrangler bundle lacks metadata');
  return JSON.parse(value);
}
function normalized(value:any):any{
  if(Array.isArray(value))return value.map(normalized).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,normalized(value[key])]));
  return value;
}
export function assertBundleMetadataUnchanged(original:any,versionOnly:any){
  if(JSON.stringify(normalized(original))!==JSON.stringify(normalized(versionOnly)))throw new Error('Version-only bundle metadata differs from the reviewed original');
  const queues=versionOnly.bindings?.filter((b:any)=>b.type==='queue')||[];
  if(queues.length!==2||!versionOnly.keep_bindings?.includes('secret_text'))throw new Error('Queue or existing secret preservation missing from bundle');
  return{bindings:versionOnly.bindings.length,queue_bindings:queues,keeps_existing_secrets:true};
}
/** Actual pinned Wrangler compilation; credentials are explicitly removed. */
export async function rehearseVersionBundle(target:WorkerTarget,directory:string){
  await fs.mkdir(directory,{recursive:false});
  const configFile=path.join(directory,'upload.json');await fs.writeFile(configFile,JSON.stringify(versionUploadConfig(target),null,2)+'\n',{flag:'wx'});
  const outputs=['original.multipart','version-only.multipart'].map(name=>path.resolve(directory,name));
  const configs=[['--config',target.originalConfig,...target.originalEnvironment?['--env',target.originalEnvironment]:[]],['--config',configFile,'--env',target.stage]];
  for(let i=0;i<configs.length;i++){
    const env:NodeJS.ProcessEnv={...process.env,WRANGLER_SEND_METRICS:'false'};
    for(const key of ['CLOUDFLARE_API_TOKEN','CLOUDFLARE_API_KEY','CLOUDFLARE_EMAIL','WRANGLER_OUTPUT_FILE_PATH','WRANGLER_OUTPUT_FILE_DIRECTORY'])delete env[key];
    const result=spawnSync('pnpm',['exec','wrangler','versions','upload',...configs[i],'--name',target.name,'--experimental-provision=false','--experimental-auto-create=false','--dry-run','--outfile',outputs[i]],{stdio:'pipe',encoding:'utf8',env});
    if(result.status!==0)throw new Error('Version bundle rehearsal failed: '+result.stderr.slice(-1500));
  }
  const result=assertBundleMetadataUnchanged(await readBundleMetadata(outputs[0]),await readBundleMetadata(outputs[1]));
  const evidence={status:'PASS',worker:target.name,environment:target.stage,wrangler:'4.153.0',published:false,...result};
  await fs.writeFile(path.join(directory,'result.json'),JSON.stringify(evidence,null,2)+'\n');
  return evidence;
}
async function readDeployment(name:string,deployment:string){
  if(!/^jotcoloring-(staging|production)(-jobs)?$/.test(name)||!UUID.test(deployment))throw new Error('Unreviewed deployment readback target');
  const token=process.env.CLOUDFLARE_API_TOKEN;
  if(!token||process.env.CLOUDFLARE_ACCOUNT_ID!==ACCOUNT)throw new Error('Reviewed deployment credentials unavailable');
  const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${name}/deployments/${deployment}`,{headers:{Authorization:`Bearer ${token}`},redirect:'error',signal:AbortSignal.timeout(30000)});
  let body:any;try{body=await response.json()}catch{throw new Error('Deployment readback returned an invalid response')}
  if(!response.ok||body.success!==true)throw new Error(`Deployment readback failed (HTTP${response.status}; codes:${(body.errors||[]).map((e:any)=>Number(e.code)).join(',')})`);
  // Never record the response's author email or other account metadata.
  return{id:body.result?.id,strategy:body.result?.strategy,versions:body.result?.versions};
}
async function readServiceGrouping(target:WorkerTarget){
  assertWorkerName(target.stage,target.name);
  const token=process.env.CLOUDFLARE_API_TOKEN;
  if(!token||process.env.CLOUDFLARE_ACCOUNT_ID!==ACCOUNT)throw new Error('Reviewed deployment credentials unavailable');
  const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/services/${target.name}`,{headers:{Authorization:`Bearer ${token}`},redirect:'error',signal:AbortSignal.timeout(30000)});
  let body:any;try{body=await response.json()}catch{throw new Error('Worker grouping readback returned an invalid response')}
  if(!response.ok||body.success!==true)throw new Error(`Worker grouping readback failed (HTTP${response.status})`);
  const script=body.result?.default_environment?.script;
  if(!script||typeof script.tag!=='string'||!script.tag)throw new Error('Existing Worker service metadata is incomplete');
  return serviceGrouping(target,script.tags||[]);
}
