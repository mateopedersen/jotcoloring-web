import test from 'node:test';import assert from 'node:assert/strict';
import captions from '../src/content/home-captions.json';
import {artworkSummary,artworkText} from '../src/ui/artwork-text';
test('home captions stay concise and work with both legacy and CDN source URLs',()=>{
 for(const [id,entry]of Object.entries(captions)){
  const item={id,title:entry.title,description:'The full detail description remains available.',alt:'The original text alternative.',lineArtUrl:`/api/media/${id}/printable_webp_bw?v=${entry.sourceHash}`};
  assert.equal(artworkSummary(item),entry.summary);assert.ok(entry.summary.length<=80);assert.match(entry.summary,/[.!?]$/);
  assert.equal(artworkSummary({...item,lineArtUrl:`https://assets.jotcoloring.com/published/${id}/6/printable_webp_bw-${entry.sourceHash}.webp`}),entry.summary);
  assert.equal(artworkText(item).description,item.description);assert.equal(artworkText(item).alt,item.alt);
 }
});
test('replaced images and renamed subjects cannot reuse a stale home caption',()=>{
 const entry=captions['jc-friendly-dragon'];
 const fresh={id:'jc-friendly-dragon',title:entry.title,description:'A new scene with broad leaves.',alt:'Broad leaves.',lineArtUrl:'/api/media/jc-friendly-dragon/printable_webp_bw?v='+'f'.repeat(24)};
 assert.equal(artworkSummary(fresh),'A new scene with broad leaves.');
 assert.equal(artworkSummary({...fresh,title:'A New Subject',lineArtUrl:`/api/media/jc-friendly-dragon/printable_webp_bw?v=${entry.sourceHash}`}),fresh.description);
 const unknown={...fresh,id:'a-future-item',description:'A very long description '.repeat(20),alt:'A turtle beside a shell.'};
 assert.equal(artworkSummary(unknown),unknown.alt);assert.ok(!artworkSummary(unknown).includes('…'));
});
