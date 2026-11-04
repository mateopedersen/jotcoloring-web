import test from 'node:test';
import assert from 'node:assert/strict';
import {productionCanonicalURL} from '../src/server/canonical-host';

test('HTTP pages and favicon share the secure JotColoring origin',()=>{
 for(const path of ['/','/favicon.png','/coloring-pages/veterans-day/?difficulty=medium']){
  assert.equal(productionCanonicalURL(new URL('http://jotcoloring.com'+path),'production')?.href,'https://jotcoloring.com'+path);
 }
});
test('www and HTTP combine into one redirect while preserving the exact path and query',()=>{
 const original=new URL('http://www.jotcoloring.com/coloring-pages/numbers/222/?q=pet%20cat&difficulty=hard#catalog-results');
 assert.equal(productionCanonicalURL(original,'production')?.href,'https://jotcoloring.com/coloring-pages/numbers/222/?q=pet%20cat&difficulty=hard#catalog-results');
 assert.equal(original.hostname,'www.jotcoloring.com');
 assert.equal(productionCanonicalURL(new URL('https://www.jotcoloring.com/favicon.ico'),'production')?.href,'https://jotcoloring.com/favicon.ico');
});
test('canonical HTTPS requests never redirect themselves',()=>{
 assert.equal(productionCanonicalURL(new URL('https://jotcoloring.com/coloring-pages/'),'production'),undefined);
});
test('staging, local servers, asset domains and unrelated hosts are untouched',()=>{
 for(const [url,stage] of [['http://jotcoloring.com/','staging'],['http://127.0.0.1:4327/','production'],['https://staging.jotcoloring.com/','production'],['https://assets.jotcoloring.com/','production'],['http://www.jotcoloring.com.invalid/','production'],['http://jotcoloring.com/',undefined]] as const){
  assert.equal(productionCanonicalURL(new URL(url),stage),undefined);
 }
});
