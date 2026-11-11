/** Restricted adapters for existing JotColoring resources. No resource creation or deletion. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {signedR2Request} from './r2-sigv4';
import type {Database,Statement,D1Result,Bucket,StoredObject,Env} from '../../src/server/types';
export async function remoteContext(environment:'staging'|'production',options:{requestLimit?:number;credentialsFile?:string;wranglerAuthFile?:string;secretsFile?:string;configFile?:string}={}){
const requestLimit=options.requestLimit??2500;if(!Number.isInteger(requestLimit)||requestLimit<1||requestLimit>4000)throw new Error('Invalid bounded request limit.');
const config=JSON.parse(await fs.readFile(options.configFile||'wrangler.jsonc','utf8')),cfg=config.env[environment],account='48c779c8eaa80234e0bb9d57f96e588b';
const allowed=environment==='production'?['d075722e-c698-4b6e-a5e4-f53ae5c9e411','59133e5c-f73a-42d2-8b8b-223720e8b6ec']:['835240f5-90d7-4bf2-8a41-b67cc484fb4b','1f4852c1-2b4d-4e80-99a3-f86be83858b6'];
if(config.account_id!==account||cfg.d1_databases.some((d:any)=>!allowed.includes(d.database_id))||cfg.r2_buckets.some((b:any)=>b.bucket_name!==`jotcoloring-${environment}-${({ORIGINALS:'originals',PUBLISHED:'published',JOB_ASSETS:'jobs',BACKUPS:'backups'} as any)[b.binding]}`))throw new Error('Unreviewed resource target');
const processEnv=typeof process==='undefined'?{}:process.env;
const credentialFile=options.credentialsFile||processEnv.JOT_CLOUDFLARE_CREDENTIALS_FILE||path.resolve('.local/cloudflare-credentials.json');
const existingSession=options.wranglerAuthFile||processEnv.JOT_WRANGLER_AUTH_FILE;
let scoped:any,token:string|undefined;
if(existingSession){
 const auth=await fs.readFile(existingSession,'utf8');
 token=auth.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
 const expiry=auth.match(/^expiration_time\s*=\s*"([^"]+)"/m)?.[1];
 if(!token||!expiry||Date.parse(expiry)<=Date.now())throw new Error('The existing separate JotColoring session requires refresh.');
}else{
 try{scoped=JSON.parse(await fs.readFile(credentialFile,'utf8'))[environment];}catch{throw new Error('Scoped Cloudflare credentials are not configured in the private local credential file.');}
 token=scoped?.apiToken;
 if(typeof token!=='string'||!token)throw new Error('A scoped Cloudflare API token is required.');
 if(Boolean(scoped?.r2AccessKeyId)!==Boolean(scoped?.r2SecretAccessKey))throw new Error('Incomplete bucket-scoped R2 S3 credentials.');
}
const accessKeyId=scoped?.r2AccessKeyId,secretAccessKey=scoped?.r2SecretAccessKey;
const privateConfig=JSON.parse(await fs.readFile(options.secretsFile||processEnv.JOT_SECRETS_FILE||'../jotcoloring-private/secrets.json','utf8'))[environment];
let requests=0;const request=async(endpoint:string,init:RequestInit={})=>{
 for(let attempt=0;;attempt++){
  if(existingSession){const auth=await fs.readFile(existingSession,'utf8'),current=auth.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];if(!current)throw new Error('Existing Jot session token unavailable.');token=current;}
  if(++requests>requestLimit)throw new Error('Bounded request limit exceeded.');
  const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${endpoint}`,{...init,headers:{Authorization:`Bearer ${token}`,...init.headers},redirect:'error',signal:AbortSignal.timeout(60000)});
  if(response.status!==429||attempt>=5)return response;
  const retryAfter=Number(response.headers.get('retry-after')),delay=Number.isFinite(retryAfter)&&retryAfter>0?Math.min(60,retryAfter):Math.min(60,10*2**attempt);
  await response.body?.cancel();await new Promise(resolve=>setTimeout(resolve,delay*1000));
 }
};
const r2request=async(bucket:string,key:string,method:'GET'|'PUT',body?:Uint8Array,headers:Record<string,string>={})=>{const allowedBuckets=new Set([`jotcoloring-${environment}-originals`,`jotcoloring-${environment}-published`,`jotcoloring-${environment}-backups`]);if(!allowedBuckets.has(bucket))throw new Error('R2 bucket is outside this release scope.');if(!/^[a-zA-Z0-9][a-zA-Z0-9_./-]*$/.test(key)||key.includes('..'))throw new Error('Invalid scoped object key.');const requestBody=body?new Blob([new Uint8Array(body)]):undefined;
 if(existingSession||!accessKeyId)return request(`/r2/buckets/${bucket}/objects/${key.split('/').map(encodeURIComponent).join('/')}`,{method,headers,...(requestBody?{body:requestBody}:{})});
 if(++requests>requestLimit)throw new Error('Bounded request limit exceeded.');const signed=signedR2Request({accountId:account,bucket,key,method,accessKeyId,secretAccessKey,...(body?{body}:{}),headers});return fetch(signed.url,{method,headers:signed.headers,...(requestBody?{body:requestBody}:{}),redirect:'error',signal:AbortSignal.timeout(60000)});};
async function api(endpoint:string,body?:unknown){const r=await request(endpoint,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),j:any=await r.json();if(!r.ok||j.success===false)throw new Error(`Cloudflare request failed (${r.status}; code ${j.errors?.[0]?.code||0}).`);return j.result;}
class RemoteStatement implements Statement{constructor(readonly owner:RemoteDatabase,readonly sql:string,readonly params:unknown[]=[]){ }bind(...params:unknown[]){return new RemoteStatement(this.owner,this.sql,params);}async all<T>(){return (await this.owner.query([{sql:this.sql,params:this.params}]))[0] as D1Result<T>;}async run<T>(){return this.all<T>();}async first<T>(column?:string){const row=(await this.all<Record<string,unknown>>()).results[0];return (row?(column?row[column]:row):null) as T|null;}}
class RemoteDatabase implements Database{constructor(readonly id:string){}prepare(sql:string){return new RemoteStatement(this,sql);}async query(queries:{sql:string;params:unknown[]}[]){const result=await api(`/d1/database/${this.id}/query`,queries.length===1?queries[0]:{batch:queries});if(!Array.isArray(result)||result.length!==queries.length||result.some((r:any)=>!r.success))throw new Error('D1 did not complete the exact expected batch.');return result;}async batch<T>(statements:Statement[]){return this.query(statements.map(s=>{if(!(s instanceof RemoteStatement)||s.owner!==this)throw new Error('Mixed database batch refused.');return{sql:s.sql,params:s.params}})) as Promise<D1Result<T>[]>;}async exec(sql:string){return this.query([{sql,params:[]}]);}}
class RemoteBucket implements Bucket{
 private cache=new Map<string,{bytes:Uint8Array;etag:string;mime:string}>();private cacheBytes=0;
 constructor(readonly name:string){}
 async get(key:string):Promise<StoredObject|null>{
  let entry=this.cache.get(key);
  if(!entry){const r=await r2request(this.name,key,'GET');if(r.status===404)return null;if(!r.ok)throw new Error(`R2 read failed (${r.status}).`);const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length>25_000_000)throw new Error('R2 read exceeds media bound.');entry={bytes,etag:r.headers.get('etag')||'',mime:r.headers.get('content-type')||''};
   // Only privately immutable originals are cached, after an actual R2 read.
   // Published and backup read-backs always make a fresh remote request.
   if(this.name.endsWith('-originals')&&this.cacheBytes+bytes.length<=64_000_000){this.cache.set(key,entry);this.cacheBytes+=bytes.length;}
  }
  const {bytes,etag,mime}=entry;return{key,size:bytes.length,etag,httpMetadata:{contentType:mime},body:new Blob([new Uint8Array(bytes)]).stream(),arrayBuffer:async()=>bytes.slice().buffer,text:async()=>new TextDecoder().decode(bytes)};
 }
 async head(key:string){return this.get(key);}
 async put(key:string,value:ReadableStream|ArrayBuffer|Uint8Array|string,options:any={}){
  const bytes=new Uint8Array(await new Response(value as BodyInit).arrayBuffer());if(bytes.length>25_000_000)throw new Error('R2 write exceeds media bound.');const cacheControl=options.httpMetadata?.cacheControl;if(cacheControl&&(!this.name.endsWith('-published')||cacheControl!=='public,max-age=31536000,immutable'))throw new Error('Unreviewed public cache metadata.');const existing=await this.get(key);if(existing){if(createHash('sha256').update(new Uint8Array(await existing.arrayBuffer())).digest('hex')!==createHash('sha256').update(bytes).digest('hex'))throw new Error('Refusing to overwrite nonidentical existing object.');if(!cacheControl)return;}
  const r=await r2request(this.name,key,'PUT',bytes,{'Content-Type':options.httpMetadata?.contentType||'application/octet-stream',...(cacheControl?{'Cache-Control':cacheControl,'Content-Disposition':'inline'}:{})});if(!r.ok)throw new Error(`R2 upload failed (${r.status}).`);
 }
 async delete(){throw new Error('Deletion is disabled for release.');}async list():Promise<never>{throw new Error('Bucket listing is disabled for release.');}
}
const database=(binding:string)=>new RemoteDatabase(cfg.d1_databases.find((d:any)=>d.binding===binding).database_id),bucket=(binding:string)=>new RemoteBucket(cfg.r2_buckets.find((b:any)=>b.binding===binding).bucket_name);
let discoveryQueueID:string|undefined;
const operatorQueue={async send(message:any){
 // Operators process their own import/projection inline. Sitemap rebuilding is
 // a real background job and must never be acknowledged by this adapter alone.
 if(!['discovery_rebuild','discovery_notify'].includes(message?.type))return;
 if(message.type==='discovery_rebuild'?message.job_id!=='sitemap':message.job_id!=='indexnow'||message.revision!==undefined&&!/^navigation-v1:[a-f0-9]{40}$/.test(message.revision))throw new Error('Unreviewed discovery job');
 if(!discoveryQueueID){const name=`jotcoloring-${environment}-ingest`,queues=await api('/queues?name='+encodeURIComponent(name)),found=queues.filter((queue:any)=>queue.queue_name===name);if(found.length!==1)throw new Error('Exact existing discovery queue required');discoveryQueueID=found[0].queue_id;}
 await api(`/queues/${discoveryQueueID}/messages`,{body:message,content_type:'json'});
}};
const env:Env={APP_ENV:environment,DISCOVERY_ENABLED:cfg.vars?.DISCOVERY_ENABLED,MEDIA_VALIDATION_SECRET:privateConfig.MEDIA_VALIDATION_SECRET,CURSOR_SIGNING_SECRET:privateConfig.CURSOR_SIGNING_SECRET,CATALOG_DB:database('CATALOG_DB'),SEARCH_DB:database('SEARCH_DB'),ORIGINALS:bucket('ORIGINALS'),PUBLISHED:bucket('PUBLISHED'),BACKUPS:bucket('BACKUPS'),INGEST_QUEUE:operatorQueue};
return {env,api,requests:()=>requests,cfg};
}
