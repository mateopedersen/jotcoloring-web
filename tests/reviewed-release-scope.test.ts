import test from 'node:test';import assert from 'node:assert/strict';
import {reviewedReleaseScope,matchesReviewedReleaseScope,matchesReviewedSourceArchives,SEVEN_TOPIC_RELEASE_ID,SEVEN_TOPIC_ZIP_CHECKSUMS,COLLECTIBLE_CHARACTER_RELEASE_ID,COLLECTIBLE_CHARACTER_ZIP_CHECKSUMS} from '../src/server/reviewed-release-scope';
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
test('collectible character release is bound to the exact 17 archive hashes',()=>{
 const scope=reviewedReleaseScope(COLLECTIBLE_CHARACTER_RELEASE_ID),release={release_id:COLLECTIBLE_CHARACTER_RELEASE_ID,source_zip_sha256s:{...COLLECTIBLE_CHARACTER_ZIP_CHECKSUMS}};
 assert.equal(scope.collections,17);assert.equal(scope.designs,1700);assert.equal(scope.topics?.length,17);assert.ok(matchesReviewedReleaseScope({id:COLLECTIBLE_CHARACTER_RELEASE_ID,collections:17,designs:1700}));assert.ok(matchesReviewedSourceArchives(release));
 const missing=structuredClone(release);delete missing.source_zip_sha256s['hello-kitty'];assert.equal(matchesReviewedSourceArchives(missing),false);
 assert.equal(matchesReviewedSourceArchives({...release,source_zip_sha256s:{...release.source_zip_sha256s,'labubu':'a'.repeat(64)}}),false);
 assert.equal(matchesReviewedSourceArchives({...release,source_zip_sha256s:{...release.source_zip_sha256s,extra:'b'.repeat(64)}}),false);
 assert.equal(matchesReviewedReleaseScope({id:COLLECTIBLE_CHARACTER_RELEASE_ID,collections:17,designs:1600}),false);
});


test('public figure release retains exact 100/100/83 owner-authorized counts',async()=>{const {PUBLIC_FIGURE_RELEASE_ID,PUBLIC_FIGURE_TOPIC_COUNTS,PUBLIC_FIGURE_ZIP_CHECKSUMS,reviewedTopicCount}=await import('../src/server/reviewed-release-scope');assert.deepEqual(PUBLIC_FIGURE_TOPIC_COUNTS,{'mrbeast':83,'elon-musk':100,'donald-trump':100});assert.equal(reviewedReleaseScope(PUBLIC_FIGURE_RELEASE_ID).designs,283);assert.equal(reviewedTopicCount(PUBLIC_FIGURE_RELEASE_ID,'mrbeast'),83);assert.equal(reviewedTopicCount('collectible-characters-20261103','labubu'),100);assert.equal(reviewedTopicCount(PUBLIC_FIGURE_RELEASE_ID,'unrelated'),0);assert.ok(matchesReviewedSourceArchives({release_id:PUBLIC_FIGURE_RELEASE_ID,source_zip_sha256s:PUBLIC_FIGURE_ZIP_CHECKSUMS}));assert.ok(!matchesReviewedSourceArchives({release_id:PUBLIC_FIGURE_RELEASE_ID,source_zip_sha256s:{...PUBLIC_FIGURE_ZIP_CHECKSUMS,mrbeast:'0'.repeat(64)}}));});
