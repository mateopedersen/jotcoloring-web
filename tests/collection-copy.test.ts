import test from 'node:test';
import assert from 'node:assert/strict';
import {COLORING_TAXONOMY,categoryPath} from '../src/taxonomy/catalog';
import {NAVIGATION_COLLECTIONS,collectionPath} from '../src/taxonomy/navigation';
import {NUMBER_VALUES,numberTopic} from '../src/taxonomy/number-topics';
import {catalogLocation} from '../src/taxonomy/catalog-location';
import {landingSummary,reviewedLandingIntroduction} from '../src/taxonomy/landing-summary';
import {landingIdentity} from '../src/taxonomy/landing-identity';
import {coloringPageTitle,coloringInvitation} from '../src/ui/coloring-copy';

test('every canonical collection, subject and numeral has a distinct informative visible introduction',()=>{
 const paths=new Set(['/coloring-pages/',...NAVIGATION_COLLECTIONS.map(c=>collectionPath(c.id)),...COLORING_TAXONOMY.map(t=>categoryPath(t.id)),...NUMBER_VALUES.map(n=>numberTopic(n)!.path)]);
 const copy=new Map<string,string>(),openings=new Map<string,string>();
 for(const path of paths){
  const location=catalogLocation(path)!;
  assert.ok(location,path);const summary=landingSummary(location);
  assert.ok(summary.split(/\s+/).length>=40&&summary.split(/\s+/).length<=120,`${path}: ${summary.split(/\s+/).length} words`);
  assert.ok(!/[-–—]/.test(summary),path);
  assert.match(summary,/[.!?]$/);
  assert.ok(!copy.has(summary),`Repeated introduction: ${path} and ${copy.get(summary)}`);
  copy.set(summary,path);
  if(location.collection||location.topic||location.number){
   const entry=reviewedLandingIntroduction(location);
   assert.ok(entry,`Missing or stale reviewed collection introduction: ${path}`);
   assert.equal(entry.sourceIntro,landingIdentity(location).intro,path);
   assert.match(summary,/\bfree\b/i,path);assert.match(summary,/\bcoloring pages\b/i,path);
   assert.match(summary,/\bPDF\b/,path);assert.match(summary,/\bimage\b/i,path);
   const opening=summary.replace(/\bT\.\s+rex/gi,'T rex').split(/(?<=[.!?])\s/)[0];
   assert.match(opening,/coloring pages/i,`${path}: introduce the collection first`);
   assert.ok(!openings.has(opening),`Repeated opening: ${path} and ${openings.get(opening)}`);
   openings.set(opening,path);
   assert.doesNotMatch(summary,/at your own pace|quieter background|clear focal point|suits your time|palette feels|a small palette/i,path);
   assert.doesNotMatch(summary,/\b(?:includes|contains|over|exactly|choose from)\s+\d[\d,]*\s+(?:pages|designs)\b|\bguarantee\b|100%/i,path);
  }
 }
});

test('future subjects display only their own reviewed introduction instead of an invented advice template',()=>{
 const topic={id:'future-topic',name:'Future Topic',topic:'Future Topic',parent:'animals',visual:'',icon:'animals',sample:'',intro:'Reviewed birds rest beside a pond.',aliases:[]};
 const text=landingSummary({topic,path:'/coloring-pages/future-topic/'});
 assert.equal(text,topic.intro);assert.equal(reviewedLandingIntroduction({topic,path:'/coloring-pages/future-topic/'}),undefined);
 assert.doesNotMatch(text,/\d+ (?:pages|designs)|\b(?:AI|guarantee|ages|easy)\b/i);
 assert.equal(landingSummary({topic:{...topic,intro:'A new reviewed subject description.'},path:'/coloring-pages/future-topic/'}),'A new reviewed subject description.');
});

test('panda collection copy introduces the printable collection and keeps coloring advice out',()=>{
 const location=catalogLocation('/coloring-pages/pandas/')!;
 const text=landingSummary(location);
 assert.match(text,/^Browse free panda coloring pages/);
 assert.match(text,/bamboo groves/);assert.match(text,/download a printable PDF or image/);
 assert.doesNotMatch(text,/Keep the panda|quieter background|main figure/);
});

test('replacement source metadata cannot keep a stale authored introduction',()=>{
 const location=catalogLocation('/coloring-pages/pandas/')!;
 const changed={...location,topic:{...location.topic!,intro:'Replacement source observations.'}};
 assert.equal(reviewedLandingIntroduction(changed),undefined);
 assert.equal(landingSummary(changed),'Replacement source observations.');
});

test('the artwork label appends Coloring Page once without altering accepted names',()=>{
 for(const title of ['Sleeping Kitten With Yarn','Sonic Coloring Page','Number 2 coloring pages.']){
  const label=coloringPageTitle(title);assert.match(label,/ Coloring Page$/);
  assert.equal((label.match(/coloring page/gi)||[]).length,1);
  assert.equal(coloringPageTitle(label),label);
 }
 assert.equal(coloringPageTitle('HUNTR/X Garden Concert'),'HUNTR/X Garden Concert Coloring Page');
 for(const title of ['Letter A Coloring Page: Rounded Capital A','KPop Demon Hunters Coloring Page: Group On Stage']){
  assert.equal(coloringPageTitle(title),title);
  assert.equal(coloringPageTitle(coloringPageTitle(title)),title);
 }
});

test('coloring invitations follow current accepted descriptions and remain suggestions',()=>{
 const original={title:'Sleeping Kitten With Yarn',description:'A kitten curls up beside a ball of yarn in a garden.'};
 const invitation=coloringInvitation(original);
 assert.match(invitation,/contrasting shade for the yarn/);
 assert.ok(!/[-–—]/.test(invitation));
 assert.notEqual(invitation,coloringInvitation({...original,title:'Kitten At A Window'}));
 // A changed description is evaluated again and never retains a stale instruction.
 assert.match(coloringInvitation({...original,description:'A sedan waits outside a garage.'}),/main body color/);
 assert.match(coloringInvitation({title:'Unknown Drawing',description:''}),/largest outlined space/);
 assert.match(coloringInvitation({title:'Sea Turtle',description:'A sea turtle swims above a coral reef.'}),/blues for the water/);
});
