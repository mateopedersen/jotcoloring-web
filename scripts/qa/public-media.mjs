/** Read-only production smoke check. Bounded to the first 48 published items.
 * Exercise cached and uncached public delivery, not only origin availability.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readOnlyFetch} from './read-only-fetch.mjs';
if(process.argv[2]!=='production')throw new Error('Select production explicitly.');
const origin='https://jotcoloring.com',cdn='https://assets.jotcoloring.com';
async function request(url,options={}){return readOnlyFetch(url,{...options,credentials:'omit'});}
const catalog=await request(origin+'/api/catalog?limit=48');assert.equal(catalog.status,200);
const {items,total}=await catalog.json();assert.ok(items.length>0&&items.length<=48);
const media=new Map(),downloads=[];
function asset(url,mime){const parsed=new URL(url);assert.equal(parsed.origin,cdn);assert.ok(parsed.pathname.startsWith('/published/'));media.set(url,mime);return url;}
for(const item of items){
 for(const key of ['thumbnail','preview','home_color','color_reference','lineArtUrl'])if(item[key])asset(item[key],'image/webp');
 asset(item.social_image,'image/png');
 for(const [format,mime,extension] of [['pdf','application/pdf','pdf'],['webp','image/webp','webp']]){
  const url=new URL(item.downloads[format],origin).href,response=await request(url,{method:'HEAD',redirect:'manual'});
  assert.equal(response.status,200,url);
  assert.equal(response.headers.get('content-type')?.split(';')[0],mime,url);
  const disposition=response.headers.get('content-disposition')||'';
  assert.ok(disposition.startsWith('attachment;'),`Download must be an attachment: ${url}`);
  assert.ok(disposition.includes(`${item.slug}.${extension}`),`Download filename must match its topic: ${url}`);
  const bytes=Number(response.headers.get('content-length'));assert.ok(bytes>0,url);if(format==='pdf')assert.ok(bytes<=1_000_000,url);
  let canonical;
  if(format==='pdf'){
   const match=/^<([^>]+)>; rel="canonical"$/.exec(response.headers.get('link')||'');
   assert.ok(match,`PDF download must identify its canonical immutable file: ${url}`);
   canonical=asset(match[1],mime);
   assert.ok(new URL(canonical).pathname.endsWith('.pdf'),canonical);
  }
  downloads.push({url,mime,bytes,canonical});
 }
}
const jobs=[...media],results=[];let index=0;
async function check(){while(index<jobs.length){const [url,mime]=jobs[index++],r=await request(url,{method:'HEAD'});assert.equal(r.status,200,url);assert.equal(r.headers.get('content-type')?.split(';')[0],mime);assert.equal(r.headers.get('access-control-allow-origin'),'*','Public CDN must retain CORS even without an Origin header');assert.ok(r.headers.get('cache-control')?.includes('immutable'));const bytes=Number(r.headers.get('content-length'));assert.ok(bytes>0);if(mime==='application/pdf')assert.ok(bytes<=1_000_000);results.push({url,mime,bytes});}}
await Promise.all([check(),check(),check(),check()]);
for(const sample of downloads.slice(0,2)){
 const response=await request(sample.url);assert.equal(response.status,200,sample.url);
 assert.equal(response.headers.get('content-type')?.split(';')[0],sample.mime,sample.url);
 const bytes=new Uint8Array(await response.arrayBuffer());assert.equal(bytes.byteLength,sample.bytes,sample.url);
 const stale=new URL(sample.url),current=stale.searchParams.get('v');assert.match(current,/^[a-f0-9]{24}$/);
 stale.searchParams.set('v',(current[0]==='0'?'1':'0')+current.slice(1));
 const recovery=await request(stale,{redirect:'manual'});assert.equal(recovery.status,302,stale.href);
 assert.equal(recovery.headers.get('cache-control'),'no-store','Old download aliases must not outlive future changes');
 const recoveredURL=new URL(recovery.headers.get('location'),origin);assert.equal(recoveredURL.href,sample.url);
 const recovered=await request(recoveredURL,{redirect:'manual'});assert.equal(recovered.status,200);
 assert.ok(recovered.headers.get('content-disposition')?.startsWith('attachment;'));
 const recoveredBytes=new Uint8Array(await recovered.arrayBuffer());
 assert.equal(createHash('sha256').update(recoveredBytes).digest('hex'),createHash('sha256').update(bytes).digest('hex'),'Recovered download must contain the exact current file bytes');
 if(sample.mime==='application/pdf'){
  assert.equal(new TextDecoder().decode(bytes.subarray(0,5)),'%PDF-',sample.url);
  const canonical=await request(sample.canonical);assert.equal(canonical.status,200);
  const file=new Uint8Array(await canonical.arrayBuffer());
  assert.equal(createHash('sha256').update(file).digest('hex'),createHash('sha256').update(bytes).digest('hex'),'Canonical PDF must contain the identical download bytes');
 }
 else{
  assert.equal(new TextDecoder('latin1').decode(bytes.subarray(0,4)),'RIFF',sample.url);assert.equal(new TextDecoder('latin1').decode(bytes.subarray(8,12)),'WEBP',sample.url);
  const alias=new URL(`/api/media/${encodeURIComponent(items[0].id)}/printable_webp_bw`,origin);
  alias.searchParams.set('v',stale.searchParams.get('v'));
  const aliasRecovery=await request(alias,{redirect:'manual'});assert.equal(aliasRecovery.status,302);
  assert.equal(aliasRecovery.headers.get('cache-control'),'no-store');
  const target=new URL(aliasRecovery.headers.get('location'),origin);assert.equal(target.origin,origin);assert.equal(target.pathname,alias.pathname);assert.equal(target.searchParams.get('v'),current);
  const image=await request(target,{redirect:'manual'});assert.equal(image.status,200);assert.equal(image.headers.get('content-type')?.split(';')[0],'image/webp');
  assert.equal(createHash('sha256').update(new Uint8Array(await image.arrayBuffer())).digest('hex'),createHash('sha256').update(bytes).digest('hex'),'Recovered image alias must contain the current verified drawing');
 }
}
let cacheHits=0;
for(const url of [items[0].thumbnail,items[0].lineArtUrl,items[0].social_image]){
 const warm=await request(url);assert.equal(warm.status,200);await warm.arrayBuffer();
 const cached=await request(url,{headers:{Origin:origin}});assert.equal(cached.status,200);assert.equal(cached.headers.get('access-control-allow-origin'),'*');await cached.arrayBuffer();if(cached.headers.get('cf-cache-status')==='HIT')cacheHits++;
}
assert.ok(cacheHits>0,'At least one repeated public GET must demonstrate an edge-cache HIT.');
const robots=await(await request(origin+'/robots.txt')).text();assert.ok(robots.includes('Allow: /'));assert.ok(!robots.includes('Disallow: /'));
for(const [path,marker]of [['/contact/','data-contact-start'],['/drawing-board/','data-drawing-board="true"']]){const r=await request(origin+path);assert.equal(r.status,200);assert.ok((await r.text()).includes(marker));}
console.log(JSON.stringify({status:'PASS',catalogTotal:total,itemsChecked:items.length,filesChecked:results.length,downloadsChecked:downloads.length,obsoleteDownloadsRecovered:Math.min(2,downloads.length),obsoleteMediaAliasesRecovered:1,largestPdf:Math.max(...downloads.filter(x=>x.mime==='application/pdf').map(x=>x.bytes)),repeatedGetCacheHits:cacheHits,scope:'Bounded public-media and page smoke check; not a load test'}));
