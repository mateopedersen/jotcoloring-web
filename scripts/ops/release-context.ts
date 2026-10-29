/** Restricted adapters for existing JotColoring resources. No resource creation or deletion. */
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import type {Database,Statement,D1Result,Bucket,StoredObject,Env} from '../../src/server/types';
export async function remoteContext(environment:'staging'|'production'){
const config=JSON.parse(await fs.readFile('wrangler.jsonc','utf8')),cfg=config.env[environment],account='48c779c8eaa80234e0bb9d57f96e588b';
const allowed=environment==='production'?['d075722e-c698-4b6e-a5e4-f53ae5c9e411','59133e5c-f73a-42d2-8b8b-223720e8b6ec']:['835240f5-90d7-4bf2-8a41-b67cc484fb4b','1f4852c1-2b4d-4e80-99a3-f86be83858b6'];
if(config.account_id!==account||cfg.d1_databases.some((d:any)=>!allowed.includes(d.database_id))||cfg.r2_buckets.some((b:any)=>b.bucket_name!==`jotcoloring-${environment}-${({ORIGINALS:'originals',PUBLISHED:'published',JOB_ASSETS:'jobs',BACKUPS:'backups'} as any)[b.binding]}`))throw new Error('Unreviewed resource target');
const authFile=process.env.JOT_WRANGLER_AUTH_FILE;if(!authFile)throw new Error('Set JOT_WRANGLER_AUTH_FILE to the existing session file');
const auth=await fs.readFile(authFile,'utf8'),token=auth.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1],expiry=auth.match(/^expiration_time\s*=\s*"([^"]+)"/m)?.[1];
if(!token||!expiry||Date.parse(expiry)<=Date.now())throw new Error('Existing authentication requires refresh');
const privateConfig=JSON.parse(await fs.readFile('../jotcoloring-private/secrets.json','utf8'))[environment];
let requests=0;const request=async(endpoint:string,init:RequestInit={})=>{if(++requests>2500)throw new Error('Bounded request limit exceeded.');return fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${endpoint}`,{...init,headers:{Authorization:`Bearer ${token}`,...init.headers},redirect:'error',signal:AbortSignal.timeout(60000)});};
async function api(endpoint:string,body?:unknown){const r=await request(endpoint,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),j:any=await r.json();if(!r.ok||j.success===false)throw new Error(`Cloudflare request failed (${r.status}; code ${j.errors?.[0]?.code||0}).`);return j.result;}
class RemoteStatement implements Statement{constructor(readonly owner:RemoteDatabase,readonly sql:string,readonly params:unknown[]=[]){ }bind(...params:unknown[]){return new RemoteStatement(this.owner,this.sql,params);}async all<T>(){return (await this.owner.query([{sql:this.sql,params:this.params}]))[0] as D1Result<T>;}async run<T>(){return this.all<T>();}async first<T>(column?:string){const row=(await this.all<Record<string,unknown>>()).results[0];return (row?(column?row[column]:row):null) as T|null;}}
class RemoteDatabase implements Database{constructor(readonly id:string){}prepare(sql:string){return new RemoteStatement(this,sql);}async query(queries:{sql:string;params:unknown[]}[]){const result=await api(`/d1/database/${this.id}/query`,queries.length===1?queries[0]:{batch:queries});if(!Array.isArray(result)||result.length!==queries.length||result.some((r:any)=>!r.success))throw new Error('D1 did not complete the exact expected batch.');return result;}async batch<T>(statements:Statement[]){return this.query(statements.map(s=>{if(!(s instanceof RemoteStatement)||s.owner!==this)throw new Error('Mixed database batch refused.');return{sql:s.sql,params:s.params}})) as Promise<D1Result<T>[]>;}async exec(sql:string){return this.query([{sql,params:[]}]);}}
class RemoteBucket implements Bucket{
 private cache=new Map<string,{bytes:Uint8Array;etag:string;mime:string}>();private cacheBytes=0;
 constructor(readonly name:string){}
 endpoint(key:string){if(!/^[a-zA-Z0-9][a-zA-Z0-9_./-]*$/.test(key)||key.includes('..'))throw new Error('Invalid scoped object key.');return `/r2/buckets/${this.name}/objects/${key.split('/').map(encodeURIComponent).join('/')}`;}
 async get(key:string):Promise<StoredObject|null>{
  let entry=this.cache.get(key);
  if(!entry){const r=await request(this.endpoint(key));if(r.status===404)return null;if(!r.ok)throw new Error(`R2 read failed (${r.status}).`);const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length>25_000_000)throw new Error('R2 read exceeds media bound.');entry={bytes,etag:r.headers.get('etag')||'',mime:r.headers.get('content-type')||''};
   // Only privately immutable originals are cached, after an actual R2 read.
   // Published and backup read-backs always make a fresh remote request.
   if(this.name.endsWith('-originals')&&this.cacheBytes+bytes.length<=64_000_000){this.cache.set(key,entry);this.cacheBytes+=bytes.length;}
  }
  const {bytes,etag,mime}=entry;return{key,size:bytes.length,etag,httpMetadata:{contentType:mime},body:new Blob([bytes]).stream(),arrayBuffer:async()=>bytes.slice().buffer,text:async()=>new TextDecoder().decode(bytes)};
 }
 async head(key:string){return this.get(key);}
 async put(key:string,value:ReadableStream|ArrayBuffer|Uint8Array|string,options:any={}){
  const bytes=new Uint8Array(await new Response(value as BodyInit).arrayBuffer());if(bytes.length>25_000_000)throw new Error('R2 write exceeds media bound.');const existing=await this.get(key);if(existing){if(createHash('sha256').update(new Uint8Array(await existing.arrayBuffer())).digest('hex')!==createHash('sha256').update(bytes).digest('hex'))throw new Error('Refusing to overwrite nonidentical existing object.');return;}
  const r=await request(this.endpoint(key),{method:'PUT',headers:{'Content-Type':options.httpMetadata?.contentType||'application/octet-stream','Content-Length':String(bytes.length)},body:bytes});if(!r.ok)throw new Error(`R2 upload failed (${r.status}).`);
 }
 async delete(){throw new Error('Deletion is disabled for release.');}async list():Promise<never>{throw new Error('Bucket listing is disabled for release.');}
}
const database=(binding:string)=>new RemoteDatabase(cfg.d1_databases.find((d:any)=>d.binding===binding).database_id),bucket=(binding:string)=>new RemoteBucket(cfg.r2_buckets.find((b:any)=>b.binding===binding).bucket_name);
const env:Env={APP_ENV:environment,MEDIA_VALIDATION_SECRET:privateConfig.MEDIA_VALIDATION_SECRET,CURSOR_SIGNING_SECRET:privateConfig.CURSOR_SIGNING_SECRET,CATALOG_DB:database('CATALOG_DB'),SEARCH_DB:database('SEARCH_DB'),ORIGINALS:bucket('ORIGINALS'),PUBLISHED:bucket('PUBLISHED'),BACKUPS:bucket('BACKUPS'),INGEST_QUEUE:{async send(){/* Trusted operator processes this exact queued job below. */}}};
return {env,api,requests:()=>requests,cfg};
}
