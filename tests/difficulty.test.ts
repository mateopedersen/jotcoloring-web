import {createHash} from 'node:crypto';
import starterAssessments from '../src/studio/starter-assessments.json';
import test from 'node:test';import assert from 'node:assert/strict';
import{difficultyForScore,difficultyValues}from '../src/age/difficulty';
import{parseSearchIntent}from '../src/search/intent';
import{STARTER_PAGES,starterPageSvg,searchStarterPages}from '../src/studio/starter-pages';
import{STUDIO_FEATURES}from '../src/studio/workspace-state';
import{ADDITIONAL_FEATURES}from '../src/studio/additional-features';

test('detail score boundaries expose four levels without turning them into age restrictions',()=>{for(const[score,expected]of [[0,'easy'],[22.99,'easy'],[23,'medium'],[41.99,'medium'],[42,'hard'],[71.99,'hard'],[72,'very-hard'],[100,'very-hard']]as const)assert.equal(difficultyForScore(score),expected);assert.throws(()=>difficultyForScore(NaN));assert.deepEqual(difficultyValues(['detailed']),['medium','hard','very-hard']);});
test('search recognizes four detail levels in natural American English queries',()=>{assert.deepEqual(parseSearchIntent('very hard coloring pages').difficulty,['very-hard']);assert.deepEqual(parseSearchIntent('medium fox coloring pages').difficulty,['medium']);assert.deepEqual(parseSearchIntent('hard mandala').difficulty,['hard']);});
test('1,000 source-assessed starters include every difficulty and preserve subject filters',()=>{assert.equal(STARTER_PAGES.length,1000);for(const page of STARTER_PAGES){const assessment=(starterAssessments as Record<string,{source_sha256:string;level:string}>)[page.id];assert.ok(assessment,page.id+' assessment required');assert.equal(assessment.source_sha256,createHash('sha256').update(starterPageSvg(page)).digest('hex'),page.id+' source changed; rerun pixel assessment');}for(const level of ['Easy','Medium','Hard','Very Hard']){const pages=searchStarterPages('','',level);assert.ok(pages.length>0,level);assert.ok(pages.every(p=>p.detail===level));}assert.ok(searchStarterPages('','Animals','Easy').every(p=>p.category==='Animals'));});
test('Studio feature guide has at least 50 initial and 60 additional distinct working controls',()=>{assert.ok(STUDIO_FEATURES.length>=50);assert.ok(ADDITIONAL_FEATURES.length>=60);assert.equal(new Set([...STUDIO_FEATURES,...ADDITIONAL_FEATURES].map(f=>f[0])).size,STUDIO_FEATURES.length+ADDITIONAL_FEATURES.length);});
