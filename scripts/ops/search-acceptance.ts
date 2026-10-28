/** Local-only acceptance against the real seeded 18-record catalog. No remote calls. */
import fs from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {localStorage} from '../data/local-storage';
import {createCatalog} from '../../src/server/catalog';
import type {CatalogQuery} from '../../src/server/types';

type Case = {id:string;query:CatalogQuery;expected:string[];reason:string};
const pairs: [string,string][] = [
 ['fox','woodland-friends'],['rabbit','woodland-friends'],['hibiscus','hibiscus-garden'],['dragon','friendly-dragon'],['castle','friendly-dragon'],['mandala','botanical-mandala'],['snowman','winter-wishes'],['Christmas','winter-wishes'],['camper','camper-adventure'],['van','camper-adventure'],['astronaut','space-explorer'],['planets','space-explorer'],['turtle','ocean-adventure'],['coral','ocean-adventure'],['cupcake','sweet-treats'],['dessert','sweet-treats'],['dinosaur','dinosaur-valley'],['prehistoric','dinosaur-valley'],['bookshop','cozy-bookshop'],['books','cozy-bookshop'],['butterfly','butterfly-garden'],['wings','butterfly-garden'],['kitten','sleepy-kitten'],['cat','sleepy-kitten'],['fawn','gentle-deer'],['deer','gentle-deer'],['hedgehog','little-hedgehog'],['mushrooms','little-hedgehog'],['owl','woodland-owl'],['moon','woodland-owl'],['puppy','playful-puppy'],['dog','playful-puppy'],['cow','farm-friends'],['barn','farm-friends']
];
const cases: Case[] = pairs.map(([q,slug],i)=>({id:`Q${String(i+1).padStart(2,'0')}`,query:{q},expected:[slug],reason:'Subject, visible object, or reviewed tag used by a reader.'}));
const extra: [CatalogQuery,string[],string][] = [
 [{q:'flowers'},['woodland-friends','hibiscus-garden','friendly-dragon','botanical-mandala','cozy-bookshop','butterfly-garden'],'Common subject across title, category and tags.'],
 [{q:'woodland'},['woodland-friends','gentle-deer','little-hedgehog','woodland-owl'],'Category search includes four woodland animals.'],
 [{q:'animals'},['woodland-friends','ocean-adventure','dinosaur-valley','butterfly-garden','sleepy-kitten','gentle-deer','little-hedgehog','woodland-owl','playful-puppy','farm-friends'],'Broad main-category query.'],
 [{q:'  FOX   RABBIT '},['woodland-friends'],'Case, whitespace normalization and AND terms.'],
 [{q:'garden'},['hibiscus-garden','butterfly-garden','sleepy-kitten','playful-puppy'],'Common title/tag query with multiple results.'],
 [{q:'daisies'},['playful-puppy','farm-friends'],'Specific reviewed tag in two drawings.'],
 [{q:'flowers',category:'fantasy'},['friendly-dragon','cozy-bookshop'],'Text plus main category filter.'],
 [{q:'ocean',category:'animals'},['ocean-adventure'],'Secondary main category membership remains searchable.'],
 [{q:'garden',category:'flowers'},['hibiscus-garden','butterfly-garden'],'Text plus flower category narrows garden results.'],
 [{q:'cat',category:'vehicles'},[],'Valid query with incompatible category returns zero.'],
 [{q:'xylophone'},[],'Unrepresented subject returns zero.'],
 [{q:'tilki'},[],'Turkish translation is not implemented; English fox is not implicitly translated.'],
 [{q:'çiçek'},[],'Turkish characters are accepted safely; no unsupported translation promise.'],
 [{q:'FOX',age:['adults']},['woodland-friends'],'Case-insensitive English with age filter.'],
 [{q:'flowers',age:['kids']},[],'All current artwork is tagged teens/adults, not kids.'],
 [{q:'dragon',difficulty:['easy']},[],'Current dragon is detailed; easy filter excludes it.']
];
for(const [query,expected,reason] of extra)cases.push({id:`Q${String(cases.length+1).padStart(2,'0')}`,query,expected,reason});
if(cases.length!==50)throw new Error('Acceptance requires exactly50 predefined cases');
const mf=localStorage();
try {
 const rawCatalog=await mf.getD1Database('CATALOG_DB'),rawSearch=await mf.getD1Database('SEARCH_DB');
 let metrics={statements:0,rows_read:0,rows_written:0,d1_duration_ms:0};
 const observe=(db:any)=>({prepare(sql:string){const wrap=(statement:any):any=>({bind(...values:any[]){return wrap(statement.bind(...values));},async all(){const result=await statement.all();metrics.statements++;metrics.rows_read+=result.meta?.rows_read||0;metrics.rows_written+=result.meta?.rows_written||0;metrics.d1_duration_ms+=result.meta?.duration||0;return result;},async first(column?:string){const result=await this.all();const row=result.results[0];return row?(column?row[column]:row):null;},async run(){const result=await statement.run();metrics.statements++;metrics.rows_read+=result.meta?.rows_read||0;metrics.rows_written+=result.meta?.rows_written||0;metrics.d1_duration_ms+=result.meta?.duration||0;return result;}});return wrap(db.prepare(sql));}});
 const env={CATALOG_DB:observe(rawCatalog),SEARCH_DB:observe(rawSearch),CURSOR_SIGNING_SECRET:'local-acceptance-cursor-key-at-least32-characters'};
 const repo=createCatalog(env as any);
 const snapshot=await rawCatalog.prepare("SELECT id,slug,active_version FROM content WHERE status='published' ORDER BY id").all();
 if(snapshot.results.length!==18)throw new Error(`Fixture changed: expected18 published records, got${snapshot.results.length}. Review expectations before running.`);
 const timings:number[]=[],results=[];
 for(const c of cases){
  const samples:number[]=[],resultSlugs:string[][]=[];metrics={statements:0,rows_read:0,rows_written:0,d1_duration_ms:0};
  for(let i=0;i<3;i++){const start=performance.now();const result=await repo.list({...c.query,limit:48});samples.push(performance.now()-start);resultSlugs.push(result.items.map(item=>item.slug).sort());}
  const expected=c.expected.slice().sort(),pass=resultSlugs.every(actual=>JSON.stringify(actual)===JSON.stringify(expected));
  timings.push(...samples);results.push({...c,status:pass?'PASS':'FAIL',actual:resultSlugs[0],stable:resultSlugs.every(r=>JSON.stringify(r)===JSON.stringify(resultSlugs[0])),elapsed_ms:samples.map(x=>Number(x.toFixed(3))),metrics:{...metrics}});
 }
 const sorted=timings.slice().sort((a,b)=>a-b),percentile=(p:number)=>Number(sorted[Math.ceil(sorted.length*p)-1].toFixed(3));
 const versions=await rawSearch.prepare('SELECT id,source_version FROM search_document ORDER BY id').all();
 const versionMap=new Map(versions.results.map((r:any)=>[r.id,r.source_version]));
 const stale=snapshot.results.filter((r:any)=>versionMap.get(r.id)!==r.active_version).map((r:any)=>r.id);
 const record={measured_at:new Date().toISOString(),environment:'local Miniflare/workerd D1; real seeded catalog; no remote traffic',content_count:snapshot.results.length,search_document_count:versions.results.length,cases:50,samples_per_case:3,samples:timings.length,passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,performance:{p50_ms:percentile(.5),p95_ms:percentile(.95),p99_ms:percentile(.99),scope:'Sequential local adapter wall clock including real FTS, hydration and local RPC; not production network latency or load test'},index_consistency:{stale_content_ids:stale,lag_time_ms:null,note:'Source versions compared at read time; queue end-to-end elapsed lag was not measured by this read-only acceptance.'},limitations:['Expectations authored from18 visually reviewed seed drawings. No external human relevance panel has reviewed this engineering query set.','Turkish input is supported as text; automatic translation, synonyms, typo tolerance and language stemming are not implemented.','Not a100k/1m/5m capacity or concurrent remote traffic test.'],results};
 await fs.mkdir('docs/evidence',{recursive:true});await fs.writeFile('docs/evidence/search-acceptance.json',JSON.stringify(record,null,2)+'\n');
 console.log(JSON.stringify({cases:record.cases,passed:record.passed,failed:record.failed,performance:record.performance,index_consistency:record.index_consistency},null,2));
 if(record.failed||stale.length)process.exitCode=1;
} finally {await mf.dispose();}
