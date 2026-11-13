import test from 'node:test';
import assert from 'node:assert/strict';
import {NOVEMBER_13_WNBA_RELEASE_ID as id,NOVEMBER_13_WNBA_TOPIC_COUNTS as counts,NOVEMBER_13_WNBA_ZIP_SHA256S as hashes} from '../src/server/november-13-wnba-fourteen-scope';
import {reviewedReleaseScope,reviewedTopicCount,matchesReviewedReleaseScope,matchesReviewedSourceArchives} from '../src/server/reviewed-release-scope';
test('WNBA complete phase rejects missing, substituted and extra source archives',()=>{
 assert.deepEqual(reviewedReleaseScope(id),{collections:14,designs:1400,topics:Object.keys(counts)});
 assert.equal(matchesReviewedReleaseScope({id,collections:14,designs:1400}),true);
 for(const [collections,designs] of [[15,1500],[15,1491],[14,1399],[7,700]])assert.equal(matchesReviewedReleaseScope({id,collections,designs}),false);
 assert.equal(reviewedTopicCount(id,'golden-state-valkyries'),0);
 assert.equal(matchesReviewedSourceArchives({release_id:id,source_zip_sha256s:hashes}),true);
 for(const topic of Object.keys(counts)){
  const missing={...hashes};delete missing[topic];
  assert.equal(matchesReviewedSourceArchives({release_id:id,source_zip_sha256s:missing}),false);
  assert.equal(matchesReviewedSourceArchives({release_id:id,source_zip_sha256s:{...hashes,[topic]:'0'.repeat(64)}}),false);
  assert.equal(reviewedTopicCount(id,topic),100);
 }
 assert.equal(matchesReviewedSourceArchives({release_id:id,source_zip_sha256s:{...hashes,'golden-state-valkyries':'0'.repeat(64)}}),false);
});

import {NOVEMBER_13_WNBA_TOPICS} from '../src/taxonomy/november-13-wnba-fourteen';
import {categoryLineage,categoryPath,resolveCategoryAlias} from '../src/taxonomy/catalog';
import {DOWNLOAD_ONLY_TOPICS,hasOnlineColoring} from '../src/ui/coloring-availability';
import {reviewedLandingIntroduction} from '../src/taxonomy/landing-summary';
test('WNBA teams have exact subject routes, reviewed introductions and download-only actions',()=>{
 assert.equal(NOVEMBER_13_WNBA_TOPICS.length,14);
 for(const topic of NOVEMBER_13_WNBA_TOPICS){
  assert.deepEqual(categoryLineage(topic.id),['sports','basketball',topic.id]);
  assert.equal(categoryPath(topic.id),'/coloring-pages/'+topic.id+'/');
  assert.equal(resolveCategoryAlias(topic.name+' coloring pages'),topic.id);
  assert.ok(DOWNLOAD_ONLY_TOPICS.has(topic.id));
  assert.equal(hasOnlineColoring({category_ids:categoryLineage(topic.id)}),false);
  assert.ok(reviewedLandingIntroduction({topic,path:categoryPath(topic.id)}));
  assert.ok(topic.sample.endsWith('-coloring-page'));
 }
});
