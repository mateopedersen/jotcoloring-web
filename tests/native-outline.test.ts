import test from 'node:test';import assert from 'node:assert/strict';import sharp from 'sharp';import {createCanvas,loadImage} from '@napi-rs/canvas';import {nativeOutlineWebP} from '../scripts/data/brand-raster';import {verifyBrandedRaster} from '../src/server/branding';import {lineMask} from '../src/studio/render';import {floodRegion} from '../src/studio/flood-fill';
(globalThis as any).document={createElement:()=>createCanvas(1,1)};
test('printable footer preserves every native outline pixel, including one-pixel contours and odd dimensions',async()=>{
 for(const [width,height] of [[128,160],[257,391],[1024,1536],[1372,1829]]){const data=Buffer.alloc(width*height*3,255);for(let y=12;y<height-12;y++)for(let x=12;x<width-12;x++)if(x===12||y===12||x===width-13||y===height-13||x===Math.floor(width/2))data.fill(0,(y*width+x)*3,(y*width+x)*3+3);const png=await sharp(data,{raw:{width,height,channels:3}}).png().toBuffer();const result=await nativeOutlineWebP(png);assert.equal(result.artwork.width,width);assert.equal(result.artwork.height,height);assert.ok(result.width>=width&&result.height>height);const decoded=await sharp(result.bytes).extract({left:result.artwork.x,top:0,width,height}).removeAlpha().raw().toBuffer();assert.deepEqual(decoded,data);const raw=await sharp(result.bytes).ensureAlpha().raw().toBuffer();assert.doesNotThrow(()=>verifyBrandedRaster(raw,result.width,result.height,4,true));}
});
test('footer removal keeps a faint one-pixel diagonal contour closed for actual Studio fill',async()=>{
 const width=257,height=391,data=Buffer.alloc(width*height*3,255),cx=128,cy=160,radius=70;
 for(let y=cy-radius;y<=cy+radius;y++)for(let x=cx-radius;x<=cx+radius;x++)if(Math.abs(x-cx)+Math.abs(y-cy)===radius)data.fill(90,(y*width+x)*3,(y*width+x)*3+3);
 const png=await sharp(data,{raw:{width,height,channels:3}}).png().toBuffer(),framed=await nativeOutlineWebP(png),image=await loadImage(framed.bytes),mask=lineMask(image as any,framed.width,framed.height,true),pixels=mask.getContext('2d')!.getImageData(0,0,framed.width,framed.height).data;
 const spans=floodRegion(pixels,framed.width,framed.height,cx*framed.width/width,cy*framed.height/height);let area=0;assert.ok(spans.length>0);
 for(let i=0;i<spans.length;i+=3){assert.ok(spans[i]>0&&spans[i]<framed.height-1);assert.ok(spans[i+1]>0&&spans[i+2]<framed.width-1);area+=spans[i+2]-spans[i+1]+1;}
 assert.ok(area>8000&&area<13000,'the diamond fills without reaching the outer white background');
});
