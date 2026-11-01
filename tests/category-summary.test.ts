import test from 'node:test';
import assert from 'node:assert/strict';
import {categoryNavigationSummary} from '../src/ui/category-summary';
import {COLORING_TAXONOMY} from '../src/taxonomy/catalog';
test('every navigation brief stays compact without changing catalog descriptions',()=>{
 const before=COLORING_TAXONOMY.map(c=>c.intro);
 for(const c of COLORING_TAXONOMY){const text=categoryNavigationSummary(c);assert.ok(text.length<=54,c.id+': '+text);assert.ok(text.split(' ').length<=9,c.id);assert.ok(!text.includes('…'));}
 assert.deepEqual(COLORING_TAXONOMY.map(c=>c.intro),before);
 for(const id of ['cartoons','dolls-toys','video-games','dinosaurs','mandalas','holidays','vehicles'])assert.ok(categoryNavigationSummary({id,name:id,intro:'Long catalog text. '.repeat(20)}).length<=42);
});
test('a future long description never becomes a paragraph in the menu',()=>{
 const c={id:'new-topic',name:'Water Garden',topic:'Water Garden',intro:'A detailed category introduction. '.repeat(30)};
 assert.equal(categoryNavigationSummary(c),'Water Garden themes to explore');
 assert.equal(categoryNavigationSummary({id:'short-custom',name:'Short',intro:'Little things to color'}),'Little things to color');
});
