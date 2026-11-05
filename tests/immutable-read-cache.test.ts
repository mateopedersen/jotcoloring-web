import test from 'node:test';import assert from 'node:assert/strict';
import {immutableReadCache} from '../src/server/immutable-read-cache';
import {verifyAsset} from '../src/server/assets';
import {sha256} from '../src/server/http';
import type {Bucket,StoredObject} from '../src/server/types';
function fixture(){
 const data=new Map<string,Uint8Array>(),reads=new Map<string,number>();
 const bucket:Bucket={async get(key){reads.set(key,(reads.get(key)||0)+1);const b=data.get(key);return b?{key,size:b.length,etag:'test',body:new Blob([new Uint8Array(b)]).stream(),arrayBuffer:async()=>b.slice().buffer,text:async()=>new TextDecoder().decode(b)} satisfies StoredObject:null;},async head(key){return bucket.get(key);},async put(key,value){data.set(key,new Uint8Array(await new Response(value as BodyInit).arrayBuffer()));},async delete(keys){for(const k of typeof keys==='string'?[keys]:keys)data.delete(k);},async list(){return {objects:[],truncated:false};}};
 return {bucket,data,reads};
}
test('immutable bytes are invocation-scoped, bounded, copied and invalidated by writes',async()=>{
 const {bucket,reads}=fixture();await bucket.put('a','abcd');await bucket.put('b','efgh');await bucket.put('other','qrst');
 const cache=immutableReadCache(bucket,['a','b'],4);
 const a=await cache.get('a');new Uint8Array(await a!.arrayBuffer())[0]=0;
 assert.equal(await (await cache.get('a'))!.text(),'abcd');assert.equal(reads.get('a'),1);
 await cache.get('b');await cache.get('b');assert.equal(reads.get('b'),2);
 await cache.get('other');await cache.get('other');assert.equal(reads.get('other'),2);
 await cache.put('a','new');assert.equal(await (await cache.get('a'))!.text(),'new');assert.equal(reads.get('a'),2);
 await cache.delete('a');assert.equal(await cache.get('a'),null);
 await bucket.put('a','next');assert.equal(await (await immutableReadCache(bucket,['a']).get('a'))!.text(),'next');
});
test('cached originals do not bypass asset hashes or current review checks',async()=>{
 const {bucket,reads}=fixture();await bucket.put('asset','RIFF0000WEBPxxxx');const cache=immutableReadCache(bucket,['asset']);await cache.get('asset');
 const asset={asset_id:'asset',object_key:'asset',role:'printable_webp_bw',mime:'image/webp',bytes:16,sha256:'a'.repeat(64),asset_version:1};
 const env={ORIGINALS:cache,CATALOG_DB:{prepare(){throw Error('Review must not be read until checksum passes');}}} as any;
 await assert.rejects(()=>verifyAsset(env,asset),/checksum mismatch/);
 asset.sha256=await sha256('RIFF0000WEBPxxxx');env.CATALOG_DB={prepare(){return {bind(){return this;},async first(){return null;}};}};
 await assert.rejects(()=>verifyAsset(env,asset),/pixel\/PDF inspection/);
 assert.equal(reads.get('asset'),1);
});
