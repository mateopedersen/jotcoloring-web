/** Serial, bounded, read-only public search verification. No catalog writes. */
import assert from 'node:assert/strict';

const stage=process.argv[2];
if(!['production','staging'].includes(stage))throw new Error('Choose production or staging explicitly.');
const origin=stage==='production'?'https://jotcoloring.com':'https://staging.jotcoloring.com';
const checks=[];
async function request(path){
 const response=await fetch(origin+path,{credentials:'omit',signal:AbortSignal.timeout(45000)});
 assert.equal(response.status,200,path);
 if(process.env.GITHUB_SHA)assert.equal(response.headers.get('x-jotcoloring-commit'),process.env.GITHUB_SHA,'Expected reviewed release: '+path);
 return response;
}
async function search(query,scope={}){
 const path='/api/search?'+new URLSearchParams({q:query,limit:'5',...scope});
 const start=performance.now(),response=await request(path),data=await response.json();
 assert.ok(Array.isArray(data.items)&&data.items.length<=5,path);
 assert.equal(data.items.length,new Set(data.items.map(item=>item.id)).size,path+' duplicate drawings');
 checks.push({query,scope,total:data.total,items:data.items.length,ms:Math.round(performance.now()-start),commit:response.headers.get('x-jotcoloring-commit')});
 return data;
}
const byd=await search('byd');
assert.ok(byd.total>0&&byd.items.every(item=>item.category_ids.includes('byd')));
const dolphin=await search('byd dolphin');
assert.ok(dolphin.total>0&&dolphin.total<byd.total,'Specific model must not expand into every manufacturer drawing');
assert.ok(dolphin.items.every(item=>item.category_ids.includes('byd')&&/\bdolphin\b/i.test(item.title+' '+item.description)));
const long=await search('please help me find free printable BYD Dolphin coloring pages');
assert.equal(long.total,dolphin.total,'Long natural request retains the specific subject');
assert.equal((await search('BYD Dolphin unlikelyspaceshipword')).total,0,'Never drop a missing scene modifier');
for(const [query,ids] of [
 ['pandas',['pandas']],['tesla',['tesla']],['chrysler',['chrysler']],
 ['HUNTR/X',['huntrix']],['KPop Demon Hunters',['k-pop-demon-hunters','huntrix']]
]){
 const data=await search(query);assert.ok(data.total>0,query);
 assert.ok(data.items.every(item=>ids.some(id=>item.category_ids.includes(id))),query+' topic identity');
}
const scoped=await search('byd',{category:'cars',subcategory:'byd',difficulty:'medium'});
assert.ok(scoped.items.every(item=>item.category_ids.includes('byd')&&item.difficulty==='medium'),'Search preserves topic and difficulty filters');
for(const [query,id,path] of [
 ['byd','byd','/coloring-pages/byd/'],['pandas','pandas','/coloring-pages/pandas/'],['number 222','number-222','/coloring-pages/numbers/222/']
]){
 const response=await request('/coloring-pages/?'+new URLSearchParams({q:query})),html=await response.text();
 const links=[...html.matchAll(/<a\b[^>]*data-search-collection="([^"]+)"[^>]*>/g)].map(match=>match[0]);
 const link=links.find(value=>value.includes('data-search-collection="'+id+'"'));
 assert.ok(link?.includes('href="'+path+'"'),query+' collection navigation');
 assert.ok(html.includes('Coloring Pages Collection'),query+' explicit collection label');
 assert.ok(html.includes('data-content-id='),query+' actual gallery cards');
 checks.push({query,collection:path,htmlBytes:Buffer.byteLength(html),status:'PASS'});
}
console.log(JSON.stringify({status:'PASS',origin,scope:'Bounded public search and collection-navigation smoke check; timings include network, not a load test',checks},null,2));
