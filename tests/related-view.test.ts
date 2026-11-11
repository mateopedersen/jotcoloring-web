import test from 'node:test';
import assert from 'node:assert/strict';
import {loadRelatedView} from '../src/server/related-view';
import type {Content} from '../src/server/types';
const item={id:'test',title:'Fox In A Garden',description:'A fox sits among flowers.',tags:['fox'],category:'animals',categoryName:'Animals',subcategory:'woodland'} as Content;
test('optional recommendation outages leave the original drawing usable without fabricated results',async()=>{
 const log=console.error;console.error=()=>{};
 try{
  const result=await loadRelatedView({related:async()=>{throw Error('D1 DB is overloaded');}},item);
  assert.equal(result.unavailable,true);assert.deepEqual(result.matches,[]);assert.deepEqual(result.explore,[]);assert.equal(item.id,'test');
 }finally{console.error=log;}
});
test('healthy recommendation results and their source-bound collection are preserved',async()=>{
 const result={matches:[],explore:[item],theme:'woodland',candidateCount:1};
 assert.equal(await loadRelatedView({related:async()=>result},item),result);
});
