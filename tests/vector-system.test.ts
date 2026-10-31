import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import catalog from '../src/icons/catalog.json';
import {ICON_SPRITE,illustrationHref,illustrationImageHref,illustrationMarkup} from '../src/icons/registry';
import {iconDocument} from '../src/icons/render';
import {componentArt,siteIcon} from '../scripts/social/render';

test('the shared sprite has unique IDs, closed internal references, a content hash and no executable content',async()=>{
 const source=await fs.readFile('public'+ICON_SPRITE,'utf8');
 const ids=[...source.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
 for(const m of source.matchAll(/(?:href="#|url\(#)([^"\)]+)/g))assert.ok(ids.includes(m[1]),`Missing SVG reference: ${m[1]}`);
 for(const item of [...catalog.icons,...catalog.scenes])assert.ok(ids.includes(item.id));
 assert.ok(ICON_SPRITE.includes(createHash('sha256').update(source).digest('hex').slice(0,12)));
 assert.ok(!/<script|foreignObject|\bon\w+=|https?:\/\//i.test(source.replace('http://www.w3.org/2000/svg','')));
 assert.ok(!illustrationHref('\" onload=\"alert(1)').includes('onload'));
 assert.ok(!illustrationMarkup('<script>').includes('<script>'));
});

test('all illustrations render at button and review sizes with a safe transparent edge',async()=>{
 const failures:string[]=[];
 for(const item of catalog.icons){
  for(const size of [24,48,128]){
   const {data,info}=await sharp(Buffer.from(await iconDocument(item.id,size))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   let visible=0,edge=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const a=data[(y*info.width+x)*4+3];if(a>50)visible++;if((x===0||y===0||x===info.width-1||y===info.height-1)&&a>80)edge++;}
   if(visible<size*size*.06)failures.push(`${item.id}@${size}: empty or too small`);
   if(size===128&&edge>2)failures.push(`${item.id}: artwork clips the viewBox (${edge} edge pixels)`);
  }
 }
 assert.deepEqual(failures,[]);
});

test('all page scenes render without broken nested symbol references',async()=>{
 for(const item of catalog.scenes){
  const {data}=await sharp(Buffer.from(await iconDocument(item.id,420))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let pixels=0;for(let i=3;i<data.length;i+=4)if(data[i]>100)pixels++;
  assert.ok(pixels>9000,`${item.id} is missing its artwork`);
 }
});

test('social image rendering uses the new icon registry and supports both illustration components',async()=>{
 for(const name of ['animals','studio','photo','fantasy']){const image=await siteIcon(name);assert.equal((await sharp(image).metadata()).width,360);}
 for(const name of ['CookieArt','LostColoringArt'] as const){const image=await componentArt(name);assert.equal((await sharp(image).metadata()).width,600);}
});

test('committed vectors match the editable drawing source',()=>{execFileSync('python3',['scripts/icons/build-svg-library.py','--check'],{stdio:'pipe'});});

test('browser icons have self-contained paint servers and match their original artwork',async()=>{
 execFileSync('python3',['scripts/icons/build-browser-icons.py','--check'],{stdio:'pipe'});
 for(const item of catalog.icons){
  const url=illustrationImageHref(item.id);
  const source=await fs.readFile('public'+url,'utf8');
  assert.ok(url.includes(ICON_SPRITE.split('-').at(-1)!.replace('.svg','')),item.id);
  const ids=new Set([...source.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  for(const ref of source.matchAll(/(?:href="#|url\(#)([^"\)]+)/g))assert.ok(ids.has(ref[1]),`${item.id}: missing ${ref[1]}`);
  const expected=await sharp(Buffer.from(await iconDocument(item.id,128))).resize(128,128).ensureAlpha().raw().toBuffer();
  const actual=await sharp(Buffer.from(source)).resize(128,128).ensureAlpha().raw().toBuffer();
  assert.deepEqual(actual,expected,`${item.id}: self-contained artwork differs`);
 }
});

test('subject navigation renders distinct artwork instead of collapsing topics to one animal',async()=>{
 const {ROOT_CATEGORIES,childCategories}=await import('../src/taxonomy/catalog');
 for(const entries of [ROOT_CATEGORIES.map(c=>c.icon),childCategories('animals').map(c=>c.icon),catalog.icons.filter(c=>c.group==='Site navigation').map(c=>c.id)]){
  const hashes=new Set<string>();for(const id of entries){const pixels=await sharp(Buffer.from(await iconDocument(id,48))).ensureAlpha().raw().toBuffer();hashes.add(createHash('sha256').update(pixels).digest('hex'));}assert.equal(hashes.size,entries.length,'Each subject needs its own visible silhouette');
 }
});
