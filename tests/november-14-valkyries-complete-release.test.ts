import test from 'node:test';
import assert from 'node:assert/strict';
import {NOVEMBER_14_VALKYRIES_RELEASE_ID as id,NOVEMBER_14_VALKYRIES_ZIP_SHA256S as hashes} from '../src/server/november-14-valkyries-complete-scope';
import {reviewedReleaseScope,reviewedTopicCount,matchesReviewedReleaseScope,matchesReviewedSourceArchives,matchesReviewedTopicLineage} from '../src/server/reviewed-release-scope';
import {categoryLineage,categoryPath} from '../src/taxonomy/catalog';
import {hasOnlineColoring} from '../src/ui/coloring-availability';
const topic='golden-state-valkyries';
test('Valkyries complete archive scope refuses truncated, missing or substituted source',()=>{
 assert.deepEqual(reviewedReleaseScope(id),{collections:1,designs:100,topics:[topic]});
 assert.equal(matchesReviewedReleaseScope({id,collections:1,designs:100}),true);
 for(const designs of [91,99,101,1491])assert.equal(matchesReviewedReleaseScope({id,collections:1,designs}),false);
 assert.equal(reviewedTopicCount(id,topic),100);assert.equal(reviewedTopicCount(id,'atlanta-dream'),0);
 assert.equal(matchesReviewedSourceArchives({release_id:id,source_zip_sha256s:hashes}),true);
 for(const sources of [{},{[topic]:'27ba471ff3cb6223150e84f9f035c0b41f4f5f0bb2dac53377c3e6c28fddd8f3'},{...hashes,extra:'0'.repeat(64)}])assert.equal(matchesReviewedSourceArchives({release_id:id,source_zip_sha256s:sources}),false);
});
test('Valkyries has exact basketball lineage and download-only controls',()=>{
 assert.deepEqual(categoryLineage(topic),['sports','basketball',topic]);
 assert.equal(categoryPath(topic),'/coloring-pages/'+topic+'/');
 assert.equal(matchesReviewedTopicLineage(id,topic,['sports','basketball',topic]),true);
 assert.equal(matchesReviewedTopicLineage(id,topic,[topic]),false);
 assert.equal(hasOnlineColoring({category_ids:categoryLineage(topic)}),false);
});
