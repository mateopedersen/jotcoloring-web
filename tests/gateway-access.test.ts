import {test} from 'node:test';
import assert from 'node:assert/strict';
import gateway from '../workers/free-ai/index';
import {gatewayDigest,gatewaySignature,signatureData,GATEWAY_MODEL} from '../src/server/gateway-signature';

function fixture(){
 let calls=0;
 const env={AI_FREE_GATEWAY_SECRET:'dummy-gateway-key-'.repeat(3),ACCOUNT_BILLING_PLAN:'workers_free',ENFORCED_ACCOUNT_ID:'a'.repeat(32),AI:{run:async()=>{calls++;return new Response('{"image":"dummy"}',{headers:{'Content-Type':'application/json'}});}}};
 return {env,calls:()=>calls};
}
async function signed(secret:string){
 const form=new FormData();form.set('prompt','A small dummy line drawing');form.set('width','1024');form.set('height','1024');
 const body=new Response(form),bytes=new Uint8Array(await body.arrayBuffer()),timestamp=String(Date.now()),id=crypto.randomUUID();
 const headers={'Content-Type':body.headers.get('content-type')!,'X-Request-Timestamp':timestamp,'Idempotency-Key':id,'X-AI-Model':GATEWAY_MODEL,'X-Max-Neurons':'300','X-Request-Signature':await gatewaySignature(secret,signatureData(timestamp,id,GATEWAY_MODEL,'300',await gatewayDigest(bytes)))};
 return {bytes,headers};
}
test('missing and malformed gateway signatures reject before any request body read',async()=>{
 const f=fixture(),sample=await signed(f.env.AI_FREE_GATEWAY_SECRET);
 for(const signature of ['', 'abc', 'g'.repeat(64)]){
  let reads=0;
  const stream=new ReadableStream<Uint8Array>({pull(controller){reads++;controller.enqueue(new Uint8Array([0]));controller.close();}},{highWaterMark:0});
  const request=new Request('https://gateway.test/inference',{method:'POST',headers:{...sample.headers,'X-Request-Signature':signature},body:stream,duplex:'half'} as RequestInit);
  const result=await gateway.fetch(request,f.env);
  assert.equal(result.status,401);assert.equal(reads,0);assert.equal(f.calls(),0);
 }
});
test('signed body alterations and expired metadata never reach the provider',async()=>{
 const f=fixture(),sample=await signed(f.env.AI_FREE_GATEWAY_SECRET),altered=sample.bytes.slice();altered[25]^=1;
 const bad=await gateway.fetch(new Request('https://gateway.test/inference',{method:'POST',headers:sample.headers,body:altered}),f.env);
 assert.equal(bad.status,401);
 const stale=await gateway.fetch(new Request('https://gateway.test/inference',{method:'POST',headers:{...sample.headers,'X-Request-Timestamp':String(Date.now()-120000)},body:sample.bytes}),f.env);
 assert.equal(stale.status,401);assert.equal(f.calls(),0);
});
test('only the exact configured free-account route reaches the stub provider',async()=>{
 const f=fixture(),sample=await signed(f.env.AI_FREE_GATEWAY_SECRET);
 const request=()=>new Request('https://gateway.test/inference',{method:'POST',headers:sample.headers,body:sample.bytes});
 assert.equal((await gateway.fetch(request(),{...f.env,ACCOUNT_BILLING_PLAN:'workers_paid'})).status,503);
 assert.equal((await gateway.fetch(new Request('https://gateway.test/other',{method:'POST',headers:sample.headers,body:sample.bytes}),f.env)).status,404);
 assert.equal(f.calls(),0);
 const response=await gateway.fetch(request(),f.env);assert.equal(response.status,200);assert.equal(f.calls(),1);
 assert.match(response.headers.get('X-Provider-Receipt')!,new RegExp(sample.headers['Idempotency-Key']+'$'));
});
