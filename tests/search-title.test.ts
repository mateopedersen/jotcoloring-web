import {test} from 'node:test';
import assert from 'node:assert/strict';
import {searchTitle} from '../src/seo/title';

test('title separators use a vertical bar without changing meaningful hyphens',()=>{
 assert.equal(searchTitle('Fox and Rabbit — JotColoring','/coloring/fox/'),'Free Fox and Rabbit | JotColoring');
 assert.equal(searchTitle('Draw & Paint - JotColoring','/drawing-board/'),'Free Draw & Paint | JotColoring');
 assert.equal(searchTitle('Ages 9–12 · JotColoring','/coloring-by-age/9-12/'),'Free Ages 9–12 | JotColoring');
 assert.equal(searchTitle('Long-Necked Dinosaurs | JotColoring','/coloring/dinosaurs/'),'Free Long-Necked Dinosaurs | JotColoring');
 assert.equal(searchTitle('Free Printable Coloring Pages | JotColoring','/'),'Free Printable Coloring Pages | JotColoring');
 assert.equal(searchTitle('Commercial licensing — JotColoring','/licensing/'),'Free Coloring Pages | Commercial licensing | JotColoring');
});


test('subject arithmetic and internal punctuation remain intact in HTML and social titles',()=>{
 assert.equal(searchTitle('Children Beside A Display Showing 999 - 900 = 99 coloring page — JotColoring','/coloring/math/'),'Free Children Beside A Display Showing 999 - 900 = 99 coloring page | JotColoring');
 assert.equal(searchTitle('Numbers 1 – 15 - JotColoring','/coloring-pages/education/numbers/'),'Free Numbers 1 – 15 | JotColoring');
 assert.equal(searchTitle('Count - Color · JotColoring','/coloring/count/'),'Free Count - Color | JotColoring');
 assert.equal(searchTitle('Free 10 - 4 = 6 — JotColoring','/coloring/math/'),'Free 10 - 4 = 6 | JotColoring');
});
