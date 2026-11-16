import test from 'node:test';
import assert from 'node:assert/strict';
import {jotContentSecurityPolicy} from '../src/advertising/csp';
import {ADVERTISING_PROVIDER_ORIGIN} from '../src/advertising/units';
test('ad host permissions cannot escape the clean adult collection route',()=>{
 for(const path of ['/','/coloring-by-age/3-5/','/coloring-pages/bluey/','/coloring/real-art/','/download/real-art/','/studio/','/create/','/licensing/','/contact/','/coloring-by-age/adults/?q=private'])assert.ok(!jotContentSecurityPolicy(new URL(path,'https://jotcoloring.com')).includes(ADVERTISING_PROVIDER_ORIGIN),path);
 const policy=jotContentSecurityPolicy(new URL('https://jotcoloring.com/coloring-by-age/adults/'));
 for(const directive of ['script-src','connect-src','img-src','frame-src'])assert.ok(policy.split(';').find(p=>p.trim().startsWith(directive+' '))?.includes(ADVERTISING_PROVIDER_ORIGIN));
 assert.doesNotMatch(policy,/script-src[^;]*(?:'unsafe-inline'|'unsafe-eval'|https:\s|\*)/);
 assert.ok(policy.includes("frame-ancestors 'none'"));
 assert.ok(policy.includes("form-action 'self'"));
});
