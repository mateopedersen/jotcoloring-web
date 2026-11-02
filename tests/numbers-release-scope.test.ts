import test from 'node:test';import assert from 'node:assert/strict';
import {reviewedReleaseScope,matchesReviewedReleaseScope,matchesReviewedSourceArchives,NUMBER_RELEASE_ID,NUMBER_ZIP_CHECKSUMS,SEVEN_TOPIC_RELEASE_ID} from '../src/server/reviewed-release-scope';
test('numbers release requires 30 exact original archives without weakening earlier scopes',()=>{
 const scope=reviewedReleaseScope(NUMBER_RELEASE_ID);assert.equal(scope.designs,3000);assert.equal(scope.collections,30);assert.equal(scope.topics?.length,30);assert.equal(new Set(scope.topics).size,30);
 assert.equal(reviewedReleaseScope().designs,2400);assert.equal(reviewedReleaseScope(SEVEN_TOPIC_RELEASE_ID).designs,700);assert.equal(reviewedReleaseScope('descendants-squishy-kpop-20261101').designs,300);
 assert.ok(matchesReviewedReleaseScope({id:NUMBER_RELEASE_ID,collections:30,designs:3000}));for(const v of [{collections:29,designs:3000},{collections:30,designs:2999},{collections:7,designs:700}])assert.equal(matchesReviewedReleaseScope({id:NUMBER_RELEASE_ID,...v}),false);
 const valid={release_id:NUMBER_RELEASE_ID,source_zip_sha256s:{...NUMBER_ZIP_CHECKSUMS}};assert.ok(matchesReviewedSourceArchives(valid));
 const missing=structuredClone(valid);delete missing.source_zip_sha256s['number-1-coloring-pages'];assert.equal(matchesReviewedSourceArchives(missing),false);
 assert.equal(matchesReviewedSourceArchives({...valid,source_zip_sha256s:{...valid.source_zip_sha256s,'number-1-coloring-pages':'a'.repeat(64)}}),false);
 assert.equal(matchesReviewedSourceArchives({...valid,source_zip_sha256s:{...valid.source_zip_sha256s,extra:'a'.repeat(64)}}),false);
 assert.equal(matchesReviewedSourceArchives({release_id:'unknown'}),false);
});
