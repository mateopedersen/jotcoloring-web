import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NOVEMBER_08_AUTOMOBILE_RELEASE_ID as id,NOVEMBER_08_AUTOMOBILE_TOPIC_COUNTS as counts,NOVEMBER_08_AUTOMOBILE_BRAND_ARCHIVE_SHA256S as brands,NOVEMBER_08_AUTOMOBILE_OUTER_ARCHIVE_SHA256S as outer,reviewedReleaseScope,matchesReviewedSourceArchives,matchesReviewedTopicLineage} from '../src/server/reviewed-release-scope';
import {NOVEMBER_08_AUTOMOBILE_BRAND_TOPICS as topics} from '../src/taxonomy/november-08-automobile-brands';
import {categoryLineage,categoryPath,resolveCategoryAlias} from '../src/taxonomy/catalog';
import {catalogLocation} from '../src/taxonomy/catalog-location';
import {reviewedLandingIntroduction} from '../src/taxonomy/landing-summary';
test('automobile intake rejects partial, substituted, or extra private containers',()=>{
 assert.equal(reviewedReleaseScope(id).collections,36);assert.equal(reviewedReleaseScope(id).designs,3600);assert.equal(Object.keys(outer).length,28);assert.equal(Object.keys(brands).length,36);assert.ok(Object.values(counts).every(n=>n===100));
 const scope={release_id:id,source_zip_sha256s:brands,source_outer_zip_sha256s:outer};assert.ok(matchesReviewedSourceArchives(scope));
 const missing={...brands};delete missing.alpine;assert.equal(matchesReviewedSourceArchives({...scope,source_zip_sha256s:missing}),false);
 assert.equal(matchesReviewedSourceArchives({...scope,source_zip_sha256s:{...brands,alpine:'0'.repeat(64)}}),false);
 assert.equal(matchesReviewedSourceArchives({...scope,source_outer_zip_sha256s:{...outer,extra:'a'.repeat(64)}}),false);
 assert.equal(matchesReviewedSourceArchives({...scope,source_outer_zip_sha256s:undefined}),false);
});
test('all automobile topics have canonical pages, accurate Cars lineage, and introductions',()=>{
 const migration=readFileSync(new URL('../migrations/catalog/0030_november_08_automobile_brand_topics.sql',import.meta.url),'utf8');
 assert.equal(topics.length,36);for(const t of topics){assert.equal(t.parent,'cars');assert.deepEqual(categoryLineage(t.id),['vehicles','cars',t.id]);assert.equal(categoryPath(t.id),`/coloring-pages/${t.id}/`);assert.ok(matchesReviewedTopicLineage(id,t.id,categoryLineage(t.id)));assert.equal(matchesReviewedTopicLineage(id,t.id,[t.id]),false);assert.equal(resolveCategoryAlias(t.name+' coloring pages'),t.id);assert.ok(migration.includes(`VALUES('${t.id}'`));const loc=catalogLocation(categoryPath(t.id));assert.ok(loc);assert.equal(reviewedLandingIntroduction(loc!)?.purpose,'category-overview',t.id);}
});
