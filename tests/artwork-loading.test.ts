import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {artworkLoading,mediaConnectionOrigin,FIRST_ROW_IMAGES,GALLERY_IMAGE_SIZES,DETAIL_IMAGE_SIZES} from '../src/ui/artwork-loading';
import {collectionCover} from '../src/ui/collection-cover';
import showcase from '../src/content/home-showcase.json';
import type {Content} from '../src/server/types';

test('initial artwork and preloads choose one responsive candidate; later artwork remains lazy',()=>{
 const srcset='/small.webp 240w, /large.webp 400w';
 assert.deepEqual(artworkLoading({priority:true,srcset}),{loading:'eager',decoding:'async',fetchpriority:'high',sizes:GALLERY_IMAGE_SIZES});
 assert.equal(artworkLoading({eager:true,srcset}).sizes,GALLERY_IMAGE_SIZES);
 assert.equal(artworkLoading({srcset}).sizes,`auto, ${GALLERY_IMAGE_SIZES}`);
 assert.equal(artworkLoading({srcset,sizes:'auto, 300px',eager:true}).sizes,'300px');
 assert.equal(artworkLoading().sizes,undefined);
 assert.equal(artworkLoading().loading,'lazy');
 assert.ok(FIRST_ROW_IMAGES<=4,'Do not eagerly load the full collection');
});

test('preconnect is limited to the public JotColoring media origins',()=>{
 assert.equal(mediaConnectionOrigin('https://assets.jotcoloring.com/published/'),'https://assets.jotcoloring.com');
 assert.equal(mediaConnectionOrigin('https://media.jotcoloring.com'),'https://media.jotcoloring.com');
 for(const value of [undefined,'','/api/media','http://assets.jotcoloring.com','https://assets.jotcoloring.com.attacker.test','https://secret@assets.jotcoloring.com'])assert.equal(mediaConnectionOrigin(value),undefined);
});

test('collection covers use reviewed small variants and invalidate replaced curated sources',()=>{
 const pin=showcase[0];
 const cover={id:pin.id,lineArtUrl:`https://assets.jotcoloring.com/published/source.${pin.sourceHash}.webp`,thumbnail:'/api/media/id/catalog_thumb_bw?v=bbb',thumbnailSrcset:'/api/media/id/catalog_thumb_small_bw?v=ccc 240w',width:1024,height:1536,alt:'Reviewed outline'} as Content;
 assert.equal(collectionCover(cover)?.src,pin.home_color);
 assert.equal(collectionCover(cover)?.srcset,pin.homeColorSrcset);
 const replacement=collectionCover({...cover,lineArtUrl:'https://assets.jotcoloring.com/published/replacement.webp'});
 assert.equal(replacement?.src,cover.thumbnail);
 assert.equal(replacement?.srcset,cover.thumbnailSrcset);
 assert.equal(collectionCover(undefined),undefined);
});

test('catalog, ages, detail and streaming share the image policy without touching download sources',()=>{
 const read=(p:string)=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
 for(const path of ['components/CatalogView.astro','pages/coloring-by-age/[band].astro']){
  const source=read(path);assert.match(source,/eager=\{index<FIRST_ROW_IMAGES\}/);assert.match(source,/priority=\{index===0\}/);assert.match(source,/rel="preload" as="image"/);assert.match(source,/GALLERY_IMAGE_SIZES/);
 }
 const detail=read('pages/coloring/[slug].astro');assert.match(detail,/imagesizes=\{DETAIL_IMAGE_SIZES\}/);assert.match(detail,/sizes=\{DETAIL_IMAGE_SIZES\}/);assert.ok(DETAIL_IMAGE_SIZES.includes('100vw'));
 assert.match(read('components/SeriesDirectory.astro'),/srcset=\{image.srcset\}/);
 assert.match(read('components/Card.astro'),/<ArtworkImage/);
 assert.match(read('components/Compare.astro'),/<ArtworkImage/);
 const fragment=read('pages/catalog-fragment.astro');assert.doesNotMatch(fragment,/<Card[^>]+(?:eager|priority)=/);
 assert.match(read('ui/catalog-stream.ts'),/if\(scrollY<8&&grid.getBoundingClientRect\(\).bottom>innerHeight\+200\)return false/);
});
