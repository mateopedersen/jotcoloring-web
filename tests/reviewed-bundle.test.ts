import test from 'node:test';import assert from 'node:assert/strict';
import {validateReviewedBundle,bundleSignature,bundleReceiptKey,inlineReviewedImportEnvironment,ReviewedImportPending,type ReviewedBundle} from '../src/server/reviewed-bundle';
import {canonicalJSON,sha256} from '../src/server/http';
import {syntheticAgeReview} from './fixtures/age-review';
import {preparedCategorySelection} from '../scripts/data/category-selection';import {COLLECTIBLE_CHARACTER_RELEASE_ID} from '../src/server/reviewed-release-scope';
const secret='test-only-reviewed-bundle-secret-1234567890';
async function fixture(){
 const source=await sha256('source'),line=await sha256('line');
 const roles=['printable_webp_bw','printable_pdf_a4_bw','catalog_thumb_bw','catalog_thumb_small_bw','catalog_thumb_medium_bw','catalog_preview_bw','catalog_preview_mobile_bw','home_half_color','home_half_color_small','home_half_color_medium','color_inspiration','social_og'];
 const assets=await Promise.all(roles.map(async role=>({asset_id:'fixture-'+role,role,storage_zone:'private_incoming',object_key:'incoming/fixture/'+role,mime:role==='printable_pdf_a4_bw'?'application/pdf':role==='social_og'?'image/png':'image/webp',bytes:role==='printable_webp_bw'?4:role.length,sha256:await sha256(role==='printable_webp_bw'?'line':role),asset_version:1,...(role==='printable_pdf_a4_bw'?{page_count:1}:{width:role==='social_og'?1200:64,height:role==='social_og'?630:64}),...(role==='social_og'||role.includes('color')?{source_asset_id:'fixture-printable_webp_bw',source_sha256:line}:{})})));
 const age=syntheticAgeReview(line),category=preparedCategorySelection(age.category_analysis,line),metadata={title:'Square Outline',description:'A large square outline with an open center.',alt_text:'A large square outline with an open center.',category_ids:category.category_ids};
 const manifest:any={schema_version:'1.0',example_only:false,content_id:'jc-bundle-fixture',slug:'square-outline',idempotency_key:'reviewed-bundle-fixture',import_action:'create',locale:'en',requested_status:'published',tags:[],...metadata,provenance:{source_type:'user_owned',rights_status:'documented',reference:'Source SHA-256 '+source},assets,age_recommendation:age,category_selection:category};
 const design='fixture-coloring-pages__easy__001',f=async(key:string,mime:string,text:string)=>({key,mime,bytes:text.length,sha256:await sha256(text),base64:btoa(text)}),pdf=await f('', 'application/pdf','pdf'),webp=await f('','image/webp','webp');
 pdf.key=`packages/fixture-coloring-pages/${design}/${pdf.sha256}.pdf`;webp.key=`packages/fixture-coloring-pages/${design}/${webp.sha256}.webp`;
 const editorial:any={design_id:design,status:'approved_for_publication',...metadata,prepared_source_sha256:source,pdf_sha256:pdf.sha256,webp_sha256:webp.sha256,render_review:{assets:Object.fromEntries(assets.map(a=>[a.role,a.sha256]))},second_editorial_review:{design_id:design,passes:2,source_sha256:source,metadata_sha256:await sha256(canonicalJSON(metadata))}};
 return {schema_version:1,environment:'staging',release:{sha256:'a'.repeat(64),collections:24,designs:2400},expires_at:new Date(Date.now()+86400000).toISOString(),design_id:design,source_sha256:source,manifest,editorial,native:await f(`originals/${manifest.content_id}/${source}.png`,'image/png','source'),supplied:[pdf,webp],assets:await Promise.all(assets.map(a=>f(a.object_key,a.mime,a.role==='printable_webp_bw'?'line':a.role))),reviews:assets.map(a=>({...a,review_version:1,reviewed_at:new Date().toISOString(),bw:!a.role.includes('color')&&a.role!=='social_og'}))} as unknown as ReviewedBundle;
}
async function checked(b:ReviewedBundle,environment='staging',signature?:string){const bytes=new TextEncoder().encode(JSON.stringify(b)),hash=await sha256(bytes);return validateReviewedBundle(bytes,{type:'reviewed_bundle',object_key:`operator-imports/${hash}.json`,sha256:hash,signature:signature??await bundleSignature(hash,environment,secret)},{APP_ENV:environment,MEDIA_VALIDATION_SECRET:secret});}
test('sealed one-artwork transport authenticates its environment, all originals and all approved derivatives',async()=>{const b=await fixture();const followup=structuredClone(b);followup.release={...followup.release,id:'descendants-squishy-kpop-20261101',collections:3,designs:300};assert.equal((await checked(followup)).decoded.size,15);for(const change of [{id:undefined,collections:3,designs:300},{id:'unknown',collections:3,designs:300},{id:'descendants-squishy-kpop-20261101',collections:3,designs:100}]){const invalid=structuredClone(followup);invalid.release={...invalid.release,...change};await assert.rejects(()=>checked(invalid),/current release/);}assert.equal((await checked(b)).decoded.size,15);await assert.rejects(()=>checked(b,'production'),/current release/);await assert.rejects(()=>checked(b,'staging','0'.repeat(64)),/signature/);assert.throws(()=>bundleReceiptKey('../wrong'));
 for(const mutation of ['copy','source','pixels','incomplete','expiry','approval','original']){const a=structuredClone(b);if(mutation==='copy')a.manifest.title='Changed title';if(mutation==='source')a.source_sha256='c'.repeat(64);if(mutation==='pixels')a.assets[0].base64=btoa('edited pixels');if(mutation==='incomplete')(a.release as any).designs=100;if(mutation==='expiry')a.expires_at='invalid';if(mutation==='approval')a.editorial.second_editorial_review.passes=1;if(mutation==='original')a.supplied[0].sha256='d'.repeat(64);await assert.rejects(()=>checked(a),mutation);}
});

