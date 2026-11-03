import test from 'node:test';import assert from 'node:assert/strict';import {streamQuery} from '../src/taxonomy/stream-query';
test('automatic continuation cannot leak into a different number series or age band',()=>{
 const number=streamQuery('/coloring-pages/numbers/222/',new URLSearchParams('number=1001&category=animals&limit=48&cursor=signed&page=8'));
 assert.equal(number.params.get('number'),'222');assert.equal(number.params.get('category'),'education');assert.equal(number.params.get('limit'),'12');assert.equal(number.params.has('page'),false);
 const age=streamQuery('/coloring-by-age/6-8/',new URLSearchParams('recommended_age=adults&cursor=signed&page=3'));
 assert.equal(age.params.get('recommended_age'),'6-8');assert.equal(age.params.has('page'),false);
 for(const source of ['/api/admin/','https://elsewhere.test/','/coloring-by-age/unknown/','/coloring-pages/numbers/99999999/'])assert.throws(()=>streamQuery(source,new URLSearchParams()));
});
