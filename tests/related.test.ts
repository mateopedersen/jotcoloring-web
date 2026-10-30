import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rankRelated,selectRelated,candidateTags,candidateTagWeight,relatedView} from '../src/content/related';
import type {Content} from '../src/server/types';
const page=(id:string,changes:Partial<Content>={}):Content=>({id,slug:id,title:'Woodland Fox',description:'A specific drawing.',alt:'A specific drawing.',category:'animals',categoryName:'Animals',subcategory:'woodland',tags:['fox','woodland','flowers'],age_groups:['kids'],difficulty:'detailed',version:1,revision:1,thumbnail:'/a.webp',preview:'/a.webp',home_color:null,downloads:{pdf:'/a.pdf',webp:'/a.webp'},published_at:'2026-10-29',lineArtUrl:'/a.webp',width:100,height:150,example_only:false,hasBrandFooter:true,recommendedAge:{band:'9-12',score:56},...changes});
test('the same subject outranks broad collection and decorative flower matches',()=>{const source=page('source'),result=rankRelated(source,[page('pet',{title:'Curious Cat',subcategory:'pets',tags:['cat','flowers']}),page('fox',{category:'fantasy',subcategory:null,tags:['fox'],recommendedAge:{band:'13-17',score:75}}),page('cupcake',{title:'Strawberry Cupcake',category:'food',tags:['cupcake','flowers'],subcategory:null})]);assert.equal(result.matches[0].item.id,'fox');assert.equal(result.matches[1].item.id,'pet');assert.deepEqual(result.explore.map(x=>x.id),['cupcake']);});
test('age and detail alone cannot turn an unrelated subject into a best match',()=>{const result=rankRelated(page('fox'),[page('rocket',{category:'space',subcategory:null,tags:['rocket'],title:'Space explorer'})]);assert.equal(result.matches.length,0);assert.equal(result.explore.length,1);});
test('current item and duplicate candidates are excluded, and ties are stable',()=>{const source=page('source'),a=page('a'),b=page('b');const first=rankRelated(source,[source,b,a,a]),second=rankRelated(source,[a,b]);assert.deepEqual(first.matches.map(m=>m.item.id),['a','b']);assert.deepEqual(first.matches,second.matches);});
test('each view filters real match properties, without filling empty views with random pages',()=>{const source=page('source'),result=rankRelated(source,[page('same'),page('different-detail',{recommendedAge:{band:'adults',score:95}}),page('subject',{category:'fantasy',subcategory:null,tags:['fox']}),page('other',{category:'food',subcategory:null,tags:['cake']})]);assert.ok(selectRelated(result,'collection').every(m=>m.sameCollection));assert.ok(selectRelated(result,'detail').every(m=>m.similarDetail));assert.ok(selectRelated(result,'theme').every(m=>m.sameTheme));assert.equal(selectRelated(rankRelated(source,[]),'best').length,0);});
test('known subject aliases connect kittens and cats, while source descriptions remain untouched',()=>{const source=page('cat',{title:'Sleepy Kitten',tags:['kitten'],subcategory:'pets'}),candidate=page('cat-two',{title:'Curious Cat',category:'fantasy',subcategory:null,tags:['cat']});const before=JSON.stringify([source,candidate]);assert.match(rankRelated(source,[candidate]).matches[0].reasons[0],/cat/);assert.equal(JSON.stringify([source,candidate]),before);});
test('candidate tags prioritize subjects over decoration and stay bounded',()=>{const tags=candidateTags(page('source',{tags:['flowers','fox',...Array.from({length:40},(_,i)=>'topic '+i)]}));assert.equal(tags.length,10);assert.ok(tags.includes('fox'));assert.ok(!tags.includes('flowers'));assert.equal(relatedView('fake'),'best');assert.equal(relatedView('detail'),'detail');});

test('background subjects and generic style words cannot create cross-collection matches',()=>{
 const owl=page('owl',{title:'Owl Under A Crescent Moon',description:'An owl perches beneath a moon among wildflowers.',tags:['owl','moon','wildflowers','outline','scene']});
 const astronaut=page('astronaut',{title:'Astronaut On The Moon',description:'An astronaut stands on the moon.',category:'space',subcategory:null,tags:['astronaut','moon','wildflowers','outline','scene']});
 const result=rankRelated(owl,[astronaut]);assert.equal(result.matches.length,0);assert.deepEqual(result.explore.map(i=>i.id),['astronaut']);
});
test('one actual subject match outranks a shared broad theme plus many background tags',()=>{
 const fox=page('source',{title:'Fox Beside Wildflowers',tags:['fox','wildflowers','leaf','garden','scene']});
 const same=page('same-subject',{title:'Curious Fox',category:'fantasy',subcategory:null,tags:['fox']});
 const background=page('background',{title:'Woodland Owl',tags:['owl','wildflowers','leaf','garden','scene']});
 assert.equal(rankRelated(fox,[background,same]).matches[0].item.id,'same-subject');
});
test('winter and Christmas remain distinct subjects, and unapproved examples never become suggestions',()=>{
 const source=page('winter',{title:'Winter Landscape',category:'nature',subcategory:null,tags:['winter']});
 const christmas=page('christmas',{title:'Christmas Stocking',category:'holidays',subcategory:null,tags:['christmas']});
 assert.equal(rankRelated(source,[christmas]).matches.length,0);
 assert.equal(rankRelated(source,[{...source,id:'example',example_only:true}]).candidateCount,0);
});
test('bounded candidate lookup includes subject synonyms and protects them from background crowding',()=>{
 const kitten=page('kitten',{title:'Sleepy Kitten',tags:['kitten','wildflowers','moon','scene','leaf','garden']});
 const tags=candidateTags(kitten);assert.ok(tags.includes('cat'));assert.ok(tags.includes('kitten'));assert.ok(tags.length<=10);
 assert.ok(candidateTagWeight(kitten,'cat')>9*candidateTagWeight(kitten,'moon')+15);
});
test('title backgrounds and flower-covered modifiers do not masquerade as primary subjects',()=>{
 const fox=page('fox',{title:'Fox In Wildflowers',description:'A fox sits among wildflowers.',tags:['fox','wildflowers']});
 const bookshop=page('shop',{title:'Flower-Covered Bookshop',description:'An arched bookshop stands beside flowering vines.',category:'buildings',subcategory:null,tags:['bookshop','flower','wildflowers']});
 const flowers=page('flowers',{title:'Wildflowers And Daisies',description:'Wildflowers bloom in a garden.',category:'flowers',subcategory:null,tags:['flower','wildflowers']});
 assert.equal(rankRelated(fox,[flowers]).matches.length,0);assert.equal(rankRelated(bookshop,[flowers]).matches.length,0);
});
test('age, difficulty and download wording are facets rather than shared visual subjects',()=>{
 const lion=page('lion',{title:'Easy Lion Coloring Page For Kids',category:'animals',subcategory:null,tags:['lion','easy','kids']});
 const rocket=page('rocket',{title:'Easy Rocket Coloring Page For Kids',category:'space',subcategory:null,tags:['rocket','easy','kids']});
 assert.equal(rankRelated(lion,[rocket]).matches.length,0);
});
