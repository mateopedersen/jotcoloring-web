import test from 'node:test';import assert from 'node:assert/strict';
import {hasOnlineColoring,DOWNLOAD_ONLY_TOPICS} from '../src/ui/coloring-availability';
test('download-only holiday topics omit online actions even with Christmas parent categories',()=>{assert.equal(DOWNLOAD_ONLY_TOPICS.size,6);for(const topic of DOWNLOAD_ONLY_TOPICS)assert.equal(hasOnlineColoring({category_ids:['holidays','christmas',topic]}),false);});
test('older imports retain manual Studio independently of automated preview policy',()=>{for(const ids of [undefined,[],['vehicles','school-bus'],['education','science'],['holidays','christmas-eve'],['holidays','christmas']]){const item={category_ids:ids,color_preview_policy:'none' as const};assert.equal(hasOnlineColoring(item),true);}});
