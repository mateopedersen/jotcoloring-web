import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {brandedRaster} from '../scripts/data/brand-raster';
import {compactOutline,responsiveCopy} from '../scripts/data/responsive-raster';
import {brandFooterLayout,verifyBrandedRaster} from '../src/server/branding';

test('compact display images preserve line boundaries and the exact logo footer',async()=>{
 const width=400,height=600,pixels=Buffer.alloc(width*height*3);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*3,v=(x*3+y)%256;pixels[i]=pixels[i+1]=pixels[i+2]=v;}
 const source=await brandedRaster(await sharp(pixels,{raw:{width,height,channels:3}}).png().toBuffer(),width,height,true);
 const before=await sharp(source).removeAlpha().raw().toBuffer(),bytes=await compactOutline(source,width,height);
 const after=await sharp(bytes).removeAlpha().raw().toBuffer(),footer=brandFooterLayout(width,height).footer.y*width*3;
 for(let i=0;i<footer;i++)assert.equal(after[i]<110,before[i]<110);
 assert.deepEqual(after.subarray(footer),before.subarray(footer));verifyBrandedRaster(after,width,height,3,true);
 const small=await responsiveCopy(bytes,240,true);assert.equal(small.width,240);assert.equal(small.height,360);
 const same=await responsiveCopy(small.bytes,600,true);assert.equal(same.width,240);assert.equal(same.height,360);
});

test('unbranded images are rejected instead of being presented as reviewed derivatives',async()=>{
 const input=await sharp({create:{width:400,height:600,channels:3,background:'#fff'}}).png().toBuffer();
 await assert.rejects(()=>responsiveCopy(input,240,true),/logo trademark/);
});
