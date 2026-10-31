import test from 'node:test';import assert from 'node:assert/strict';
import {analyzeDetailPixels,recommendAge} from '../src/age/model';
test('broad enclosed spaces keep fractions bounded despite floating-point summation order',()=>{
 const width=200,height=200,rgb=new Uint8Array(width*height*3).fill(255);
 // Three disjoint broad coloring spaces reproduce the simple-mushroom failure.
 for(const [left,top,right,bottom] of [[5,5,59,161],[70,5,129,132],[138,5,190,99]])for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)if(x===left||x===right||y===top||y===bottom)rgb.fill(0,(y*width+x)*3,(y*width+x)*3+3);
 const metrics=analyzeDetailPixels(rgb,width,height);assert.equal(metrics.regions,3);assert.equal(metrics.largeAreaShare,1);assert.equal(metrics.wideAreaShare,1);assert.equal(recommendAge(metrics,[1,0,0,0,0]).band,'3-5');
 assert.throws(()=>recommendAge({...metrics,largeAreaShare:1.01},[1,0,0,0,0]),/consistent/);
});
