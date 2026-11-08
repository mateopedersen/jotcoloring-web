import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {SEARCH_COLLECTION_OPTIONS} from '../src/search/collection-options';
import {matchingSearchCollections,parseSearchCollectionOptions,searchCollectionHref} from '../src/search/collection-matches';
import {categoryPath,COLORING_TAXONOMY} from '../src/taxonomy/catalog';
import {buildSuggestions} from '../src/ui/search-suggestions-model';
import {intentWords} from '../src/search/intent';

test('every registered topic and numeral stays discoverable after the old 200-option boundary',()=>{
 const options=parseSearchCollectionOptions(SEARCH_COLLECTION_OPTIONS);
 assert.ok(options.length>200);assert.equal(options.length,SEARCH_COLLECTION_OPTIONS.length);
 for(const topic of COLORING_TAXONOMY){
  const found=matchingSearchCollections(topic.name,options);
  assert.ok(found.some(option=>searchCollectionHref(option)===categoryPath(topic.id)),topic.id);
 }
 for(const id of ['byd','tesla','chrysler','gmc','bmw','pandas','letter-a']){
  const option=options.find(c=>c.id===id)!;assert.ok(option,id);
  assert.equal(buildSuggestions(option.name,[],options)[0].href,option.href,id);
 }
 for(const text of ['222','number 1001'])assert.ok(matchingSearchCollections(text,options).some(c=>c.href?.includes('/coloring-pages/numbers/')));
 assert.deepEqual(matchingSearchCollections('number 222',options).map(c=>c.id),['number-222']);
 assert.deepEqual(matchingSearchCollections('pandas',options).map(c=>c.id),['pandas']);
});

test('short prefixes, branded model queries and long natural requests expose the proper collection',()=>{
 const options=parseSearchCollectionOptions(SEARCH_COLLECTION_OPTIONS);
 for(const [query,id] of [['byd','byd'],['BYD Dolphin rear view','byd'],['Please help me find free printable BYD Dolphin coloring pages for kids','byd'],['chrys','chrysler'],['mercedes benz','mercedes-benz'],['HUNTR/X','huntrix'],['kpop rumi stage','k-pop-demon-hunters'],['HUNTR/X Rumi stage','huntrix'],['disney descendants','descendants'],['number one thousand one','1001']]){
  const matches=matchingSearchCollections(query,options);
  if(id==='1001')assert.ok(matches.some(c=>c.href==='/coloring-pages/numbers/1001/'),query);
  else assert.equal(matches[0]?.id,id,query);
 }
 assert.deepEqual(matchingSearchCollections('zzunknownnomatch',options),[]);
 assert.deepEqual(intentWords('please help me find a free printable drawing of a BYD Dolphin with the rear view'),['byd','dolphin','rear','view']);
 assert.deepEqual(intentWords('letter a coloring pages'),['letter','a']);
 assert.deepEqual(intentWords('please I would like a free printable panda eating bamboo'),['panda','eating','bamboo']);
});

test('future topics beyond a thousand entries need no larger hand-maintained client limit',()=>{
 const options=parseSearchCollectionOptions(Array.from({length:1200},(_,i)=>({id:'future-'+i,name:'Future Theme '+i,href:'/coloring-pages/future-'+i+'/'})));
 assert.equal(options.length,1200);
 assert.equal(matchingSearchCollections('Future Theme 1199',options)[0].id,'future-1199');
 assert.deepEqual(parseSearchCollectionOptions([{id:'bad',name:'Bad',href:'https://outside.invalid/'}]),[]);
});

test('collection lookup stays in memory and is reused across rapid searches',()=>{
 const options=parseSearchCollectionOptions(SEARCH_COLLECTION_OPTIONS);
 matchingSearchCollections('byd',options);
 const start=performance.now();
 for(let i=0;i<400;i++)matchingSearchCollections(['byd','panda bamboo','bmw','number 222'][i%4],options);
 assert.ok(performance.now()-start<2000,'400 warm lookups should not scan artwork or make database/network calls');
});

test('all shared forms keep immediate collection links while drawing requests are in flight or fail',()=>{
 const client=readFileSync(new URL('../src/ui/search-suggestions.ts',import.meta.url),'utf8');
 assert.match(client,/parseSearchCollectionOptions/);assert.doesNotMatch(client,/slice\(0,200\)/);
 assert.ok(client.indexOf('if(collections.length)show(collections,query)')<client.indexOf('timer=setTimeout'));
 assert.match(client,/show\(collections,query,true\)/);
 assert.match(client,/addEventListener\('pageshow',event=>\{if\(event.persisted\)close\(\)/,'initial page load must not close a search already in use');
 const component=readFileSync(new URL('../src/components/CatalogView.astro',import.meta.url),'utf8');
 assert.match(component,/<SearchCollections query=/);
});
