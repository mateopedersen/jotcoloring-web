/** Publish only generated, checksum-verified public OG artwork. Never reads or writes private buckets. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const account='48c779c8eaa80234e0bb9d57f96e588b',bucket='jotcoloring-production-published';
const root=process.cwd(),manifest=JSON.parse(await fs.readFile(path.join(root,'src/social/generated.json'),'utf8'));
const entries=[...new Map(Object.values(manifest).map(e=>[e.src,e])).values()];
const plan=[];
for(const entry of entries){
 if(!/^\/og\/(?:pages|coloring)\/[a-z0-9-]+-[a-f0-9]{16}\.png$/.test(entry.src))throw new Error('Unexpected public OG path');
 const bytes=await fs.readFile(path.join(root,'public',entry.src));
 const sha=createHash('sha256').update(bytes).digest('hex');
 if(sha!==entry.sha256||bytes.length>2_000_000||bytes.readUInt32BE(16)!==1200||bytes.readUInt32BE(20)!==630)throw new Error('OG validation failed: '+entry.src);
 plan.push({key:entry.src.slice(1),bytes,sha});
}
if(!process.argv.includes('--apply')){console.log(JSON.stringify({bucket,files:plan.length,bytes:plan.reduce((n,x)=>n+x.bytes.length,0),mode:'dry-run'}));process.exit(0);}
const authPath=process.env.JOT_WRANGLER_AUTH_FILE;if(!authPath)throw new Error('Existing Wrangler session required');
const auth=await fs.readFile(authPath,'utf8'),token=auth.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1],expiry=auth.match(/^expiration_time\s*=\s*"([^"]+)"/m)?.[1];
if(!token||!expiry||Date.parse(expiry)<=Date.now())throw new Error('Wrangler session expired');
let uploaded=0,existing=0;
for(const entry of plan){
 const endpoint=`https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/${bucket}/objects/${entry.key}`;
 const old=await fetch(endpoint,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});
 if(old.ok){if(createHash('sha256').update(new Uint8Array(await old.arrayBuffer())).digest('hex')!==entry.sha)throw new Error('Existing object mismatch');existing++;continue;}
 if(old.status!==404)throw new Error('R2 read failed '+old.status);
 const put=await fetch(endpoint,{method:'PUT',headers:{Authorization:`Bearer ${token}`,'Content-Type':'image/png','Cache-Control':'public,max-age=31536000,immutable'},body:entry.bytes,signal:AbortSignal.timeout(30000)});
 if(!put.ok)throw new Error('R2 write failed '+put.status);
 const check=await fetch(endpoint,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});
 if(!check.ok||createHash('sha256').update(new Uint8Array(await check.arrayBuffer())).digest('hex')!==entry.sha)throw new Error('R2 verification failed');uploaded++;
}
console.log(JSON.stringify({bucket,uploaded,existing,verified:plan.length}));
