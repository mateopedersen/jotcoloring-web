import test from 'node:test';
import assert from 'node:assert/strict';
import {readOnlyFetch} from '../scripts/qa/read-only-fetch.mjs';
import {transientDeploymentReadback} from '../scripts/ops/worker-version-release';

test('a transient connection failure retries the same read with a fresh timeout',async()=>{
  const calls:RequestInit[]=[],pauses:number[]=[];
  const response=await readOnlyFetch('https://example.test/file',{method:'HEAD',redirect:'manual',headers:{Origin:'https://jotcoloring.com'}},{
    fetchImpl:async(url:unknown,options:RequestInit)=>{
      assert.equal(url,'https://example.test/file');calls.push(options);
      if(calls.length===1)throw new TypeError('fetch failed',{cause:{code:'UND_ERR_CONNECT_TIMEOUT'}});
      return new Response(null,{status:200});
    },wait:async(ms:number)=>{pauses.push(ms);}
  });
  assert.equal(response.status,200);assert.equal(calls.length,2);assert.deepEqual(pauses,[1000]);
  assert.notEqual(calls[0].signal,calls[1].signal);assert.equal(calls[1].redirect,'manual');
  assert.deepEqual(calls[1].headers,{Origin:'https://jotcoloring.com'});
});

test('transient HTTP failures stop after three reads and return the real failure',async()=>{
  let calls=0;const pauses:number[]=[];
  const response=await readOnlyFetch('https://example.test/file',{}, {
    fetchImpl:async()=>{calls++;return new Response('unavailable',{status:503});},
    wait:async(ms:number)=>{pauses.push(ms);}
  });
  assert.equal(calls,3);assert.deepEqual(pauses,[1000,4000]);assert.equal(response.status,503);
  assert.equal(await response.text(),'unavailable');
});

test('network timeouts remain failures when all bounded attempts fail',async()=>{
  let calls=0;
  await assert.rejects(()=>readOnlyFetch('https://example.test/file',{}, {
    fetchImpl:async()=>{calls++;throw new DOMException('timed out','TimeoutError');},wait:async()=>{}
  }),/timed out/);
  assert.equal(calls,3);
});

test('permission, not-found and invalid request responses are never retried by default',async()=>{
  for(const status of [400,401,403,404,422]){
    let calls=0;
    const response=await readOnlyFetch('https://example.test/file',{}, {
      fetchImpl:async()=>{calls++;return new Response(null,{status});},
      wait:async()=>{assert.fail('Permanent errors must not retry');}
    });
    assert.equal(response.status,status);assert.equal(calls,1);
  }
});

test('non-network exceptions and caller cancellation fail without retry',async()=>{
  let calls=0;
  await assert.rejects(()=>readOnlyFetch('https://example.test/file',{}, {
    fetchImpl:async()=>{calls++;throw new TypeError('Invalid URL');},wait:async()=>{assert.fail('Invalid requests must not retry');}
  }),/Invalid URL/);
  assert.equal(calls,1);
  const controller=new AbortController();controller.abort();
  await assert.rejects(()=>readOnlyFetch('https://example.test/file',{signal:controller.signal},{
    fetchImpl:async()=>{assert.fail('Aborted reads must not start');}
  }),{name:'AbortError'});
});

test('mutation methods and request bodies are rejected before any network request',async()=>{
  for(const options of [{method:'POST'},{method:'PUT'},{method:'DELETE'},{method:'GET',body:'body'}]){
    await assert.rejects(()=>readOnlyFetch('https://example.test/file',options,{
      fetchImpl:async()=>{assert.fail('A mutation must never be replayed');}
    }),/Only bodyless GET and HEAD/);
  }
});

test('only the known newly accepted Cloudflare deployment readback error gets 404 retries',async()=>{
  let calls=0;const urls:string[]=[];
  const url='https://api.cloudflare.com/client/v4/accounts/account/workers/scripts/worker/deployments/exact-deployment';
  const response=await readOnlyFetch(url,{}, {
    retryResponse:transientDeploymentReadback,wait:async()=>{},
    fetchImpl:async(actual:unknown)=>{
      urls.push(String(actual));calls++;
      return calls===1?Response.json({success:false,errors:[{code:10336}]},{status:404}):Response.json({success:true,result:{id:'exact-deployment'}});
    }
  });
  assert.equal(response.status,200);assert.equal(calls,2);assert.deepEqual(urls,[url,url]);
  for(const [status,body]of [[404,{errors:[{code:10090}]}],[403,{errors:[{code:10336}]}],[404,{errors:'invalid'}],[404,{}]] as const){
    assert.equal(await transientDeploymentReadback(Response.json(body,{status})),false);
  }
  assert.equal(await transientDeploymentReadback(new Response('invalid json',{status:404})),false);
});
