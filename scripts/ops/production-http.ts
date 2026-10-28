/** Bounded read-only production acceptance. Never creates sessions, invokes AI or writes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {inspectScripts} from './script-policy';

const origin = 'https://jotcoloring.com';
const alternateOrigin = 'https://jotcoloring-production.melihozcanapple.workers.dev';
const allowedOrigins = new Set([origin, 'https://www.jotcoloring.com', alternateOrigin]);
const config = JSON.parse(await fs.readFile('wrangler.jsonc', 'utf8'));
if (config.env.production.vars.PUBLIC_SITE_URL !== origin || config.env.production.name !== 'jotcoloring-production') throw new Error('Reviewed production target changed');
const cases = JSON.parse(await fs.readFile('docs/evidence/search-acceptance.json', 'utf8')).results;
type PreparedAsset = {content_id:string; role:string; bytes:number; sha256:string; mime:string; local_file:string; public_key:string|null};
const uploads:PreparedAsset[] = JSON.parse(await fs.readFile('../../deployment-data/uploads.json', 'utf8'));
const expected = uploads.filter(r => r.public_key !== null);
if (cases.length !== 50 || expected.length !== 108 || new Set(expected.map(r => r.content_id)).size !== 18) throw new Error('Reviewed18-content fixture changed');
const versions = new Map<string,number>();
for (const r of expected.filter(r => r.role === 'catalog_thumb_bw')) {
  const manifest = JSON.parse(await fs.readFile(path.join(path.dirname(r.local_file), 'manifest.json'), 'utf8'));
  for (const asset of manifest.assets) versions.set(manifest.content_id+'/'+asset.role, asset.asset_version);
}
const evidence:any = {
  measured_at:new Date().toISOString(), origin, alternate_origin:alternateOrigin,
  scope:'Read-only public production HTTPS from one client; sequential18-content acceptance, no credentials, cookies, sessions, mutations, inference or artificial load',
  five_million_tested:false, production_tested:true, ai_inference_tested:false, browser_canvas_tested:false,
  checks:[], search:[], media:[], downloads:[], content:[], routes:[], modules:[], redirects:[], security:[], warnings:[],
  wrong_owner_private_result:{status:'NOT RUN',reason:'Requires a known production job and another existing signed owner session. This run deliberately uses no cookies and creates no sessions; anonymous401 is a separate assertion.'}
};
let requests = 0, totalBytes = 0;
const headerNames = ['content-type','content-length','content-disposition','cache-control','etag','x-content-type-options','x-robots-tag','content-security-policy','strict-transport-security','cross-origin-resource-policy','cf-cache-status','x-jotcoloring-commit'];
function check(name:string, passed:boolean, detail?:unknown) { evidence.checks.push({name,status:passed?'PASS':'FAIL',...(detail===undefined?{}:{detail})}); }
const digest = (bytes:Buffer) => createHash('sha256').update(bytes).digest('hex');
const signature = (bytes:Buffer) => bytes.subarray(0,5).toString()==='%PDF-'?'application/pdf':bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'?'image/webp':'unknown';
const decodeXML = (text:string) => text.replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&apos;',"'");
async function get(route:string, headers:Record<string,string>={}) {
  const url = new URL(route,origin);
  if (!allowedOrigins.has(url.origin) || url.username || url.password) throw new Error('Unapproved target');
  if (++requests > 280) throw new Error('Bounded request budget exceeded');
  const started = performance.now();
  const response = await fetch(url,{method:'GET',headers,redirect:'manual',signal:AbortSignal.timeout(30000)});
  const bytes = Buffer.from(await response.arrayBuffer()); totalBytes += bytes.length;
  // Never record Set-Cookie values or Access redirect query parameters.
  const location = response.headers.get('location');
  const safeLocation = location ? (()=>{const target=new URL(location,url);return target.origin+target.pathname;})() : null;
  return {status:response.status, bytes, location, safe_location:safeLocation,
    headers:Object.fromEntries(headerNames.map(k=>[k,response.headers.get(k)])),
    has_set_cookie:response.headers.has('set-cookie'), elapsed_ms:Number((performance.now()-started).toFixed(3)), path:url.pathname+url.search};
}
function htmlAttribute(html:string, tag:string, selector:string, value:string, attribute:string) {
  for (const match of html.matchAll(new RegExp('<'+tag+'\\b([^>]*)>','gi'))) {
    const attrs = Object.fromEntries([...match[1].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(a=>[a[1].toLowerCase(),a[2]??a[3]]));
    if (attrs[selector] === value) return attrs[attribute] || null;
  }
  return null;
}
try {
  const health = await get('/api/health'); const healthBody = JSON.parse(health.bytes.toString());
  check('Public production health available',health.status===200&&healthBody.status==='available');
  evidence.health = {http_status:health.status,body:healthBody,headers:health.headers};
  const catalog = await get('/api/catalog?limit=48'); const page = JSON.parse(catalog.bytes.toString()); const items:any[] = page.items || [];
  check('Exactly18 published catalog contents',catalog.status===200&&page.total===18&&items.length===18&&!page.has_more);
  const ids = new Set(expected.map(r=>r.content_id));
  check('Immutable content IDs and revisions match bundle',items.length===ids.size&&items.every(item=>ids.has(item.id)&&item.version===1&&item.revision===1&&!item.example_only));
  check('Every content has color preview and printable dimensions',items.every(item=>item.home_color&&item.width===1024&&item.height===1536));
  check('Public catalog creates no personal session',!catalog.has_set_cookie);
  for (const item of items) {
    const r = await get('/api/content/'+encodeURIComponent(item.slug)), data = JSON.parse(r.bytes.toString());
    evidence.content.push({id:item.id,slug:item.slug,version:item.version,http_status:r.status,status:r.status===200&&data.id===item.id&&data.version===item.version?'PASS':'FAIL'});
  }
  check('18 slug lookups preserve IDs and versions',evidence.content.length===18&&evidence.content.every((r:any)=>r.status==='PASS'));
  for (const c of cases) {
    const params = new URLSearchParams({limit:'48'});
    for (const [key,value] of Object.entries(c.query)) { if (Array.isArray(value)) for (const part of value) params.append(key,String(part)); else params.set(key,String(value)); }
    const r = await get('/api/search?'+params), data = JSON.parse(r.bytes.toString());
    const actual = (data.items||[]).map((item:any)=>item.slug).sort(), wanted = c.expected.slice().sort();
    evidence.search.push({id:c.id,query:c.query,expected:wanted,actual,http_status:r.status,status:r.status===200&&JSON.stringify(actual)===JSON.stringify(wanted)?'PASS':'FAIL',elapsed_ms:r.elapsed_ms,cache_control:r.headers['cache-control']});
  }
  check('50 real HTTPS search cases',evidence.search.length===50&&evidence.search.every((r:any)=>r.status==='PASS'));
  console.log('Production catalog and50 searches checked; validating immutable media.');
  for (const asset of expected) {
    const item = items.find(item=>item.id===asset.content_id);
    const provided = ({catalog_thumb_bw:item.thumbnail,catalog_preview_bw:item.preview,printable_webp_bw:item.lineArtUrl,home_half_color:item.home_color} as Record<string,string>)[asset.role];
    const route = provided || `/api/media/${asset.content_id}/${asset.role}?v=${asset.sha256.slice(0,24)}`;
    const r = await get(route), hash = digest(r.bytes);
    const passed = r.status===200&&r.bytes.length===asset.bytes&&hash===asset.sha256&&signature(r.bytes)===asset.mime&&r.headers['content-type']?.split(';')[0]===asset.mime&&Number(r.headers['content-length'])===asset.bytes&&r.headers.etag===`"${asset.sha256}"`&&r.headers['x-content-type-options']==='nosniff'&&new URL(route,origin).searchParams.get('v')===asset.sha256.slice(0,24)&&(asset.mime!=='application/pdf'||r.bytes.length<=1_000_000);
    evidence.media.push({content_id:asset.content_id,role:asset.role,prepared_asset_version:versions.get(asset.content_id+'/'+asset.role),status:passed?'PASS':'FAIL',http_status:r.status,bytes:r.bytes.length,expected_bytes:asset.bytes,sha256:hash,expected_sha256:asset.sha256,signature:signature(r.bytes),headers:r.headers,elapsed_ms:r.elapsed_ms});
  }
  check('108 public assets match exact prepared bytes, versions and MIME',evidence.media.length===108&&evidence.media.every((r:any)=>r.status==='PASS'));
  for (const item of items) for (const [format,role] of [['pdf','printable_pdf_a4_bw'],['letter','printable_pdf_letter_bw'],['webp','printable_webp_bw']]) {
    const asset = expected.find(r=>r.content_id===item.id&&r.role===role)!;
    const r = await get(item.downloads[format]), hash = digest(r.bytes), extension = format==='webp'?'webp':'pdf';
    const passed = r.status===200&&hash===asset.sha256&&r.bytes.length===asset.bytes&&signature(r.bytes)===asset.mime&&r.headers['content-type']===asset.mime&&r.headers['content-disposition']===`attachment; filename="${item.slug}.${extension}"`&&r.headers['x-content-type-options']==='nosniff'&&(extension!=='pdf'||r.bytes.length<=1_000_000);
    evidence.downloads.push({id:item.id,format,status:passed?'PASS':'FAIL',http_status:r.status,bytes:r.bytes.length,sha256:hash,headers:r.headers});
  }
  check('54 PDF, Letter and WEBP downloads including attachment filenames',evidence.downloads.length===54&&evidence.downloads.every((r:any)=>r.status==='PASS'));
  console.log('Production108 assets and54 downloads checked; verifying canonical and access boundaries.');
  const sample = expected.find(a=>a.role==='catalog_thumb_bw')!, base = `/api/media/${sample.content_id}/${sample.role}`;
  const stale = await get(base+'?v=000000000000000000000000');
  check('Stale asset revision fails explicitly',stale.status===410&&JSON.parse(stale.bytes.toString()).error?.code==='ASSET_REVISION_GONE');
  const conditional = await get(base+'?v='+sample.sha256.slice(0,24),{'If-None-Match':`"${sample.sha256}"`});
  check('Checksum conditional request returns304 without body',conditional.status===304&&conditional.bytes.length===0&&conditional.headers.etag===`"${sample.sha256}"`);
  check('Unknown content returns404',(await get('/api/content/ops-nonexistent-coloring-20261028')).status===404);
  const routes = ['/','/coloring-pages/','/coloring-pages/animals/','/coloring/woodland-friends/','/create/text/','/create/photo/','/my-artwork/','/studio/','/coloring-pages/?q=fox'];
  for (const route of routes) {
    const r = await get(route), html = r.bytes.toString(), scripts = inspectScripts(html,origin);
    const privatePage = /^\/(create|my-artwork|studio)\//.test(route) || route.includes('?');
    const canonical = htmlAttribute(html,'link','rel','canonical','href'), robots = htmlAttribute(html,'meta','name','robots','content');
    const scriptDirective = (r.headers['content-security-policy']||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('script-src '))||'';
    const passed = r.status===200&&!r.headers['x-robots-tag']?.includes('noindex')&&r.headers['x-content-type-options']==='nosniff'&&canonical===origin+new URL(route,origin).pathname&&robots===(privatePage?'noindex,follow':'index,follow')&&scripts.status==='PASS'&&scriptDirective.includes("'self'")&&!scriptDirective.includes("'unsafe-inline'");
    evidence.routes.push({path:route,status:passed?'PASS':'FAIL',http_status:r.status,canonical,meta_robots:robots,headers:r.headers,scripts,elapsed_ms:r.elapsed_ms});
  }
  check('Public pages canonical/indexable; private and query pages meta-noindex; strict script CSP',evidence.routes.every((r:any)=>r.status==='PASS'));
  evidence.observed_commit_headers = [...new Set(evidence.routes.map((r:any)=>r.headers['x-jotcoloring-commit']))];
  if (evidence.observed_commit_headers.some((value:unknown)=>!value||value==='development')) evidence.warnings.push('The tested response does not expose a release commit. This HTTP record proves observed behavior and media bytes, not a specific deployed Git commit.');
  const modulePaths = new Set<string>(evidence.routes.flatMap((r:any)=>r.scripts.same_origin_modules));
  for (const modulePath of modulePaths) {
    const r = await get(modulePath), passed = r.status===200&&r.bytes.length>0&&/javascript/.test(r.headers['content-type']||'');
    evidence.modules.push({path:modulePath,http_status:r.status,bytes:r.bytes.length,mime:r.headers['content-type'],status:passed?'PASS':'FAIL'});
  }
  check('Direct same-origin page modules return JavaScript',evidence.modules.length>0&&evidence.modules.every((r:any)=>r.status==='PASS'));
  const creatorRedirect = await get('/create/');
  check('Creator landing redirects to text builder',creatorRedirect.status===302&&creatorRedirect.location==='/create/text/');
  const robots = await get('/robots.txt'), robotsBody = robots.bytes.toString();
  evidence.robots = {http_status:robots.status,body:robotsBody,headers:robots.headers};
  check('Production robots permits catalog and files, excludes private/filter routes',robots.status===200&&!/^Disallow:\s*\/\s*$/m.test(robotsBody)&&/^Allow: \/$/m.test(robotsBody)&&['/api/','/admin/','/studio/','/create/','/my-artwork/','/*?'].every(p=>robotsBody.includes('Disallow: '+p+'\n'))&&['/api/media/','/api/download/'].every(p=>robotsBody.includes('Allow: '+p+'\n'))&&robotsBody.includes('Sitemap: '+origin+'/sitemap.xml')&&!robots.headers['x-robots-tag']?.includes('noindex'));
  const index = await get('/sitemap.xml'), locations = [...index.bytes.toString().matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>decodeXML(m[1]));
  evidence.sitemap = {http_status:index.status,locations,headers:index.headers,segments:[]};
  check('Sitemap index has two production canonical segments',index.status===200&&locations.length===2&&locations.every(url=>new URL(url).origin===origin)&&index.headers['content-type']?.includes('application/xml')===true&&!index.headers['x-robots-tag']?.includes('noindex'));
  for (const url of locations) {
    const r = await get(url), locs = [...r.bytes.toString().matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>decodeXML(m[1]));
    evidence.sitemap.segments.push({path:new URL(url).pathname,http_status:r.status,locations:locs,headers:r.headers});
  }
  const contentMap = evidence.sitemap.segments.find((s:any)=>s.path==='/sitemaps/1.xml');
  check('Published sitemap has exactly18 current canonical slugs',!!contentMap&&contentMap.http_status===200&&contentMap.locations.length===18&&items.every(item=>contentMap.locations.includes(origin+'/coloring/'+item.slug+'/')));
  check('All sitemap entries use canonical production host',evidence.sitemap.segments.every((s:any)=>s.http_status===200&&s.locations.every((url:string)=>new URL(url).origin===origin)));
  check('Out-of-range sitemap returns404',(await get('/sitemaps/2.xml')).status===404);
  for (const route of ['/','/coloring-pages/animals/?q=fox&age=teens&sort=newest']) {
    const r = await get('https://www.jotcoloring.com'+route), passed = r.status===308&&r.location===origin+route;
    evidence.redirects.push({from:'https://www.jotcoloring.com'+route,http_status:r.status,target:r.location,status:passed?'PASS':'FAIL'});
  }
  check('www308 preserves path and complete query',evidence.redirects.every((r:any)=>r.status==='PASS'));
  for (const route of ['/','/robots.txt']) {
    const r = await get(alternateOrigin+route), passed = r.status===200&&r.headers['x-robots-tag']?.includes('noindex')===true&&(route!=='/robots.txt'||/^Disallow:\s*\/\s*$/m.test(r.bytes.toString()));
    evidence.security.push({target:'alternate worker'+route,http_status:r.status,headers:r.headers,status:passed?'PASS':'FAIL'});
  }
  check('Alternate workers.dev host is noindex and robots-disallowed',evidence.security.every((r:any)=>r.status==='PASS'));
  for (const route of ['/admin/','/api/admin/status']) {
    const r = await get(route); const target = r.location ? new URL(r.location,origin) : null;
    const passed = r.status===302&&!!target&&target.hostname==='broken-term-6d26.cloudflareaccess.com'&&target.pathname.startsWith('/cdn-cgi/access/login/');
    evidence.security.push({target:route,http_status:r.status,redirect_origin:target?.origin||null,redirect_path:target?.pathname||null,status:passed?'PASS':'FAIL'});
    check('Canonical'+route+' requires Access authentication',passed);
  }
  for (const headers of [{},{'cf-access-jwt-assertion':'invalid.acceptance.token'}] as Record<string,string>[]) {
    const r = await get(alternateOrigin+'/api/admin/status',headers); const code = JSON.parse(r.bytes.toString()).error?.code;
    const forged = 'cf-access-jwt-assertion' in headers, passed = forged?r.status===403&&code==='FORBIDDEN':r.status===401&&code==='UNAUTHORIZED';
    evidence.security.push({target:'alternate worker/api/admin/status',credential:forged?'malformed dummy JWT':'none',http_status:r.status,error_code:code,status:passed?'PASS':'FAIL'});
    check('Alternate host admin rejects '+(forged?'forged JWT':'anonymous request'),passed);
  }
  for (const route of ['/api/creator/jobs','/api/creator/jobs/00000000-0000-4000-8000-000000000000/result?format=webp']) {
    const r = await get(route), code = JSON.parse(r.bytes.toString()).error?.code;
    const passed = r.status===401&&code==='UNAUTHORIZED'&&!r.has_set_cookie;
    evidence.security.push({target:route,http_status:r.status,error_code:code,session_created:r.has_set_cookie,status:passed?'PASS':'FAIL'});
    check('Private creator GET requires an existing session: '+route,passed);
  }
  const availability = await get('/api/creator/availability'), availabilityBody = JSON.parse(availability.bytes.toString());
  evidence.ai_availability = {http_status:availability.status,body:availabilityBody,inference_tested:false};
  check('AI advertises free-only mode without creating a session',availability.status===200&&availabilityBody.available===true&&availabilityBody.billing_mode==='free_only'&&!availability.has_set_cookie);
  const times = evidence.search.map((r:any)=>r.elapsed_ms).sort((a:number,b:number)=>a-b), p = (value:number)=>times[Math.ceil(times.length*value)-1];
  evidence.network_latency = {samples:times.length,p50_ms:p(.5),p95_ms:p(.95),p99_ms:p(.99),scope:'Sequential full-body HTTPS latency from one client, mixed cache state; no concurrency, RPS or scale guarantee'};
  evidence.overall = evidence.checks.every((r:any)=>r.status==='PASS')?'PASS':'FAIL';
} catch (error) {
  evidence.overall = 'FAIL'; evidence.error = error instanceof Error?error.message:'Unexpected acceptance failure'; process.exitCode = 1;
} finally {
  evidence.request_count = requests; evidence.received_body_bytes = totalBytes; evidence.finished_at = new Date().toISOString();
  await fs.writeFile('docs/evidence/production-http.json',JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify({status:evidence.overall,requests,received_body_bytes:totalBytes,checks:evidence.checks,network_latency:evidence.network_latency,error:evidence.error},null,2));
  if (evidence.overall !== 'PASS') process.exitCode = 1;
}
