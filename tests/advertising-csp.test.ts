import test from 'node:test';
import assert from 'node:assert/strict';
import {jotContentSecurityPolicy} from '../src/advertising/csp';
import {ADVERTISING_PROVIDER_ORIGIN} from '../src/advertising/units';
const directive=(policy:string,name:string)=>policy.split(';').find(part=>part.trim().startsWith(name+' '))?.trim();
test('ad host permissions cannot escape the clean adult collection route',()=>{
 for(const path of ['/','/coloring-by-age/3-5/','/coloring-pages/bluey/','/coloring/real-art/','/download/real-art/','/studio/','/create/','/licensing/','/contact/','/privacy/','/cookies/','/coloring-by-age/adults/?q=private','/coloring-by-age/adults/?utm_source=test','/coloring-by-age/adults/?date=2026-11-16','/coloring-by-age/adults/#private','/coloring-by-age/adults','/coloring-by-age/adults/other/']){
  const policy=jotContentSecurityPolicy(new URL(path,'https://jotcoloring.com'),true);
  assert.ok(!policy.includes(ADVERTISING_PROVIDER_ORIGIN),path);
  assert.ok(!directive(policy,'script-src')?.includes("'unsafe-inline'"),path);
  assert.ok(!policy.includes('static.nresystems.com'),path);
  assert.ok(!policy.includes('cdn.storageimagedisplay.com'),path);
  assert.equal(directive(policy,'script-src-attr'),"script-src-attr 'none'",path);
 }
 const policy=jotContentSecurityPolicy(new URL('https://jotcoloring.com/coloring-by-age/adults/'),true);
 for(const name of ['script-src','connect-src','img-src','frame-src'])assert.ok(directive(policy,name)?.includes(ADVERTISING_PROVIDER_ORIGIN));
 assert.ok(directive(policy,'script-src')?.includes("'unsafe-inline'"));
 assert.doesNotMatch(directive(policy,'script-src')||'',/'unsafe-eval'|https:\s|\*/);
 assert.equal(directive(policy,'script-src-attr'),"script-src-attr 'none'");
 assert.ok(directive(policy,'img-src')?.includes('https://static.nresystems.com'));
 assert.ok(directive(policy,'img-src')?.includes('https://cdn.storageimagedisplay.com'));
 for(const name of ['script-src','connect-src','frame-src']){
  assert.ok(!directive(policy,name)?.includes('static.nresystems.com'));
  assert.ok(!directive(policy,name)?.includes('cdn.storageimagedisplay.com'));
 }
 assert.ok(policy.includes("frame-ancestors 'none'"));
 assert.ok(policy.includes("form-action 'self'"));
 assert.ok(policy.includes("base-uri 'self'"));
 assert.ok(policy.includes("object-src 'none'"));
});

test('explicit delivery hold grants no provider origins or inline creative exception',()=>{
 for(const path of ['/coloring-by-age/adults/','/coloring-by-age/adults/?q=private','/coloring-by-age/3-5/','/contact/','/privacy/','/cookies/','/']){
  const policy=jotContentSecurityPolicy(new URL(path,'https://jotcoloring.com'),false);
  for(const origin of [ADVERTISING_PROVIDER_ORIGIN,'https://static.nresystems.com','https://cdn.storageimagedisplay.com'])assert.ok(!policy.includes(origin),path);
  assert.ok(!directive(policy,'script-src')?.includes("'unsafe-inline'"),path);
  assert.equal(directive(policy,'script-src-attr'),"script-src-attr 'none'",path);
 }
});

test('production CSP grants provider access only on the approved clean adult page',()=>{
 for(const path of ['/coloring-by-age/adults/','/coloring-by-age/adults/?q=private','/coloring-by-age/3-5/','/contact/','/privacy/','/cookies/','/']){
  const policy=jotContentSecurityPolicy(new URL(path,'https://jotcoloring.com'));
  const eligible=path==='/coloring-by-age/adults/';
  assert.equal(policy.includes(ADVERTISING_PROVIDER_ORIGIN),eligible,path);
  assert.equal(directive(policy,'script-src')?.includes("'unsafe-inline'"),eligible,path);
  assert.equal(directive(policy,'script-src-attr'),"script-src-attr 'none'",path);
 }
});
