import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NOVEMBER_09_AUTO29_RELEASE_ID as id,NOVEMBER_09_AUTO29_TOPIC_COUNTS as counts,NOVEMBER_09_AUTO29_BRAND_ARCHIVE_SHA256S as archives,reviewedReleaseScope,matchesReviewedSourceArchives,matchesReviewedTopicLineage} from '../src/server/reviewed-release-scope';
import {NOVEMBER_09_AUTO29_ARCHIVE_NAMES as names} from '../src/server/november-09-automobile-29-source';
import {NOVEMBER_09_AUTO29_TOPICS as topics} from '../src/taxonomy/november-09-auto29';
import {categoryLineage,categoryPath,resolveCategoryAlias} from '../src/taxonomy/catalog';
import {catalogLocation} from '../src/taxonomy/catalog-location';
import {landingSummary,reviewedLandingIntroduction} from '../src/taxonomy/landing-summary';

test('November 9 automobile intake is exactly 29 checksum-pinned topics and 2,900 drawings',()=>{
 const scope=reviewedReleaseScope(id);
 assert.deepEqual({collections:scope.collections,designs:scope.designs},{collections:29,designs:2900});
 assert.equal(Object.keys(counts).length,29);assert.ok(Object.values(counts).every(count=>count===100));
 assert.equal(Object.keys(archives).length,29);assert.equal(Object.keys(names).length,29);
 assert.ok(Object.values(archives).every(hash=>/^[a-f0-9]{64}$/.test(hash)));
 assert.ok(matchesReviewedSourceArchives({release_id:id,source_zip_sha256s:archives}));
 assert.equal(matchesReviewedSourceArchives({release_id:id,source_zip_sha256s:{...archives,unexpected:'a'.repeat(64)}}),false);
 assert.equal(matchesReviewedSourceArchives({release_id:id,source_zip_sha256s:{...archives,auburn:'0'.repeat(64)}}),false);
});

test('each new car brand routes to one Cars topic with a full intro and matching migration row',()=>{
 const migration=readFileSync(new URL('../migrations/catalog/0031_november_09_auto29_car_topics.sql',import.meta.url),'utf8');
 assert.equal(topics.length,29);assert.equal(new Set(topics.map(t=>t.id)).size,29);
 for(const t of topics){
  assert.equal(t.parent,'cars');assert.deepEqual(categoryLineage(t.id),['vehicles','cars',t.id]);
  assert.equal(categoryPath(t.id),`/coloring-pages/${t.id}/`);
  assert.ok(matchesReviewedTopicLineage(id,t.id,categoryLineage(t.id)));
  assert.equal(matchesReviewedTopicLineage(id,t.id,[t.id]),false);
  assert.equal(resolveCategoryAlias(t.name+' coloring pages'),t.id);
  const location=catalogLocation(categoryPath(t.id));assert.equal(location?.topic?.id,t.id);
  assert.equal(reviewedLandingIntroduction(location!)?.purpose,'category-overview',t.id+' visitor introduction');assert.doesNotMatch(landingSummary(location!),/The set pairs full-vehicle outlines with close-up design details/);
  assert.ok(migration.includes(`VALUES('${t.id}'`),t.id+' migration');
 }
});
