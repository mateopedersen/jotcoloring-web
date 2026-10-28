import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectScripts} from '../scripts/ops/script-policy';
const origin='https://staging.jotcoloring.com';
test('self CSP rejects Astro-inlined executable modules but accepts JSON data',()=>{
  assert.equal(inspectScripts('<script type="module">document.body.dataset.ready="yes"</script>',origin).status,'FAIL');
  const okay=inspectScripts('<script type="application/ld+json">{"name":"A"}</script><script type="application/json">{"settings":1}</script><script type="module" src="/_astro/catalog.js"></script>',origin);
  assert.equal(okay.status,'PASS');assert.equal(okay.data_scripts,2);assert.deepEqual(okay.same_origin_modules,['/_astro/catalog.js']);
});
test('external application modules rejected; narrowly identified injected analytics excluded',()=>{
  assert.equal(inspectScripts('<script type="module" src="https://other.example/app.js"></script>',origin).status,'FAIL');
  assert.equal(inspectScripts('<script src="//other.example/app.js"></script>',origin).status,'FAIL');
  assert.equal(inspectScripts('<script src="https://static.cloudflareinsights.com/beacon.min.js/abc"></script>',origin).status,'PASS');
  assert.equal(inspectScripts('<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js"></script>',origin).status,'FAIL');
  assert.equal(inspectScripts('<script src="data:text/javascript,alert(1)"></script>',origin).status,'FAIL');
});
