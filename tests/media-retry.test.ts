import test from 'node:test';
import assert from 'node:assert/strict';
import {retryCurrentMedia} from '../src/ui/media-retry';
function image(source:string,srcset=''){
 const result={dataset:{} as Record<string,string>,src:source,srcset,sizes:'300px',getAttribute(name:string){return name==='src'?this.src:null;},removeAttribute(name:string){if(name==='srcset')this.srcset='';if(name==='sizes')this.sizes='';}};
 return result as unknown as HTMLImageElement;
}
test('missing responsive files fall back to the original and stale originals retry only once',()=>{
 const original='/api/media/content-one/catalog_preview_bw?v='+('a'.repeat(24)),img=image(original,'/missing-copy.webp 600w');
 retryCurrentMedia(img,'https://jot.test/coloring/test/');assert.equal(img.src,original);assert.equal(img.srcset,'');assert.equal(img.sizes,'');assert.equal(img.dataset.mediaRetried,undefined);
 retryCurrentMedia(img,'https://jot.test/coloring/test/');const refreshed=new URL(img.src,'https://jot.test');assert.equal(refreshed.pathname,'/api/media/content-one/catalog_preview_bw');assert.equal(refreshed.searchParams.has('v'),false);assert.ok(refreshed.searchParams.has('refresh'));
 const saved=img.src;retryCurrentMedia(img,'https://jot.test/coloring/test/');assert.equal(img.src,saved);
});
test('cross-origin originals remain on their declared host and do not enter the API refresh flow',()=>{
 const source='https://assets.jotcoloring.com/published/original.webp',img=image(source,'https://assets.jotcoloring.com/responsive/missing.webp 240w');
 retryCurrentMedia(img,'https://jotcoloring.com/');assert.equal(img.src,source);assert.equal(img.srcset,'');retryCurrentMedia(img,'https://jotcoloring.com/');assert.equal(img.src,source);assert.equal(img.dataset.mediaRetried,undefined);
});
