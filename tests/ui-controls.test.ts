import test from 'node:test';
import assert from 'node:assert/strict';
import {selectFilterURL,clearFilterURL} from '../src/ui/filter-url';
import {LatestRequest} from '../src/ui/latest-request';
test('changing category keeps the search and chosen facets but drops stale pagination and subcategory',()=>{
 const url=selectFilterURL('https://example.test/coloring-pages/animals/pets/?q=fox&age=kids&difficulty=easy&page=3&cursor=stale&subcategory=pets&category=animals','category',['flowers']);
 assert.equal(url.pathname,'/coloring-pages/flowers/');assert.equal(url.searchParams.get('q'),'fox');assert.equal(url.searchParams.get('age'),'kids');assert.equal(url.searchParams.get('difficulty'),'easy');
 for(const key of ['page','cursor','category','subcategory'])assert.equal(url.searchParams.has(key),false);assert.equal(url.hash,'#catalog-results');
});
test('choosing all categories leaves the previous animal subroute',()=>{
 assert.equal(selectFilterURL('https://example.test/coloring-pages/animals/pets/','category',['']).pathname,'/coloring-pages/');assert.throws(()=>selectFilterURL('https://example.test/','category',['../admin']));
});
test('checkbox changes preserve other facet selections and remove duplicate values',()=>{
 const url=selectFilterURL('https://example.test/coloring-pages/animals/?q=owl&age=kids&age=adults&difficulty=detailed&page=2','age',['teens','adults','teens']);
 assert.deepEqual(url.searchParams.getAll('age'),['teens','adults']);assert.equal(url.searchParams.get('difficulty'),'detailed');assert.equal(url.searchParams.get('q'),'owl');assert.equal(url.searchParams.has('page'),false);
});
test('clear filters retains the category and search rather than losing the current search',()=>{
 const url=clearFilterURL('https://example.test/coloring-pages/animals/?q=kitten&age=kids&difficulty=easy&sort=newest&page=2');assert.equal(url.pathname,'/coloring-pages/animals/');assert.equal(url.searchParams.toString(),'q=kitten');
});
test('a slow failed preview cannot hide a newer successful preview or reset its busy state',async()=>{
 const requests=new LatestRequest(),events:string[]=[];let reject!:(e:Error)=>void;
 const old=requests.run(()=>new Promise<string>((_,r)=>reject=r),v=>events.push(v),()=>events.push('old-error'),()=>events.push('old-done'));
 await requests.run(async()=> 'new-preview',v=>events.push(v),()=>events.push('new-error'),()=>events.push('new-done'));
 reject(new Error('Late response'));await old;assert.deepEqual(events,['new-preview','new-done']);
});
test('a slow successful preview cannot replace a newer failed preview',async()=>{
 const requests=new LatestRequest(),events:string[]=[];let resolve!:(v:string)=>void;
 const old=requests.run(()=>new Promise<string>(r=>resolve=r),v=>events.push(v),()=>events.push('old-error'),()=>events.push('old-done'));
 await requests.run(async()=>{throw new Error('Latest request failed');},v=>events.push(v),()=>events.push('latest-error'),()=>events.push('latest-done'));
 resolve('old-preview');await old;assert.deepEqual(events,['latest-error','latest-done']);
});
