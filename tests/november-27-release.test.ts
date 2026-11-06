import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COLORING_TAXONOMY,categoryLineage,categoryPath,resolveCategoryAlias,NEW_EXACT_TOPIC_CATEGORY_IDS} from '../src/taxonomy/catalog';
import {catalogLocation} from '../src/taxonomy/catalog-location';
import {landingSummary} from '../src/taxonomy/landing-summary';
import {NOVEMBER_27_RELEASE_ID,NOVEMBER_27_TOPIC_COUNTS,NOVEMBER_27_ZIP_CHECKSUMS,reviewedReleaseScope,reviewedTopicCount,matchesReviewedReleaseScope,matchesReviewedSourceArchives,matchesReviewedTopicLineage} from '../src/server/reviewed-release-scope';

test('November 5 intake has an exact bounded 27-topic, 2,658-artwork release scope',()=>{
 const scope=reviewedReleaseScope(NOVEMBER_27_RELEASE_ID);
 assert.equal(scope.collections,27);assert.equal(scope.designs,2658);assert.equal(Object.keys(NOVEMBER_27_TOPIC_COUNTS).length,27);
 assert.equal(NOVEMBER_27_TOPIC_COUNTS.beyonce,58);assert.ok(Object.entries(NOVEMBER_27_TOPIC_COUNTS).filter(([id])=>id!=='beyonce').every(([,count])=>count===100));
 assert.equal(reviewedTopicCount(NOVEMBER_27_RELEASE_ID,'beyonce'),58);assert.equal(reviewedTopicCount(NOVEMBER_27_RELEASE_ID,'jellyfish'),100);assert.equal(reviewedTopicCount(NOVEMBER_27_RELEASE_ID,'not-in-release'),0);
 assert.ok(matchesReviewedReleaseScope({id:NOVEMBER_27_RELEASE_ID,collections:27,designs:2658}));
 assert.equal(matchesReviewedReleaseScope({id:NOVEMBER_27_RELEASE_ID,collections:27,designs:2657}),false);
 assert.ok(matchesReviewedSourceArchives({release_id:NOVEMBER_27_RELEASE_ID,source_zip_sha256s:NOVEMBER_27_ZIP_CHECKSUMS}));
 assert.equal(matchesReviewedSourceArchives({release_id:NOVEMBER_27_RELEASE_ID,source_zip_sha256s:{...NOVEMBER_27_ZIP_CHECKSUMS,extra:'a'.repeat(64)}}),false);
});

test('every new subject has a unique exact route, reviewed parent lineage, and seeded catalog row',()=>{
 const parents:Record<string,string>={ambulance:'vehicles',beyonce:'music',bmw:'cars','blues-clues':'cartoons',blippi:'people',blaze:'cartoons','black-history-month':'holidays','black-girl':'people','bigfoot-yeti':'fantasy',beyblade:'dolls-toys',farm:'farms',starbucks:'drinks','star-trek':'space','st-patricks-day':'holidays','peppa-pig':'cartoons',milkshake:'drinks',karate:'sports',horse:'farm-animals',horror:'fantasy','home-alone':'christmas','hocus-pocus':'halloween',ferrari:'cars','fathers-day':'holidays','hot-air-balloon':'vehicles',kawaii:'art-patterns',jesus:'bible',jellyfish:'ocean'};
 const topics=Object.keys(parents),migration=readFileSync(new URL('../migrations/catalog/0023_november_27_topic_categories.sql',import.meta.url),'utf8');
 assert.equal(topics.length,27);
 for(const id of topics){
  const category=COLORING_TAXONOMY.find(item=>item.id===id)!;assert.ok(category);assert.equal(category.parent,parents[id]);assert.equal(categoryPath(id),`/coloring-pages/${id}/`);
  const location=catalogLocation(categoryPath(id));assert.ok(location);const intro=landingSummary(location);assert.ok(intro.split(/\s+/).length>=40,id+' has its own reviewed topic introduction');assert.notEqual(intro,category.intro,id+' introduction stays bound to its current source');
  const lineage=categoryLineage(id);assert.equal(lineage.at(-1),id);assert.ok(lineage.includes(parents[id]));
  assert.ok(matchesReviewedTopicLineage(NOVEMBER_27_RELEASE_ID,id,lineage));
  assert.equal(matchesReviewedTopicLineage(NOVEMBER_27_RELEASE_ID,id,[id]),false);
  assert.ok(NEW_EXACT_TOPIC_CATEGORY_IDS.has(id));assert.ok(migration.includes(`VALUES('${id}'`),id+' migration row');
 }
});

test('important new topic aliases resolve to the intended individual page',()=>{
 for(const [query,id] of [['ambulances','ambulance'],['beyonce coloring pages','beyonce'],['bmw cars','bmw'],['blues clues','blues-clues'],['blaze coloring pages','blaze'],['black history month','black-history-month'],['bigfoot coloring pages','bigfoot-yeti'],['beyblade tops','beyblade'],['farm coloring pages','farm'],['starbucks drinks','starbucks'],['star trek coloring pages','star-trek'],['peppa pig characters','peppa-pig'],['milkshakes','milkshake'],['horses','horse'],['home alone movie coloring pages','home-alone'],['sanderson sisters coloring pages','hocus-pocus'],['ferrari cars','ferrari'],['hot air balloons','hot-air-balloon'],['kawaii coloring pages','kawaii'],['jesus christ','jesus'],['jellyfishes','jellyfish']] as const)assert.equal(resolveCategoryAlias(query),id,query);
});
