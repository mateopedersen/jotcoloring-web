import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {DatabaseSync} from 'node:sqlite';
import {queueDiscoveryNotices,processDiscoveryNotices} from '../src/server/discovery';
import {rebuildDiscovery,sendDiscoveryNotices,nextDiscoveryAttempt,INDEXNOW_KEY,reconcileDiscovery,queueDiscoveryRebuild,processDiscoveryRebuild,runDiscovery} from '../src/server/discovery';import {sitemapIndex,sitemapSegment} from '../src/server/sitemap';import type {Env} from '../src/server/types';
function database(sql:DatabaseSync):any{let tail:Promise<unknown>=Promise.resolve();return{prepare(q:string){let args:any[]=[];const stmt:any={bind(...v:any[]){args=v;return stmt},async first(){return sql.prepare(q).get(...args)||null},async all(){return{results:sql.prepare(q).all(...args),success:true,meta:{}}},async run(){return{results:[],success:true,meta:{changes:Number(sql.prepare(q).run(...args).changes)}}}};return stmt},async batch(stmts:any[]){const run=tail.then(async()=>{sql.exec('BEGIN');try{const r=[];for(const stmt of stmts)r.push(await stmt.run());sql.exec('COMMIT');return r}catch(error){sql.exec('ROLLBACK');throw error}});tail=run.catch(()=>{});return run;}};}
function setup(){
 const sql=new DatabaseSync(':memory:'),search=new DatabaseSync(':memory:');
 for(const f of fs.readdirSync('migrations/catalog').sort())sql.exec(fs.readFileSync('migrations/catalog/'+f,'utf8'));
 for(const f of fs.readdirSync('migrations/search').sort())search.exec(fs.readFileSync('migrations/search/'+f,'utf8'));
 const db=database(sql),files=new Map<string,Uint8Array>(),messages:any[]=[];
 const bucket:any={async put(key:string,value:any){files.set(key,new Uint8Array(await new Response(value).arrayBuffer()))},async get(key:string){const bytes=files.get(key);return bytes?{size:bytes.length,body:new Blob([new Uint8Array(bytes)]).stream(),text:async()=>new TextDecoder().decode(bytes),arrayBuffer:async()=>bytes.buffer}:null}};
 const env:Env={CATALOG_DB:db,PUBLISHED:bucket,SEARCH_DB:database(search),INGEST_QUEUE:{async send(message){messages.push(message)}},APP_ENV:'production',PUBLIC_SITE_URL:'https://jotcoloring.com',PUBLIC_MEDIA_BASE_URL:'https://assets.jotcoloring.com',DISCOVERY_ENABLED:'true'};
 return{sql,search,db,env,files,messages};
}
const drawing=(sql:DatabaseSync,id='fox',status='draft')=>sql.prepare("INSERT INTO content(id,slug,title,status,active_version,provenance_json) VALUES(?,?,?, ?,1,'{}')").run(id,id,'A fox',status);
test('drafts do not notify; publication, update, slug and archive are durable and preserve original ordinal',async()=>{const f=setup();drawing(f.sql);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM discovery_notice').get()!.n,0);f.sql.exec("UPDATE content SET status='published',updated_at='2026-11-01T00:00:00Z' WHERE id='fox'");const ordinal=f.sql.prepare('SELECT ordinal FROM sitemap_entry').get()!.ordinal;await rebuildDiscovery(f.env,8);assert.match(await(await sitemapIndex(f.env,new URL('https://jotcoloring.com'))).text(),/sitemaps\/coloring\/1.xml/);assert.match(await(await sitemapSegment(f.env,new URL('https://jotcoloring.com'),'1')).text(),/coloring\/fox\//);f.sql.exec("UPDATE content SET slug='red-fox',updated_at='2026-11-01T01:00:00Z' WHERE id='fox'");await rebuildDiscovery(f.env,8);assert.equal(f.sql.prepare('SELECT ordinal FROM sitemap_entry').get()!.ordinal,ordinal);assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM discovery_notice WHERE event_type='redirect'").get()!.n,1);f.sql.exec("UPDATE content SET status='archived',updated_at='2026-11-01T02:00:00Z' WHERE id='fox'");await rebuildDiscovery(f.env,8);assert.ok(!(await(await sitemapSegment(f.env,new URL('https://jotcoloring.com'),'1')).text()).includes('/coloring/red-fox/'));});
test('racing publication cannot activate stale fragment and bounded reconciliation repairs drift',async()=>{const f=setup();drawing(f.sql,'fox','published');let first=true;const put=f.env.PUBLISHED!.put;f.env.PUBLISHED!.put=async(...args:any[])=>{const r=await put(...args as [any,any]);if(first){first=false;f.sql.exec("UPDATE discovery_dirty SET generation=generation+1")};return r};await rebuildDiscovery(f.env);assert.ok(Number(f.sql.prepare('SELECT COUNT(*) n FROM discovery_dirty').get()!.n)>0);f.sql.exec("UPDATE sitemap_entry SET slug='stale'");await reconcileDiscovery(f.env);assert.equal(f.sql.prepare('SELECT slug FROM sitemap_entry').get()!.slug,'fox');});
test('single-host IndexNow receipts stop repeats; 202 differs from indexed; invalid host and staging never send',async()=>{const f=setup();await rebuildDiscovery(f.env);f.sql.exec("INSERT INTO discovery_notice(path_key,revision,event_type) VALUES('/','v1','upsert')");let posts=0;const fetcher:any=async(u:string,init:any)=>{if(u.endsWith('.txt'))return new Response(INDEXNOW_KEY);if(u.includes('api.indexnow.org')){posts++;const b=JSON.parse(init.body);assert.equal(b.host,'jotcoloring.com');assert.deepEqual(b.urlList,['https://jotcoloring.com/']);return new Response('',{status:202})}return new Response('<link rel="canonical" href="https://jotcoloring.com/">')};await sendDiscoveryNotices(f.env,fetcher);await sendDiscoveryNotices(f.env,fetcher);assert.equal(posts,1);assert.equal(f.sql.prepare('SELECT state FROM discovery_notice').get()!.state,'key_pending');f.env.APP_ENV='staging';await sendDiscoveryNotices(f.env,fetcher);assert.equal(posts,1);});
test('retries respect Retry-After, permanent failures stop, attempts are bounded and operator can requeue',async()=>{assert.equal(nextDiscoveryAttempt(403,null,1),null);assert.equal(nextDiscoveryAttempt(429,'3600',1,0,0),'1970-01-01T01:00:00.000Z');assert.equal(nextDiscoveryAttempt(503,null,8),null);const f=setup();await rebuildDiscovery(f.env);f.sql.exec("INSERT INTO discovery_notice(path_key,revision,event_type) VALUES('/','v2','upsert')");const call:any=async(u:string)=>u.includes('.txt')?new Response(INDEXNOW_KEY):u.includes('api.indexnow.org')?new Response('',{status:403}):new Response('<link rel="canonical" href="https://jotcoloring.com/">');await sendDiscoveryNotices(f.env,call);assert.equal(f.sql.prepare('SELECT state FROM discovery_notice').get()!.state,'failed');f.sql.exec("UPDATE discovery_notice SET state='pending',attempts=0 WHERE state='failed'");assert.equal(f.sql.prepare('SELECT state FROM discovery_notice').get()!.state,'pending');});

test('duplicate concurrent delivery claims only once and late obsolete publication never sends',async()=>{
 const f=setup();drawing(f.sql,'fox','published');await rebuildDiscovery(f.env,8);f.sql.exec("UPDATE content SET status='archived',updated_at='2026-11-01T03:00:00Z' WHERE id='fox'");await rebuildDiscovery(f.env,8);let posts=0;
 const fetcher:any=async(u:string)=>{if(u.endsWith('.txt'))return new Response(INDEXNOW_KEY);if(u.includes('api.indexnow.org')){posts++;return new Response('',{status:200})}return new Response('',{status:404})};
 await Promise.all([sendDiscoveryNotices(f.env,fetcher),sendDiscoveryNotices(f.env,fetcher)]);assert.equal(posts,1);assert.ok(f.sql.prepare("SELECT id FROM discovery_notice WHERE state='obsolete'").get());
});

test('real publication validates both live preview and PDF before accepting its detail notification',async()=>{
 const f=setup();drawing(f.sql);f.sql.exec("INSERT INTO content_category(content_id,category_id) VALUES('fox','animals')");for(const [role,mime,key] of [['catalog_preview_bw','image/webp','published/fox.webp'],['printable_pdf_a4_bw','application/pdf','published/fox.pdf']])f.sql.prepare('INSERT INTO asset(asset_id,content_id,content_version,role,object_key,original_key,mime,bytes,sha256,asset_version,verified) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(role,'fox',1,role,key,key,mime,100,'a'.repeat(64),1,1);
 f.sql.exec("UPDATE content SET status='published',updated_at='2026-11-01T04:00:00Z' WHERE id='fox'");await rebuildDiscovery(f.env,8);const sent:string[]=[],heads:string[]=[];
 const fetcher:any=async(u:string,init:any)=>{if(init?.method==='HEAD'){heads.push(u);return new Response(null,{headers:{'Content-Type':u.endsWith('.pdf')?'application/pdf':'image/webp'}})}if(u.endsWith('.txt'))return new Response(INDEXNOW_KEY);if(u.includes('api.indexnow.org')){sent.push(...JSON.parse(init.body).urlList);return new Response('',{status:200})}return new Response(`<link rel="canonical" href="${u}">`)};
 await sendDiscoveryNotices(f.env,fetcher);assert.ok(sent.includes('https://jotcoloring.com/coloring/fox/'));assert.equal(heads.length,2);assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM discovery_notice WHERE state='failed'").get()!.n,0);
});

async function consume(f:ReturnType<typeof setup>,body:any){
 const {default:jobs}=await import('../workers/jobs/index');let acked=0;const retries:number[]=[];
 await jobs.queue({messages:[{body,attempts:1,ack(){acked++},retry(options){retries.push(options!.delaySeconds)}}]},f.env);
 return{acked,retries};
}
test('publication projection automatically queues one sitemap rebuild, including recovery of an already projected event',async()=>{
 const f=setup(),{projectEvent}=await import('../src/server/imports');f.sql.exec("DELETE FROM category WHERE id='numbers'");await rebuildDiscovery(f.env,8);assert.ok(!(await(await sitemapSegment(f.env,new URL('https://jotcoloring.com'),'static')).text()).includes('/coloring-pages/numbers/'));f.sql.exec("INSERT INTO category(id,name,parent_id) VALUES('numbers','Numbers','education')");drawing(f.sql,'new-topic','published');f.sql.exec("INSERT INTO content_category(content_id,category_id) VALUES('new-topic','numbers')");
 f.sql.exec("INSERT INTO outbox_event(event_id,content_id,version,event_type) VALUES('new-publication','new-topic',1,'published')");
 await Promise.all([projectEvent(f.env,'new-publication'),projectEvent(f.env,'new-publication')]);
 assert.deepEqual(f.messages,[{type:'discovery_rebuild',job_id:'sitemap'}]);
 assert.equal(f.sql.prepare('SELECT rebuild_state FROM discovery_state').get()!.rebuild_state,'queued');
 assert.deepEqual(await consume(f,f.messages[0]),{acked:1,retries:[]});
 const result=await sitemapSegment(f.env,new URL('https://jotcoloring.com'),'1');assert.match(await result.text(),/coloring\/new-topic\//);assert.match(result.headers.get('Cache-Control')!,/max-age=0,must-revalidate/);
 assert.equal(f.sql.prepare('SELECT rebuild_completed_by FROM discovery_state').get()!.rebuild_completed_by,'queue');assert.match(await(await sitemapSegment(f.env,new URL('https://jotcoloring.com'),'static')).text(),/coloring-pages\/numbers\//);
 f.sql.exec("UPDATE content SET title='Updated topic',updated_at='2026-11-02T10:00:00Z' WHERE id='new-topic'");
 await projectEvent(f.env,'new-publication');assert.equal(f.messages.length,2,'a known processed event can recover a failed wake-up');
});

test('concurrent publications coalesce and duplicate wake-ups do not rebuild clean fragments',async()=>{
 const f=setup();drawing(f.sql,'fox','published');
 const claimed=await Promise.all(Array.from({length:20},()=>queueDiscoveryRebuild(f.env)));
 assert.equal(claimed.filter(Boolean).length,1);assert.equal(f.messages.length,1);
 let writes=0;const put=f.env.PUBLISHED!.put;f.env.PUBLISHED!.put=async(...args:any[])=>{writes++;return put(...args as [any,any])};
 await Promise.all([consume(f,f.messages[0]),consume(f,f.messages[0])]);assert.equal(writes,2);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM discovery_dirty').get()!.n,0);
 await consume(f,f.messages[0]);assert.equal(writes,2);
});

test('an interrupted rebuild is recovered after its lease and a fresh lease is never falsely completed',async()=>{
 const f=setup();drawing(f.sql,'fox','published');
 f.sql.prepare("UPDATE discovery_state SET rebuild_state='processing',rebuild_token='previous-worker',rebuild_lease_until=?").run(new Date(Date.now()+60000).toISOString());
 assert.equal(await processDiscoveryRebuild(f.env),false);assert.equal(f.files.size,0);assert.equal(f.sql.prepare('SELECT rebuild_completed_at FROM discovery_state').get()!.rebuild_completed_at,'');
 f.sql.exec("UPDATE discovery_state SET rebuild_lease_until='2000-01-01T00:00:00Z'");f.env.APP_ENV='staging';
 await runDiscovery(f.env);assert.match(await(await sitemapSegment(f.env,new URL('https://jotcoloring.com'),'1')).text(),/coloring\/fox\//);
 assert.equal(f.sql.prepare('SELECT rebuild_state FROM discovery_state').get()!.rebuild_state,'idle');assert.equal(f.sql.prepare('SELECT rebuild_completed_by FROM discovery_state').get()!.rebuild_completed_by,'cron');
});

test('a failed wake-up or readback retains dirty work and the normal retry publishes its sitemap',async()=>{
 const f=setup();drawing(f.sql,'fox','published');const send=f.env.INGEST_QUEUE!.send;
 f.env.INGEST_QUEUE!.send=async()=>{throw Error('Queue unavailable')};await assert.rejects(()=>queueDiscoveryRebuild(f.env),/Queue unavailable/);
 assert.equal(f.sql.prepare('SELECT rebuild_state FROM discovery_state').get()!.rebuild_state,'idle');f.env.INGEST_QUEUE!.send=send;await queueDiscoveryRebuild(f.env);
 const get=f.env.PUBLISHED!.get;f.env.PUBLISHED!.get=async()=>null;
 const failed=await consume(f,f.messages[0]);assert.equal(failed.acked,0);assert.equal(failed.retries.length,1);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM discovery_fragment').get()!.n,0);
 assert.ok(Number(f.sql.prepare('SELECT COUNT(*) n FROM discovery_dirty').get()!.n)>0);assert.equal(f.sql.prepare('SELECT rebuild_completed_at FROM discovery_state').get()!.rebuild_completed_at,'');
 f.env.PUBLISHED!.get=get;assert.deepEqual(await consume(f,f.messages[0]),{acked:1,retries:[]});assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM discovery_dirty').get()!.n,0);
});

test('publication racing generation keeps its wake-up and cannot activate stale XML',async()=>{
 const f=setup();drawing(f.sql,'fox','published');await queueDiscoveryRebuild(f.env);
 const put=f.env.PUBLISHED!.put;let raced=false;f.env.PUBLISHED!.put=async(...args:any[])=>{const result=await put(...args as [any,any]);if(!raced){raced=true;drawing(f.sql,'rabbit','published');assert.equal(await queueDiscoveryRebuild(f.env),false);}return result;};
 await consume(f,f.messages[0]);assert.equal(f.sql.prepare('SELECT rebuild_state FROM discovery_state').get()!.rebuild_state,'queued');assert.equal(f.sql.prepare('SELECT rebuild_completed_at FROM discovery_state').get()!.rebuild_completed_at,'');assert.equal(f.messages.length,2);
 await consume(f,f.messages[1]);const xml=await(await sitemapSegment(f.env,new URL('https://jotcoloring.com'),'1')).text();assert.match(xml,/coloring\/fox\//);assert.match(xml,/coloring\/rabbit\//);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM discovery_dirty').get()!.n,0);
});

test('publication at lease release gets a follow-up instead of being lost',async()=>{
 const f=setup();drawing(f.sql,'fox','published');await queueDiscoveryRebuild(f.env);const prepare=f.db.prepare.bind(f.db);let raced=false;
 f.db.prepare=(query:string)=>{const statement=prepare(query);if(query.startsWith('UPDATE discovery_state SET rebuild_state=CASE')){const run=statement.run;statement.run=async()=>{if(!raced){raced=true;drawing(f.sql,'late-page','published');await queueDiscoveryRebuild(f.env);}return run();};}return statement;};
 await consume(f,f.messages[0]);assert.equal(f.messages.length,2);await consume(f,f.messages[1]);
 assert.match(await(await sitemapSegment(f.env,new URL('https://jotcoloring.com'),'1')).text(),/coloring\/late-page\//);assert.equal(f.sql.prepare('SELECT rebuild_state FROM discovery_state').get()!.rebuild_state,'idle');
});

test('each rebuild is bounded, prioritizes topic URLs and queues remaining segments',async()=>{
 const f=setup();for(let i=1;i<=9;i++){drawing(f.sql,'page-'+i,'published');f.sql.prepare('UPDATE sitemap_entry SET ordinal=? WHERE content_id=?').run(i*1000,'page-'+i);f.sql.prepare('INSERT OR IGNORE INTO discovery_dirty(segment) VALUES(?)').run(String(i));}
 await queueDiscoveryRebuild(f.env);const put=f.env.PUBLISHED!.put,keys:string[]=[];f.env.PUBLISHED!.put=async(key,...args:any[])=>{keys.push(key);return put(key,...args as [any])};
 await consume(f,f.messages[0]);assert.equal(keys.length,8);assert.match(keys[0],/sitemaps\/v1\/static\//);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM discovery_dirty').get()!.n,2);assert.equal(f.sql.prepare('SELECT rebuild_completed_at FROM discovery_state').get()!.rebuild_completed_at,'');
 await consume(f,f.messages[1]);assert.equal(keys.length,10);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM discovery_dirty').get()!.n,0);
});


test('crawler index changes with a changed fragment and unchanged XML preserves real modification times',async()=>{
 const {sitemapIndex}=await import('../src/server/sitemap');const f=setup();drawing(f.sql,'index-first','published');await rebuildDiscovery(f.env,8);
 f.sql.exec("UPDATE discovery_fragment SET generated_at='2026-01-01T00:00:00.000Z'");const before=await sitemapIndex(f.env,new URL('https://jotcoloring.com/sitemap.xml')),tag=before.headers.get('etag'),xml=await before.text();assert.match(xml,/<lastmod>2026-01-01T00:00:00.000Z<\/lastmod>/);
 f.sql.exec("INSERT INTO discovery_dirty(segment) SELECT segment FROM discovery_fragment WHERE 1 ON CONFLICT(segment) DO UPDATE SET generation=generation+1");await rebuildDiscovery(f.env,8);const same=await sitemapIndex(f.env,new URL('https://jotcoloring.com/sitemap.xml'));assert.equal(same.headers.get('etag'),tag);assert.equal(await same.text(),xml);
 drawing(f.sql,'index-new-topic','published');await rebuildDiscovery(f.env,8);const changed=await sitemapIndex(f.env,new URL('https://jotcoloring.com/sitemap.xml'));assert.notEqual(changed.headers.get('etag'),tag);assert.notEqual(await changed.text(),xml);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM discovery_dirty').get()!.n,0);
});

test('IndexNow POST uses a redirect mode supported by the actual Workers runtime',async()=>{
 const f=setup();await rebuildDiscovery(f.env);f.sql.exec("INSERT INTO discovery_notice(path_key,revision,event_type) VALUES('/','runtime-check','upsert')");
 const call:any=async(u:string,init:any)=>{if(init?.redirect==='error')throw Error('Workers rejects redirect:error');if(u.endsWith('.txt'))return new Response(INDEXNOW_KEY);if(u.includes('api.indexnow.org')){assert.equal(init.redirect,'manual');return new Response('',{status:200});}return new Response('<link rel="canonical" href="https://jotcoloring.com/">');};
 await sendDiscoveryNotices(f.env,call);assert.equal(f.sql.prepare('SELECT state FROM discovery_notice').get()!.state,'received');
});
test('bounded notice deliveries drain a backlog with durable receipts and no empty follow-up loop',async()=>{
 const f=setup();await rebuildDiscovery(f.env);for(let i=0;i<45;i++)f.sql.prepare("INSERT INTO discovery_notice(path_key,revision,event_type) VALUES('/',?,'upsert')").run('revision-'+i);
 const call:any=async(u:string)=>u.endsWith('.txt')?new Response(INDEXNOW_KEY):u.includes('api.indexnow.org')?new Response('',{status:200}):new Response('<link rel="canonical" href="https://jotcoloring.com/">');
 assert.equal(await queueDiscoveryNotices(f.env),true);assert.deepEqual(f.messages,[{type:'discovery_notify',job_id:'indexnow'}]);
 assert.equal(await processDiscoveryNotices(f.env,call),20);assert.equal(f.messages.length,2);
 assert.equal(await processDiscoveryNotices(f.env,call),20);assert.equal(f.messages.length,3);
 assert.equal(await processDiscoveryNotices(f.env,call),5);assert.equal(f.messages.length,3);
 assert.equal(await processDiscoveryNotices(f.env,call),0);assert.equal(f.messages.length,3);
 assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM discovery_notice WHERE state='received'").get()!.n,1);assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM discovery_notice WHERE state='obsolete'").get()!.n,44);
});
test('notice wake-ups preserve revision scope and Retry-After without processing other or future notices',async()=>{
 const f=setup();await rebuildDiscovery(f.env);const revision='navigation-v1:'+'a'.repeat(40);
 f.sql.prepare("INSERT INTO discovery_notice(path_key,revision,event_type,not_before) VALUES('/',?,'upsert',?)").run(revision,new Date(Date.now()+3600000).toISOString());
 f.sql.exec("INSERT INTO discovery_notice(path_key,revision,event_type) VALUES('/','other','upsert')");
 assert.equal(await queueDiscoveryNotices(f.env,revision),false);assert.equal(await processDiscoveryNotices(f.env,async()=>{throw Error('should not fetch')},revision),0);assert.equal(f.messages.length,0);
 f.sql.prepare("UPDATE discovery_notice SET not_before='' WHERE revision=?").run(revision);assert.equal(await queueDiscoveryNotices(f.env,revision),true);assert.deepEqual(f.messages,[{type:'discovery_notify',job_id:'indexnow',revision}]);
 await assert.rejects(()=>queueDiscoveryNotices(f.env,'unreviewed'),/reviewed navigation/);f.env.APP_ENV='staging';assert.equal(await queueDiscoveryNotices(f.env),false);
 const {default:jobs}=await import('../workers/jobs/index');let acked=0;await jobs.queue({messages:[{body:{type:'discovery_notify',job_id:'indexnow'},attempts:1,ack(){acked++},retry(){throw Error('valid message rejected')}}]},f.env);assert.equal(acked,1);
});

test('twenty verified URLs share one IndexNow request and one key check',async()=>{
 const f=setup();await rebuildDiscovery(f.env);const paths=Array.from({length:15},(_,i)=>'/coloring-pages/numbers/'+(i+1)+'/').concat(['/collections/animals/','/collections/nature/','/collections/education/','/collections/characters/','/collections/bible/']);
 const key=f.sql.prepare("SELECT object_key FROM discovery_fragment WHERE segment='static'").get()!.object_key as string;f.files.set(key,new TextEncoder().encode('<urlset>'+paths.map(p=>'<url><loc>https://jotcoloring.com'+p+'</loc></url>').join('')+'</urlset>'));
 for(const path of paths)f.sql.prepare("INSERT INTO discovery_notice(path_key,revision,event_type) VALUES(?,'batch','upsert')").run(path);
 let posts=0,keys=0;const call:any=async(u:string,init:any)=>{if(u.endsWith('.txt')){keys++;return new Response(INDEXNOW_KEY);}if(u.includes('api.indexnow.org')){posts++;assert.deepEqual(JSON.parse(init.body).urlList,paths.map(p=>'https://jotcoloring.com'+p));return new Response('',{status:200});}return new Response(`<link rel="canonical" href="${u}">`);};
 assert.equal(await processDiscoveryNotices(f.env,call),20);assert.equal(posts,1);assert.equal(keys,1);assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM discovery_notice WHERE state='received'").get()!.n,20);
});
test('a 429 pauses every notification stream until Retry-After without spending unrelated attempts',async()=>{
 const f=setup();await rebuildDiscovery(f.env);f.sql.exec("INSERT INTO discovery_notice(path_key,revision,event_type) VALUES('/','limited','upsert')");let posts=0;
 const call:any=async(u:string)=>u.endsWith('.txt')?new Response(INDEXNOW_KEY):u.includes('api.indexnow.org')?(posts++,new Response('',{status:429,headers:{'Retry-After':'3600'}})):new Response('<link rel="canonical" href="https://jotcoloring.com/">');
 await processDiscoveryNotices(f.env,call);f.sql.exec("INSERT INTO discovery_notice(path_key,revision,event_type) VALUES('/collections/education/','unrelated','upsert')");
 assert.equal(await queueDiscoveryNotices(f.env),false);assert.equal(await processDiscoveryNotices(f.env,call),0);assert.equal(posts,1);assert.equal(f.sql.prepare("SELECT attempts FROM discovery_notice WHERE revision='unrelated'").get()!.attempts,0);assert.equal(f.messages.length,0);
});
test('a notification that loses its lease before the batch send cannot notify or overwrite the new owner',async()=>{
 const f=setup();await rebuildDiscovery(f.env);f.sql.exec("INSERT INTO discovery_notice(path_key,revision,event_type) VALUES('/','lease-check','upsert')");const prepare=f.db.prepare.bind(f.db);f.db.prepare=(q:string)=>{const s=prepare(q);if(q.startsWith('UPDATE discovery_notice SET lease_until=')){const run=s.run;s.run=async()=>{f.sql.exec("UPDATE discovery_notice SET lease_until='new-owner'");return run();};}return s;};
 let posts=0;const call:any=async(u:string)=>u.includes('api.indexnow.org')?(posts++,new Response('')):new Response('<link rel="canonical" href="https://jotcoloring.com/">');await sendDiscoveryNotices(f.env,call);assert.equal(posts,0);const row=f.sql.prepare('SELECT state,lease_until FROM discovery_notice').get()!;assert.equal(row.state,'sending');assert.equal(row.lease_until,'new-owner');
});

test('a repeated 429 retains the global cooldown instead of becoming a permanent failure',async()=>{
 assert.equal(nextDiscoveryAttempt(429,null,1,0,0),'1970-01-01T00:10:00.000Z');
 assert.ok(nextDiscoveryAttempt(429,null,8,0,0));
 assert.equal(nextDiscoveryAttempt(429,'172800',40,0,0),'1970-01-03T00:00:00.000Z');
 const f=setup();await rebuildDiscovery(f.env);f.sql.exec("INSERT INTO discovery_notice(path_key,revision,event_type,attempts) VALUES('/','eighth-rate-limit','upsert',7)");let posts=0;
 const call:any=async(u:string)=>u.endsWith('.txt')?new Response(INDEXNOW_KEY):u.includes('api.indexnow.org')?(posts++,new Response('',{status:429})):new Response('<link rel="canonical" href="https://jotcoloring.com/">');
 await processDiscoveryNotices(f.env,call);const row=f.sql.prepare('SELECT state,attempts,last_status,not_before FROM discovery_notice').get()!;
 assert.equal(row.state,'pending');assert.equal(row.attempts,8);assert.equal(row.last_status,429);assert.ok(Date.parse(row.not_before as string)>Date.now()+600000);
 f.sql.exec("INSERT INTO discovery_notice(path_key,revision,event_type) VALUES('/collections/education/','new-stream','upsert')");
 assert.equal(await processDiscoveryNotices(f.env,call),0);assert.equal(posts,1);assert.equal(f.sql.prepare("SELECT attempts FROM discovery_notice WHERE revision='new-stream'").get()!.attempts,0);
});

test('publication during a live check defers the notice without exhausting its last attempt',async()=>{
 const f=setup();await rebuildDiscovery(f.env);f.sql.exec("INSERT INTO discovery_notice(path_key,revision,event_type,attempts) VALUES('/','publication-race','upsert',7)");let posts=0;
 const call:any=async(u:string)=>{if(u.includes('api.indexnow.org')){posts++;return new Response('');}f.sql.exec("INSERT INTO discovery_dirty(segment) VALUES('static') ON CONFLICT(segment) DO UPDATE SET generation=generation+1");return new Response('<link rel="canonical" href="https://jotcoloring.com/">');};
 await processDiscoveryNotices(f.env,call);const row=f.sql.prepare('SELECT state,attempts,last_error,lease_until,not_before FROM discovery_notice').get()!;
 assert.equal(posts,0);assert.equal(row.state,'pending');assert.equal(row.attempts,7);assert.equal(row.last_error,'PUBLICATION_CHANGED');assert.equal(row.lease_until,null);assert.ok(Date.parse(row.not_before as string)>Date.now());
 await rebuildDiscovery(f.env);f.sql.exec("UPDATE discovery_notice SET not_before='' WHERE revision='publication-race'");
 const success:any=async(u:string)=>u.endsWith('.txt')?new Response(INDEXNOW_KEY):u.includes('api.indexnow.org')?(posts++,new Response('')):new Response('<link rel="canonical" href="https://jotcoloring.com/">');
 await processDiscoveryNotices(f.env,success);assert.equal(posts,1);assert.equal(f.sql.prepare('SELECT state FROM discovery_notice').get()!.state,'received');
});

test('publication after preparation defers every owned batch notice without spending attempts',async()=>{
 const f=setup();await rebuildDiscovery(f.env);for(let i=0;i<2;i++)f.sql.prepare("INSERT INTO discovery_notice(path_key,revision,event_type) VALUES(?,?,'upsert')").run(i?'/coloring-pages/':'/','prepared-'+i);
 const prepare=f.db.prepare.bind(f.db);f.db.prepare=(q:string)=>{const s=prepare(q);if(q.startsWith('UPDATE discovery_notice SET lease_until=')){const run=s.run;s.run=async()=>{const result=await run();f.sql.exec("INSERT INTO discovery_dirty(segment) VALUES('static') ON CONFLICT(segment) DO UPDATE SET generation=generation+1");return result;};}return s;};
 let posts=0;const call:any=async(u:string)=>u.includes('api.indexnow.org')?(posts++,new Response('')):new Response(`<link rel="canonical" href="${u}">`);
 await processDiscoveryNotices(f.env,call);assert.equal(posts,0);const rows=f.sql.prepare('SELECT state,attempts,last_error FROM discovery_notice').all();assert.equal(rows.length,2);for(const row of rows){assert.equal(row.state,'pending');assert.equal(row.attempts,0);assert.equal(row.last_error,'PUBLICATION_CHANGED');}
});
