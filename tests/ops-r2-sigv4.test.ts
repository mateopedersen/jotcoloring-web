import test from 'node:test';
import assert from 'node:assert/strict';
import {signedR2Request} from '../scripts/ops/r2-sigv4';

const base={accountId:'48c779c8eaa80234e0bb9d57f96e588b',bucket:'jotcoloring-production-originals',key:'packages/rhino/design_001/source.webp',accessKeyId:'test-access-key',secretAccessKey:'test-secret-key',method:'GET' as const,now:new Date('2026-11-07T12:00:00.000Z')};

test('signs only the expected account, bucket and object path',()=>{
 const signed=signedR2Request(base);
 assert.equal(signed.url,'https://48c779c8eaa80234e0bb9d57f96e588b.r2.cloudflarestorage.com/jotcoloring-production-originals/packages/rhino/design_001/source.webp');
 assert.match(signed.headers.Authorization,/Credential=test-access-key\/20261107\/auto\/s3\/aws4_request/);
 assert.match(signed.headers.Authorization,/SignedHeaders=host;x-amz-content-sha256;x-amz-date/);
 assert.match(signed.headers['x-amz-content-sha256'],/^[a-f0-9]{64}$/);
});

test('signatures are deterministic and bind the method, body and metadata',()=>{
 const a=signedR2Request({...base,method:'PUT',body:new TextEncoder().encode('drawing'),headers:{'Content-Type':'image/webp'}});
 const same=signedR2Request({...base,method:'PUT',body:new TextEncoder().encode('drawing'),headers:{'Content-Type':'image/webp'}});
 const otherBody=signedR2Request({...base,method:'PUT',body:new TextEncoder().encode('different drawing'),headers:{'Content-Type':'image/webp'}});
 const otherMethod=signedR2Request({...base,method:'PUT'});
 assert.equal(a.headers.Authorization,same.headers.Authorization);
 assert.notEqual(a.headers.Authorization,otherBody.headers.Authorization);
 assert.notEqual(signedR2Request(base).headers.Authorization,otherMethod.headers.Authorization);
});

test('rejects targets outside the release object-key format',()=>{
 assert.throws(()=>signedR2Request({...base,key:'../other-bucket/private'}),/Invalid scoped R2 object key/);
 assert.throws(()=>signedR2Request({...base,accountId:'not-an-account'}),/Invalid scoped R2 credentials or target/);
});
