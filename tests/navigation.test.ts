import {PUBLIC_COLLECTION_IDS} from '../src/taxonomy/routes';
import test from 'node:test';import assert from 'node:assert/strict';
import {COLORING_TAXONOMY,ROOT_CATEGORIES,categoryPath} from '../src/taxonomy/catalog';
import {NAVIGATION_COLLECTIONS,collectionForRoot,collectionPath} from '../src/taxonomy/navigation';
import {catalogLocation,catalogRedirect} from '../src/taxonomy/catalog-location';
import {NUMBER_VALUES,numberTopic} from '../src/taxonomy/number-topics';
import {parseCatalogQuery} from '../src/server/catalog';
import {discoveryPath} from '../src/server/discovery';
import {buildSuggestions} from '../src/ui/search-suggestions-model';
test('every reviewed classification has one public navigation home and a unique routable canonical URL',()=>{
 assert.equal(NAVIGATION_COLLECTIONS.length,13);assert.deepEqual(NAVIGATION_COLLECTIONS.map(c=>c.id).sort(),[...PUBLIC_COLLECTION_IDS].sort());const roots=NAVIGATION_COLLECTIONS.flatMap(c=>c.roots);assert.equal(new Set(roots).size,roots.length);assert.deepEqual([...roots].sort(),ROOT_CATEGORIES.map(c=>c.id).sort());
 for(const group of NAVIGATION_COLLECTIONS)for(const topic of group.cover_topics){const c=COLORING_TAXONOMY.find(t=>t.id===topic);assert.ok(c&&group.roots.includes(c.parent||c.id),'representative topic must belong to '+group.id);}
 const urls=COLORING_TAXONOMY.map(c=>{assert.ok(collectionForRoot(c.parent||c.id),c.id);const path=categoryPath(c.id);assert.equal(catalogLocation(path)?.path,path);assert.equal(catalogRedirect(new URL('https://jotcoloring.com'+path)),undefined);return path;});assert.equal(new Set(urls).size,urls.length);
});
test('legacy topic/category URLs redirect once, retain filters, and exact scoped number searches become real topics',()=>{
 for(const [old,target] of [['/collection/education/','/collections/education/'],['/coloring-pages/animals/cats/','/coloring-pages/cats/'],['/coloring-pages/video-games/fnaf/','/coloring-pages/fnaf/'],['/coloring-pages/education/numbers/?q=number+111','/coloring-pages/numbers/111/'],['/coloring-pages/education/numbers111','/coloring-pages/numbers/111/'],['/collection/animals/?difficulty=easy&page=2','/collections/animals/?difficulty=easy'],['/coloring-pages/numbers/111/?category=education&difficulty=easy','/coloring-pages/numbers/111/?difficulty=easy']]){assert.equal(catalogRedirect(new URL('https://jotcoloring.com'+old)),target);assert.equal(catalogRedirect(new URL('https://jotcoloring.com'+target)),undefined);}
 assert.equal(catalogLocation('/coloring-pages/does-not-exist/'),undefined);assert.equal(catalogLocation('/coloring-pages/flowers/fnaf/'),undefined);assert.equal(catalogLocation('/coloring-pages/numbers/99999999/'),undefined);
 for(const n of NUMBER_VALUES){const topic=numberTopic(n)!;assert.equal(catalogLocation(topic.path)?.number?.number,n);assert.equal(discoveryPath(topic.path),topic.path);}
 assert.equal(discoveryPath('/collection/education/'),null);assert.equal(discoveryPath('/collection/education/',true),'/collection/education/');
 for(const c of NAVIGATION_COLLECTIONS){assert.equal(catalogRedirect(new URL('https://jotcoloring.com/collection/'+c.id+'/')),collectionPath(c.id));assert.equal(catalogRedirect(new URL('https://jotcoloring.com'+collectionPath(c.id))),undefined);}
});
test('collection and number API scopes reject unknown values and search suggestions use the same canonical paths',()=>{
 assert.equal(parseCatalogQuery(new URLSearchParams('collection=characters')).collection,'characters');assert.equal(parseCatalogQuery(new URLSearchParams('number=111')).number,'111');
 for(const q of ['collection=unknown','number=00111','number=999999999'])assert.throws(()=>parseCatalogQuery(new URLSearchParams(q)));
 const topic=numberTopic(111)!;const suggestion=buildSuggestions('number 111',[],[{id:topic.id,name:topic.name,href:topic.path,icon:'education'}])[0];assert.equal(suggestion.href,topic.path);
});
