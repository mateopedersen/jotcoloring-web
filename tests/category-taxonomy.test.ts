import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {COLORING_TAXONOMY,VISION_ROOT_CATEGORIES as ROOT_CATEGORIES,categoryPath,categoryLineage,resolveCategoryAlias,TAXONOMY_VERSION,VISION_TAXONOMY_VERSION,PREVIOUS_EDITORIAL_TAXONOMY_VERSION,PREVIOUS_EXPANSION_EDITORIAL_TAXONOMY_VERSION,PREVIOUS_EXACT_TOPIC_TAXONOMY_VERSION,NEW_EDITORIAL_TOPIC_CATEGORY_IDS,NEW_EXACT_TOPIC_CATEGORY_IDS,EDITORIAL_REVIEW_CATEGORY_IDS,LETTER_TOPIC_IDS,visionChildCategories} from '../src/taxonomy/catalog';
import {collectionForRoot} from '../src/taxonomy/navigation';
import {NOVEMBER_06_TOPICS} from '../src/taxonomy/november-06-topics';
import {NOVEMBER_07_CAR_BRAND_TOPICS} from '../src/taxonomy/november-07-car-brands';
import {NOVEMBER_07_FIVE_TOPICS} from '../src/taxonomy/november-07-five-topics';
import {NOVEMBER_07_ADDITIONAL_CAR_BRAND_TOPICS} from '../src/taxonomy/november-07-additional-car-brands';
import {NOVEMBER_07_ADDITIONAL_TOPICS} from '../src/taxonomy/november-07-additional-topics';
import {hasIllustration} from '../src/icons/registry';
import {classifyCategories,categoryLabels,decideCategories,isHierarchicalCategoryAnalysis,validateCategorySelection} from '../src/taxonomy/analysis';
import {preparedCategorySelection} from '../scripts/data/category-selection';
import {CategoryQueue} from '../scripts/data/category-queue';
const oneHot=(labels:string[],index:number)=>labels.map((_,i)=>Number(i===index));
async function recognized(root:string,child?:string){return classifyCategories(async labels=>{const index=labels===undefined?-1:labels.indexOf(child&&labels.includes(COLORING_TAXONOMY.find(c=>c.id===child)!.visual)?COLORING_TAXONOMY.find(c=>c.id===child)!.visual:COLORING_TAXONOMY.find(c=>c.id===root)!.visual);return oneHot(labels,index<0?labels.length-1:index);});}
test('expanded stable taxonomy has unique IDs, real parents, routable paths and available icons',()=>{assert.equal(ROOT_CATEGORIES.length,22);assert.equal(COLORING_TAXONOMY.length,254+NOVEMBER_06_TOPICS.filter(topic=>topic.parent==='cars').length+NOVEMBER_07_CAR_BRAND_TOPICS.length+NOVEMBER_07_FIVE_TOPICS.length+NOVEMBER_07_ADDITIONAL_CAR_BRAND_TOPICS.length+NOVEMBER_07_ADDITIONAL_TOPICS.length);assert.equal(new Set(COLORING_TAXONOMY.map(c=>c.id)).size,COLORING_TAXONOMY.length);for(const c of COLORING_TAXONOMY){assert.ok(hasIllustration(c.icon),c.id+': '+c.icon);assert.ok(categoryPath(c.id).endsWith('/'+c.id+'/'));assert.equal(categoryLineage(c.id).at(-1),c.id);if(c.parent)assert.ok(COLORING_TAXONOMY.some(r=>r.id===c.parent));}assert.equal(categoryPath('woodland'),'/coloring-pages/woodland/');assert.equal(categoryPath('dinosaurs'),'/collections/dinosaurs/');assert.equal(categoryPath('houses'),'/coloring-pages/houses/');assert.equal(categoryPath('ant'),'/coloring-pages/ant/');});
test('formerly unsupported subjects classify into meaningful new parent and child collections',async()=>{for(const [root,child] of [['buildings','houses'],['people','portraits'],['education','alphabet'],['sports','basketball'],['music','instruments'],['objects','tools'],['nature','mountains']] as const){const a=await recognized(root,child);assert.equal(a.review_required,false);assert.deepEqual(a.category_ids,[root,child]);assert.ok(isHierarchicalCategoryAnalysis(a));}});
test('templates disagreeing or closely competing roots require review; unknown never becomes fantasy',()=>{const labels=categoryLabels('root'),one=oneHot(labels,0),two=oneHot(labels,1);const a=decideCategories([{scope:'root',scores:[one,two,one,two,one,two]}]);assert.equal(a.review_required,true);const unknown=decideCategories([{scope:'root',scores:Array.from({length:6},()=>oneHot(labels,labels.length-1))}]);assert.equal(unknown.primary,null);assert.deepEqual(unknown.category_ids,[]);});
test('parent agreement can be automatic while uncertain child labels are withheld',async()=>{const a=await classifyCategories(async labels=>labels.length===categoryLabels('root').length?oneHot(labels,ROOT_CATEGORIES.findIndex(c=>c.id==='buildings')):labels.map(()=>1/labels.length));assert.deepEqual(a.category_ids,['buildings']);assert.equal(a.review_required,false);});
test('complete evidence required; tampered decisions and taxonomy versions rejected',async()=>{const a=await recognized('buildings','houses');assert.equal(isHierarchicalCategoryAnalysis({...a,category_ids:['fantasy']}),false);assert.equal(isHierarchicalCategoryAnalysis({...a,taxonomy_version:'old'}),false);assert.throws(()=>decideCategories([{scope:'root',scores:[[NaN],[1]]}]));assert.throws(()=>decideCategories([a.runs[0],{scope:'not-a-root',scores:[]}]))});
test('source-bound selection invalidates after image replacement and preserves manual review audit',async()=>{const a=await recognized('buildings','houses'),sha='a'.repeat(64),selection=preparedCategorySelection(a,sha);assert.ok(validateCategorySelection(selection,a,sha));assert.equal(validateCategorySelection(selection,a,'b'.repeat(64)),false);assert.equal(validateCategorySelection({...selection,category_ids:['fantasy']},a,sha),false);assert.throws(()=>preparedCategorySelection(a,sha,'fantasy'));const reviewed=preparedCategorySelection(a,sha,'magical-castles','Visible fairy-tale towers and magical clouds reviewed.');assert.deepEqual(reviewed.category_ids,['fantasy','magical-castles']);assert.ok(validateCategorySelection(reviewed,a,sha));assert.throws(()=>preparedCategorySelection(a,sha,'invented-topic','Reviewed real visible image.'));});
test('explicit aliases resolve known topics but ambiguous words never force a topic',()=>{assert.equal(resolveCategoryAlias('alphabet'),'alphabet');assert.equal(resolveCategoryAlias('classroom'),'school');assert.equal(resolveCategoryAlias('safari'),undefined);});
test('disk queue resumes, deduplicates, guards leases and refuses stale source-result commits',()=>{const dir=mkdtempSync(join(tmpdir(),'jot-category-')),path=join(dir,'jobs.sqlite'),job={id:'example-page',file:'/test.png',sha256:'a'.repeat(64),branded:true};try{let q=new CategoryQueue(path);const key=q.enqueue(job);assert.equal(q.enqueue(job),key);const first=q.claim(0)!;assert.equal(q.claim(1),undefined);q.close();q=new CategoryQueue(path);const reclaimed=q.claim(600001)!;assert.equal(reclaimed.job_key,key);assert.equal(q.finish(key,first.token,{}),false);assert.ok(q.finish(key,reclaimed.token,{ready:true}));assert.equal(q.claim(700000),undefined);assert.equal(q.summary()[0].count,1);assert.notEqual(q.enqueue({...job,sha256:'b'.repeat(64)}),key);q.close();}finally{rmSync(dir,{recursive:true,force:true});}});

