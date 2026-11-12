import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {AGE_BANDS} from '../src/age/model';
import {AGE_COLLECTION_INTROS,AGE_DIRECTORY_INTRO} from '../src/age/browse-copy';
import {ALL_PAGES_SEO,DIRECTORY_SEO} from '../src/seo/catalog-copy';

test('each supported age collection has its own substantial browsing introduction',()=>{
 assert.deepEqual(Object.keys(AGE_COLLECTION_INTROS),AGE_BANDS.map(b=>b.id));
 const paragraphs=[...AGE_DIRECTORY_INTRO,...Object.values(AGE_COLLECTION_INTROS).flat()];
 assert.equal(new Set(paragraphs).size,paragraphs.length);
 for(const band of AGE_BANDS){
  const copy=AGE_COLLECTION_INTROS[band.id];assert.equal(copy.length,2);
  assert.match(copy[0],band.id==='adults'?/for adults/:new RegExp('ages '+band.min+' to '+band.max));
  assert.ok(copy.every(p=>p.split(/\s+/).length>=25));
  assert.match(copy.join(' '),/PDF/);assert.match(copy.join(' '),/image/);assert.match(copy.join(' '),/online|Coloring Studio/);
  assert.doesNotMatch(copy.join(' '),/\bguarantee|\bIQ\b|#\d|Design \d/);
 }
});

test('age detail and directory templates actually render the authored introduction',()=>{
 const detail=readFileSync(new URL('../src/pages/coloring-by-age/[band].astro',import.meta.url),'utf8');
 const directory=readFileSync(new URL('../src/pages/coloring-by-age/index.astro',import.meta.url),'utf8');
 assert.match(detail,/<BrowseIntroduction paragraphs=\{AGE_COLLECTION_INTROS\[band.id\]\}/);
 assert.match(directory,/<BrowseIntroduction paragraphs=\{AGE_DIRECTORY_INTRO\}/);
 for(const source of [detail,directory])assert.match(source,/jc-age-hero--descriptive/);
 // Invalid ages still return the real 404 rather than inheriting another age's copy.
 assert.match(detail,/if\(!band\)return Astro.rewrite\('\/404\/'\)/);
});

test('All and the collection directory keep distinct, useful copy in the shared responsive introduction',()=>{
 assert.notEqual(ALL_PAGES_SEO.intro,DIRECTORY_SEO.intro);
 assert.match(ALL_PAGES_SEO.intro,/full gallery/);
 assert.match(DIRECTORY_SEO.intro,/Open a collection/);
 const source=readFileSync(new URL('../src/components/CatalogView.astro',import.meta.url),'utf8');
 assert.match(source,/<BrowseIntroduction text=\{summary\}/);
 assert.match(source,/landingSummary\(location\)/,'Accepted subject-specific introductions remain in use');
});
