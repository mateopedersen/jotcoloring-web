import test from 'node:test';
import assert from 'node:assert/strict';
import {categoryPresentation} from '../src/icons/category';
import {ROOT_CATEGORIES} from '../src/taxonomy/catalog';
import {hasIllustration} from '../src/icons/registry';

test('category labels have distinct, registered artwork for every root collection',()=>{
 const entries=ROOT_CATEGORIES.map(c=>categoryPresentation(c.id));
 assert.equal(new Set(entries.map(e=>e.icon)).size,ROOT_CATEGORIES.length);
 assert.ok(entries.every(e=>hasIllustration(e.icon)));
});
test('imported category IDs and aliases resolve to the same image and destination',()=>{
 assert.deepEqual(categoryPresentation('Farm Animals'),categoryPresentation('farm-animals'));
 assert.equal(categoryPresentation('cats').icon,'cats');
 assert.equal(categoryPresentation('fantasy').icon,'fantasy');
 assert.equal(categoryPresentation('animals','Fantasy').label,'Animals');
});
test('new content needs category metadata rather than item-specific icon assignments',()=>{
 for(const name of ['Animals','Fantasy','Flowers','Robots']){
  const entry=categoryPresentation('',name);
  assert.equal(entry.label,name);
  assert.notEqual(entry.icon,'share');
  assert.ok(entry.href.startsWith('/coloring-pages/'));
 }
});
test('unknown categories use a neutral collection symbol instead of an unrelated animal',()=>{
 assert.deepEqual(categoryPresentation('a-new-collection','New Collection'),{id:'a-new-collection',label:'New Collection',icon:'all',href:'/coloring-pages/'});
});
