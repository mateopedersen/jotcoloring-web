/** Real D1 export -> private R2 -> newly created isolated D1 rehearsal.
 * PLAN ONLY unless --apply. No production/staging import, deletion or binding change.
 * Credentials and signed URLs are never logged or persisted. Reviewed small-data
 * bounds: 50 MB SQL, 100k rows, max2000 API requests. Not a five-million-row tool.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {verifyRestoredDatabase} from './cloud-restore-verifier';
export const ACTIVE_IDS=['835240f5-90d7-4bf2-8a41-b67cc484fb4b','1f4852c1-2b4d-4e80-99a3-f86be83858b6','d075722e-c698-4b6e-a5e4-f53ae5c9e411','59133e5c-f73a-42d2-8b8b-223720e8b6ec'];
const ACCOUNT='48c779c8eaa80234e0bb9d57f96e588b', MAX_BYTES=50_000_000;
const digest=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
export function assertRestoreTarget(id:string,name:string){if(ACTIVE_IDS.includes(id)||!/^[a-f0-9-]{36}$/.test(id)||!/^jotcoloring-restore-(staging|production)-[a-z0-9-]{8,48}$/.test(name))throw new Error('Target is not a separate named restore database');}
export function assertPrivateBucket(managed:any,custom:any){if(managed?.enabled!==false||!Array.isArray(custom?.domains)||custom.domains.some((d:any)=>d.enabled!==false))throw new Error('Backup bucket public-access state is enabled or unknown');}
export function signedURL(raw:string){const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||!(u.hostname==='cloudflarestorage.com'||u.hostname.endsWith('.cloudflarestorage.com')))throw new Error('Unexpected signed URL host');return u;}
export async function run(argv:string[]){
  const value=(key:string)=>{const n=argv.indexOf(key);return n<0?undefined:argv[n+1];};
  const environment=value('--environment')||'staging';
  if(!['staging','production'].includes(environment))throw new Error('Environment must be staging or production');
  const config=JSON.parse(await fs.readFile('wrangler.jsonc','utf8')),env=config.env[environment];
  const source=env.d1_databases.find((d:any)=>d.binding==='CATALOG_DB'),bucket=env.r2_buckets.find((b:any)=>b.binding==='BACKUPS')?.bucket_name;
  if(config.account_id!==ACCOUNT||!ACTIVE_IDS.includes(source?.database_id)||source.database_name!==`jotcoloring-${environment}-catalog`||bucket!==`jotcoloring-${environment}-backups`)throw new Error('Reviewed source environment configuration changed');
  const name=value('--new-restore-name');
  if(name&&!new RegExp(`^jotcoloring-restore-${environment}-[a-z0-9-]{8,48}$`).test(name))throw new Error('Restore name must identify the source environment and a unique run suffix');
  const plan={mode:argv.includes('--apply')?'APPLY':'PLAN_ONLY',environment,source_database:source.database_id,backup_bucket:bucket,new_restore_name:name||'Required when applying',operations:['Read backup privacy settings','Export real canonical SQL into memory','Remove private AI rows and validate SQL locally','Upload immutable SQL + checksum manifest to private BACKUPS; read both back','Create NEW separate D1; refuse active/nonempty target','Import SQL read back from R2','Compare every durable table row/hash, schema, foreign keys and active revisions'],no_source_writes:true,no_active_target_writes:true,existing_target_policy:'Only this task recorded new empty restore DB may be retried with --resume-empty-target',no_automatic_deletion:true,ai_private_rows_included:false,remote_acceptance:'NOT RUN until --apply completes'};
  if(!argv.includes('--apply')){console.log(JSON.stringify(plan,null,2));return plan;}
  if(!name)throw new Error('--new-restore-name is required when applying');
  let token=process.env.CLOUDFLARE_API_TOKEN;
  if(!token){const authFile=value('--wrangler-auth-file');if(!authFile)throw new Error('Provide secure environment authentication or a local Wrangler auth-file path');const auth=await fs.readFile(authFile,'utf8');token=auth.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];const expiration=auth.match(/^expiration_time\s*=\s*"([^"]+)"/m)?.[1];if(!token||!expiration||Date.parse(expiration)<=Date.now())throw new Error('Wrangler session missing or expired');}
  let requests=0;
  const request=async(endpoint:string,init:RequestInit={})=>{
    if(++requests>2000)throw new Error('Bounded API request budget exceeded');
    const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}${endpoint}`,{...init,headers:{Authorization:`Bearer ${token}`,...init.headers},redirect:'error',signal:AbortSignal.timeout(60000)});
    return response;
  };
  const api=async(endpoint:string,method='GET',body?:any)=>{
    const response=await request(endpoint,{method,...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
    let data:any;try{data=await response.json();}catch{throw new Error(`Cloudflare API non-JSON response status${response.status}`);}
    if(!response.ok||data.success!==true)throw new Error(`Cloudflare API request failed status${response.status}; codes ${(data.errors||[]).map((e:any)=>Number(e.code)||0).join(',')}`);
    return data.result;
  };
  const query=async(id:string,sql:string,params:unknown[]=[])=>{const results=await api(`/d1/database/${id}/query`,'POST',{sql,params});if(!Array.isArray(results)||results.length!==1||!results[0].success)throw new Error('D1 query did not succeed');return results[0].results as Record<string,any>[];};
  const bytes=async(response:Response)=>{if(!response.ok||Number(response.headers.get('content-length')||0)>MAX_BYTES)throw new Error('Object response unavailable or too large');const reader=response.body?.getReader();if(!reader)throw new Error('Empty response stream');const parts:Uint8Array[]=[];let n=0;while(true){const p=await reader.read();if(p.done)break;n+=p.value.length;if(n>MAX_BYTES){await reader.cancel();throw new Error('Object exceeds bounded rehearsal size');}parts.push(p.value);}return Buffer.concat(parts);};
  const originalRoot=path.resolve('.local/cloud-backup',name),retry=argv.includes('--resume-empty-target');
  let resumedTarget:string|undefined;
  if(retry){const prior=JSON.parse(await fs.readFile(path.join(originalRoot,'verification.json'),'utf8'));if(prior.status!=='FAIL'||prior.environment!==environment||prior.source_database!==source.database_id||prior.restore_database?.name!==name)throw new Error('Retry requires this task\'s failed private creation record');resumedTarget=prior.restore_database.id;assertRestoreTarget(resumedTarget!,name);}
  const root=retry?path.join(originalRoot,'retry-'+new Date().toISOString().replace(/[^0-9]/g,'')):originalRoot,parent=path.dirname(root);
  await fs.mkdir(parent,{recursive:true,mode:0o700});if(await fs.realpath(parent)!==parent)throw new Error('Private output directory must not be a symlink');await fs.mkdir(root,{mode:0o700});
  const report:any={started_at:new Date().toISOString(),...plan,status:'RUNNING',checks:[],requests:0,production_rto_rpo:'NOT MEASURED',r2_asset_restore:'NOT RUN; this rehearsal restores canonical metadata only'};
  try{
    if(resumedTarget){const details=await api(`/d1/database/${resumedTarget}`);if(details.name!==name)throw new Error('Recorded retry target name changed');if((await query(resumedTarget,"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'")).length)throw new Error('Recorded retry target is not empty');report.retry_of_recorded_empty_target=true;}
    const bucketPath=`/r2/buckets/${bucket}`;
    assertPrivateBucket(await api(bucketPath+'/domains/managed'),await api(bucketPath+'/domains/custom'));
    report.checks.push('BACKUPS bucket has disabled managed domain and no enabled custom domain');
    const info=await api(`/d1/database/${source.database_id}`);if(info.name!==source.database_name)throw new Error('Remote source name differs from reviewed configuration');
    let exported:any,bookmark:string|undefined;
    for(let n=0;n<120;n++){exported=await api(`/d1/database/${source.database_id}/export`,'POST',{output_format:'polling',dump_options:{no_schema:false,no_data:false,tables:[]},...(bookmark?{current_bookmark:bookmark}:{})});if(exported.status==='complete')break;if(exported.status==='error'||exported.success===false)throw new Error('D1 export failed');bookmark=exported.at_bookmark;await new Promise(resolve=>setTimeout(resolve,200));}
    if(exported?.status!=='complete'||!exported.result?.signed_url)throw new Error('D1 export not complete within polling bound');
    // This separate fetch NEVER receives the account Authorization header.
    const raw=await bytes(await fetch(signedURL(exported.result.signed_url),{redirect:'error',signal:AbortSignal.timeout(60000)}));
    const snapshotDir=path.join(root,'snapshot');await fs.mkdir(snapshotDir,{mode:0o700});
    const prepared=spawnSync('python3',['scripts/ops/prepare-d1-snapshot.py',snapshotDir],{input:raw,encoding:'utf8',maxBuffer:100_000});raw.fill(0);
    if(prepared.status!==0)throw new Error('Local snapshot validation/filtering refused exported SQL; private error details suppressed');
    const meta=JSON.parse(await fs.readFile(path.join(snapshotDir,'snapshot.json'),'utf8'));
    const sql=await fs.readFile(path.join(snapshotDir,'catalog.sql'));
    if(sql.length!==meta.sql_bytes||digest(sql)!==meta.sql_sha256)throw new Error('Prepared snapshot checksum mismatch');
    const prefix=`database-snapshots/${environment}/${source.database_id}/${name}/${meta.sql_sha256}`;
    const backupObject=async(suffix:string,data:Buffer,mime:string)=>{
      const key=prefix+'/'+suffix,endpoint=bucketPath+'/objects/'+key.split('/').map(encodeURIComponent).join('/');
      const existing=await request(endpoint);
      if(existing.status!==404)throw new Error('Immutable backup key already exists or cannot be checked');
      const uploaded=await request(endpoint,{method:'PUT',headers:{'Content-Type':mime,'Content-Length':String(data.length)},body:new Uint8Array(data)});
      if(!uploaded.ok)throw new Error('Private backup upload failed');
      const restored=await bytes(await request(endpoint));if(restored.length!==data.length||digest(restored)!==digest(data))throw new Error('R2 read-back checksum differs');
      return{key,bytes:data.length,sha256:digest(restored),body:restored};
    };
    const manifest=Buffer.from(JSON.stringify({...meta,source_database:source.database_id,environment,captured_at:report.started_at},null,2)+'\n');
    const backed=await backupObject('catalog.sql',sql,'application/sql'),manifestBacked=await backupObject('snapshot.json',manifest,'application/json');
    report.backup_objects=[backed,manifestBacked].map(({body,...item})=>item);report.excluded_private_rows=meta.excluded_private_rows;
    report.checks.push('Immutable SQL and manifest fetched back from private R2 with exact SHA256 and bytes');
    // Only this newly created ID can ever be the import target. Never accept an ID argument.
    const created=resumedTarget?{uuid:resumedTarget}:await api('/d1/database','POST',{name});const target=created.uuid;
    assertRestoreTarget(target,name);report.restore_database={id:target,name};
    const details=await api(`/d1/database/${target}`);if(details.name!==name)throw new Error('New restore target name does not match');
    const existingTables=await query(target,"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'");if(existingTables.length)throw new Error('New restore target is unexpectedly nonempty');
    const md5=createHash('md5').update(backed.body).digest('hex');
    let imported=await api(`/d1/database/${target}/import`,'POST',{action:'init',etag:md5});
    if(imported.upload_url){const uploaded=await fetch(signedURL(imported.upload_url),{method:'PUT',headers:{'Content-Length':String(backed.body.length)},body:backed.body,redirect:'error',signal:AbortSignal.timeout(60000)});if(!uploaded.ok||uploaded.headers.get('etag')?.replaceAll('"','')!==md5)throw new Error('D1 temporary import upload checksum failed');imported=await api(`/d1/database/${target}/import`,'POST',{action:'ingest',filename:imported.filename,etag:md5});}
    for(let n=0;imported.status!=='complete'&&n<120;n++){if(imported.status==='error'||imported.success===false)throw new Error('Isolated D1 import failed');await new Promise(resolve=>setTimeout(resolve,200));imported=await api(`/d1/database/${target}/import`,'POST',{action:'poll',current_bookmark:imported.at_bookmark});}
    if(imported.status!=='complete')throw new Error('Isolated D1 import did not complete within polling bound');
    Object.assign(report,await verifyRestoredDatabase(query,target,meta));
    report.checks.push('Every durable row and all table counts/checksums match the R2-restored snapshot','All schema objects, column types, foreign keys, autoincrement high-water marks and published active revisions verified','Private AI rows absent; restore Worker is not deployed or bound');report.outbox_watermark=meta.outbox_watermark;report.status='PASS';
  }catch(error){report.status='FAIL';report.error=(error as Error).message;throw error;}
  finally{report.requests=requests;report.finished_at=new Date().toISOString();report.elapsed_seconds=(Date.parse(report.finished_at)-Date.parse(report.started_at))/1000;await fs.writeFile(path.join(root,'verification.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify({status:report.status,environment,restore_database:report.restore_database,checks:report.checks,error:report.error,elapsed_seconds:report.elapsed_seconds,requests,private_evidence:'new .local/cloud-backup run directory'},null,2));}
  return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)run(process.argv.slice(2)).catch(error=>{console.error((error as Error).message.startsWith('Cloudflare API')?(error as Error).message:'Cloud backup rehearsal stopped; no raw response, SQL, signed URL or secret is logged');process.exitCode=1;});
