/** Three-object private staging recovery drill. Defaults to plan only.
 * No public paths, DB mutations, bucket creation, deletion or overwrites.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {assertPrivateBucket} from './cloud-backup-restore';
const args=process.argv.slice(2),arg=(name:string)=>{const n=args.indexOf(name);return n<0?undefined:args[n+1];};
const apply=args.includes('--apply'),run=arg('--run')||'20261028-first';
if(!/^[0-9]{8}-[a-z0-9-]{3,32}$/.test(run))throw new Error('Use a reviewed unique staging restore run name');
const account='48c779c8eaa80234e0bb9d57f96e588b',sourceBucket='jotcoloring-staging-backups',targetBucket='jotcoloring-staging-originals';
const sha=(data:Uint8Array)=>createHash('sha256').update(data).digest('hex');
const roles=['printable_pdf_a4_bw','printable_webp_bw','source_original'];
const manifestBytes=await fs.readFile('../../deployment-data/uploads.json'),all=JSON.parse(manifestBytes.toString());
const selected=all.filter((r:any)=>r.content_id==='jc-woodland-friends'&&roles.includes(r.role));
if(selected.length!==3||new Set(selected.map((r:any)=>r.role)).size!==3)throw new Error('Reviewed representative media set changed');
type RestoreObject={content_id:string;role:string;mime:string;bytes:number;sha256:string;source_key:string;target_key:string};
const objects:RestoreObject[]=[];
for(const r of selected){
  const raw=r.role==='source_original',mime=raw?'image/png':r.role==='printable_webp_bw'?'image/webp':'application/pdf',ext=raw?'png':mime==='image/webp'?'webp':'pdf';
  if(!/^[a-f0-9]{64}$/.test(r.sha256)||r.mime!==mime||!Number.isInteger(r.bytes)||r.bytes<1||r.bytes>10_000_000||(mime==='application/pdf'&&r.bytes>1_000_000))throw new Error('Invalid reviewed media metadata');
  if(raw&&(r.public_key!==null||r.private_key!==`sources/jc-woodland-friends/${r.sha256}.png`))throw new Error('Raw source must remain private');
  // Recovery must work when original local media is lost: trust the reviewed
  // manifest hash only after the BACKUPS bytes independently match it below.
  const source_key=raw?'raw/'+r.private_key:`objects/sha256/${r.sha256}/${r.role}.${ext}`;
  objects.push({content_id:r.content_id,role:r.role,mime,bytes:r.bytes,sha256:r.sha256,source_key,target_key:`restore-drill/${run}/jc-woodland-friends/${r.sha256}/${r.role}.${ext}`});
}
const plan={mode:apply?'APPLY':'PLAN_ONLY',account,environment:'staging',source_bucket:sourceBucket,target_bucket:targetBucket,reviewed_manifest_sha256:sha(manifestBytes),objects,total_bytes:objects.reduce((n,r)=>n+r.bytes,0),public_paths:false,database_writes:false,delete_or_overwrite:false,maximum_requests:16,scope:'Three representative immutable bytes + MIME restoration only; no full R2/CORS/public delivery/RTO guarantee'};
if(!apply){console.log(JSON.stringify(plan,null,2));process.exit(0);}
let token=process.env.CLOUDFLARE_API_TOKEN;
if(!token){const authFile=arg('--wrangler-auth-file');if(!authFile)throw new Error('Secure existing auth file required');const auth=await fs.readFile(authFile,'utf8');token=auth.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];const expiry=auth.match(/^expiration_time\s*=\s*"([^"]+)"/m)?.[1];if(!token||!expiry||Date.parse(expiry)<=Date.now())throw new Error('Existing auth session expired');}
const folder=path.resolve('.local/media-restore',run);await fs.mkdir(path.dirname(folder),{recursive:true,mode:0o700});if(await fs.realpath(path.dirname(folder))!==path.dirname(folder))throw new Error('Private evidence parent must not be a symlink');await fs.mkdir(folder,{mode:0o700});
let requests=0;
async function call(bucket:string,suffix:string,method='GET',body?:Buffer,mime?:string){if(![sourceBucket,targetBucket].includes(bucket)||method==='PUT'&&(bucket!==targetBucket||!suffix.startsWith(`/objects/restore-drill/${run}/`)))throw new Error('Destination outside reviewed private restore prefix');if(++requests>16)throw new Error('Bounded request budget exceeded');return fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/${bucket}${suffix}`,{method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':mime!,'Content-Length':String(body.length)}:{})},...(body?{body:new Uint8Array(body)}:{}),redirect:'error',signal:AbortSignal.timeout(30000)});}
async function settings(bucket:string,route:string){const r=await call(bucket,route),j:any=await r.json();if(!r.ok||j.success!==true)throw new Error('Bucket privacy settings unavailable');return j.result;}
const signature=(b:Buffer)=>b.subarray(0,5).toString()==='%PDF-'?'application/pdf':b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP'?'image/webp':b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':'unknown';
async function verifyResponse(r:Response,o:typeof objects[number]){if(!r.ok||r.headers.get('content-type')?.split(';')[0]!==o.mime||Number(r.headers.get('content-length'))!==o.bytes)throw new Error('Private object status/MIME/length differs');const b=Buffer.from(await r.arrayBuffer());if(b.length!==o.bytes||sha(b)!==o.sha256||signature(b)!==o.mime)throw new Error('Private object bytes/hash/signature differs');return b;}
const report:any={...plan,started_at:new Date().toISOString(),status:'RUNNING',verified:[]};
try{
  for(const bucket of [sourceBucket,targetBucket])assertPrivateBucket(await settings(bucket,'/domains/managed'),await settings(bucket,'/domains/custom'));
  report.private_bucket_checks='PASS';
  for(const object of objects){const source='/objects/'+object.source_key.split('/').map(encodeURIComponent).join('/'),target='/objects/'+object.target_key.split('/').map(encodeURIComponent).join('/');const bytes=await verifyResponse(await call(sourceBucket,source),object);const existing=await call(targetBucket,target);if(existing.status!==404)throw new Error('Restore key exists or absence could not be verified; refusing overwrite');await existing.body?.cancel();const put=await call(targetBucket,target,'PUT',bytes,object.mime);if(!put.ok)throw new Error('Private restore PUT failed');await put.body?.cancel();await verifyResponse(await call(targetBucket,target),object);report.verified.push({...object,status:'PASS'});}
  report.status='PASS';
}catch(error){report.status='FAIL';report.error=(error as Error).message;process.exitCode=1;}
finally{report.finished_at=new Date().toISOString();report.elapsed_seconds=(Date.parse(report.finished_at)-Date.parse(report.started_at))/1000;report.requests=requests;await fs.writeFile(path.join(folder,'verification.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(report,null,2));}
