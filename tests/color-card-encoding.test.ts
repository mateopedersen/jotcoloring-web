import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {brandedRaster,brandedColorCardWebP} from '../scripts/data/brand-raster';
import {verifyBrandedRaster} from '../src/server/branding';
test('true-color fallback retains detailed colors when a palette cannot meet the quality bound',async()=>{
 const width=180,height=240,rgb=Buffer.alloc(width*height*3);
 let seed=17;for(let i=0;i<rgb.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;rgb[i]=seed>>>24;}
 const source=await sharp(rgb,{raw:{width,height,channels:3}}).png().toBuffer(),reference=await brandedRaster(source,width,height),before=await sharp(reference).removeAlpha().raw().toBuffer();
 const encoded=await brandedColorCardWebP(source,width,height,250000,.05),after=await sharp(encoded).removeAlpha().raw().toBuffer();
 assert.deepEqual(after,before);verifyBrandedRaster(after,width,height,3,false);
 await assert.rejects(()=>brandedColorCardWebP(source,width,height,50,.05),/No color encoding satisfies/);
});
