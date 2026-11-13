import test from 'node:test';
import assert from 'node:assert/strict';
import {NOVEMBER_12_NBA_RELEASE_ID as id,NOVEMBER_12_NBA_TOPIC_COUNTS as counts,NOVEMBER_12_NBA_ZIP_SHA256S as hashes} from '../src/server/november-12-nba-thirty-scope';
import {reviewedReleaseScope,reviewedTopicCount,matchesReviewedReleaseScope,matchesReviewedSourceArchives} from '../src/server/reviewed-release-scope';

test('NBA intake requires the complete thirty-team scope and every exact source archive',()=>{
 assert.deepEqual(reviewedReleaseScope(id),{collections:30,designs:3000,topics:Object.keys(counts)});
 assert.ok(matchesReviewedReleaseScope({id,collections:30,designs:3000}));
 assert.equal(matchesReviewedReleaseScope({id,collections:4,designs:400}),false);
 assert.ok(matchesReviewedSourceArchives({release_id:id,source_zip_sha256s:hashes}));
 for(const topic of Object.keys(counts)){
  const missing={...hashes};delete missing[topic];
  assert.equal(matchesReviewedSourceArchives({release_id:id,source_zip_sha256s:missing}),false);
  assert.equal(matchesReviewedSourceArchives({release_id:id,source_zip_sha256s:{...hashes,[topic]:'0'.repeat(64)}}),false);
  assert.equal(reviewedTopicCount(id,topic),100);
 }
 assert.equal(reviewedTopicCount(id,'basketball'),0);
 assert.equal(matchesReviewedSourceArchives({release_id:id,source_zip_sha256s:{...hashes,extra:'0'.repeat(64)}}),false);
});

import {NOVEMBER_12_NBA_TOPICS} from '../src/taxonomy/november-12-nba-thirty';
import {categoryLineage,categoryPath,resolveCategoryAlias} from '../src/taxonomy/catalog';
import {DOWNLOAD_ONLY_TOPICS,hasOnlineColoring} from '../src/ui/coloring-availability';
import {reviewedLandingIntroduction} from '../src/taxonomy/landing-summary';
test('NBA teams have exact subject routes, reviewed introductions and download-only actions',()=>{
 assert.equal(NOVEMBER_12_NBA_TOPICS.length,30);
 for(const topic of NOVEMBER_12_NBA_TOPICS){
  assert.deepEqual(categoryLineage(topic.id),['sports','basketball',topic.id]);
  assert.equal(categoryPath(topic.id),'/coloring-pages/'+topic.id+'/');
  assert.equal(resolveCategoryAlias(topic.name+' coloring pages'),topic.id);
  assert.ok(DOWNLOAD_ONLY_TOPICS.has(topic.id));
  assert.equal(hasOnlineColoring({category_ids:categoryLineage(topic.id)}),false);
  assert.ok(reviewedLandingIntroduction({topic,path:categoryPath(topic.id)}));
  assert.ok(topic.sample.endsWith('-coloring-page'));
 }
});
