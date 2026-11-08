import test from 'node:test';
import assert from 'node:assert/strict';
import {COLORING_TAXONOMY,categoryPath} from '../src/taxonomy/catalog';
import {NAVIGATION_COLLECTIONS,collectionForRoot} from '../src/taxonomy/navigation';
import {catalogFilterOptions} from '../src/taxonomy/catalog-filter-options';
import {catalogLocation} from '../src/taxonomy/catalog-location';
import {catalogParameters} from '../src/taxonomy/catalog-query';
import {parseCatalogQuery} from '../src/server/catalog';
import {catalogFilterFormURL,selectFilterURL} from '../src/ui/filter-url';
import {AGE_BANDS} from '../src/age/model';
import {GET} from '../src/pages/api/catalog-filters';

test('every registered topic has exactly one selected option, even before counts refresh',()=>{
 for(const counts of [[],COLORING_TAXONOMY.map(t=>({id:t.id,count:1}))]){
  for(const topic of COLORING_TAXONOMY){
   const location=catalogLocation(categoryPath(topic.id))!;
   const query=parseCatalogQuery(catalogParameters(location,new URLSearchParams()));
   const model=catalogFilterOptions(query,topic.id,counts);
   const options=model.groups.flatMap(group=>[group.id,...group.topics.map(t=>t.value)]);
   assert.equal(options.filter(value=>value===model.selectedCategory).length,1,topic.id);
   if(topic.parent){
    const group=model.groups.find(g=>g.topics.some(t=>t.id===topic.id));
    assert.equal(group?.id,collectionForRoot(topic.id)?.id,topic.id+' ancestor group');
   }
  }
 }
});

test('age, difficulty, search and sorting preserve every topic rather than broadening to all pages',()=>{
 for(const topic of COLORING_TAXONOMY){
  const path=categoryPath(topic.id),location=catalogLocation(path)!;
  const query=parseCatalogQuery(catalogParameters(location,new URLSearchParams()));
  const {selectedCategory}=catalogFilterOptions(query,topic.id,[]);
  for(const difficulty of ['','easy','medium','hard','very-hard']){
   const fields=new URLSearchParams({category:selectedCategory,initial_category:selectedCategory,
    recommended_age:'3-5',difficulty,sort:'newest',q:'outline'});
   const url=catalogFilterFormURL('https://example.test'+path+'?page=2&cursor=old',fields);
   assert.equal(url.pathname,path,topic.id+' '+difficulty);
   const filtered=parseCatalogQuery(catalogParameters(catalogLocation(url.pathname)!,url.searchParams));
   assert.equal(filtered.category,query.category,topic.id);
   assert.equal(filtered.subcategory,query.subcategory,topic.id);
   assert.equal(filtered.collection,query.collection,topic.id);
   assert.equal(filtered.recommended_age,'3-5');
   assert.deepEqual(filtered.difficulty,difficulty?[difficulty]:[]);
   assert.equal(filtered.q,'outline');assert.equal(filtered.sort,'newest');
   assert.equal(url.searchParams.has('cursor'),false);assert.equal(url.searchParams.has('page'),false);
  }
 }
});

test('third-level car brands remain selectable on age pages and ordinary topic galleries',()=>{
 for(const topic of ['chrysler','gmc']){
  const selection='cars/'+topic;
  const url=selectFilterURL('https://example.test/coloring-by-age/3-5/?difficulty=easy','category',[selection]);
  assert.equal(url.pathname,'/coloring-by-age/3-5/');
  assert.equal(url.searchParams.get('category'),'cars');assert.equal(url.searchParams.get('subcategory'),topic);
  const query=parseCatalogQuery(url.searchParams),model=catalogFilterOptions(query,topic,[]);
  assert.equal(model.selectedCategory,selection);
  assert.ok(model.groups.find(g=>g.id==='vehicles')?.topics.some(t=>t.value===selection));
  assert.equal(selectFilterURL('https://example.test/coloring-pages/all/','category',[selection]).pathname,
   '/coloring-pages/'+topic+'/all/');
 }
});

test('native GET filtering retains brands, numeral series and collection scopes',async()=>{
 for(const path of ['/coloring-pages/chrysler/','/coloring-pages/gmc/','/coloring-pages/numbers/222/',
  ...NAVIGATION_COLLECTIONS.map(c=>'/collections/'+c.id+'/')]){
  const location=catalogLocation(path)!;
  const query=parseCatalogQuery(catalogParameters(location,new URLSearchParams()));
  const {selectedCategory}=catalogFilterOptions(query,query.subcategory||query.category||'',[]);
  const fields=new URLSearchParams({source:path,initial_category:selectedCategory,category:selectedCategory,
   recommended_age:'6-8',difficulty:'medium',sort:'title',q:'outline'});
  const response=await GET({url:new URL('https://example.test/api/catalog-filters?'+fields)} as Parameters<typeof GET>[0]);
  assert.equal(response.status,303,path);
  const target=new URL(response.headers.get('location')!,'https://example.test');
  assert.equal(target.pathname,path);assert.equal(target.searchParams.get('recommended_age'),'6-8');
  assert.equal(target.searchParams.get('difficulty'),'medium');assert.equal(target.hash,'#catalog-results');
 }
});

test('age and detail shortcuts stay inside a topic and retain the other filters',()=>{
 for(const path of ['/coloring-pages/chrysler/','/coloring-pages/gmc/','/coloring-pages/numbers/222/']){
  for(const band of AGE_BANDS){
   const age=selectFilterURL('https://example.test'+path+'?difficulty=hard&q=outline&cursor=old','recommended_age',[band.id]);
   assert.equal(age.pathname,path);assert.equal(age.searchParams.get('difficulty'),'hard');
   const level=selectFilterURL(age.href,'difficulty',['easy']);
   assert.equal(level.pathname,path);assert.equal(level.searchParams.get('recommended_age'),band.id);
   assert.equal(level.searchParams.get('q'),'outline');assert.equal(level.searchParams.has('cursor'),false);
  }
 }
});
