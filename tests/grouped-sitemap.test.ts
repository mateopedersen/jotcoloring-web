import test from 'node:test';
import assert from 'node:assert/strict';
import {groupedSitemap,sitemapIndex,PUBLIC_SITEMAP_LIMIT} from '../src/server/sitemap';
import {publicCachePolicy} from '../src/server/public-cache';
import {sha256} from '../src/server/http';
import type {Env} from '../src/server/types';

const origin='https://jotcoloring.com',url=new URL(origin+'/sitemap.xml');
async function fixture(count=11001){
 const objects=new Map<string,string>(),rows:any[]=[],reads:string[]=[];
 async function add(segment:string,entries:string[]){
  const body='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'+entries.join('')+'</urlset>';
  const etag=await sha256(new TextEncoder().encode(body)),key='sitemaps/v1/'+segment+'/'+etag+'.xml';objects.set(key,body);
  const old=rows.findIndex(r=>r.segment===segment);if(old>=0)rows.splice(old,1);
  rows.push({segment,object_key:key,etag,url_count:entries.length,bytes:new TextEncoder().encode(body).length,generated_at:'2026-11-09T09:00:00.000Z'});
 }
 const entry=(path:string)=>'<url><loc>'+origin+path+'</loc><lastmod>2026-11-08T10:11:12.000Z</lastmod></url>';
 await add('static',['/','/about/','/studio/','/create/photo/','/coloring-pages/','/coloring-pages/all/','/coloring-pages/pandas/','/coloring-pages/numbers/222/','/collections/ocean/','/coloring-by-age/6-8/'].map(entry));
 const drawing=(i:number)=>'<url><loc>'+origin+'/coloring/page-'+i+'/</loc><lastmod>2026-11-08T10:11:12.000Z</lastmod><image:image><image:loc>https://assets.jotcoloring.com/published/preview-'+i+'.webp</image:loc></image:image><image:image><image:loc>https://assets.jotcoloring.com/published/print-'+i+'.webp</image:loc></image:image></url>';
 for(let start=0;start<count;start+=1000)await add(String(start/1000+1),Array.from({length:Math.min(1000,count-start)},(_,i)=>drawing(start+i)));
 const env={CATALOG_DB:{prepare(sql:string){assert.match(sql,/^SELECT segment,object_key,etag,generated_at,url_count,bytes FROM discovery_fragment/);return{all:async()=>({results:rows})};}},PUBLISHED:{async get(key:string){reads.push(key);const body=objects.get(key);return body?{size:new TextEncoder().encode(body).length,text:async()=>body}:null;}}} as unknown as Env;
 return{env,objects,rows,reads,add,drawing};
}
const records=(xml:string)=>xml.match(/<url>/g)?.length||0;
test('public index separates page types with clean direct child paths and no nested index',async()=>{
 const f=await fixture();const xml=await(await sitemapIndex(f.env,url)).text();
 const paths=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>new URL(m[1]).pathname);
 assert.deepEqual(paths,['/sitemaps/pages/1.xml','/sitemaps/coloring-pages/1.xml','/sitemaps/coloring/1.xml','/sitemaps/coloring/2.xml','/sitemaps/images/1.xml','/sitemaps/images/2.xml','/sitemaps/images/3.xml']);
 assert.equal(f.reads.length,0,'the index reads fragment metadata only');
 const allPages:string[]=[],allImages:string[]=[];
 for(const path of paths){
  const [,kind,part]=path.match(/^\/sitemaps\/([^/]+)\/(\d+)\.xml$/)!;
  const response=await groupedSitemap(f.env,url,kind,part),body=await response.text();
  assert.equal(response.status,200);assert.ok(records(body)<=PUBLIC_SITEMAP_LIMIT);
  const images=body.match(/<image:loc>/g)?.length||0;assert.ok(images<=PUBLIC_SITEMAP_LIMIT);
  assert.doesNotMatch(body,/<sitemapindex/);assert.match(body,/<lastmod>2026-11-08T10:11:12.000Z<\/lastmod>/);
  const locs=[...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
  if(kind==='coloring'){assert.equal(images,0);allPages.push(...locs);assert.ok(locs.every(p=>new URL(p).pathname.startsWith('/coloring/')));}
  if(kind==='images'){assert.equal(images,records(body)*2);allImages.push(...[...body.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map(m=>m[1]));}
  if(kind==='pages'){assert.equal(records(body),4);assert.ok(!body.includes('/coloring-pages/'));}
  if(kind==='coloring-pages'){assert.equal(records(body),6);assert.ok(body.includes('/collections/ocean/'));assert.ok(body.includes('/coloring-pages/numbers/222/'));}
 }
 assert.equal(allPages.length,11001);assert.equal(new Set(allPages).size,11001);assert.equal(allImages.length,22002);assert.equal(new Set(allImages).size,22002);
 assert.equal(allPages[9999],origin+'/coloring/page-9999/');assert.equal(allPages[10000],origin+'/coloring/page-10000/');
 assert.ok(allImages.every(p=>new URL(p).hostname==='assets.jotcoloring.com'));
});
test('new immutable publication changes the grouped response without rewriting legacy fragments',async()=>{
 const f=await fixture(2);const before=await groupedSitemap(f.env,url,'coloring','1'),oldKey=f.rows.find(r=>r.segment==='1').object_key,oldBody=f.objects.get(oldKey);
 await f.add('1',[f.drawing(0),f.drawing(1),f.drawing(2)]);
 const after=await groupedSitemap(f.env,url,'coloring','1');assert.notEqual(after.headers.get('etag'),before.headers.get('etag'));assert.equal(records(await after.text()),3);assert.equal(f.objects.get(oldKey),oldBody);
 assert.equal(records(await(await groupedSitemap(f.env,url,'images','1')).text()),3);
});
test('invalid paths, missing immutable objects and inconsistent metadata fail closed',async()=>{
 const f=await fixture(2);
 for(const [kind,part]of [['unknown','1'],['images','0'],['images','01'],['images','2'],['coloring','../1']])await assert.rejects(()=>groupedSitemap(f.env,url,kind,part),(e:any)=>e.status===404);
 const row=f.rows.find(r=>r.segment==='1');f.objects.delete(row.object_key);
 await assert.rejects(()=>groupedSitemap(f.env,url,'coloring','1'),(e:any)=>e.status===503);
 row.url_count=10001;await assert.rejects(()=>sitemapIndex(f.env,url),(e:any)=>e.status===503);
});
test('grouped sitemap cache is publication-aware and rejects private or malformed requests',()=>{
 for(const kind of ['pages','coloring-pages','coloring','images'])assert.deepEqual(publicCachePolicy(new Request(origin+'/sitemaps/'+kind+'/1.xml')),{kind:'xml',catalog:true,seconds:600});
 assert.equal(publicCachePolicy(new Request(origin+'/sitemaps/images/1.xml',{headers:{Cookie:'session=private'}})),undefined);
 for(const path of ['/sitemaps/images/0.xml','/sitemaps/images/01.xml','/sitemaps/unknown/1.xml','/sitemaps/images/1.xml?token=x'])assert.equal(publicCachePolicy(new Request(origin+path)),undefined);
});
