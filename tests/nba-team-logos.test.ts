import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import logos from '../src/content/nba-team-logos.json';
import {NOVEMBER_12_NBA_TOPICS} from '../src/taxonomy/november-12-nba-thirty';
import {nbaTeamLogo} from '../src/ui/team-logo';

test('all thirty NBA subjects use distinct, source-verified official logo files',()=>{
 assert.deepEqual(Object.keys(logos.teams).sort(),NOVEMBER_12_NBA_TOPICS.map(t=>t.id).sort());
 assert.equal(new Set(Object.values(logos.teams).map(t=>t.teamId)).size,30);
 assert.equal(new Set(Object.values(logos.teams).map(t=>t.sha256)).size,30);
 for(const topic of NOVEMBER_12_NBA_TOPICS){
  const logo=nbaTeamLogo(topic.id)!;
  assert.equal(logo.src,`/team-logos/nba/${topic.id}.svg`);
  assert.equal(logo.source,`https://cdn.nba.com/logos/nba/${logo.teamId}/primary/L/logo.svg`);
  const bytes=readFileSync(new URL('../public'+logo.src,import.meta.url));
  assert.equal(bytes.length,logo.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),logo.sha256);
  const svg=bytes.toString();
  assert.match(svg,/<svg\b/);
  assert.doesNotMatch(svg,/<(?:script|foreignObject)\b|javascript:|(?:href|src)\s*=\s*["'](?:https?:|\/\/|data:)/i);
 }
});

test('other sports, numeral topics and inherited keys keep their ordinary icons',()=>{
 for(const id of ['sports','basketball','football','numbers','111','constructor','__proto__'])assert.equal(nbaTeamLogo(id),undefined);
});
