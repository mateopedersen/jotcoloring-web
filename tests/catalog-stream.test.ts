import test from 'node:test';import assert from 'node:assert/strict';
import {catalogLocation} from '../src/taxonomy/catalog-location';
import {catalogParameters} from '../src/taxonomy/catalog-query';
import {parseCatalogQuery} from '../src/server/catalog';
import {mountCatalogStream} from '../src/ui/catalog-stream';
test('later gallery batches retain the landing topic instead of trusting a mismatched requested scope',()=>{
 const params=catalogParameters(catalogLocation('/coloring-pages/cats/')!,new URLSearchParams('category=vehicles&collection=vehicles&subcategory=cars&limit=48&cursor=signed&difficulty=hard&page=99'));
 const q=parseCatalogQuery(params);assert.equal(q.category,'animals');assert.equal(q.subcategory,'cats');assert.equal(q.collection,undefined);assert.equal(q.limit,12);assert.equal(q.cursor,'signed');assert.equal(q.page,1);assert.deepEqual(q.difficulty,['hard']);
 const number=parseCatalogQuery(catalogParameters(catalogLocation('/coloring-pages/numbers/100/')!,new URLSearchParams('number=2&category=flowers')));assert.equal(number.number,'100');assert.equal(number.category,'education');assert.equal(number.subcategory,'numbers');
});
test('collection batches preserve real curated grouping and search filters',()=>{
 const q=parseCatalogQuery(catalogParameters(catalogLocation('/coloring-pages/characters/')!,new URLSearchParams('q=bluey&recommended_age=6-8&sort=newest&source=invalid')));
 assert.equal(q.collection,'characters');assert.equal(q.category,undefined);assert.equal(q.q,'bluey');assert.equal(q.recommended_age,'6-8');assert.equal(q.sort,'newest');
});

test('an incomplete row on a five-column desktop does not request batches until the reader approaches',()=>{
 let nextTop=4000,scheduled=0;
 const listeners=new Map<string,()=>void>();
 const sentinel={dataset:{source:'/coloring-pages/pandas/',total:'52',nextCursor:'cursor'},querySelector:()=>({addEventListener(){}}),getBoundingClientRect:()=>({top:nextTop})};
 const grid={getBoundingClientRect:()=>({bottom:nextTop}),querySelectorAll:()=>Array.from({length:12},(_,i)=>({dataset:{contentId:String(i)}}))};
 const globals={
  document:{visibilityState:'visible',querySelector:(selector:string)=>selector==='[data-catalog-stream]'?sentinel:grid,addEventListener(){}},
  window:{addEventListener:(event:string,callback:()=>void)=>listeners.set(event,callback)},
  scrollY:0,innerHeight:900,getComputedStyle:()=>({gridTemplateColumns:'200px 200px 200px 200px 200px'}),
  setTimeout:()=>++scheduled
 };
 const originals=Object.getOwnPropertyDescriptors(globalThis);
 try{
  for(const [name,value] of Object.entries(globals))Object.defineProperty(globalThis,name,{value,configurable:true,writable:true});
  mountCatalogStream();assert.equal(scheduled,0,'a far-away incomplete row must not trigger an eager request');
  nextTop=1700;listeners.get('resize')!();assert.equal(scheduled,0,'initial images must not compete with another offscreen batch');
  globalThis.scrollY=200;listeners.get('scroll')!();assert.equal(scheduled,1,'approaching the next group must schedule one request');
  listeners.get('scroll')!();assert.equal(scheduled,1,'a scheduled batch must not be duplicated');
 }finally{
  for(const name of Object.keys(globals)){if(originals[name])Object.defineProperty(globalThis,name,originals[name]);else Reflect.deleteProperty(globalThis,name);}
 }
});
