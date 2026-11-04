import test from 'node:test';
import assert from 'node:assert/strict';
import {selectFilterURL,clearFilterURL,catalogFilterFormURL} from '../src/ui/filter-url';
import {LatestRequest} from '../src/ui/latest-request';
test('age-collection selectors navigate to the selected band and preserve search and difficulty',()=>{
 const url=selectFilterURL('https://example.test/coloring-by-age/9-12/?q=fox&difficulty=easy&page=3','recommended_age',['adults']);
 assert.equal(url.pathname,'/coloring-by-age/adults/');assert.equal(url.searchParams.get('q'),'fox');assert.equal(url.searchParams.get('difficulty'),'easy');assert.equal(url.searchParams.has('page'),false);assert.equal(url.hash,'#age-results');
 const all=selectFilterURL(url.href,'recommended_age',['']);assert.equal(all.pathname,'/coloring-pages/');assert.equal(all.searchParams.has('recommended_age'),false);
 const category=selectFilterURL(url.href,'category',['nature']);assert.equal(category.pathname,'/coloring-by-age/adults/');assert.equal(category.searchParams.get('collection'),'nature');assert.equal(category.hash,'#age-results');
});
test('age pages keep their age while selecting a specific subject and while clearing it',()=>{
 const url=selectFilterURL('https://example.test/coloring-by-age/6-8/?difficulty=medium&q=kitten&cursor=old','category',['animals/cats']);
 assert.equal(url.pathname,'/coloring-by-age/6-8/');assert.equal(url.searchParams.get('category'),'animals');assert.equal(url.searchParams.get('subcategory'),'cats');assert.equal(url.searchParams.get('q'),'kitten');assert.equal(url.searchParams.get('difficulty'),'medium');assert.equal(url.searchParams.has('cursor'),false);
 const all=selectFilterURL(url.href,'category',['']);assert.equal(all.pathname,url.pathname);assert.equal(all.searchParams.has('category'),false);assert.equal(all.searchParams.has('subcategory'),false);
 const anyAge=selectFilterURL(url.href,'recommended_age',['']);assert.equal(anyAge.pathname,'/coloring-pages/cats/');assert.equal(anyAge.searchParams.has('category'),false);assert.equal(anyAge.searchParams.get('q'),'kitten');
});
test('filter form search keeps a selected detail level and the current numeral topic',()=>{
 const fields=new URLSearchParams({category:'number-222',initial_category:'number-222',recommended_age:'',difficulty:'very-hard',sort:'title',q:'  floating   island '});
 const url=catalogFilterFormURL('https://example.test/coloring-pages/numbers/222/?difficulty=hard&page=3&cursor=old',fields);
 assert.equal(url.pathname,'/coloring-pages/numbers/222/');assert.equal(url.searchParams.get('difficulty'),'very-hard');assert.equal(url.searchParams.get('q'),'floating island');assert.equal(url.searchParams.get('sort'),'title');assert.equal(url.searchParams.has('page'),false);assert.equal(url.searchParams.has('cursor'),false);
});
test('changing a subject applies the text currently typed into the shared form',()=>{
 const fields=new URLSearchParams({category:'animals/cats',initial_category:'',recommended_age:'6-8',difficulty:'easy',sort:'newest',q:'sleeping kitten'});
 const age=catalogFilterFormURL('https://example.test/coloring-by-age/6-8/',fields);
 assert.equal(age.pathname,'/coloring-by-age/6-8/');assert.equal(age.searchParams.get('subcategory'),'cats');assert.equal(age.searchParams.get('q'),'sleeping kitten');assert.equal(age.searchParams.get('difficulty'),'easy');
 const all=catalogFilterFormURL('https://example.test/coloring-pages/?difficulty=easy',fields);
 assert.equal(all.pathname,'/coloring-pages/cats/');assert.equal(all.searchParams.get('recommended_age'),'6-8');assert.equal(all.searchParams.get('q'),'sleeping kitten');
 assert.throws(()=>catalogFilterFormURL('https://example.test/admin/',fields));
 assert.throws(()=>selectFilterURL(age.href,'category',['../../admin']));
});
test('changing category keeps the search and chosen facets but drops stale pagination and subcategory',()=>{
 const url=selectFilterURL('https://example.test/coloring-pages/animals/pets/?q=fox&age=kids&difficulty=easy&page=3&cursor=stale&subcategory=pets&category=animals','category',['flowers']);
 assert.equal(url.pathname,'/collections/flowers/');assert.equal(url.searchParams.get('q'),'fox');assert.equal(url.searchParams.get('age'),'kids');assert.equal(url.searchParams.get('difficulty'),'easy');
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
