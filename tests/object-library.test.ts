import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createCanvas, Path2D } from '@napi-rs/canvas';
import { OBJECT_LIBRARY, OBJECT_CATEGORIES, searchObjects, OBJECT_LIBRARY_DESCRIPTION } from '../src/studio/object-library';
import { drawObject, hitObject, objectSvg } from '../src/studio/objects';

(globalThis as any).Path2D = Path2D;

test('library has exactly 500 distinct insertable variants from 25 disclosed drawings', () => {
  assert.equal(OBJECT_LIBRARY.length,500);
  assert.equal(new Set(OBJECT_LIBRARY.map(item=>item.id)).size,500);
  const families = new Map<string,typeof OBJECT_LIBRARY>();
  for (const item of OBJECT_LIBRARY) families.set(item.baseId,[...(families.get(item.baseId)||[]),item]);
  assert.equal(families.size,25);
  for (const [base,items] of families) {
    assert.equal(items.length,20,base);
    assert.equal(new Set(items.map(item=>item.variantId)).size,20,base);
    assert.equal(new Set(items.map(item=>JSON.stringify(item.regions))).size,20,base);
  }
  assert.match(OBJECT_LIBRARY_DESCRIPTION,/25 original drawings/);
});

test('all native paths parse, stay inside the canvas, and never carry markup', () => {
  for (const item of OBJECT_LIBRARY) {
    assert.equal(item.width,256); assert.equal(item.height,256);
    assert.ok(OBJECT_CATEGORIES.includes(item.category));
    assert.ok(item.regions.length >= 4,item.id);
    for (const part of item.regions) {
      assert.match(part.id,/^[a-z][a-z0-9-]*$/);
      assert.ok(part.label.length>0);
      if(part.fill) assert.match(part.fill,/^#[0-9a-f]{6}$/i);
    }
    for (const path of [...item.regions.map(part=>part.path),...(item.outlinePaths||[])]) {
      assert.match(path,/^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\s-]+$/,item.id);
      assert.doesNotMatch(path,/NaN|Infinity|undefined|[<>]/,item.id);
      const bounds = new Path2D(path).computeTightBounds();
      assert.ok(bounds.every(Number.isFinite),item.id);
      assert.ok(bounds[0]>=1&&bounds[1]>=1&&bounds[2]<=255&&bounds[3]<=255,`${item.id}: ${bounds}`);
    }
  }
});

test('every variation rasterizes to distinct visible artwork without a blank result', () => {
  const fingerprints = new Set<string>();
  for(const definition of OBJECT_LIBRARY) {
    const canvas=createCanvas(256,256),ctx=canvas.getContext('2d');
    drawObject(ctx as any,{id:'test',definition,x:128,y:128,scale:1,rotation:0,visible:true,colors:{}});
    const raw=ctx.getImageData(0,0,256,256).data;
    let ink=0;for(let i=0;i<raw.length;i+=4)if(raw[i+3]>0&&raw[i]<100)ink++;
    assert.ok(ink>300,`${definition.id}: only ${ink} ink pixels`);
    fingerprints.add(createHash('sha256').update(raw).digest('hex'));
  }
  assert.equal(fingerprints.size,500);
});

test('one semantic ear selection colors both ears and hit-tests return the same region', () => {
  const definition=OBJECT_LIBRARY.find(item=>item.baseId==='rabbit')!;
  const canvas=createCanvas(256,256),ctx=canvas.getContext('2d');
  const object={id:'rabbit',definition,x:128,y:128,scale:1,rotation:0,visible:true,colors:{ears:'#ee3344'}};
  drawObject(ctx as any,object);
  const ears=definition.regions.filter(region=>region.id==='ears');
  assert.equal(ears.length,2);
  const hits=new Set<number>();
  for(let y=1;y<70;y++)for(let x=1;x<255;x++){
    const pixel=ctx.getImageData(x,y,1,1).data;
    if(pixel[0]===238&&pixel[1]===51&&pixel[2]===68){
      const hit=hitObject([object],{x,y},ctx as any);
      assert.equal(hit?.region.id,'ears');hits.add(x<128?0:1);
    }
  }
  assert.equal(hits.size,2);
});

test('search combines words and category filters and serialized SVG escapes metadata', () => {
  assert.equal(searchObjects('', 'Animals').length,200);
  assert.equal(searchObjects('rocket hearts').length,4);
  assert.equal(searchObjects('kitten','Vehicles').length,0);
  assert.equal(searchObjects('POTTED rose stars cluster','Flowers & plants').length,1);
  assert.equal(searchObjects('no matching object').length,0);
  const svg=objectSvg({...OBJECT_LIBRARY[0],title:'<script>alert(1)</script>'});
  assert.doesNotMatch(svg,/<script|onload|foreignObject|javascript:/i);
  assert.match(svg,/<svg/);
});
