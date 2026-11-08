import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCatalogView} from '../src/server/catalog-view';
import type {CatalogRepository} from '../src/server/catalog';
import type {CatalogPage,CatalogQuery,Env} from '../src/server/types';
import {catalogLocation} from '../src/taxonomy/catalog-location';

const page:CatalogPage={items:[],total:0,page:1,page_size:12,total_pages:0,next_cursor:null,has_more:false};
const environment={} as Env;
function repository(overrides:Partial<CatalogRepository>={}):CatalogRepository{
 return {categories:async()=>[],categoryCover:async()=>null,categoryCovers:async()=>[],list:async()=>page,
  relatedCollections:async()=>({matches:[],topics:[],mode:'browse'}),...overrides} as CatalogRepository;
}
async function load(path:string,repo:CatalogRepository){const url=new URL(path,'https://jotcoloring.com');return loadCatalogView(environment,catalogLocation(url.pathname)!,url,repo);}

test('invalid filters return an uncacheable 400 before any catalog reads',async()=>{
 const repo=new Proxy({} as CatalogRepository,{get:()=>()=>{throw new Error('Unexpected database read');}});
 for(const path of ['/coloring-pages/veterans-day/?difficulty=invalid','/collections/ocean/?recommended_age=invalid','/coloring-pages/all/?sort=invalid']){
  const result=await load(path,repo);
  assert.equal(result.status,400,path);assert.equal(result.headers['Cache-Control'],'no-store');
  assert.ok(result.error);assert.equal(result.result.items.length,0);
 }
});

test('filtered topic loads keep their exact subject, age and difficulty scope',async()=>{
 for(const topic of ['veterans-day','chrysler','gmc']){
  let actual:CatalogQuery|undefined;
  const result=await load('/coloring-pages/'+topic+'/?recommended_age=6-8&difficulty=medium',repository({list:async q=>{actual=q;return page;}}));
  assert.equal(result.status,200);assert.equal(result.error,'');assert.deepEqual(result.headers,{});
  assert.equal(actual?.subcategory,topic);assert.equal(actual?.recommended_age,'6-8');assert.deepEqual(actual?.difficulty,['medium']);
 }
});

test('a required catalog failure returns 503 and no-store instead of a cacheable empty gallery',async()=>{
 const original=console.error;console.error=()=>{};
 try{
  const result=await load('/coloring-pages/veterans-day/?difficulty=medium',repository({
   list:async()=>{throw new Error('D1 DB overloaded');},relatedCollections:async()=>{throw new Error('Should not load recommendations');}
  }));
  assert.equal(result.status,503);assert.equal(result.headers['Cache-Control'],'no-store');assert.equal(result.headers['Retry-After'],'2');
  assert.match(result.error,/temporarily busy/);assert.doesNotMatch(result.error,/D1/);assert.equal(result.relatedCollections,undefined);
 }finally{console.error=original;}
});

test('an empty valid filter is still a successful, cacheable document',async()=>{
 const result=await load('/coloring-pages/veterans-day/?difficulty=easy',repository());
 assert.equal(result.status,200);assert.equal(result.error,'');assert.deepEqual(result.headers,{});assert.equal(result.result.total,0);
});

test('an unpublished numeral has a real uncacheable 404 while a filtered empty numeral remains 200',async()=>{
 const missing=await load('/coloring-pages/numbers/222/',repository());
 assert.equal(missing.status,404);assert.equal(missing.headers['Cache-Control'],'no-store');
 assert.equal((await load('/coloring-pages/numbers/222/?difficulty=easy',repository())).status,200);
});

test('all catalog routes finish reads and apply status before rendering their nested layout',()=>{
 for(const path of ['coloring-pages/[...category]','collections/[...category]','collection/[category]']){
  const source=readFileSync(new URL('../src/pages/'+path+'.astro',import.meta.url),'utf8');
  const frontmatter=source.split('---')[1];
  assert.match(frontmatter,/await loadCatalogView/);assert.match(frontmatter,/Astro.response.status=data.status/);
  assert.match(frontmatter,/Astro.response.headers.set\(name,value\)/);assert.match(source,/<CatalogView location=\{location\} data=\{data\}/);
 }
 const component=readFileSync(new URL('../src/components/CatalogView.astro',import.meta.url),'utf8');
 assert.doesNotMatch(component,/Astro.response.status|createCatalog\(|await repo\./);
});
