import test from 'node:test';import assert from 'node:assert/strict';
import showcase from '../src/content/home-showcase.json';
import type {Content} from '../src/server/types';
import {homeGallerySelection,HOME_SHOWCASE_KEYS} from '../src/ui/home-selection';
const fixture=()=>showcase.map(p=>({id:p.id,category:p.id.includes('butterfly')?'flowers':'animals',lineArtUrl:`https://assets.jotcoloring.com/line.${p.sourceHash}.webp`,thumbnail:'unreviewed-new-thumb',home_color:'unreviewed-new-color'}) as Content);
test('new publications never enter any homepage view automatically',()=>{
 const original=fixture(),extra=Array.from({length:100},(_,i)=>({...original[0],id:'new-'+i}));
 for(const tab of ['trending','newest','easy','detailed'])assert.deepEqual(homeGallerySelection([...extra,...original],tab),homeGallerySelection(original,tab));
 const output=homeGallerySelection(original);assert.equal(output.length,18);assert.deepEqual(output.map(i=>i.id),HOME_SHOWCASE_KEYS);assert.equal(output[0].home_color,showcase[0].home_color);
});
test('an unpublished or replaced source leaves the showcase instead of showing unreviewed artwork',()=>{
 const items=fixture();items[0].lineArtUrl='/replaced-new-source.webp';
 assert.ok(!homeGallerySelection([null,...items]).some(item=>item.id===items[0].id));assert.deepEqual(homeGallerySelection([]),[]);
});
