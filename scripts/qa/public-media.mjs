/** Read-only production smoke check. Bounded to the first 48 published items.
 * Exercise cached and uncached public delivery, not only origin availability.
 */
import assert from 'node:assert/strict';
if(process.argv[2]!=='production')throw new Error('Select production explicitly.');
const origin='https://jotcoloring.com',cdn='https://assets.jotcoloring.com';
async function request(url,options={}){return fetch(url,{...options,credentials:'omit',signal:AbortSignal.timeout(20000)});}
const catalog=await request(origin+'/api/catalog?limit=48');assert.equal(catalog.status,200);
const {items,total}=await catalog.json();assert.ok(items.length>0&&items.length<=48);
const media=new Map(),pdfs=[];
function asset(url,mime){const parsed=new URL(url);assert.equal(parsed.origin,cdn);assert.ok(parsed.pathname.startsWith('/published/'));media.set(url,mime);return url;}
for(const item of items){
 for(const key of ['thumbnail','preview','home_color','color_reference','lineArtUrl'])if(item[key])asset(item[key],'image/webp');
 asset(item.social_image,'image/png');
 const response=await request(new URL(item.downloads.pdf,origin),{method:'HEAD',redirect:'manual'});
 assert.equal(response.status,302);pdfs.push(asset(response.headers.get('location'),'application/pdf'));
}
const jobs=[...media],results=[];let index=0;
async function check(){while(index<jobs.length){const [url,mime]=jobs[index++],r=await request(url,{method:'HEAD'});assert.equal(r.status,200,url);assert.equal(r.headers.get('content-type')?.split(';')[0],mime);assert.equal(r.headers.get('access-control-allow-origin'),'*','Public CDN must retain CORS even without an Origin header');assert.ok(r.headers.get('cache-control')?.includes('immutable'));const bytes=Number(r.headers.get('content-length'));assert.ok(bytes>0);if(mime==='application/pdf')assert.ok(bytes<=1_000_000);results.push({url,mime,bytes});}}
await Promise.all([check(),check(),check(),check()]);
let cacheHits=0;
for(const url of [items[0].thumbnail,items[0].lineArtUrl,items[0].social_image,pdfs[0]]){
 const warm=await request(url);assert.equal(warm.status,200);await warm.arrayBuffer();
 const cached=await request(url,{headers:{Origin:origin}});assert.equal(cached.status,200);assert.equal(cached.headers.get('access-control-allow-origin'),'*');await cached.arrayBuffer();if(cached.headers.get('cf-cache-status')==='HIT')cacheHits++;
}
assert.ok(cacheHits>0,'At least one repeated public GET must demonstrate an edge-cache HIT.');
const robots=await(await request(origin+'/robots.txt')).text();assert.ok(robots.includes('Allow: /'));assert.ok(!robots.includes('Disallow: /'));
for(const [path,marker]of [['/contact/','data-contact-start'],['/drawing-board/','data-drawing-board="true"']]){const r=await request(origin+path);assert.equal(r.status,200);assert.ok((await r.text()).includes(marker));}
console.log(JSON.stringify({status:'PASS',catalogTotal:total,itemsChecked:items.length,filesChecked:results.length,largestPdf:Math.max(...results.filter(x=>x.mime==='application/pdf').map(x=>x.bytes)),repeatedGetCacheHits:cacheHits,scope:'Bounded public-media and page smoke check; not a load test'}));
