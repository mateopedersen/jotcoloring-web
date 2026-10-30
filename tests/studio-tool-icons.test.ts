import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import sharp from 'sharp';
import {toolIcon,STUDIO_TOOL_NAMES,STUDIO_TOOL_SPRITE} from '../src/studio/tool-icons';
const source=readFileSync('public'+STUDIO_TOOL_SPRITE,'utf8'),defs=source.match(/<defs>[\s\S]*?<\/defs>/)![0];
function documentFor(name:string,size:number){const body=source.match(new RegExp(`<symbol id="${name}"[^>]*>([\\s\\S]*?)<\\/symbol>`))![1];return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="${size}" height="${size}" fill="none">${defs}${body}</svg>`;}
test('all thirteen Studio controls have distinct visible artwork with transparent edges at mobile and review sizes',async()=>{
 assert.equal(STUDIO_TOOL_NAMES.length,13);const renders=new Set<string>();
 for(const name of STUDIO_TOOL_NAMES){
  const markup=toolIcon(name);assert.ok(markup.includes(`${STUDIO_TOOL_SPRITE}#${name}`));assert.ok(!markup.includes('<defs>'));
  for(const size of [30,96]){const pixels=await sharp(Buffer.from(documentFor(name,size))).ensureAlpha().raw().toBuffer();let visible=0,edge=0;for(let y=0;y<size;y++)for(let x=0;x<size;x++){const a=pixels[(y*size+x)*4+3];if(a>40)visible++;if((x===0||y===0||x===size-1||y===size-1)&&a>70)edge++;}assert.ok(visible>size*size*.13,`${name}@${size} is too small`);assert.equal(edge,0,`${name}@${size} clips`);if(size===96)renders.add(createHash('sha256').update(pixels).digest('hex'));}
 }
 assert.equal(renders.size,13);assert.doesNotMatch(source,/<script|foreignObject|\bon\w+=/i);
 assert.ok(!toolIcon('" onload="oops').includes('onload'));
});
