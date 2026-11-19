import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=(p:string)=>fs.readFileSync(p,'utf8');
test('the shared page layout and policy pages render no display advertising',()=>{
 const layout=read('src/layouts/Layout.astro');
 assert.doesNotMatch(layout,/OptionalAdvertisement|data-jc-public-ad/);
 assert.doesNotMatch(read('src/components/PolicyPage.astro'),/data-banner-choice|adsterra\.com/i);
});
