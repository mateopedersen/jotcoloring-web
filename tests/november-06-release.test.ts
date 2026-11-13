import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COLORING_TAXONOMY,NEW_EXACT_TOPIC_CATEGORY_IDS,categoryLineage,categoryPath,resolveCategoryAlias} from '../src/taxonomy/catalog';
import {NAVIGATION_COLLECTIONS,collectionForRoot} from '../src/taxonomy/navigation';
import {catalogLocation} from '../src/taxonomy/catalog-location';
import {reviewedLandingIntroduction} from '../src/taxonomy/landing-summary';
import {NOVEMBER_06_RELEASE_ID,NOVEMBER_06_TOPIC_COUNTS,NOVEMBER_06_ZIP_CHECKSUMS,reviewedReleaseScope,reviewedTopicCount,matchesReviewedReleaseScope,matchesReviewedSourceArchives,matchesReviewedTopicLineage} from '../src/server/reviewed-release-scope';

test('November 6 combined intake is exactly eighteen topics and 1,800 designs',()=>{
 const scope=reviewedReleaseScope(NOVEMBER_06_RELEASE_ID);
 assert.equal(scope.collections,18);assert.equal(scope.designs,1800);assert.equal(Object.keys(NOVEMBER_06_TOPIC_COUNTS).length,18);
 assert.ok(Object.values(NOVEMBER_06_TOPIC_COUNTS).every(count=>count===100));
 assert.equal(reviewedTopicCount(NOVEMBER_06_RELEASE_ID,'instagram'),100);assert.equal(reviewedTopicCount(NOVEMBER_06_RELEASE_ID,'pete-the-cat'),0);
 assert.ok(matchesReviewedReleaseScope({id:NOVEMBER_06_RELEASE_ID,collections:18,designs:1800}));
 assert.ok(matchesReviewedSourceArchives({release_id:NOVEMBER_06_RELEASE_ID,source_zip_sha256s:NOVEMBER_06_ZIP_CHECKSUMS}));
 assert.equal(matchesReviewedSourceArchives({release_id:NOVEMBER_06_RELEASE_ID,source_zip_sha256s:{...NOVEMBER_06_ZIP_CHECKSUMS,extra:'a'.repeat(64)}}),false);
});

test('every intake topic has its correct parent, canonical route, searchable aliases, and navigation home',()=>{
 const parents:Record<string,string>={instagram:'social-media','stained-glass':'art-patterns',squishmallow:'dolls-toys',pennywise:'horror',penguin:'polar-animals',pegasus:'fantasy',kangaroo:'animals',snapchat:'social-media',tiktok:'social-media',facebook:'social-media',x:'social-media',bugatti:'cars','mercedes-benz':'cars',audi:'cars',chery:'cars',byd:'cars',volvo:'cars',tesla:'cars'};
 const topics=Object.keys(parents),migration=readFileSync(new URL('../migrations/catalog/0024_november_06_topic_categories.sql',import.meta.url),'utf8');
 assert.equal(topics.length,18);assert.ok(NAVIGATION_COLLECTIONS.some(item=>item.id==='social-media'));
 for(const id of topics){
  const item=COLORING_TAXONOMY.find(category=>category.id===id)!;assert.ok(item);assert.equal(item.parent,parents[id]);
  assert.equal(categoryPath(id),`/coloring-pages/${id}/`);assert.ok(catalogLocation(categoryPath(id)));
  const lineage=categoryLineage(id);assert.equal(lineage.at(-1),id);assert.ok(matchesReviewedTopicLineage(NOVEMBER_06_RELEASE_ID,id,lineage));
  assert.equal(matchesReviewedTopicLineage(NOVEMBER_06_RELEASE_ID,id,[id]),false);
  assert.ok(collectionForRoot(lineage[0]),id+' has a public navigation home');
  assert.ok(NEW_EXACT_TOPIC_CATEGORY_IDS.has(id));assert.ok(migration.includes(`VALUES('${id}'`),id+' migration row');
  assert.equal(reviewedLandingIntroduction(catalogLocation(categoryPath(id))!)?.purpose,'category-overview',id+' has a current category overview');
 }
 assert.equal(categoryPath('social-media'),'/collections/social-media/');assert.ok(migration.includes("VALUES('social-media','Social Media',NULL,391)"));
 assert.equal(categoryPath('cars'),'/coloring-pages/cars/');assert.ok(collectionForRoot('vehicles'));
});

test('platform and franchise aliases lead to the intended new topic',()=>{
 for(const [query,id] of [['instagram camera','instagram'],['stained glass coloring pages','stained-glass'],['squishmallows','squishmallow'],['pennywise the dancing clown','pennywise'],['penguins','penguin'],['winged horse coloring page','pegasus'],['joey coloring page','kangaroo'],['snapchat ghost','snapchat'],['tik tok coloring page','tiktok'],['facebook logo coloring page','facebook'],['twitter coloring pages','x'],['bugatti type 35','bugatti'],['mercedes benz coloring pages','mercedes-benz'],['audi quattro','audi'],['chery tiggo','chery'],['byd dolphin','byd'],['volvo p1800','volvo'],['tesla cybertruck','tesla']] as const)assert.equal(resolveCategoryAlias(query),id,query);
});
