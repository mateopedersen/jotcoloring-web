import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withPublicCache,publicCachePolicy,publicCacheKey,type ResponseCache} from '../src/server/public-cache';
import type {Env} from '../src/server/types';

function fixture(){
 let epoch=1,originCalls=0;const entries=new Map<string,Response>(),pending:Promise<unknown>[]=[];
 const cache:ResponseCache={async match(k){return entries.get(k.url)?.clone()},async put(k,r){entries.set(k.url,r)}};
 const env={APP_ENV:'staging',PUBLIC_SITE_URL:'https://staging.jotcoloring.com',CATALOG_DB:{prepare(){return{async first(){return{seq:epoch}}}}}} as unknown as Env;
 const next=async()=>{originCalls++;return new Response('published revision '+epoch,{headers:{'Content-Type':'text/html',ETag:'"revision-'+epoch+'"'}})};
 const run=(request=new Request(env.PUBLIC_SITE_URL+'/coloring/fox/'),handler=next)=>withPublicCache(request,env,'release-one',handler,cache,p=>pending.push(p));
 return{env,cache,entries,pending,run,get calls(){return originCalls},advance(){epoch++}};
}
test('public edge cache reuses published HTML and a publication epoch invalidates it immediately',async()=>{
 const f=fixture(),first=await f.run();assert.equal(first.headers.get('X-JotColoring-Cache'),'MISS');assert.equal(await first.text(),'published revision 1');await Promise.all(f.pending);
 const hit=await f.run();assert.equal(hit.headers.get('X-JotColoring-Cache'),'HIT');assert.equal(f.calls,1);assert.match(hit.headers.get('Cache-Control')!,/max-age=0/);
 f.advance();const changed=await f.run();assert.equal(changed.headers.get('X-JotColoring-Cache'),'MISS');assert.equal(await changed.text(),'published revision 2');assert.equal(f.calls,2);
});
test('only published route families qualify; private tools, writes, cookies and authorization bypass',()=>{
 for(const path of ['/studio/','/studio/private/download/','/create/photo/','/my-artwork/','/admin/','/api/creator/jobs','/api/session','/api/admin/content','/unrecognized/','/?private=1'])assert.equal(publicCachePolicy(new Request('https://jot.test'+path)),undefined,path);
 for(const options of [{method:'POST'},{headers:{Authorization:'Bearer private'}},{headers:{Cookie:'session=private'}},{headers:{'cf-access-jwt-assertion':'private'}},{headers:{Range:'bytes=1-2'}}] as RequestInit[])assert.equal(publicCachePolicy(new Request('https://jot.test/',options)),undefined);
 for(const path of ['/','/about/','/coloring-pages/animals/farm-animals/','/coloring-by-age/6-8/','/api/catalog?q=fox','/api/media/content-one/catalog_thumb_bw?v='+'a'.repeat(24)])assert.ok(publicCachePolicy(new Request('https://jot.test'+path)),path);
 assert.equal(publicCachePolicy(new Request('https://jot.test/api/media/content-one/catalog_thumb_bw')),undefined);
});
test('cache keys separate release, country, environment and query while HEAD shares GET storage',()=>{
 const request=new Request('https://jot.test/?sort=newest&q=fox');Object.assign(request,{cf:{country:'US'}});
 const key=publicCacheKey(request,'production','a','1').url;
 assert.equal(key,publicCacheKey(Object.assign(new Request('https://jot.test/?q=fox&sort=newest',{method:'HEAD'}),{cf:{country:'US'}}),'production','a','1').url);
 assert.notEqual(key,publicCacheKey(request,'production','b','1').url);assert.notEqual(key,publicCacheKey(request,'staging','a','1').url);
 assert.notEqual(key,publicCacheKey(Object.assign(new Request(request.url),{cf:{country:'TR'}}),'production','a','1').url);
});
test('HEAD hits have no body and ETag hits return 304 without rendering',async()=>{
 const f=fixture();await f.run();await Promise.all(f.pending);
 const head=await f.run(new Request(f.env.PUBLIC_SITE_URL+'/coloring/fox/',{method:'HEAD'}));assert.equal(head.status,200);assert.equal(await head.text(),'');assert.equal(f.calls,1);
 const notModified=await f.run(new Request(f.env.PUBLIC_SITE_URL+'/coloring/fox/',{headers:{'If-None-Match':'"revision-1"'}}));assert.equal(notModified.status,304);assert.equal(await notModified.text(),'');assert.equal(f.calls,1);
});
test('errors, private responses, Set-Cookie and mismatched origins are never stored',async()=>{
 for(const response of [new Response('not found',{status:404}),new Response('private',{headers:{'Content-Type':'text/html','Cache-Control':'private'}}),new Response('session',{headers:{'Content-Type':'text/html','Set-Cookie':'x=y'}}),new Response('wrong MIME',{headers:{'Content-Type':'application/json'}})]){
  const f=fixture();await f.run(undefined,async()=>response);await Promise.all(f.pending);assert.equal(f.entries.size,0);
 }
 const f=fixture();await f.run(new Request('https://another.test/coloring/fox/'));assert.equal(f.entries.size,0);
});
test('cache and epoch lookup failures fail open without retrying the application',async()=>{
 const f=fixture();f.cache.match=async()=>{throw Error('cache unavailable')};f.cache.put=async()=>{throw Error('write unavailable')};assert.equal((await f.run()).status,200);await Promise.all(f.pending);assert.equal(f.calls,1);
 f.env.CATALOG_DB={prepare(){throw Error('DB unavailable')}} as never;assert.equal((await f.run()).status,200);assert.equal(f.calls,2);
});
