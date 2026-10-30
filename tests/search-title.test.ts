import {test} from 'node:test';
import assert from 'node:assert/strict';
import {searchTitle} from '../src/seo/title';

test('title separators use a vertical bar without changing meaningful hyphens',()=>{
 assert.equal(searchTitle('Fox and Rabbit — JotColoring'),'Fox and Rabbit | JotColoring');
 assert.equal(searchTitle('Draw & Paint - JotColoring'),'Draw & Paint | JotColoring');
 assert.equal(searchTitle('Ages 9–12 · JotColoring'),'Ages 9–12 | JotColoring');
 assert.equal(searchTitle('Long-Necked Dinosaurs | JotColoring'),'Long-Necked Dinosaurs | JotColoring');
});
