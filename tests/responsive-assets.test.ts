import test from 'node:test';
import assert from 'node:assert/strict';
import registry from '../src/server/responsive-assets.json';
import {displayCopies,type DisplaySource} from '../src/server/responsive-assets';
import {publicAsset} from '../src/server/assets';
import {AppError} from '../src/server/http';
import type {Env} from '../src/server/types';

test('legacy display copies are bound to the exact source checksum and role',()=>{
 assert.ok(registry.length>0);
 for(const row of registry as DisplaySource[]){
  assert.deepEqual(displayCopies(row.source_sha256,row.source_role),row.copies);
  assert.deepEqual(displayCopies('0'.repeat(64),row.source_role),[]);
  assert.deepEqual(displayCopies(row.source_sha256,'unrelated_role'),[]);
  for(const copy of row.copies){assert.match(copy.key,new RegExp('^responsive/v1/'+row.source_sha256+'/'));assert.ok(copy.width===240||copy.width===600);assert.match(copy.sha256,/^[a-f0-9]{64}$/);}
 }
});

test('display variants use their own length and ETag while downloads retain the source',async()=>{
 const source=(registry as DisplaySource[])[0],copy=source.copies[0],keys:string[]=[];
 let sourceSHA=source.source_sha256;
 const env={CATALOG_DB:{prepare(){return{bind(){return{async first(){return{slug:'test-artwork',object_key:'published/original.webp',sha256:sourceSHA,bytes:123,mime:'image/webp',role:source.source_role};}}}}}},PUBLISHED:{async get(key:string){keys.push(key);const size=key===copy.key?copy.bytes:123;return{size,body:new Blob([new Uint8Array(size)]).stream()};}}} as unknown as Env;
 const url=`https://jot.test/api/media/test-artwork/${source.source_role}?v=${source.source_sha256.slice(0,24)}&display=${copy.width}`;
 const response=await publicAsset(new Request(url),env,'test-artwork',source.source_role);
 assert.equal(response.headers.get('Content-Length'),String(copy.bytes));assert.equal(response.headers.get('ETag'),`"${copy.sha256}"`);assert.equal(keys.at(-1),copy.key);
 const original=await publicAsset(new Request(url),env,'test-artwork',source.source_role,true);
 assert.equal(original.headers.get('Content-Length'),'123');assert.equal(keys.at(-1),'published/original.webp');
 const cached=await publicAsset(new Request(url,{headers:{'If-None-Match':`"${copy.sha256}"`}}),env,'test-artwork',source.source_role);assert.equal(cached.status,304);
 await assert.rejects(()=>publicAsset(new Request(url.replace('display='+copy.width,'display=9999')),env,'test-artwork',source.source_role),(e:unknown)=>e instanceof AppError&&e.status===404);
 sourceSHA='0'.repeat(64);
 await assert.rejects(()=>publicAsset(new Request(url),env,'test-artwork',source.source_role),(e:unknown)=>e instanceof AppError&&e.status===410);
});
