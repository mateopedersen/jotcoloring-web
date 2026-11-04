import test from 'node:test';
import assert from 'node:assert/strict';
import {seriesDirectory,seriesCaption} from '../src/taxonomy/series-directory';
import {catalogLocation} from '../src/taxonomy/catalog-location';
const location=(path:string)=>catalogLocation(path)!;
test('learning directories expose distinct published numeral series, not a duplicate broad number link',()=>{
 const entries=seriesDirectory(location('/coloring-pages/education/'),[{id:'numbers',count:200}], [{number:'222',count:100,cover_id:'real-222'},{number:'1001',count:100,cover_id:'real-1001'},{number:'111',count:0,cover_id:null}]);
 assert.deepEqual(entries.map(e=>[e.path,e.count,e.coverId]),[['/coloring-pages/numbers/222/',100,'real-222'],['/coloring-pages/numbers/1001/',100,'real-1001']]);
 assert.notEqual(entries[0].intro,entries[1].intro);assert.deepEqual(seriesDirectory(location('/coloring-pages/numbers/222/'),[],[]),[]);
});
test('the main directory uses distinct published group counts and omits empty groups',()=>{
 const entries=seriesDirectory(location('/coloring-pages/'),[],[],{animals:14,education:200,nature:0});
 assert.deepEqual(entries.map(e=>[e.path,e.count]),[['/collections/animals/',14],['/collections/education/',200]]);
});
test('registered new topics appear from publication counts without a hand-maintained card list',()=>{
 const entries=seriesDirectory(location('/coloring-pages/animals/'),[{id:'cats',count:2},{id:'dogs',count:3},{id:'birds',count:0}]);
 assert.ok(entries.some(e=>e.path==='/coloring-pages/cats/'&&e.count===2));assert.ok(entries.some(e=>e.path==='/coloring-pages/dogs/'&&e.count===3));
 assert.equal(new Set(entries.map(e=>e.path)).size,entries.length);assert.ok(!entries.some(e=>e.path==='/coloring-pages/animals/'||e.count===0));
});
test('cover captions keep an accepted observation without inventing a repeated promotion',()=>{
 assert.equal(seriesCaption('Petals surround a curved numeral. Another observation.'),'Petals surround a curved numeral.');
 assert.ok(seriesCaption('Leaf '.repeat(80)).length<=170);
});
