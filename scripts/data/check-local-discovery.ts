/** Read-only HTTP checks against the existing local preview. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {categories,animalCategories} from '../../src/ui/categories';
import type {Content} from '../../src/server/types';
const origin='http://localhost:4322';
async function json(path:string){const r=await fetch(origin+path);assert.equal(r.status,200,path);return r.json();}
const items=(await json('/api/catalog?limit=48')).items as Content[],search=[];
const checks:Array<[string,string[]]>=items.map(i=>[i.title,[i.slug]]);
checks.push(['kitty',['sleepy-kitten']],['bunny',['woodland-friends']],['dinosuar',['dinosaur-valley']],['flwoer',['hibiscus-garden','butterfly-garden','botanical-mandala']],['turreted castle',['friendly-dragon']],['fox with flowers',['woodland-friends']],['for adults',['botanical-mandala']]);
for(const [q,expected] of checks){const data=await json('/api/search?'+new URLSearchParams({q,limit:'48'}));assert.ok(expected.includes(data.items[0]?.slug),q+' top result');if(q==='flwoer'){assert.deepEqual(new Set(data.items.slice(0,3).map((i:Content)=>i.slug)),new Set(expected));assert.equal(data.search_match.mode,'corrected');}search.push({q,total:data.total,mode:data.search_match.mode,first:data.items[0]?.slug});}
for(const q of ['fox moon','zzzxqxyz','" OR 1=1 --']){const data=await json('/api/search?'+new URLSearchParams({q}));assert.equal(data.total,0,q);search.push({q,total:0});}
const kids=await json('/api/search?q=for+kids&limit=48');assert.ok(kids.items.length>0&&kids.items.every((i:Content)=>i.age_groups.includes('kids')));const age=await json('/api/search?q=age+7&limit=48');assert.ok(age.items.length>0&&age.items.every((i:Content)=>i.recommendedAge?.band==='6-8'));
assert.equal((await json('/api/search?q=kitty&category=flowers')).total,0);
const first=await json('/api/search?q=flower&limit=2'),second=await json('/api/search?'+new URLSearchParams(first.next_cursor?{q:'flower',limit:'2',cursor:first.next_cursor}:{q:'flower',limit:'2',page:'2'}));assert.equal(new Set([...first.items,...second.items].map((i:Content)=>i.id)).size,4);
const paths=['/coloring-pages/',...categories.map(c=>`/coloring-pages/${c.id}/`),...animalCategories.map(c=>`/coloring-pages/animals/${c.id}/`),'/coloring-pages/?q=fox','/coloring-pages/?q=flwoer','/coloring-pages/?q=for+adults','/coloring-pages/animals/?recommended_age=6-8','/coloring-pages/?q=zzzxqxyz'];
const pages=[];
for(const path of paths){const r=await fetch(origin+path),html=await r.text();assert.equal(r.status,200,path);const cards=[...html.matchAll(/<article\b[^>]*data-collection-id="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)];assert.equal(new Set(cards.map(c=>c[1])).size,cards.length);
 for(const [,id,card] of cards){const href=card.match(/class="jc-collection-title" href="([^"]+)"/)?.[1]?.replaceAll('&amp;','&');assert.ok(href,id);const target=new URL(href!,origin),parts=target.pathname.split('/').filter(Boolean),params=new URLSearchParams(target.search);params.set('category',parts[1]);if(parts[2])params.set('subcategory',parts[2]);params.set('limit','1');const actual=await json('/api/catalog?'+params);const count=Number(card.match(/class="jc-collection-meta"[^>]*><strong>([\d,]+)/)?.[1]?.replaceAll(',',''));assert.equal(count,actual.total,path+' / '+id+' count');const previews=[...card.matchAll(/<img[^>]*src="([^"]+)"/g)].map(m=>m[1]);assert.ok(previews.length>=1&&previews.length<=3);assert.equal(new Set(previews).size,previews.length);}
 const ids=cards.map(c=>c[1]);if(path==='/coloring-pages/animals/woodland/')assert.ok(!ids.includes('flowers')&&!ids.includes('pets'));if(path==='/coloring-pages/food/')assert.ok(!ids.includes('holidays'));if(path.includes('zzzx'))assert.equal(cards.length,0);pages.push({path,collections:ids});}
await fs.mkdir('outputs/discovery',{recursive:true});await fs.writeFile('outputs/discovery/http.json',JSON.stringify({search,pages,kids:kids.items.length,age7:age.items.length},null,2));console.log(JSON.stringify({searchChecks:search.length,collectionViews:pages.length,pagination:true,facets:true,counts:true}));
