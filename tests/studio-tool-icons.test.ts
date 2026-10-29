import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {toolIcon} from '../src/studio/tool-icons';

test('studio tool illustrations render visibly and repeated gradient IDs do not collide',async()=>{
 const names=['brush','fill','eraser','picker','move','zoom'];
 const iconIds=new Set<string>(),renders=new Set<string>();
 for(const name of names){
  for(let instance=0;instance<2;instance++){
   const svg=toolIcon(name),ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
   assert.ok(ids.length>0);
   for(const id of ids){assert.ok(!iconIds.has(id),`Duplicate SVG gradient: ${id}`);iconIds.add(id);}
   const pixels=await sharp(Buffer.from(svg)).resize(96,96).ensureAlpha().raw().toBuffer();
   let visible=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)visible++;
   assert.ok(visible>500,`${name} did not render visibly`);
   if(instance===0)renders.add(createHash('sha256').update(pixels).digest('hex'));
  }
 }
 assert.equal(renders.size,names.length,'Each tool should have its own illustration');
});
