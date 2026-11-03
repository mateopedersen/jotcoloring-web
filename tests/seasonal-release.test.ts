import {requireSearchableTopicIdentity} from '../src/taxonomy/topic-identity';
import test from 'node:test';import assert from 'node:assert/strict';
import {SEASONAL_TEN_RELEASE_ID,SEASONAL_TEN_ZIP_CHECKSUMS,reviewedReleaseScope,matchesReviewedSourceArchives,matchesReviewedReleaseScope} from '../src/server/reviewed-release-scope';
import {categoryById,categoryPath,EDITORIAL_REVIEW_CATEGORY_IDS} from '../src/taxonomy/catalog';

test('seasonal scope accepts only the exact ten complete100-page source archives',()=>{
 const scope=reviewedReleaseScope(SEASONAL_TEN_RELEASE_ID);assert.equal(scope.collections,10);assert.equal(scope.designs,1000);assert.equal(scope.topics?.length,10);
 assert.ok(matchesReviewedSourceArchives({release_id:SEASONAL_TEN_RELEASE_ID,source_zip_sha256s:SEASONAL_TEN_ZIP_CHECKSUMS}));
 for(const key of Object.keys(SEASONAL_TEN_ZIP_CHECKSUMS)){const changed={...SEASONAL_TEN_ZIP_CHECKSUMS,[key]:'0'.repeat(64)},missing={...SEASONAL_TEN_ZIP_CHECKSUMS};delete missing[key];for(const hashes of [changed,missing])assert.equal(matchesReviewedSourceArchives({release_id:SEASONAL_TEN_RELEASE_ID,source_zip_sha256s:hashes}),false);}
 for(const [collections,designs]of[[9,1000],[10,999],[10,100],[17,1700]])assert.equal(matchesReviewedReleaseScope({id:SEASONAL_TEN_RELEASE_ID,collections,designs}),false);
 assert.equal(reviewedReleaseScope('collectible-characters-20261103').designs,1700);assert.equal(reviewedReleaseScope('public-figures-20261103').designs,283);assert.equal(reviewedReleaseScope().designs,2400);
});
test('seasonal subjects retain separate reviewed classification and real canonical routes',()=>{
 const parents:Record<string,string>={'sugar-skull':'holidays','all-souls-day':'holidays','veterans-day':'holidays','christmas-tree':'holidays','january':'seasons','december':'seasons','cheetah':'animals','excavator':'vehicles','gingerbread-house':'holidays','fall-leaf':'nature'};
 for(const [id,parent] of Object.entries(parents)){const c=categoryById(id)!;assert.equal(c.parent,parent);assert.equal(c.editorial_only,true);assert.ok(EDITORIAL_REVIEW_CATEGORY_IDS.has(id));assert.equal(categoryPath(id),`/coloring-pages/${id}/`);assert.ok(c.intro.length>240);}
 assert.notEqual(categoryById('sugar-skull')!.intro,categoryById('all-souls-day')!.intro);
});

test('all ten new subjects require their visible searchable topic identity',()=>{
 for(const id of Object.keys(SEASONAL_TEN_ZIP_CHECKSUMS)){
  const label=categoryById(id)!.name;
  assert.throws(()=>requireSearchableTopicIdentity({title:'A Visible Scene',description:'The individually described source artwork.',category_ids:[id]}));
  assert.doesNotThrow(()=>requireSearchableTopicIdentity({title:label+': A Visible Scene',description:'The individually described source artwork.',category_ids:[id]}));
 }
});
