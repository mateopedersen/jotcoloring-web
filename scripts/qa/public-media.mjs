/** Read-only production smoke check. Bounded to the first 48 published items.
 * Exercise cached and uncached public delivery, not only origin availability.
 */
import assert from 'node:assert/strict';
if(process.argv[2]!=='production')throw new Error('Select production explicitly.');
const origin='https://jotcoloring.com',cdn='https://assets.jotcoloring.com';
async function request(url,options={}){return fetch(url,{...options,credentials:'omit',signal:AbortSignal.timeout(20000)});}
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
  downloads.push({url,mime,bytes});
 }
}
const jobs=[...media],results=[];let index=0;
async function check(){while(index<jobs.length){const [url,mime]=jobs[index++],r=await request(url,{method:'HEAD'});assert.equal(r.status,200,url);assert.equal(r.headers.get('content-type')?.split(';')[0],mime);assert.equal(r.headers.get('access-control-allow-origin'),'*','Public CDN must retain CORS even without an Origin header');assert.ok(r.headers.get('cache-control')?.includes('immutable'));const bytes=Number(r.headers.get('content-length'));assert.ok(bytes>0);if(mime==='application/pdf')assert.ok(bytes<=1_000_000);results.push({url,mime,bytes});}}
await Promise.all([check(),check(),check(),check()]);
for(const sample of downloads.slice(0,2)){
 const response=await request(sample.url);assert.equal(response.status,200,sample.url);
 assert.equal(response.headers.get('content-type')?.split(';')[0],sample.mime,sample.url);
 const bytes=new Uint8Array(await response.arrayBuffer());assert.equal(bytes.byteLength,sample.bytes,sample.url);
 if(sample.mime==='application/pdf')assert.equal(new TextDecoder().decode(bytes.subarray(0,5)),'%PDF-',sample.url);
 else{assert.equal(new TextDecoder('latin1').decode(bytes.subarray(0,4)),'RIFF',sample.url);assert.equal(new TextDecoder('latin1').decode(bytes.subarray(8,12)),'WEBP',sample.url);}
}
let cacheHits=0;
for(const url of [items[0].thumbnail,items[0].lineArtUrl,items[0].social_image]){
 const warm=await request(url);assert.equal(warm.status,200);await warm.arrayBuffer();
 const cached=await request(url,{headers:{Origin:origin}});assert.equal(cached.status,200);assert.equal(cached.headers.get('access-control-allow-origin'),'*');await cached.arrayBuffer();if(cached.headers.get('cf-cache-status')==='HIT')cacheHits++;
}
assert.ok(cacheHits>0,'At least one repeated public GET must demonstrate an edge-cache HIT.');
const robots=await(await request(origin+'/robots.txt')).text();assert.ok(robots.includes('Allow: /'));assert.ok(!robots.includes('Disallow: /'));
for(const [path,marker]of [['/contact/','data-contact-start'],['/drawing-board/','data-drawing-board="true"']]){const r=await request(origin+path);assert.equal(r.status,200);assert.ok((await r.text()).includes(marker));}
console.log(JSON.stringify({status:'PASS',catalogTotal:total,itemsChecked:items.length,filesChecked:results.length,downloadsChecked:downloads.length,largestPdf:Math.max(...downloads.filter(x=>x.mime==='application/pdf').map(x=>x.bytes)),repeatedGetCacheHits:cacheHits,scope:'Bounded public-media and page smoke check; not a load test'}));
