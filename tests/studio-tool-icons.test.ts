import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {toolIcon} from '../src/studio/tool-icons';
import {iconDocument} from '../src/icons/render';
import {ICON_SPRITE} from '../src/icons/registry';

test('all Studio tools resolve to distinct, visible vector illustrations without repeated inline gradient IDs',async()=>{
 const names=['brush','fill','eraser','picker','move','zoom'],renders=new Set<string>();
 for(const name of names){
  const svg=toolIcon(name);assert.ok(svg.includes(`${ICON_SPRITE}#${name}`));assert.ok(!svg.includes('<defs>'));
  const pixels=await sharp(Buffer.from(await iconDocument(name,96))).ensureAlpha().raw().toBuffer();
  let visible=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)visible++;
  assert.ok(visible>500,`${name} did not render visibly`);renders.add(createHash('sha256').update(pixels).digest('hex'));
 }
 assert.equal(renders.size,names.length);
});
