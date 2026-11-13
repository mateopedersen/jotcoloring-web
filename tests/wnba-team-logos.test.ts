import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import logos from '../src/content/wnba-team-logos.json';
import {wnbaTeamLogo} from '../src/ui/wnba-team-logo';
import {subjectLogo} from '../src/ui/subject-logo';

const officialTeamIds:Record<string,number>={
 'atlanta-dream':1611661330,'chicago-sky':1611661329,
 'connecticut-sun':1611661323,'dallas-wings':1611661321,
 'golden-state-valkyries':1611661331,'indiana-fever':1611661325,
 'las-vegas-aces':1611661319,'los-angeles-sparks':1611661320,
 'minnesota-lynx':1611661324,'new-york-liberty':1611661313,
 'phoenix-mercury':1611661317,'portland-fire':1611661327,
 'seattle-storm':1611661328,'toronto-tempo':1611661332,
 'washington-mystics':1611661322
};

test('fifteen WNBA subjects bind official team identities to distinct local logo bytes',()=>{
 assert.deepEqual(Object.keys(logos.teams).sort(),Object.keys(officialTeamIds).sort());
 assert.equal(new Set(Object.values(logos.teams).map(x=>x.sha256)).size,15);
 for(const [id,teamId] of Object.entries(officialTeamIds)){
  const logo=wnbaTeamLogo(id)!;
  assert.equal(logo.teamId,teamId);
  assert.equal(logo.identity_reference,`https://www.wnba.com/team/${teamId}/${id}`);
  assert.match(logo.source,new RegExp(`^https://cdn\\.wnba\\.com/logos/wnba/${teamId}/primary/[LD]/logo\\.svg$`));
  assert.equal(logo.src,`/team-logos/wnba/${id}.${logo.sha256.slice(0,12)}.svg`);
  const bytes=readFileSync(new URL('../public'+logo.src,import.meta.url));
  assert.equal(bytes.length,logo.bytes,id);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),logo.sha256,id);
  assert.match(bytes.toString(),/<svg\b/);
  assert.doesNotMatch(bytes.toString(),/<(?:script|foreignObject)\b|javascript:|(?:href|src)\s*=\s*["'](?:https?:|\/\/|file:|data:)/i);
  assert.deepEqual(subjectLogo(id),{src:logo.src,kind:'team',surface:logo.surface,shape:'square'});
 }
});

test('WNBA identities do not change NBA teams or generic basketball subjects',()=>{
 for(const id of ['sports','basketball','wnba','nba','atlanta-hawks','portland-trail-blazers','constructor','__proto__'])assert.equal(wnbaTeamLogo(id),undefined);
 assert.equal(subjectLogo('toronto-tempo')?.surface,'dark');
 assert.equal(subjectLogo('boston-celtics')?.src,'/team-logos/nba/boston-celtics.svg');
});
