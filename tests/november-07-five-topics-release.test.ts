import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COLORING_TAXONOMY,NEW_FIVE_TOPIC_CATEGORY_IDS,categoryLineage,categoryPath,resolveCategoryAlias} from '../src/taxonomy/catalog';
import {catalogLocation} from '../src/taxonomy/catalog-location';
import {landingSummary} from '../src/taxonomy/landing-summary';
import {NOVEMBER_07_FIVE_TOPICS} from '../src/taxonomy/november-07-five-topics';
import {NOVEMBER_07_FIVE_TOPICS_RELEASE_ID,NOVEMBER_07_FIVE_TOPIC_COLLECTION_COUNTS,NOVEMBER_07_FIVE_TOPIC_ZIP_CHECKSUMS,reviewedReleaseScope,reviewedTopicCount,matchesReviewedReleaseScope,matchesReviewedSourceArchives,matchesReviewedTopicLineage} from '../src/server/reviewed-release-scope';

test('November 7 five-topic intake is exactly five collections and 500 drawings',()=>{
 const scope=reviewedReleaseScope(NOVEMBER_07_FIVE_TOPICS_RELEASE_ID);
 assert.deepEqual({collections:scope.collections,designs:scope.designs},{collections:5,designs:500});
 assert.deepEqual(Object.keys(NOVEMBER_07_FIVE_TOPIC_COLLECTION_COUNTS),['rhino','gymnastics','rescue-bots','pusheen','dogs']);
 assert.ok(Object.values(NOVEMBER_07_FIVE_TOPIC_COLLECTION_COUNTS).every(count=>count===100));
 assert.equal(reviewedTopicCount(NOVEMBER_07_FIVE_TOPICS_RELEASE_ID,'dogs'),100);
 assert.equal(reviewedTopicCount(NOVEMBER_07_FIVE_TOPICS_RELEASE_ID,'puppy'),0);
 assert.ok(matchesReviewedReleaseScope({id:NOVEMBER_07_FIVE_TOPICS_RELEASE_ID,collections:5,designs:500}));
 assert.ok(matchesReviewedSourceArchives({release_id:NOVEMBER_07_FIVE_TOPICS_RELEASE_ID,source_zip_sha256s:NOVEMBER_07_FIVE_TOPIC_ZIP_CHECKSUMS}));
 assert.equal(matchesReviewedSourceArchives({release_id:NOVEMBER_07_FIVE_TOPICS_RELEASE_ID,source_zip_sha256s:{...NOVEMBER_07_FIVE_TOPIC_ZIP_CHECKSUMS,extra:'a'.repeat(64)}}),false);
});

test('new subjects resolve to their accurate parent pages and individual landing copy',()=>{
 const migration=readFileSync(new URL('../migrations/catalog/0026_november_07_five_topics.sql',import.meta.url),'utf8');
 assert.equal(NOVEMBER_07_FIVE_TOPICS.length,4);
 const parents:Record<string,string>={rhino:'animals',gymnastics:'sports','rescue-bots':'robots',pusheen:'cartoons'};
 for(const topic of NOVEMBER_07_FIVE_TOPICS){
  assert.equal(topic.parent,parents[topic.id]);
  assert.equal(categoryPath(topic.id),`/coloring-pages/${topic.id}/`);
  const lineage=categoryLineage(topic.id);assert.equal(lineage.at(-1),topic.id);
  assert.ok(matchesReviewedTopicLineage(NOVEMBER_07_FIVE_TOPICS_RELEASE_ID,topic.id,lineage));
  assert.equal(matchesReviewedTopicLineage(NOVEMBER_07_FIVE_TOPICS_RELEASE_ID,topic.id,[topic.id]),false);
  assert.equal(COLORING_TAXONOMY.find(row=>row.id===topic.id)?.intro,topic.intro);
  assert.ok(NEW_FIVE_TOPIC_CATEGORY_IDS.has(topic.id));
  assert.ok(catalogLocation(categoryPath(topic.id)));
  const location=catalogLocation(categoryPath(topic.id))!;
  assert.ok(landingSummary(location).split(/\s+/).length>=40,topic.id+' has a complete visitor introduction');
  assert.ok(migration.includes(`VALUES('${topic.id}'`),topic.id+' is present in catalog migration');
 }
 const dogs=categoryLineage('dogs');
 assert.deepEqual(dogs,['animals','dogs']);
 assert.ok(matchesReviewedTopicLineage(NOVEMBER_07_FIVE_TOPICS_RELEASE_ID,'dogs',dogs));
 assert.equal(COLORING_TAXONOMY.find(row=>row.id==='dogs')?.intro.includes('puppies'),true);
});

test('topic and franchise search aliases resolve to the reviewed collections',()=>{
 for(const [query,id] of [['rhino coloring pages','rhino'],['rhinoceros coloring pages','rhino'],['gymnastics coloring pages','gymnastics'],['Transformers Rescue Bots coloring pages','rescue-bots'],['rescue bots coloring pages','rescue-bots'],['Pusheen cat coloring pages','pusheen'],['puppy coloring pages','dogs']] as const)assert.equal(resolveCategoryAlias(query),id,query);
});