test('supplied 17-topic transport preserves print containers and excludes color roles',async()=>{
 const b=await fixture(),excluded=new Set(['home_half_color','home_half_color_small','home_half_color_medium','color_inspiration']);
 b.manifest.assets=b.manifest.assets.filter(a=>!excluded.has(a.role));b.assets=b.assets.filter(a=>b.manifest.assets.some(m=>m.object_key===a.key));b.reviews=b.reviews.filter(a=>!excluded.has(a.role));
 const line=b.assets.find(a=>a.key===b.manifest.assets.find(m=>m.role==='printable_webp_bw')!.object_key)!,pdf=b.assets.find(a=>a.key===b.manifest.assets.find(m=>m.role==='printable_pdf_a4_bw')!.object_key)!;
 const source=line.sha256;b.source_sha256=source;b.release={...b.release,id:COLLECTIBLE_CHARACTER_RELEASE_ID,collections:17,designs:1700};b.editorial.prepared_source_sha256=source;b.editorial.second_editorial_review.source_sha256=source;b.editorial.pdf_sha256=pdf.sha256;b.manifest.provenance.reference='Source SHA-256 '+source+'; original PDF/WebP preserved verbatim.';
 const collection=b.design_id.split('__')[0];b.source_file={...line,key:`packages/${collection}/${b.design_id}/${source}.webp`};b.supplied=[{...pdf,key:`packages/${collection}/${b.design_id}/${pdf.sha256}.pdf`}];delete b.native;
 b.editorial.render_review.assets=Object.fromEntries(b.manifest.assets.map(a=>[a.role,a.sha256]));
 const result=await checked(b);assert.equal(result.decoded.size,10);assert.equal(result.manifest.assets.length,8);assert.equal(result.bundle.native,undefined);
 const changed=structuredClone(b);changed.manifest.assets.find(a=>a.role==='printable_webp_bw')!.sha256='b'.repeat(64);await assert.rejects(()=>checked(changed));
 const missing=structuredClone(b);missing.manifest.assets=missing.manifest.assets.filter(a=>a.role!=='catalog_preview_mobile_bw');await assert.rejects(()=>checked(missing),/preserved/);
 const invalid=structuredClone(b);invalid.source_file!.sha256='b'.repeat(64);await assert.rejects(()=>checked(invalid),/Transported bytes changed/);
});