test('a plain circle split into a few cells does not auto-publish as an intricate mandala',async()=>{const a=await classifyCategories(async labels=>{const i=labels.indexOf(COLORING_TAXONOMY.find(c=>c.id==='mandalas')!.visual);return oneHot(labels,i<0?labels.length-1:i);},{regions:8,inkRatio:.05,edgeDensity:.04});assert.equal(a.primary,'mandalas');assert.equal(a.review_required,true);assert.throws(()=>preparedCategorySelection(a,'a'.repeat(64)));});

test('center crops cannot replace the whole-frame subject with background decoration',()=>{
 const roots=categoryLabels('root'),animal=oneHot(roots,ROOT_CATEGORIES.findIndex(c=>c.id==='animals')),flower=oneHot(roots,ROOT_CATEGORIES.findIndex(c=>c.id==='flowers'));
 const child=oneHot(categoryLabels('flowers'),0);
 const a=decideCategories([{scope:'root',scores:[animal,animal,flower,flower,flower,flower]},{scope:'flowers',scores:[child,child]}]);
 assert.equal(a.primary,'flowers');assert.equal(a.review_required,true);assert.throws(()=>preparedCategorySelection(a,'a'.repeat(64)));
 // Old evidence is checked with its recorded rules, without rewriting live metadata.
 const previous={...a,version:'jot-category-hierarchy-2.2.0',category_ids:['flowers',...categoryLineage(COLORING_TAXONOMY.find(c=>c.parent==='flowers')!.id)].filter((x,i,all)=>all.indexOf(x)===i),review_required:false,reason:'supported'};
 assert.ok(isHierarchicalCategoryAnalysis(previous));
 assert.equal(isHierarchicalCategoryAnalysis({...previous,version:a.version}),false);
});


