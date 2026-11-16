import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {NOVEMBER_16_MLB_RELEASE_ID as id,NOVEMBER_16_MLB_TOPIC_COUNTS as counts,NOVEMBER_16_MLB_ZIP_SHA256S as hashes} from '../src/server/november-16-mlb-thirty-scope';
import {reviewedReleaseScope,reviewedTopicCount,matchesReviewedReleaseScope,matchesReviewedSourceArchives} from '../src/server/reviewed-release-scope';
import logos from '../src/content/mlb-team-logos.json';
import {subjectLogo} from '../src/ui/subject-logo';

test('MLB release requires all thirty exact supplied archives and three thousand drawings',()=>{
 assert.deepEqual(reviewedReleaseScope(id),{collections:30,designs:3000,topics:Object.keys(counts)});
 assert.equal(matchesReviewedReleaseScope({id,collections:30,designs:3000}),true);
 for(const [collections,designs] of [[29,2900],[30,2999],[31,3100]])assert.equal(matchesReviewedReleaseScope({id,collections,designs}),false);
 assert.equal(matchesReviewedSourceArchives({release_id:id,source_zip_sha256s:hashes}),true);
 for(const topic of Object.keys(counts)){
  const missing={...hashes};delete missing[topic];
  assert.equal(matchesReviewedSourceArchives({release_id:id,source_zip_sha256s:missing}),false);
  assert.equal(matchesReviewedSourceArchives({release_id:id,source_zip_sha256s:{...hashes,[topic]:'0'.repeat(64)}}),false);
  assert.equal(reviewedTopicCount(id,topic),100);
 }
 assert.equal(reviewedTopicCount(id,'not-an-mlb-team'),0);
 assert.equal(matchesReviewedSourceArchives({release_id:id,source_zip_sha256s:{...hashes,'not-an-mlb-team':'0'.repeat(64)}}),false);
});

test('MLB emblems are exact local copies of the verified official team assets',()=>{
 assert.deepEqual(Object.keys(logos.teams).sort(),Object.keys(counts).sort());
 for(const [topic,logo] of Object.entries(logos.teams)){
  const bytes=fs.readFileSync(new URL('../public'+logo.src,import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),logo.sha256);
  assert.equal(bytes.length,logo.bytes);
  assert.equal(logo.source,`https://www.mlbstatic.com/team-logos/${logo.teamId}.svg`);
  assert.deepEqual(subjectLogo(topic),{src:logo.src,kind:'team',surface:logo.surface,shape:'square'});
 }
 assert.equal(subjectLogo('colorado'),undefined);
 assert.equal(subjectLogo('rockies'),undefined);
});
