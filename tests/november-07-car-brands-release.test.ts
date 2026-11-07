import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COLORING_TAXONOMY,NEW_EXACT_TOPIC_CATEGORY_IDS,categoryLineage,categoryPath,resolveCategoryAlias} from '../src/taxonomy/catalog';
import {collectionForRoot} from '../src/taxonomy/navigation';
import {catalogLocation} from '../src/taxonomy/catalog-location';
import {landingSummary} from '../src/taxonomy/landing-summary';
import {NOVEMBER_07_CAR_BRANDS_RELEASE_ID,NOVEMBER_07_CAR_BRANDS_TOPIC_COUNTS,NOVEMBER_07_CAR_BRANDS_ZIP_CHECKSUMS,reviewedReleaseScope,reviewedTopicCount,matchesReviewedReleaseScope,matchesReviewedSourceArchives,matchesReviewedTopicLineage} from '../src/server/reviewed-release-scope';
import {NOVEMBER_07_CAR_BRAND_TOPICS} from '../src/taxonomy/november-07-car-brands';

test('November 7 car-brand intake is exactly six collections and 600 drawings',()=>{
 const scope=reviewedReleaseScope(NOVEMBER_07_CAR_BRANDS_RELEASE_ID);
 assert.deepEqual({collections:scope.collections,designs:scope.designs},{collections:6,designs:600});
 assert.equal(Object.keys(NOVEMBER_07_CAR_BRANDS_TOPIC_COUNTS).length,6);
 assert.ok(Object.values(NOVEMBER_07_CAR_BRANDS_TOPIC_COUNTS).every(count=>count===100));
 assert.equal(reviewedTopicCount(NOVEMBER_07_CAR_BRANDS_RELEASE_ID,'buick'),100);
 assert.equal(reviewedTopicCount(NOVEMBER_07_CAR_BRANDS_RELEASE_ID,'tesla'),0);
 assert.ok(matchesReviewedReleaseScope({id:NOVEMBER_07_CAR_BRANDS_RELEASE_ID,collections:6,designs:600}));
 assert.ok(matchesReviewedSourceArchives({release_id:NOVEMBER_07_CAR_BRANDS_RELEASE_ID,source_zip_sha256s:NOVEMBER_07_CAR_BRANDS_ZIP_CHECKSUMS}));
 assert.equal(matchesReviewedSourceArchives({release_id:NOVEMBER_07_CAR_BRANDS_RELEASE_ID,source_zip_sha256s:{...NOVEMBER_07_CAR_BRANDS_ZIP_CHECKSUMS,extra:'a'.repeat(64)}}),false);
});

test('all six brands resolve to an exact Cars topic, valid landing page, aliases, and migration row',()=>{
 const migration=readFileSync(new URL('../migrations/catalog/0025_november_07_car_brand_topics.sql',import.meta.url),'utf8');
 assert.equal(NOVEMBER_07_CAR_BRAND_TOPICS.length,6);
 for(const topic of NOVEMBER_07_CAR_BRAND_TOPICS){
  assert.equal(topic.parent,'cars');assert.equal(categoryPath(topic.id),`/coloring-pages/${topic.id}/`);
  const lineage=categoryLineage(topic.id);assert.deepEqual(lineage,['vehicles','cars',topic.id]);
  assert.ok(matchesReviewedTopicLineage(NOVEMBER_07_CAR_BRANDS_RELEASE_ID,topic.id,lineage));
  assert.equal(matchesReviewedTopicLineage(NOVEMBER_07_CAR_BRANDS_RELEASE_ID,topic.id,[topic.id]),false);
  assert.equal(COLORING_TAXONOMY.find(row=>row.id===topic.id)?.intro,topic.intro);
  assert.ok(NEW_EXACT_TOPIC_CATEGORY_IDS.has(topic.id));assert.ok(collectionForRoot('vehicles'));
  const location=catalogLocation(categoryPath(topic.id));assert.ok(location);
  assert.ok(landingSummary(location!).split(/\s+/).length>=40,topic.id+' has a full landing introduction');
  assert.ok(migration.includes(`VALUES('${topic.id}'`),topic.id+' is included in migration');
 }
 const expected:Record<string,string>={gmc:'cars',ford:'cars',kia:'cars',chevrolet:'cars',bentley:'cars',buick:'cars'};
 assert.deepEqual(Object.fromEntries(NOVEMBER_07_CAR_BRAND_TOPICS.map(topic=>[topic.id,topic.parent])),expected);
});

test('brand and model search phrases resolve to the right collection',()=>{
 for(const [query,id] of [['GMC coloring pages','gmc'],['Ford coloring pages','ford'],['Kia coloring pages','kia'],['Chevrolet coloring pages','chevrolet'],['Bentley coloring pages','bentley'],['Buick coloring pages','buick']] as const)assert.equal(resolveCategoryAlias(query),id,query);
});
