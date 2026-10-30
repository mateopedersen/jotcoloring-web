/** Add immutable caching to already-published, content-addressed files.
 * Never creates missing objects, changes file bytes, or touches private buckets.
 * Pass a saved public catalog response; default is plan only.
 */
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const file=process.argv[2];if(!file)throw new Error('Provide a saved public catalog JSON response.');
const catalog=JSON.parse(await fs.readFile(file,'utf8'));
const bucket='jotcoloring-production-published',account='48c779c8eaa80234e0bb9d57f96e588b';
const roles={thumbnail:'catalog_thumb_bw',preview:'catalog_preview_bw',home_color:'home_half_color',color_reference:'color_inspiration',lineArtUrl:'printable_webp_bw',social_image:'social_og'};
const plan=[];
for(const item of catalog.items||[]){
 if(!/^jc-[a-z0-9-]+$/.test(item.id)||!Number.isSafeInteger(item.version)||item.version<1)throw new Error('Unrecognized published item.');
 for(const [field,role]of Object.entries({...roles,pdf:'printable_pdf_a4_bw'})){
  if(process.argv.includes('--social-only')&&field!=='social_image')continue;
  const source=field==='pdf'?item.downloads?.pdf:item[field];if(!source)continue;
  const url=new URL(source,'https://jotcoloring.com'),hash=url.searchParams.get('v');
  if(url.origin!=='https://jotcoloring.com'||!url.pathname.startsWith(field==='social_image'?'/og/coloring/':'/api/')||!/^[a-f0-9]{24}$/.test(hash||''))throw new Error('Catalog contains an unexpected file URL.');
  const ext=field==='pdf'?'pdf':field==='social_image'?'png':'webp',mime=field==='pdf'?'application/pdf':`image/${ext}`;
  plan.push({key:`published/${item.id}/${item.version}/${role}-${hash}.${ext}`,hash,mime});
 }
}
if(!plan.length)throw new Error('No published files selected.');
if(!process.argv.includes('--apply')){console.log(JSON.stringify({mode:'plan',bucket,files:plan.length}));process.exit(0);}
const auth=await fs.readFile(process.env.JOT_WRANGLER_AUTH_FILE||'','utf8');
const token=auth.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1],expiry=auth.match(/^expiration_time\s*=\s*"([^"]+)"/m)?.[1];
if(!token||!Number.isFinite(Date.parse(expiry||''))||Date.parse(expiry)<=Date.now())throw new Error('A current authorized Wrangler session is required.');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
let next=0,verified=0;
async function run(){
 while(next<plan.length){const entry=plan[next++],url=`https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/${bucket}/objects/${entry.key}`;
  const old=await fetch(url,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});
  if(!old.ok)throw new Error(`Existing object read failed: ${entry.key} (${old.status})`);
  const bytes=new Uint8Array(await old.arrayBuffer()),sha=digest(bytes);
  if(!sha.startsWith(entry.hash)||(entry.mime==='application/pdf'&&bytes.length>1_000_000))throw new Error('Published bytes failed validation: '+entry.key);
  // The management API adds its own attachment header. It is not the object's
  // original metadata and must not make public preview images download-only.
  const headers={Authorization:`Bearer ${token}`,'Content-Type':entry.mime,'Cache-Control':'public,max-age=31536000,immutable','Content-Disposition':'inline'};
  for(const [key,value]of old.headers)if(key.startsWith('x-amz-meta-'))headers[key]=value;
  const put=await fetch(url,{method:'PUT',headers,body:bytes,signal:AbortSignal.timeout(30000)});
  if(!put.ok)throw new Error(`Metadata update failed (${put.status})`);
  const check=await fetch(url,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});
  if(!check.ok||digest(new Uint8Array(await check.arrayBuffer()))!==sha)throw new Error('Byte verification failed after metadata update.');
  verified++;if(verified%18===0)console.log(JSON.stringify({verified,total:plan.length}));
 }
}
await Promise.all([run(),run()]);console.log(JSON.stringify({status:'verified',bucket,files:verified,bytes_changed:false}));
