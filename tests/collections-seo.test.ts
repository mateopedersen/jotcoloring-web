import test from 'node:test';import assert from 'node:assert/strict';
import {ROOT_CATEGORIES,COLORING_TAXONOMY,categoryPath} from '../src/taxonomy/catalog';
import {ROOT_COLLECTION_IDS,ALL_COLORING_PAGES_PATH,catalogAllPath} from '../src/taxonomy/routes';
import {catalogLocation,catalogRedirect} from '../src/taxonomy/catalog-location';
import {legacyCatalogRedirects} from '../src/taxonomy/navigation-migration';
import {catalogBreadcrumbs} from '../src/taxonomy/catalog-breadcrumbs';
import {landingIdentity} from '../src/taxonomy/landing-identity';
import {selectFilterURL} from '../src/ui/filter-url';
import {streamQuery} from '../src/taxonomy/stream-query';
import {parseCatalogQuery} from '../src/server/catalog';
import {buildSuggestions} from '../src/ui/search-suggestions-model';
import {seriesDirectory} from '../src/taxonomy/series-directory';
import {PHOTO_SEO,DIRECTORY_SEO,ALL_PAGES_SEO,PHOTO_FAQ} from '../src/seo/catalog-copy';
import {pageSchema} from '../src/seo/page';
test('broad classifications have collection URLs while specific subjects retain their stable subject URLs',()=>{
 assert.deepEqual([...ROOT_COLLECTION_IDS].sort(),ROOT_CATEGORIES.map(c=>c.id).sort());
 for(const c of COLORING_TAXONOMY){const path=categoryPath(c.id);assert.ok(path.startsWith(c.parent?'/coloring-pages/':'/collections/'),c.id);assert.equal(catalogLocation(path)?.path,path);assert.equal(catalogRedirect(new URL('https://jotcoloring.com'+path)),undefined);}
 assert.equal(categoryPath('ocean'),'/collections/ocean/');assert.equal(categoryPath('fish'),'/coloring-pages/fish/');
 assert.equal(catalogLocation('/collections/fish/'),undefined);assert.equal(catalogLocation('/collections/no-such-collection/'),undefined);
});
test('every previously published collection and nested subject address reaches its new canonical target in one hop',()=>{
 for(const row of legacyCatalogRedirects()){assert.equal(catalogRedirect(new URL('https://jotcoloring.com'+row.path)),row.target,row.path);assert.equal(catalogRedirect(new URL('https://jotcoloring.com'+row.target)),undefined,row.target);}
 assert.equal(catalogRedirect(new URL('https://jotcoloring.com/coloring-pages/ocean/?difficulty=easy')),'/collections/ocean/?difficulty=easy');
});
test('Browse All uses a dedicated canonical page, including legacy query migration and scoped gallery changes',()=>{
 assert.equal(catalogAllPath('/coloring-pages/'),ALL_COLORING_PAGES_PATH);
 assert.equal(catalogRedirect(new URL('https://jotcoloring.com/coloring-pages/?view=pages#catalog-results')),ALL_COLORING_PAGES_PATH);
 assert.equal(catalogRedirect(new URL('https://jotcoloring.com/coloring-pages/ocean/?view=pages&difficulty=easy#catalog-results')),'/collections/ocean/all/?difficulty=easy');
 assert.equal(catalogLocation(ALL_COLORING_PAGES_PATH)?.allPages,true);
 assert.deepEqual(seriesDirectory(catalogLocation(ALL_COLORING_PAGES_PATH)!,[{id:'ocean',count:1}],[],{ocean:1}),[]);
 const url=selectFilterURL('https://jotcoloring.com/coloring-pages/all/?q=turtle','category',['ocean']);assert.equal(url.pathname,'/collections/ocean/all/');assert.equal(url.searchParams.get('q'),'turtle');
});
test('ocean collection continuation cannot switch to an unrelated client supplied category',()=>{
 const q=parseCatalogQuery(streamQuery('/collections/ocean/all/',new URLSearchParams('cursor=signed&category=flowers&collection=animals')).params);
 assert.equal(q.collection,'ocean');assert.equal(q.category,undefined);assert.equal(q.cursor,'signed');
 assert.throws(()=>streamQuery('/coloring-pages/ocean/',new URLSearchParams('cursor=signed')));
});
test('collection directory, search suggestions and breadcrumbs communicate the same ocean hierarchy',()=>{
 const ocean=catalogLocation('/collections/ocean/')!;assert.equal(landingIdentity(ocean).heading,'Ocean Coloring Pages Collection');
 const children=seriesDirectory(ocean,[{id:'fish',count:1},{id:'sharks',count:2}]);assert.deepEqual(children.map(c=>c.path).sort(),['/coloring-pages/fish/','/coloring-pages/sharks/']);
 const fish=catalogBreadcrumbs(catalogLocation('/coloring-pages/fish/')!);assert.deepEqual(fish.map(c=>c.path),['/','/coloring-pages/','/collections/ocean/','/coloring-pages/fish/']);
 assert.equal(buildSuggestions('ocean',[],[{id:'ocean',name:'Ocean',href:categoryPath('ocean'),icon:'ocean'}])[0].detail,'Coloring Pages Collection');
 const animals=seriesDirectory(catalogLocation('/collections/animals/')!,[{id:'woodland',count:3},{id:'dinosaurs',count:2},{id:'long-neck-dinosaurs',count:2}]);assert.ok(animals.some(c=>c.id==='dinosaurs'));assert.ok(!animals.some(c=>c.id==='long-neck-dinosaurs'));
});
test('photo and catalog entry pages have distinct descriptive metadata and truthful visible FAQ schema',()=>{
 for(const copy of [PHOTO_SEO,DIRECTORY_SEO,ALL_PAGES_SEO]){assert.ok(copy.title.startsWith('Free '));assert.ok(copy.title.endsWith(' | JotColoring'));assert.ok(copy.description.length>=120&&copy.description.length<=170);assert.ok(!/[-–—]/.test(copy.description+copy.intro));}
 assert.equal(new Set([PHOTO_SEO,DIRECTORY_SEO,ALL_PAGES_SEO].map(x=>x.description)).size,3);
 const schema=pageSchema({origin:'https://jotcoloring.com',canonical:'/create/photo/',title:PHOTO_SEO.title,description:PHOTO_SEO.description,image:'/og/photo.png',imageAlt:'Photo to coloring page converter'})['@graph'] as any[];
 assert.equal(schema.find(x=>x['@type']==='WebApplication').offers.price,'0');assert.deepEqual(schema.find(x=>x['@type']==='FAQPage').mainEntity.map((x:any)=>x.acceptedAnswer.text),PHOTO_FAQ.map(x=>x.answer));
 assert.equal(landingIdentity(catalogLocation('/coloring-pages/')!).intro,DIRECTORY_SEO.intro);assert.equal(landingIdentity(catalogLocation(ALL_COLORING_PAGES_PATH)!).intro,ALL_PAGES_SEO.intro);
});
