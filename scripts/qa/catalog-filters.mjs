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
 '/coloring-by-age/6-8/?q=flower&difficulty=medium',
 '/coloring-by-age/6-8/?collection=nature&q=flower',
 '/coloring-by-age/6-8/?category=animals&subcategory=cats&q=kitten',
 '/coloring-pages/?difficulty=very-hard&q=mandala',
 '/coloring-pages/chrysler/?recommended_age=6-8&difficulty=medium&sort=title',
 '/coloring-pages/gmc/?recommended_age=3-5&difficulty=easy',
 '/coloring-by-age/6-8/?category=cars&subcategory=chrysler&difficulty=medium',
];
const checks=[];
// Workers propagation may briefly reach the previous release in another region.
// Wait only for the reviewed commit; never retry an assertion on that commit.
async function releaseFetch(url,options={}){
 const expected=process.env.GITHUB_SHA;
 for(let attempt=0;attempt<8;attempt++){
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(45000)});
  if(!expected||response.headers.get('x-jotcoloring-commit')===expected)return response;
  await response.body?.cancel();
  if(attempt===7)throw new Error('Expected release has not reached '+new URL(url).pathname);
  await new Promise(resolve=>setTimeout(resolve,1500));
 }
 throw new Error('Release check did not complete.');
}
for(const path of paths){
 const response=await releaseFetch(base+path),html=await response.text();
 assert.equal(response.status,200,path+' HTTP status');
 assert.match(response.headers.get('content-type')||'',/text\/html/,path+' content type');
 assert.ok(html.length>5000,path+' returned an empty or truncated document');
 assert.ok(/<main\b[^>]*id="main"/.test(html),path+' main landmark');
 assert.ok(/<h1\b/.test(html),path+' page heading');
 assert.ok(/id="(?:catalog|age)-results"/.test(html),path+' usable filter controls');
 assert.ok(/id="catalog-search"/.test(html),path+' scoped search');
 assert.ok(/id="category-filter"/.test(html),path+' topic choices');
 assert.ok(/<optgroup\s/.test(html),path+' grouped published topics');
 const initial=html.match(/name="initial_category"[^>]*value="([^"]*)"/)?.[1];
 const choices=html.match(/<select\b[^>]*id="category-filter"[^>]*>([\s\S]*?)<\/select>/)?.[1]||'';
 const selected=[...choices.matchAll(/<option\b([^>]*)>/g)].filter(m=>/\bselected(?:\s|=|$)/.test(m[1]));
 assert.equal(selected.length,1,path+' must render one explicit topic selection');
 assert.equal(selected[0][1].match(/\bvalue="([^"]*)"/)?.[1],initial,path+' selected topic must match form scope');
 if(path.includes('/chrysler/')||path.includes('subcategory=chrysler'))assert.equal(initial,'cars/chrysler',path+' Chrysler scope');
 if(path.includes('/gmc/'))assert.equal(initial,'cars/gmc',path+' GMC scope');
 const cards=[...html.matchAll(/data-content-id="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(cards.length,new Set(cards).size,path+' duplicate gallery cards');
 assert.ok(cards.length||/class="[^"]*(?:iv-empty|jc-age-empty)/.test(html),path+' missing gallery and empty selection message');
 const level=new URL(base+path).searchParams.get('difficulty');
 if(level)assert.ok(new RegExp('<option[^>]*value="'+level+'"[^>]*selected').test(html),path+' selected filter');
 checks.push({path,status:response.status,bytes:new TextEncoder().encode(html).length,cards:cards.length,commit:response.headers.get('x-jotcoloring-commit')});
}
for(const source of ['/coloring-by-age/6-8/?difficulty=medium','/coloring-pages/?difficulty=very-hard']){
 const fields=new URLSearchParams({source,initial_category:'',category:'animals/cats',recommended_age:source.includes('coloring-by-age')?'6-8':'',difficulty:source.includes('very-hard')?'very-hard':'medium',sort:'newest',q:'kitten'});
 const response=await releaseFetch(base+'/api/catalog-filters?'+fields,{redirect:'manual'});
 assert.equal(response.status,303,'Native GET filter form');
 const target=new URL(response.headers.get('location')||'',base);
 assert.equal(target.origin,new URL(base).origin);assert.equal(target.searchParams.get('q'),'kitten');assert.equal(target.searchParams.get('sort'),'newest');
 assert.equal(target.pathname,source.includes('coloring-by-age')?'/coloring-by-age/6-8/':'/coloring-pages/cats/');
 if(source.includes('coloring-by-age'))assert.equal(target.searchParams.get('subcategory'),'cats');
 checks.push({path:'/api/catalog-filters (native form: '+source+')',status:response.status,location:target.pathname+target.search+target.hash});
}
for(const topic of ['chrysler','gmc']){
 const source='/coloring-pages/'+topic+'/',selection='cars/'+topic;
 const fields=new URLSearchParams({source,initial_category:selection,category:selection,recommended_age:'3-5',difficulty:'easy',sort:'title',q:''});
 const response=await releaseFetch(base+'/api/catalog-filters?'+fields,{redirect:'manual'});
 assert.equal(response.status,303,'Scoped native brand filter');
 const target=new URL(response.headers.get('location')||'',base);
 assert.equal(target.pathname,source);assert.equal(target.searchParams.get('recommended_age'),'3-5');assert.equal(target.searchParams.get('difficulty'),'easy');
 checks.push({path:'/api/catalog-filters (brand: '+topic+')',status:response.status,location:target.pathname+target.search+target.hash});
}
const invalid=await releaseFetch(base+'/api/catalog-filters?source=https%3A%2F%2Foutside.invalid%2F',{redirect:'manual'});
assert.equal(invalid.status,400,'Reject external filter form source');checks.push({path:'/api/catalog-filters (invalid source)',status:invalid.status});
console.log(JSON.stringify({status:'PASS',base,checks},null,2));
