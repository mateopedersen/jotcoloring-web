import test from 'node:test';import assert from 'node:assert/strict';
import {reviewedReleaseScope,matchesReviewedReleaseScope,matchesReviewedSourceArchives,SEVEN_TOPIC_RELEASE_ID,SEVEN_TOPIC_ZIP_CHECKSUMS} from '../src/server/reviewed-release-scope';
test('seven-topic release is exact and does not relax either accepted release gate',()=>{
 assert.equal(reviewedReleaseScope().designs,2400);assert.equal(reviewedReleaseScope('descendants-squishy-kpop-20261101').designs,300);
 assert.deepEqual(reviewedReleaseScope(SEVEN_TOPIC_RELEASE_ID).topics,Object.keys(SEVEN_TOPIC_ZIP_CHECKSUMS));
 assert.ok(matchesReviewedReleaseScope({id:SEVEN_TOPIC_RELEASE_ID,collections:7,designs:700}));
 for(const invalid of [{collections:6,designs:700},{collections:7,designs:600},{collections:7,designs:100},{collections:24,designs:2400}])assert.equal(matchesReviewedReleaseScope({id:SEVEN_TOPIC_RELEASE_ID,...invalid}),false);
 const release={release_id:SEVEN_TOPIC_RELEASE_ID,source_zip_sha256s:{...SEVEN_TOPIC_ZIP_CHECKSUMS}};assert.ok(matchesReviewedSourceArchives(release));
 const missing=structuredClone(release);delete missing.source_zip_sha256s['panda-coloring-pages'];assert.equal(matchesReviewedSourceArchives(missing),false);
 assert.equal(matchesReviewedSourceArchives({...release,source_zip_sha256s:{...release.source_zip_sha256s,'extra-topic':'a'.repeat(64)}}),false);
 assert.equal(matchesReviewedSourceArchives({...release,source_zip_sha256s:{...release.source_zip_sha256s,'bible-coloring-pages':'b'.repeat(64)}}),false);
 assert.equal(matchesReviewedSourceArchives({release_id:'unknown'}),false);
});
