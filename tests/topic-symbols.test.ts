import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import symbols from '../src/content/topic-symbols.json';
import {subjectSymbol} from '../src/ui/subject-symbol';
import {subjectLogo} from '../src/ui/subject-logo';
import {COLORING_TAXONOMY} from '../src/taxonomy/catalog';

test('each unbranded sports topic has its own sport symbol',()=>{
 const sports=COLORING_TAXONOMY.filter(topic=>topic.parent==='sports');
 assert.ok(sports.length>=6);
 for(const topic of sports){
  if(subjectLogo(topic.id))continue;
  const symbol=subjectSymbol(topic.id);assert.ok(symbol,topic.id);
  assert.match(symbol.src,new RegExp('/'+topic.id+'\\.'));
  assert.doesNotMatch(symbol.src,/\/sports\./);
 }
 assert.notEqual(subjectSymbol('basketball')?.src,subjectSymbol('baseball')?.src);
 assert.notEqual(subjectSymbol('karate')?.src,subjectSymbol('winter-sports')?.src);
});

test('symbol bytes are local, checksum-pinned and free of external references',()=>{
 for(const [id,symbol] of Object.entries(symbols)){
  assert.equal(subjectSymbol(id)?.src,symbol.src);
  const svg=readFileSync(new URL('../public'+symbol.src,import.meta.url),'utf8');
  assert.equal(createHash('sha256').update(svg).digest('hex'),symbol.sha256,id);
  assert.ok(symbol.src.includes('.'+symbol.sha256.slice(0,12)+'.'));
  assert.doesNotMatch(svg,/<(?:script|foreignObject)\b|javascript:|(?:href|src)\s*=\s*["'](?:https?:|\/\/|file:|data:)/i);
  assert.match(svg,/<title>[^<]+<\/title>/);
  assert.match(svg,/<radialGradient/);
  assert.match(svg,/<feDropShadow/);
  assert.doesNotMatch(svg,/<image\b/);
 }
});

test('car and vehicle topic symbols preserve verified brand and team logo identities',()=>{
 for(const id of ['cars','trucks','trains','aircraft','jet','boats','bicycles','excavator','construction-vehicles','ambulance','police-car','school-bus','hot-air-balloon'])assert.ok(subjectSymbol(id),id);
 for(const id of ['bmw','audi','boston-celtics','atlanta-dream','arizona-diamondbacks']){
  assert.ok(subjectLogo(id),id);assert.equal(subjectSymbol(id),undefined);
 }
 for(const id of ['__proto__','constructor','not-a-topic','basketball-team'])assert.equal(subjectSymbol(id),undefined);
});

test('directory, search and related cards pass exact topic identities to the symbol resolver',()=>{
 for(const [file,identity] of [['SeriesDirectory.astro','topic={entry.id}'],['SearchCollections.astro','topic={option.id}'],['RelatedCollections.astro','topic={match.collection.id}']]){
  const source=readFileSync(new URL('../src/components/'+file,import.meta.url),'utf8');assert.ok(source.includes(identity),file);
 }
 const series=readFileSync(new URL('../src/components/SeriesDirectory.astro',import.meta.url),'utf8');
 assert.match(series,/subjectLogo\(entry.id\)\|\|subjectSymbol\(entry.id\)/);
 assert.ok(series.includes('jc-series-paper'));assert.ok(series.includes('JotColoring'));
});
