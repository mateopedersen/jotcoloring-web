/** Focused read-only six-page gate; intentionally does not repeat catalog/media suites. */
import fs from 'node:fs/promises';
import {inspectScripts} from './script-policy';
const origin = process.argv[2] || 'https://staging.jotcoloring.com';
if (!['https://staging.jotcoloring.com','https://jotcoloring-staging.melihozcanapple.workers.dev','https://jotcoloring.com','http://127.0.0.1:4321'].includes(origin)) throw new Error('Origin is not approved');
const routes = ['/coloring-pages/','/create/text/','/create/photo/','/coloring/woodland-friends/','/my-artwork/','/studio/'];
const evidence: any = {measured_at:new Date().toISOString(), origin, scope:'Read-only six-page script/CSP compatibility and direct module response check; no browser interaction, media or load claim', routes:[], modules:[]};
let requests = 0;
for (const route of routes) {
  requests++;
  const response = await fetch(origin+route, {redirect:'manual', signal:AbortSignal.timeout(30000)});
  const html = await response.text(), csp = response.headers.get('content-security-policy') || '';
  const scripts = inspectScripts(html, origin);
  const scriptDirective = csp.split(';').map(s=>s.trim()).find(s=>s.startsWith('script-src ')) || '';
  const strictCsp = scriptDirective.includes("'self'") && !scriptDirective.includes("'unsafe-inline'");
  evidence.routes.push({path:route,http_status:response.status,content_type:response.headers.get('content-type'),script_directive:scriptDirective,...scripts,status:response.status===200&&strictCsp&&scripts.status==='PASS'&&scripts.same_origin_modules.length>0?'PASS':'FAIL'});
}
for (const modulePath of new Set<string>(evidence.routes.flatMap((r:any)=>r.same_origin_modules))) {
  if (++requests > 40) throw new Error('Focused request budget exceeded');
  const response = await fetch(origin+modulePath,{redirect:'manual',signal:AbortSignal.timeout(30000)});
  const bytes = (await response.arrayBuffer()).byteLength, mime = response.headers.get('content-type') || '';
  evidence.modules.push({path:modulePath,http_status:response.status,content_type:mime,bytes,status:response.status===200&&bytes>0&&/javascript/.test(mime)?'PASS':'FAIL'});
}
evidence.status = evidence.routes.every((r:any)=>r.status==='PASS') && evidence.modules.every((r:any)=>r.status==='PASS') ? 'PASS':'FAIL';
evidence.request_count=requests;
evidence.finished_at=new Date().toISOString();
const file = origin==='https://jotcoloring.com'?'docs/evidence/production-script-policy.json':'docs/evidence/staging-script-policy.json';
await fs.writeFile(file,JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));
if(evidence.status!=='PASS')process.exitCode=1;
