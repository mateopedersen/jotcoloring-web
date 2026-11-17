import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeDiagnosticEvent,diagnosticPage} from '../scripts/ops/catalog-diagnostics.mjs';
test('diagnostic targets stay on the finite public read-only route allowlist',()=>{
 assert.equal(diagnosticPage('ages-9-12'),'https://jotcoloring.com/coloring-by-age/9-12/');
 for(const target of ['https://example.com/','/api/admin/','__proto__','constructor'])assert.throws(()=>diagnosticPage(target));
});
test('an age gallery diagnostic still drops other routes and other visitor traces',()=>{
 const page=diagnosticPage('ages-9-12');
 const event={event:{request:{url:page,headers:{'x-jot-diagnostic':'ours'}}},logs:[],exceptions:[]};
 assert.ok(summarizeDiagnosticEvent(event,'ours',page));
 assert.equal(summarizeDiagnosticEvent(event,'other',page),null);
 assert.equal(summarizeDiagnosticEvent(event,'ours'),null);
 assert.equal(summarizeDiagnosticEvent(event,'ours','https://example.com/'),null);
});
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