test('inline reviewed imports suppress only their duplicate import delivery and preserve projection dispatch',async()=>{const sent:any[]=[];const queue={async send(message:any,options?:unknown){sent.push({message,options});}},env={INGEST_QUEUE:queue};const inline=inlineReviewedImportEnvironment(env);assert.equal(env.INGEST_QUEUE,queue);await inline.INGEST_QUEUE!.send({type:'import',job_id:'same-job'});assert.equal(sent.length,0);await inline.INGEST_QUEUE!.send({type:'projection',event_id:'event-1'},{delaySeconds:1});assert.deepEqual(sent,[{message:{type:'projection',event_id:'event-1'},options:{delaySeconds:1}}]);await env.INGEST_QUEUE.send({type:'import',job_id:'unrelated-job'});assert.equal(sent.length,2);assert.throws(()=>inlineReviewedImportEnvironment({}),/queue binding/);});

test('an active reviewed import lease defers transport delivery past the lease instead of exhausting short retries',async()=>{
 const {default:jobs}=await import('../workers/jobs/index');
 const bundle=await fixture(),{manifest}=await checked(bundle),bytes=new TextEncoder().encode(JSON.stringify(bundle)),hash=await sha256(bytes);
 class Bucket{
  objects=new Map<string,Uint8Array>();
  async put(key:string,value:Uint8Array|ArrayBuffer|string){this.objects.set(key,typeof value==='string'?new TextEncoder().encode(value):new Uint8Array(value));}
  async get(key:string){const data=this.objects.get(key);return data?{key,size:data.length,body:new Response(data as BodyInit).body!,arrayBuffer:async()=>data.slice().buffer,text:async()=>new TextDecoder().decode(data)}:null;}
  async head(key:string){return this.get(key);}
 }
 const originals=new Bucket(),backups=new Bucket(),published=new Bucket();await originals.put('operator-imports/'+hash+'.json',bytes);
 const payload=await sha256(canonicalJSON(manifest)),updatedAt=new Date().toISOString();let claimed=0;
 const db:any={prepare(sql:string){return{bind(){return this;},async first(){
  if(sql.startsWith('SELECT active_version'))return{active_version:null,latest_version:1,status:'draft'};
  if(sql.startsWith('SELECT manifest_json'))return{manifest_json:JSON.stringify(manifest)};
  if(sql.startsWith('SELECT id,payload_sha256,status FROM import_job'))return{id:'leased-job',payload_sha256:payload,status:'processing'};
  if(sql.startsWith('SELECT * FROM import_job'))return{id:'leased-job',payload_sha256:payload,status:'processing',owner:'operator'};
  if(sql.startsWith('SELECT status,updated_at FROM import_job'))return{status:'processing',updated_at:updatedAt};
  throw Error('Unexpected read '+sql);
 },async all(){return{results:[],success:true};},async run(){if(sql.startsWith('UPDATE import_job'))claimed++;return{results:[],success:true,meta:{changes:0}};}};}};
 let acked=0;const retries:number[]=[];
 await jobs.queue({messages:[{body:{type:'reviewed_bundle',object_key:'operator-imports/'+hash+'.json',sha256:hash,signature:await bundleSignature(hash,'staging',secret)},attempts:4,ack(){acked++;},retry(options){retries.push(options!.delaySeconds);}}]}, {APP_ENV:'staging',MEDIA_VALIDATION_SECRET:secret,ORIGINALS:originals,BACKUPS:backups,PUBLISHED:published,CATALOG_DB:db,INGEST_QUEUE:{async send(){throw Error('Duplicate import must remain inline');}}} as any);
 assert.equal(claimed,1);assert.equal(acked,0);assert.equal(retries.length,1);assert.ok(retries[0]>=899&&retries[0]<=901);
 assert.equal(published.objects.size,0);assert.equal(backups.objects.has(bundleReceiptKey(hash)),false);
 assert.equal([...backups.objects.keys()].some(key=>key.startsWith('operator-import-errors/')),false);
 const now=Date.now();assert.equal(new ReviewedImportPending(new Date(now-16*60000).toISOString(),now).retryAfterSeconds,1);
});
