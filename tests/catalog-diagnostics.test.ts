import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeDiagnosticEvent} from '../scripts/ops/catalog-diagnostics.mjs';
test('diagnostic telemetry excludes other visitors and routes',()=>{
 for(const request of [{url:'https://jotcoloring.com/collections/vehicles/',headers:{}},{url:'https://jotcoloring.com/coloring-pages/cars/',headers:{'x-jot-diagnostic':'ours'}}])assert.equal(summarizeDiagnosticEvent({event:{request},logs:[{message:['private visitor data']}]},'ours'),null);
});
test('marked diagnostic traces omit headers, credentials and websocket addresses',()=>{
 const result=summarizeDiagnosticEvent({event:{request:{url:'https://jotcoloring.com/collections/vehicles/',headers:{'X-Jot-Diagnostic':'ours',authorization:'Bearer never-copy-this'}}},logs:[{level:'error',message:['D1_ERROR: database is locked','Bearer secret-token','wss://example.invalid/private-stream']}],exceptions:[{name:'Error',message:'Network connection lost.'}]},'ours');
 assert.ok(result);
 assert.equal(result.logs[0].messages[0],'D1_ERROR: database is locked');
 assert.doesNotMatch(JSON.stringify(result),/never-copy-this|secret-token|private-stream/);
 assert.equal(result.exceptions[0].message,'Network connection lost.');
});
