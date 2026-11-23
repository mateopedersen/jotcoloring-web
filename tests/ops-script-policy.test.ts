import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectScripts} from '../scripts/ops/script-policy';
import {decodeMarkup} from '../scripts/ops/decode-markup';
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

test('policy follows browser parsing for script elements and their attributes',()=>{
  const result = inspectScripts([
    '<!-- <script>commented out</script> -->',
    '<template><script>inert script</script></template>',
    '<script type="text/javascript1.5">console.log("ready")</script >',
    '<script data-note="1 > 0" type="module" src="/catalog.js?a=1&amp;b=2"></script>',
  ].join(''),origin);
  assert.equal(result.inline_executable,1);
  assert.deepEqual(result.same_origin_modules,['/catalog.js?a=1&b=2']);
});

test('release checks decode named entities once',()=>{
  assert.equal(decodeMarkup('A &amp; B &amp;lt; C &#39;D&#39;'), "A & B &lt; C 'D'");
});
