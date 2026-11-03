import test from 'node:test';
import assert from 'node:assert/strict';
import {COLORING_TAXONOMY,categoryPath} from '../src/taxonomy/catalog';
import {NAVIGATION_COLLECTIONS,collectionPath} from '../src/taxonomy/navigation';
import {NUMBER_VALUES,numberTopic} from '../src/taxonomy/number-topics';
import {catalogLocation} from '../src/taxonomy/catalog-location';
import {landingSummary} from '../src/taxonomy/landing-summary';
import {landingIdentity} from '../src/taxonomy/landing-identity';
import {coloringPageTitle,coloringInvitation} from '../src/ui/coloring-copy';

test('every canonical collection, subject and numeral has a distinct informative visible introduction',()=>{
 const paths=new Set(['/coloring-pages/',...NAVIGATION_COLLECTIONS.map(c=>collectionPath(c.id)),...COLORING_TAXONOMY.map(t=>categoryPath(t.id)),...NUMBER_VALUES.map(n=>numberTopic(n)!.path)]);
 const copy=new Map<string,string>();
 for(const path of paths){
  const location=catalogLocation(path)!;
  assert.ok(location,path);const summary=landingSummary(location);
  assert.ok(summary.split(/\s+/).length>=50&&summary.split(/\s+/).length<=140,`${path}: ${summary.split(/\s+/).length} words`);
  assert.ok(!/[-–—]/.test(summary),path);
  assert.match(summary,/[.!?]$/);
  assert.ok(!copy.has(summary),`Repeated introduction: ${path} and ${copy.get(summary)}`);
  copy.set(summary,path);
  // Source observations are preserved; added instructions remain visitor advice.
  assert.ok(summary.includes(landingIdentity(location).intro.replace(/[-–—]/g,' ').replace(/\s+/g,' ')),path);
 }
});

test('future subjects retain their reviewed facts and receive useful visitor guidance without guessed scene details',()=>{
 const topic={id:'future-topic',name:'Future Topic',topic:'Future Topic',parent:'animals',visual:'',icon:'animals',sample:'',intro:'Reviewed birds rest beside a pond.',aliases:[]};
 const text=landingSummary({topic,path:'/coloring-pages/future-topic/'});
 assert.ok(text.includes(topic.intro));assert.match(text,/Compare the complete outlines/);
 assert.doesNotMatch(text,/\d+ (?:pages|designs)|\b(?:AI|guarantee|ages|easy)\b/i);
 assert.notEqual(text,landingSummary({topic:{...topic,id:'different-topic',topic:'Different Topic'},path:'/coloring-pages/different-topic/'}));
});

test('the artwork label appends Coloring Page once without altering accepted names',()=>{
 for(const title of ['Sleeping Kitten With Yarn','Sonic Coloring Page','Number 2 coloring pages.']){
  const label=coloringPageTitle(title);assert.match(label,/ Coloring Page$/);
  assert.equal((label.match(/coloring page/gi)||[]).length,1);
  assert.equal(coloringPageTitle(label),label);
 }
 assert.equal(coloringPageTitle('HUNTR/X Garden Concert'),'HUNTR/X Garden Concert Coloring Page');
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