test('character and public-figure topics require explicit current editorial selection while legacy visual evidence remains valid',async()=>{
 const a=await recognized('fantasy','dragons'),sha='c'.repeat(64);
 assert.equal(a.taxonomy_version,VISION_TAXONOMY_VERSION);assert.ok(isHierarchicalCategoryAnalysis(a));
 assert.equal(EDITORIAL_REVIEW_CATEGORY_IDS.size,140+NOVEMBER_06_TOPICS.filter(topic=>topic.parent==='cars').length+NOVEMBER_07_CAR_BRAND_TOPICS.length+NOVEMBER_07_FIVE_TOPICS.length+NOVEMBER_07_ADDITIONAL_CAR_BRAND_TOPICS.length+NOVEMBER_07_ADDITIONAL_TOPICS.length);
 for(const id of EDITORIAL_REVIEW_CATEGORY_IDS){const c=COLORING_TAXONOMY.find(c=>c.id===id)!;assert.equal(c.editorial_only,true);if(c.parent){const parent=COLORING_TAXONOMY.find(x=>x.id===c.parent)!;if(!parent.parent)assert.equal(categoryLabels(c.parent).includes(c.visual),false);assert.equal(visionChildCategories(c.parent).some(v=>v.id===id),false);}else assert.equal(categoryLabels('root').includes(c.visual),false);}
 const selected=preparedCategorySelection(a,sha,'sonic','Visible Sonic character holding a ring; identity reviewed from actual artwork.');
 assert.deepEqual(selected.category_ids,['video-games','sonic']);assert.equal(selected.taxonomy_version,TAXONOMY_VERSION);assert.ok(validateCategorySelection(selected,a,sha));
 assert.equal(validateCategorySelection({...selected,taxonomy_version:VISION_TAXONOMY_VERSION},a,sha),false);assert.ok(validateCategorySelection({...selected,taxonomy_version:PREVIOUS_EDITORIAL_TAXONOMY_VERSION},a,sha),'accepted earlier character reviews remain valid');const fresh=preparedCategorySelection(a,sha,'descendants','Mal and Evie identities checked against source artwork and official character references.');assert.ok(validateCategorySelection(fresh,a,sha));assert.equal(validateCategorySelection({...fresh,taxonomy_version:PREVIOUS_EDITORIAL_TAXONOMY_VERSION},a,sha),false,'new character topics require the new explicit review vocabulary');
 assert.equal(validateCategorySelection({...selected,method:'automatic',review_note:''},{...a,category_ids:selected.category_ids,review_required:false},sha),false);
 const legacy={...preparedCategorySelection(a,sha),taxonomy_version:VISION_TAXONOMY_VERSION};assert.ok(validateCategorySelection(legacy,a,sha));
});


