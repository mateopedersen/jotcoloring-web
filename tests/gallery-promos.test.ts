import test from 'node:test';
import assert from 'node:assert/strict';
import {galleryPromoSpans} from '../src/ui/gallery-promos';
test('gallery tool cards complete each responsive row without hiding or repeating coloring pages',()=>{for(let count=0;count<=100;count++)for(let columns=1;columns<=6;columns++){const spans=galleryPromoSpans(count,columns);assert.equal(spans.length,2);assert.ok(spans.every(n=>n>=1&&n<=columns));assert.equal((count+spans[0]+spans[1])%columns,0);}assert.deepEqual(galleryPromoSpans(18,4),[1,1]);assert.deepEqual(galleryPromoSpans(18,3),[1,2]);assert.deepEqual(galleryPromoSpans(18,2),[1,1]);for(const args of [[-1,4],[18,0],[18,13],[1.5,4]])assert.throws(()=>galleryPromoSpans(args[0],args[1]));});
