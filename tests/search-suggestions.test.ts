import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSuggestions} from '../src/ui/search-suggestions-model';

const categories=[{id:'animals',name:'Animals'},{id:'flowers',name:'Flowers'}];
const item=(id:string,slug:string,title:string,thumbnail='/api/media/item/catalog_thumb_bw?v=123')=>({id,slug,title,thumbnail,categoryName:'Animals'});
test('suggestions use the actual matching category and returned catalog items',()=>{
 const result=buildSuggestions('ani',[item('one','sleepy-kitten','Sleepy Kitten')],categories);
 assert.deepEqual(result.map(x=>[x.kind,x.title,x.href]),[['category','Animals','/coloring-pages/animals/'],['page','Sleepy Kitten','/coloring/sleepy-kitten/']]);
});
test('unsafe slugs, duplicate IDs and external thumbnails are not promoted as trusted links or images',()=>{
 const result=buildSuggestions('cat',[item('1','safe-cat','Safe Cat','https://outside.invalid/photo'),item('1','again','Duplicate'),item('2','../outside','Bad path')],categories);
 assert.equal(result.length,1);assert.equal(result[0].href,'/coloring/safe-cat/');assert.equal(result[0].thumbnail,undefined);
});
test('short queries do not produce suggestions and results are bounded',()=>{
 assert.deepEqual(buildSuggestions('a',[item('1','cat','Cat')],categories),[]);
 assert.equal(buildSuggestions('cat',Array.from({length:20},(_,i)=>item(String(i),`cat-${i}`,`Cat ${i}`)),categories).filter(x=>x.kind==='page').length,5);
});
