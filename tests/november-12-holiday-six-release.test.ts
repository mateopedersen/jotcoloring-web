import test from 'node:test';
import assert from 'node:assert/strict';
import {NOVEMBER_12_HOLIDAY_RELEASE_ID as id,NOVEMBER_12_HOLIDAY_TOPIC_COUNTS as counts,NOVEMBER_12_HOLIDAY_ZIP_SHA256S as hashes} from '../src/server/november-12-holiday-six-scope';
import {reviewedReleaseScope,reviewedTopicCount,matchesReviewedSourceArchives} from '../src/server/reviewed-release-scope';

test('holiday release requires exactly all six pinned source archives and 600 drawings',()=>{
 assert.deepEqual(reviewedReleaseScope(id),{collections:6,designs:600,topics:Object.keys(counts)});
 assert.ok(matchesReviewedSourceArchives({release_id:id,source_zip_sha256s:hashes}));
 for(const topic of Object.keys(counts)){
  const missing={...hashes};delete missing[topic];
  assert.equal(matchesReviewedSourceArchives({release_id:id,source_zip_sha256s:missing}),false);
  assert.equal(matchesReviewedSourceArchives({release_id:id,source_zip_sha256s:{...hashes,[topic]:'0'.repeat(64)}}),false);
  assert.equal(reviewedTopicCount(id,topic),100);
 }
 assert.equal(reviewedTopicCount(id,'christmas-eve'),0);
 assert.equal(matchesReviewedSourceArchives({release_id:id,source_zip_sha256s:{...hashes,extra:'0'.repeat(64)}}),false);
});

import {NOVEMBER_12_HOLIDAY_TOPICS as topics} from '../src/taxonomy/november-12-holiday-six';
import {matchesReviewedTopicLineage} from '../src/server/reviewed-release-scope';
import {contentSocialSpec,socialBinding,SOCIAL_PAGES} from '../src/social/model';
test('holiday subjects use exact Christmas lineage and do not promote unavailable coloring controls',()=>{
 assert.equal(topics.length,6);
 for(const t of topics){assert.equal(t.parent,'christmas');assert.ok(t.intro.length>60);assert.ok(t.sample&&!t.sample.endsWith('-001'));assert.ok(matchesReviewedTopicLineage(id,t.id,['holidays','christmas',t.id]));assert.equal(matchesReviewedTopicLineage(id,t.id,['holidays',t.id]),false);}
 const b=socialBinding({slug:'elf-with-gift',title:'Elf beside a Gift Coloring Page',description:'An elf sits beside a wrapped gift.',category_ids:['holidays','christmas','elf-on-the-shelf'],sourceSHA256:'a'.repeat(64)});
 assert.deepEqual(contentSocialSpec(b,{coloringAvailable:false}).badges,['PDF','Image']);
 assert.ok(contentSocialSpec(b).badges.includes('Color in Studio'));
});

test('holiday topic covers advertise actual downloads and have clean sentence endings',()=>{for(const t of topics){const s=SOCIAL_PAGES.find(s=>s.key==='topic-'+t.id)!;assert.deepEqual(s.badges,['PDF','Image']);assert.ok(!s.description.endsWith('..'));}});
