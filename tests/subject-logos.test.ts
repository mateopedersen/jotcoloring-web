import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync}from 'node:fs';
import {createHash}from 'node:crypto';
import logos from '../src/content/subject-logos.json';
import reviews from '../src/content/subject-logo-reviews.json';
import {subjectLogo}from '../src/ui/subject-logo';
import {nbaTeamLogo}from '../src/ui/team-logo';

test('subject logos bind exact IDs to reviewed local source bytes',()=>{
 assert.deepEqual(Object.keys(reviews.subjects).sort(),Object.keys(logos.subjects).sort());
 for(const [id,logo]of Object.entries(logos.subjects)){
  const review=reviews.subjects[id as keyof typeof reviews.subjects];
  assert.equal(review.asset_sha256,logo.sha256);
  assert.equal(review.src,logo.src);
  assert.equal(review.surface,logo.surface);
  assert.equal(review.shape,logo.shape);
  assert.equal(review.identity_reference,logo.identity_reference);
  assert.ok(review.artwork_preview_id);
  assert.match(review.artwork_preview_url,/^https:\/\/assets\.jotcoloring\.com\/published\//);
  assert.match(id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.match(logo.src,/^\/subject-logos\/(?:cars|subjects)\/[a-z0-9-]+\.[a-f0-9]{12}\.(?:png|svg|jpg)$/);
  assert.ok(Date.parse(logo.reviewed_at));
  assert.ok(logo.src.includes('.'+logo.sha256.slice(0,12)+'.'));
  for(const url of [logo.asset_source,logo.identity_reference])assert.equal(new URL(url).protocol,'https:');
  const bytes=readFileSync(new URL('../public'+logo.src,import.meta.url));
  assert.equal(bytes.length,logo.bytes,id);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),logo.sha256,id);
  if(logo.src.endsWith('.svg'))assert.doesNotMatch(bytes.toString(),/<(?:script|foreignObject)\b|javascript:|(?:href|src)\s*=\s*["'](?:https?:|\/\/|file:|data:)/i);
  assert.equal(subjectLogo(id)?.src,logo.src);
 }
});

test('unbranded topics and inherited keys never acquire corporate identities',()=>{
 for(const id of ['cars','race-car','sports','cartoons','numbers','111','constructor','__proto__','BMW','not-a-brand'])assert.equal(subjectLogo(id),undefined);
});

test('NBA logo mappings remain unchanged while brand cards use the shared resolver',()=>{
 for(const id of ['boston-celtics','los-angeles-lakers','washington-wizards'])assert.deepEqual(subjectLogo(id),{src:nbaTeamLogo(id)!.src,kind:'team',surface:'none',shape:'square'});
});
