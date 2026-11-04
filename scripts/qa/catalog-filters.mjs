import assert from 'node:assert/strict';

// Verify real documents, not only status 200: an SSR failure previously returned
// a successful empty response while the underlying catalog API still worked.
const stage=process.argv[2];
if(!['production','staging','local'].includes(stage))throw new Error('Choose production, staging or local.');
const base=stage==='production'?'https://jotcoloring.com':stage==='staging'?'https://staging.jotcoloring.com':'http://127.0.0.1:4327';
const paths=[
 '/coloring-pages/veterans-day/',
 ...['easy','medium','hard','very-hard'].map(level=>'/coloring-pages/veterans-day/?difficulty='+level),
 '/coloring-pages/veterans-day/?recommended_age=6-8&difficulty=medium',
 '/coloring-pages/veterans-day/?sort=newest',
 '/coloring-pages/veterans-day/?sort=title',
 '/collections/holidays/?difficulty=hard',
 '/coloring-pages/all/?difficulty=medium',
 '/coloring-pages/numbers/222/?difficulty=hard',
 '/coloring-by-age/6-8/?difficulty=easy',
];
const checks=[];
for(const path of paths){
 const response=await fetch(base+path,{signal:AbortSignal.timeout(45000)}),html=await response.text();
 assert.equal(response.status,200,path+' HTTP status');
 assert.match(response.headers.get('content-type')||'',/text\/html/,path+' content type');
 assert.ok(html.length>5000,path+' returned an empty or truncated document');
 assert.match(html,/<main\b[^>]*id="main"/,path+' main landmark');
 assert.match(html,/<h1\b/,path+' page heading');
 assert.match(html,/id="(?:catalog|age)-results"/,path+' usable filter controls');
 const cards=[...html.matchAll(/data-content-id="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(cards.length,new Set(cards).size,path+' duplicate gallery cards');
 assert.ok(cards.length||/class="[^"]*(?:iv-empty|jc-age-empty)/.test(html),path+' missing gallery and empty selection message');
 const level=new URL(base+path).searchParams.get('difficulty');
 if(level)assert.match(html,new RegExp('<option[^>]*value="'+level+'"[^>]*selected'),path+' selected filter');
 checks.push({path,status:response.status,bytes:new TextEncoder().encode(html).length,cards:cards.length,commit:response.headers.get('x-jotcoloring-commit')});
}
console.log(JSON.stringify({status:'PASS',base,checks},null,2));
