import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {COLORING_TAXONOMY,VISION_ROOT_CATEGORIES as ROOT_CATEGORIES,categoryPath,categoryLineage,resolveCategoryAlias,TAXONOMY_VERSION,VISION_TAXONOMY_VERSION,EDITORIAL_REVIEW_CATEGORY_IDS,visionChildCategories} from '../src/taxonomy/catalog';
import {hasIllustration} from '../src/icons/registry';
import {classifyCategories,categoryLabels,decideCategories,isHierarchicalCategoryAnalysis,validateCategorySelection} from '../src/taxonomy/analysis';
import {preparedCategorySelection} from '../scripts/data/category-selection';
import {CategoryQueue} from '../scripts/data/category-queue';
const oneHot=(labels:string[],index:number)=>labels.map((_,i)=>Number(i===index));
async function recognized(root:string,child?:string){return classifyCategories(async labels=>{const index=labels===undefined?-1:labels.indexOf(child&&labels.includes(COLORING_TAXONOMY.find(c=>c.id===child)!.visual)?COLORING_TAXONOMY.find(c=>c.id===child)!.visual:COLORING_TAXONOMY.find(c=>c.id===root)!.visual);return oneHot(labels,index<0?labels.length-1:index);});}
test('expanded stable taxonomy has unique IDs, real parents, routable paths and available icons',()=>{assert.equal(ROOT_CATEGORIES.length,22);assert.equal(COLORING_TAXONOMY.length,124);assert.equal(new Set(COLORING_TAXONOMY.map(c=>c.id)).size,COLORING_TAXONOMY.length);for(const c of COLORING_TAXONOMY){assert.ok(hasIllustration(c.icon),c.id+': '+c.icon);assert.ok(categoryPath(c.id).endsWith('/'+c.id+'/'));assert.equal(categoryLineage(c.id).at(-1),c.id);if(c.parent)assert.ok(COLORING_TAXONOMY.some(r=>!r.parent&&r.id===c.parent));}assert.equal(categoryPath('woodland'),'/coloring-pages/animals/woodland/');assert.equal(categoryPath('dinosaurs'),'/coloring-pages/dinosaurs/');assert.equal(categoryPath('houses'),'/coloring-pages/buildings/houses/');});
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


test('character topics require explicit current editorial selection while legacy visual evidence remains valid',async()=>{
 const a=await recognized('fantasy','dragons'),sha='c'.repeat(64);
 assert.equal(a.taxonomy_version,VISION_TAXONOMY_VERSION);assert.ok(isHierarchicalCategoryAnalysis(a));
 assert.equal(EDITORIAL_REVIEW_CATEGORY_IDS.size,10);
 for(const id of EDITORIAL_REVIEW_CATEGORY_IDS){const c=COLORING_TAXONOMY.find(c=>c.id===id)!;assert.equal(c.editorial_only,true);if(c.parent){assert.equal(categoryLabels(c.parent).includes(c.visual),false);assert.equal(visionChildCategories(c.parent).some(v=>v.id===id),false);}else assert.equal(categoryLabels('root').includes(c.visual),false);}
 const selected=preparedCategorySelection(a,sha,'sonic','Visible Sonic character holding a ring; identity reviewed from actual artwork.');
 assert.deepEqual(selected.category_ids,['video-games','sonic']);assert.equal(selected.taxonomy_version,TAXONOMY_VERSION);assert.ok(validateCategorySelection(selected,a,sha));
 assert.equal(validateCategorySelection({...selected,taxonomy_version:VISION_TAXONOMY_VERSION},a,sha),false);
 assert.equal(validateCategorySelection({...selected,method:'automatic',review_note:''},{...a,category_ids:selected.category_ids,review_required:false},sha),false);
 const legacy={...preparedCategorySelection(a,sha),taxonomy_version:VISION_TAXONOMY_VERSION};assert.ok(validateCategorySelection(legacy,a,sha));
});