test('new manually reviewed collections preserve earlier taxonomy approvals and reject stale new-topic approvals',async()=>{
 const a=await recognized('fantasy','dragons'),sha='d'.repeat(64);
 const old=preparedCategorySelection(a,sha,'descendants','Visible Descendants character identity reviewed from original artwork.');
 assert.ok(validateCategorySelection({...old,taxonomy_version:'jot-taxonomy-2.2.0'},a,sha));
 for(const id of ['turtles','pandas','trick-or-treat','fnaf','bible']){
  const current=preparedCategorySelection(a,sha,id,'Actual source artwork inspected and assigned to its depicted subject.');
  assert.ok(validateCategorySelection(current,a,sha));
 for(const version of ['jot-taxonomy-2.1.0','jot-taxonomy-2.2.0'])assert.equal(validateCategorySelection({...current,taxonomy_version:version},a,sha),false);
 assert.ok(validateCategorySelection({...current,taxonomy_version:'jot-taxonomy-2.3.0'},a,sha),'previously approved seven-topic reviews stay valid');
 }
 for(const id of NEW_EDITORIAL_TOPIC_CATEGORY_IDS){const current=preparedCategorySelection(a,sha,id,'Inspected source artwork and assigned the visible character to its reviewed topic.');assert.ok(validateCategorySelection(current,a,sha));assert.equal(validateCategorySelection({...current,taxonomy_version:PREVIOUS_EXPANSION_EDITORIAL_TAXONOMY_VERSION},a,sha),false);}
 const prior=preparedCategorySelection(a,sha,'turtles','Turtle subject is visible in the inspected source artwork.');assert.ok(validateCategorySelection({...prior,taxonomy_version:PREVIOUS_EXPANSION_EDITORIAL_TAXONOMY_VERSION},a,sha),'previously approved 2.3 taxonomy reviews remain valid');
 assert.equal(categoryPath('fnaf'),'/coloring-pages/fnaf/');
 assert.equal(categoryPath('bible'),'/collections/bible/');
 assert.equal(resolveCategoryAlias('five nights at freddys'),'fnaf');
 assert.equal(categoryPath('faith'),'/collections/faith/');assert.equal(categoryPath('religious'),'/coloring-pages/religious/');assert.deepEqual(categoryLineage('religious'),['faith','religious']);assert.equal(resolveCategoryAlias('religion'),'faith');assert.equal(resolveCategoryAlias('religious coloring pages'),'religious');assert.equal(collectionForRoot('faith')?.id,'faith');
 assert.equal(categoryPath('labubu'),'/coloring-pages/labubu/');assert.equal(categoryPath('sonny-angel'),'/coloring-pages/sonny-angel/');
 assert.equal(resolveCategoryAlias('cry baby'),'crybaby');assert.equal(resolveCategoryAlias('chiikawa characters'),'chiikawa');assert.equal(resolveCategoryAlias('ant'),'ant');assert.equal(resolveCategoryAlias('ants'),'ant');
});

