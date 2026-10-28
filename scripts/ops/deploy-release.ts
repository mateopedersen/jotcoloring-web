/** Checked GitHub Actions jobs→web release. Default validates only; --prepare
 * creates a local artifact manifest; --apply is restricted to trusted push CI.
 */
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {spawnSync} from 'node:child_process';import {pathToFileURL} from 'node:url';
import {publishWorkerVersion,rehearseVersionBundle,type WorkerTarget} from './worker-version-release';
type Stage='staging'|'production';
const ACCOUNT='48c779c8eaa80234e0bb9d57f96e588b',ZONE='f719bb4d17d29abc414ab167ba2797e4',REPOSITORY='mateopedersen/jotcoloring-web';
const DATABASES={staging:{CATALOG_DB:'835240f5-90d7-4bf2-8a41-b67cc484fb4b',SEARCH_DB:'1f4852c1-2b4d-4e80-99a3-f86be83858b6'},production:{CATALOG_DB:'d075722e-c698-4b6e-a5e4-f53ae5c9e411',SEARCH_DB:'59133e5c-f73a-42d2-8b8b-223720e8b6ec'}};
const FREE_GATEWAY='https://jotcoloring-ai-free-gateway.jotcoloring-web.workers.dev',AI_MODEL='@cf/black-forest-labs/flux-2-klein-4b';
const sorted=(items:string[])=>JSON.stringify([...items].sort());
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
function stageOf(value:unknown):Stage{if(value!=='staging'&&value!=='production')throw new Error('Explicit staging or production environment required');return value;}
export function assertReleaseTargets(stage:Stage,web:any,jobsRoot:any){
  stageOf(stage);const jobs={...jobsRoot,...jobsRoot.env?.[stage]},expectedName=`jotcoloring-${stage}`;
  for(const [kind,config]of [['web',web],['jobs',jobs]] as const){
    if(config.name!==expectedName+(kind==='jobs'?'-jobs':'')||config.account_id!==ACCOUNT||config.vars?.APP_ENV!==stage)throw new Error('Release Worker/account/environment mismatch');
    if(config.vars.AI_BILLING_MODE!=='free_only'||config.vars.AI_DAILY_BUDGET_USD!=='0'||config.vars.AI_MONTHLY_BUDGET_USD!=='0'||config.ai)throw new Error('Release would change reviewed free-only AI boundary');
    const daily=Number(config.vars.AI_FREE_DAILY_NEURONS),perJob=Number(config.vars.AI_FREE_MAX_JOB_NEURONS);
    if(config.vars.AI_FREE_GATEWAY_URL!==FREE_GATEWAY||config.vars.AI_MODEL_ID!==AI_MODEL||!Number.isSafeInteger(daily)||daily<1||daily>9000||perJob!==300)throw new Error('Release would change reviewed free-only gateway, model or neuron caps');
    if(!Array.isArray(config.d1_databases)||config.d1_databases.length!==2||config.d1_databases.some((d:any)=>DATABASES[stage][d.binding as keyof typeof DATABASES[Stage]]!==d.database_id||d.database_name!==`${expectedName}-${d.binding==='CATALOG_DB'?'catalog':'search'}`)||new Set(config.d1_databases.map((d:any)=>d.binding)).size!==2)throw new Error('Release D1 binding mismatch');
    const buckets={ORIGINALS:`${expectedName}-originals`,PUBLISHED:`${expectedName}-published`,JOB_ASSETS:`${expectedName}-jobs`,BACKUPS:`${expectedName}-backups`};
    if(!Array.isArray(config.r2_buckets)||config.r2_buckets.length!==4||config.r2_buckets.some((b:any)=>buckets[b.binding as keyof typeof buckets]!==b.bucket_name)||new Set(config.r2_buckets.map((b:any)=>b.binding)).size!==4)throw new Error('Release R2 binding mismatch');
    const producers=config.queues?.producers||[];
    if(sorted(producers.map((q:any)=>q.binding+':'+q.queue))!==sorted([`INGEST_QUEUE:${expectedName}-ingest`,`AI_QUEUE:${expectedName}-ai`]))throw new Error('Release queue producer mismatch');
    if(config.services?.length||config.workflows?.length||config.kv_namespaces?.length)throw new Error('Unexpected additional resource bindings require review');
  }
  if(jobs.workers_dev!==false||jobs.preview_urls!==false||jobs.routes?.length)throw new Error('Background Worker must not acquire a public route');
  const consumers=jobs.queues?.consumers||[];
  if(consumers.length!==2||sorted(consumers.map((c:any)=>c.queue))!==sorted([`${expectedName}-ingest`,`${expectedName}-ai`])||consumers.some((c:any)=>c.dead_letter_queue!==`${expectedName}-dead-letter`||c.max_batch_size!==1||c.max_retries!==3))throw new Error('Release consumer or DLQ mismatch');
  if(web.queues?.consumers?.length)throw new Error('Web Worker must not acquire queue consumers');
  if(JSON.stringify(jobs.triggers?.crons)!==JSON.stringify(['*/10 * * * *'])||web.triggers?.crons?.length)throw new Error('Release cron trigger differs; requires separate operator review');
  const expectedRoutes=stage==='staging'?['staging.jotcoloring.com']:['jotcoloring.com/*','www.jotcoloring.com/*'];
  if(!Array.isArray(web.routes)||sorted(web.routes.map((r:any)=>r.pattern))!==sorted(expectedRoutes)||web.routes.some((r:any)=>r.zone_id!==ZONE||Boolean(r.custom_domain)!==(stage==='staging')))throw new Error('Release route/zone mismatch');
  return{account:ACCOUNT,environment:stage,jobs_worker:jobs.name,web_worker:web.name,zone:ZONE,order:[jobs.name,web.name],database_migrations:false,resource_creation:false,trigger_updates:false,queue_management:false,publication:'versions upload then exact UUID at100%'};
}
async function listFiles(directory:string,base=directory):Promise<{path:string;bytes:number;sha256:string}[]>{
  const result=[];for(const name of (await fs.readdir(directory)).sort()){const full=path.join(directory,name),rel=path.relative(base,full).split(path.sep).join('/');if(rel==='release-manifest.json')continue;const stat=await fs.lstat(full);if(stat.isSymbolicLink())throw new Error('Build artifact must not contain symlinks');if(stat.isDirectory())result.push(...await listFiles(full,base));else if(stat.isFile()){const bytes=await fs.readFile(full);result.push({path:rel,bytes:bytes.length,sha256:sha(bytes)});}else throw new Error('Unexpected artifact entry');}return result;
}
export async function createArtifactManifest(directory:string,stage:Stage,commit:string,lockHash:string){stageOf(stage);if(!/^[a-f0-9]{40}$/.test(commit)||!/^[a-f0-9]{64}$/.test(lockHash))throw new Error('Actual commit and lock hash required');const files=await listFiles(directory);if(!files.some(f=>f.path==='server/wrangler.json')||!files.some(f=>f.path==='server/entry.mjs'))throw new Error('Built Astro Worker missing');return{format:'jotcoloring-checked-release/1',environment:stage,commit,lock_sha256:lockHash,files};}
export async function verifyArtifactManifest(directory:string,manifest:any,stage:Stage,commit:string,lockHash:string){const current=await createArtifactManifest(directory,stage,commit,lockHash);if(JSON.stringify(current)!==JSON.stringify(manifest))throw new Error('Build artifact, commit, lockfile or environment differs from verified input');return current;}
function command(program:string,args:string[],capture=false){const result=spawnSync(program,args,{encoding:'utf8',stdio:capture?'pipe':'inherit',env:process.env});if(result.status!==0)throw new Error(capture?'Required release verification command failed':'Release step failed; later publication steps were not run');return result.stdout?.trim()||'';}
export function assertCiPublication(stage:Stage,env:NodeJS.ProcessEnv){const branch=stage==='production'?'main':'staging';if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='push'||env.GITHUB_REPOSITORY!==REPOSITORY||env.GITHUB_REF!==`refs/heads/${branch}`||env.CLOUDFLARE_ACCOUNT_ID!==ACCOUNT||!env.CLOUDFLARE_API_TOKEN)throw new Error('Publication requires the reviewed push workflow and environment token');return branch;}
export async function run(argv:string[]){
  const stage=stageOf(argv[0]),prepare=argv.includes('--prepare'),apply=argv.includes('--apply');if(prepare&&apply)throw new Error('Preparation and publication must be separate');
  const web=JSON.parse(await fs.readFile('dist/server/wrangler.json','utf8')),jobs=JSON.parse(await fs.readFile('workers/jobs/wrangler.jsonc','utf8')),plan=assertReleaseTargets(stage,web,jobs);
  const targets:WorkerTarget[]=[{stage,name:plan.jobs_worker,config:{...jobs,...jobs.env[stage]},originalConfig:'workers/jobs/wrangler.jsonc',originalEnvironment:stage,topLevelName:jobs.name},{stage,name:plan.web_worker,config:web,originalConfig:'dist/server/wrangler.json',topLevelName:web.topLevelName||'jotcoloring-web'}];
  if(argv.includes('--plan')){if(prepare||apply)throw new Error('Review plan cannot publish or prepare artifacts');console.log(JSON.stringify({mode:'REVIEW_PLAN_ONLY',...plan}));return;}
  const commit=command('git',['rev-parse','HEAD'],true),expectedCommit=process.env.GITHUB_SHA||commit;if(commit!==expectedCommit)throw new Error('Checkout is not the gated commit');command('git',['diff','--quiet','HEAD','--']);
  const lockHash=sha(await fs.readFile('pnpm-lock.yaml')),file='dist/release-manifest.json';
  if(prepare){await fs.mkdir('.local',{recursive:true});const rehearsal=await fs.mkdtemp('.local/version-rehearsal-');for(const target of targets)console.log(JSON.stringify(await rehearseVersionBundle(target,path.join(rehearsal,target.name))));const manifest=await createArtifactManifest('dist',stage,commit,lockHash);await fs.writeFile(file,JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({mode:'PREPARED_LOCAL_ARTIFACT',...plan,commit,files:manifest.files.length}));return;}
  await verifyArtifactManifest('dist',JSON.parse(await fs.readFile(file,'utf8')),stage,commit,lockHash);
  console.log(JSON.stringify({mode:apply?'APPLY':'CHECK_ONLY',...plan,commit}));
  if(!apply)return;
  const expectedBranch=assertCiPublication(stage,process.env);
  // Avoid a queued older commit replacing a newer deployment. This public read
  // has no GitHub token and never fetches or checks out another commit.
  const current=command('git',['ls-remote',`https://github.com/${REPOSITORY}.git`,`refs/heads/${expectedBranch}`],true).split(/\s+/)[0];if(current!==commit)throw new Error('Branch advanced; stale commit will not be published');
  await fs.mkdir('.local',{recursive:true});const directory=await fs.mkdtemp('.local/version-release-'),releases=[];
  for(const target of targets){const receipt=await publishWorkerVersion(target,commit,path.join(directory,target.name),undefined,undefined,undefined,event=>console.log(JSON.stringify(event)));releases.push(receipt);console.log(JSON.stringify(receipt));}
  console.log(JSON.stringify({status:'PUBLISHED_JOBS_THEN_WEB',...plan,commit,releases}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)run(process.argv.slice(2)).catch(error=>{console.error((error as Error).message);process.exitCode=1;});
