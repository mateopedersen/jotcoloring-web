import test from 'node:test';import assert from 'node:assert/strict';
import {catalogLocation} from '../src/taxonomy/catalog-location';
import {catalogParameters} from '../src/taxonomy/catalog-query';
import {parseCatalogQuery} from '../src/server/catalog';
test('later gallery batches retain the landing topic instead of trusting a mismatched requested scope',()=>{
 const params=catalogParameters(catalogLocation('/coloring-pages/cats/')!,new URLSearchParams('category=vehicles&collection=vehicles&subcategory=cars&limit=48&cursor=signed&difficulty=hard&page=99'));
 const q=parseCatalogQuery(params);assert.equal(q.category,'animals');assert.equal(q.subcategory,'cats');assert.equal(q.collection,undefined);assert.equal(q.limit,12);assert.equal(q.cursor,'signed');assert.equal(q.page,1);assert.deepEqual(q.difficulty,['hard']);
 const number=parseCatalogQuery(catalogParameters(catalogLocation('/coloring-pages/numbers/100/')!,new URLSearchParams('number=2&category=flowers')));assert.equal(number.number,'100');assert.equal(number.category,'education');assert.equal(number.subcategory,'numbers');
});
test('collection batches preserve real curated grouping and search filters',()=>{
 const q=parseCatalogQuery(catalogParameters(catalogLocation('/coloring-pages/characters/')!,new URLSearchParams('q=bluey&recommended_age=6-8&sort=newest&source=invalid')));
 assert.equal(q.collection,'characters');assert.equal(q.category,undefined);assert.equal(q.q,'bluey');assert.equal(q.recommended_age,'6-8');assert.equal(q.sort,'newest');
});