test('A to Z are separately searchable education topics and cannot reuse older reviews',async()=>{
 const a=await recognized('education','alphabet'),sha='f'.repeat(64);
 assert.equal(LETTER_TOPIC_IDS.length,26);
 for(const [index,id] of LETTER_TOPIC_IDS.entries()){
  const letter=String.fromCharCode(65+index),selected=preparedCategorySelection(a,sha,id,`Letter ${letter} artwork and its matching alphabet topic were reviewed.`);
  assert.deepEqual(selected.category_ids,['education','alphabet',id]);
  assert.equal(categoryPath(id),`/coloring-pages/${id}/`);
  assert.equal(resolveCategoryAlias(`letter ${letter.toLowerCase()} coloring pages`),id);
  assert.ok(validateCategorySelection(selected,a,sha));
  assert.equal(validateCategorySelection({...selected,taxonomy_version:'jot-taxonomy-2.5.0'},a,sha),false);
 }
 const migration=readFileSync(new URL('../migrations/catalog/0020_letter_topics.sql',import.meta.url),'utf8');
 const seeded=[...migration.matchAll(/INSERT INTO category\(id,name,parent_id,sort_order\) VALUES\('([^']+)','([^']+)','([^']+)',(\d+)\)/g)].map(match=>({id:match[1],name:match[2],parent:match[3],order:Number(match[4])}));
 assert.deepEqual(seeded.map(row=>row.id),LETTER_TOPIC_IDS,'every searchable letter topic is seeded in the catalog database');
 assert.ok(seeded.every((row,index)=>row.name===`Letter ${String.fromCharCode(65+index)}`&&row.parent==='alphabet'&&row.order===120+index));
});

 test('seasonal2.5 approvals preserve old2.4 reviews while new topics require current source-bound selection',async()=>{const a=await recognized('fantasy','dragons'),sha='e'.repeat(64);const prior=preparedCategorySelection(a,sha,'labubu','Character identity reviewed against the actual source artwork.');assert.ok(validateCategorySelection({...prior,taxonomy_version:'jot-taxonomy-2.4.0'},a,sha));for(const id of ['sugar-skull','veterans-day','christmas-tree','january','december','all-souls-day','cheetah','excavator','gingerbread-house','fall-leaf']){const selected=preparedCategorySelection(a,sha,id,'Actual source pixels and subject specific collection reviewed.');assert.ok(validateCategorySelection(selected,a,sha));assert.equal(validateCategorySelection({...selected,taxonomy_version:'jot-taxonomy-2.4.0'},a,sha),false);}});

test('the 52-topic index and six car brands have exact topic pages and parent collections',async()=>{
 const sha='a'.repeat(64),a=await recognized('fantasy','dragons');
 const expectedParents:Record<string,string>={
  jet:'aircraft','jurassic-park':'dinosaurs',jungle:'jungle-animals',juneteenth:'holidays','john-deere':'vehicles','american-flag':'holidays',ant:'insects',anpanman:'cartoons',ankylosaurus:'dinosaurs','angry-birds':'video-games',angel:'fantasy','amy-rose':'sonic','among-us':'video-games',rabbit:'animals',religious:'faith',reindeer:'animals','red-panda':'animals',rat:'animals',rarity:'my-little-pony',ramadan:'holidays','rainbow-friends':'video-games','rainbow-dash':'my-little-pony',rainbow:'weather',rain:'weather',raccoon:'animals','race-car':'cars',gmc:'cars',ford:'cars',kia:'cars',chevrolet:'cars',bentley:'cars',buick:'cars'
 };
 const expectedGroups:Record<string,string>={
  jet:'vehicles','jurassic-park':'animals',jungle:'animals',juneteenth:'holidays','john-deere':'vehicles','american-flag':'holidays',ant:'animals',anpanman:'characters',ankylosaurus:'animals','angry-birds':'characters',angel:'characters','amy-rose':'characters','among-us':'characters',rabbit:'animals',religious:'faith',reindeer:'animals','red-panda':'animals',rat:'animals',rarity:'characters',ramadan:'holidays','rainbow-friends':'characters','rainbow-dash':'characters',rainbow:'nature',rain:'nature',raccoon:'animals','race-car':'vehicles',gmc:'vehicles',ford:'vehicles',kia:'vehicles',chevrolet:'vehicles',bentley:'vehicles',buick:'vehicles'
 };
 const all67=[...NOVEMBER_07_ADDITIONAL_CAR_BRAND_TOPICS,...NOVEMBER_07_ADDITIONAL_TOPICS];
 const topics=[...LETTER_TOPIC_IDS,...Object.keys(expectedParents),...all67.map(topic=>topic.id)];
 assert.equal(topics.length,125);assert.equal(new Set(topics).size,125);
 for(const id of topics){
  const c=COLORING_TAXONOMY.find(x=>x.id===id)!;
  const parent=expectedParents[id]||c.parent;
  assert.equal(categoryPath(id),'/coloring-pages/'+id+'/');
  if(parent)assert.equal(c.parent,parent,id+' parent');
  const lineage=categoryLineage(id);
  const selection=preparedCategorySelection(a,sha,id,'Inspected the package subject and assigned its exact topic page and collection.');
  assert.deepEqual(selection.category_ids,lineage,id+' lineage');
  assert.ok(validateCategorySelection(selection,a,sha),id+' selection');
  const group=collectionForRoot(lineage[0]);
  assert.equal(group?.id,expectedGroups[id]||collectionForRoot(lineage[0])?.id,id+' collection');
 }
 for(const [query,id] of [['jet plane','jet'],['jungle','jungle'],['red panda','red-panda'],['amy rose','amy-rose'],['reindeer','reindeer'],['rabbit','rabbit'],['race car','race-car'],['rainbow','rainbow'],['rain','rain']] as const)assert.equal(resolveCategoryAlias(query),id);
 for(const id of NEW_EXACT_TOPIC_CATEGORY_IDS){
  const fresh=preparedCategorySelection(a,sha,id,'Reviewed the exact subject page and its parent collection.');
  assert.ok(validateCategorySelection(fresh,a,sha));
  assert.equal(validateCategorySelection({...fresh,taxonomy_version:PREVIOUS_EXACT_TOPIC_TAXONOMY_VERSION},a,sha),false,id+' rejects stale broad-category review');
 }
 const prior28=preparedCategorySelection(a,sha,'jurassic-park','Jurassic Park remains attached to its own topic page after taxonomy expansion.');
 assert.ok(validateCategorySelection({...prior28,taxonomy_version:PREVIOUS_EXACT_TOPIC_TAXONOMY_VERSION},a,sha));
 const migration=readFileSync(new URL('../migrations/catalog/0022_52_topic_categories.sql',import.meta.url),'utf8')+readFileSync(new URL('../migrations/catalog/0023_november_27_topic_categories.sql',import.meta.url),'utf8')+readFileSync(new URL('../migrations/catalog/0024_november_06_topic_categories.sql',import.meta.url),'utf8')+readFileSync(new URL('../migrations/catalog/0025_november_07_car_brand_topics.sql',import.meta.url),'utf8')+readFileSync(new URL('../migrations/catalog/0026_november_07_five_topics.sql',import.meta.url),'utf8')+readFileSync(new URL('../migrations/catalog/0027_november_07_additional_car_brands.sql',import.meta.url),'utf8')+readFileSync(new URL('../migrations/catalog/0028_november_07_additional_topics.sql',import.meta.url),'utf8');
 for(const id of NEW_EXACT_TOPIC_CATEGORY_IDS)assert.ok(migration.includes("VALUES('"+id+"'"),id+' migration row');
});
