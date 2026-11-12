import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import test from 'node:test';
import {publicAsset} from '../src/server/assets';
import {AppError} from '../src/server/http';
import {withPublicCache, type ResponseCache} from '../src/server/public-cache';
import type {Database, Env} from '../src/server/types';

function fixture(role='printable_pdf_a4_bw') {
  const sql=new DatabaseSync(':memory:');
  sql.exec(`CREATE TABLE content(id TEXT,slug TEXT,status TEXT,active_version INTEGER);
    CREATE TABLE asset(content_id TEXT,content_version INTEGER,role TEXT,object_key TEXT,sha256 TEXT,mime TEXT,bytes INTEGER,verified INTEGER);
    INSERT INTO content VALUES('jc-facebook-071','facebook-roadster-garage','published',2);`);
  const pdf=role.includes('pdf'),mime=pdf?'application/pdf':'image/webp';
  const bytes=pdf?new TextEncoder().encode('%PDF-1.7\ncurrent reviewed drawing\n%%EOF'):new Uint8Array([82,73,70,70,4,0,0,0,87,69,66,80]);
  const hash=createHash('sha256').update(bytes).digest('hex'),key='published/social-media/current/'+hash+(pdf?'.pdf':'.webp');
  const old='a'.repeat(64);
  sql.prepare('INSERT INTO asset VALUES(?,?,?,?,?,?,?,?)').run('jc-facebook-071',1,role,'published/old-file',old,mime,123,1);
  sql.prepare('INSERT INTO asset VALUES(?,?,?,?,?,?,?,?)').run('jc-facebook-071',2,role,key,hash,mime,bytes.length,1);
  let heads=0,gets=0,missing=false,wrongSize=false;
  const db={prepare(query:string) {
    let values:unknown[]=[];
    const statement={bind(...bound:unknown[]) {values=bound;return statement;},async first() {
      if(query.includes('outbox_event'))return {seq:1,projected:1};
      return sql.prepare(query).get(...values as never[])||null;
    }};
    return statement;
  }} as unknown as Database;
  const object=(requested:string)=>{
    assert.equal(requested,key,'Recovery may only read the active verified file');
    return missing?null:{size:bytes.length+(wrongSize?1:0),body:new Response(bytes.slice()).body};
  };
  const env={APP_ENV:'production',PUBLIC_SITE_URL:'https://jotcoloring.com',PUBLIC_MEDIA_BASE_URL:'https://assets.jotcoloring.com',CATALOG_DB:db,PUBLISHED:{
    async head(requested:string) {heads++;return object(requested);},
    async get(requested:string) {gets++;return object(requested);}
  }} as unknown as Env;
  return {sql,env,role,bytes,hash,key,old,reads:()=>({heads,gets}),missing:()=>{missing=true;},wrongSize:()=>{wrongSize=true;}};
}

test('old indexed PDF, Image and Letter links recover in one hop to the active verified download',async()=>{
  for(const [role,format] of [['printable_pdf_a4_bw','pdf'],['printable_webp_bw','webp'],['printable_pdf_letter_bw','letter']]) {
    for(const length of [24,64]) {
      const f=fixture(role),url=`https://jotcoloring.com/api/download/jc-facebook-071/${format}?v=${f.old.slice(0,length)}&return=https://attacker.test`;
      const response=await publicAsset(new Request(url,{headers:{'If-None-Match':'"'+f.old+'"'}}),f.env,'jc-facebook-071',role,true);
      assert.equal(response.status,302);
      assert.equal(response.headers.get('Location'),`/api/download/jc-facebook-071/${format}?v=${f.hash.slice(0,24)}`);
      assert.equal(response.headers.get('Cache-Control'),'no-store');
      assert.equal(response.headers.get('ETag'),null);
      assert.equal((await response.arrayBuffer()).byteLength,0);
      assert.deepEqual(f.reads(),{heads:1,gets:0});
      const final=await publicAsset(new Request(new URL(response.headers.get('Location')!,url)),f.env,'jc-facebook-071',role,true);
      assert.equal(final.status,200);
      assert.equal(final.headers.get('Content-Disposition'),`attachment; filename="facebook-roadster-garage.${format==='webp'?'webp':'pdf'}"`);
      assert.deepEqual(new Uint8Array(await final.arrayBuffer()),f.bytes);
    }
  }
});

test('HEAD recovers without a body, while current downloads preserve bytes, canonical identity and conditionals',async()=>{
  const f=fixture(),path='https://jotcoloring.com/api/download/jc-facebook-071/pdf';
  const recovered=await publicAsset(new Request(path+'?v='+f.old.slice(0,24),{method:'HEAD'}),f.env,'jc-facebook-071',f.role,true);
  assert.equal(recovered.status,302);
  assert.equal((await recovered.arrayBuffer()).byteLength,0);
  for(const suffix of ['', '?v='+f.hash.slice(0,24), '?v='+f.hash]) {
    const response=await publicAsset(new Request(path+suffix),f.env,'jc-facebook-071',f.role,true);
    assert.equal(response.status,200);
    assert.equal(response.headers.get('Link'),`<https://assets.jotcoloring.com/${f.key}>; rel="canonical"`);
    assert.equal(response.headers.get('ETag'),'"'+f.hash+'"');
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()),f.bytes);
  }
  const unchanged=await publicAsset(new Request(path+'?v='+f.hash.slice(0,24),{headers:{'If-None-Match':'"'+f.hash+'"'}}),f.env,'jc-facebook-071',f.role,true);
  assert.equal(unchanged.status,304);
  assert.equal((await unchanged.arrayBuffer()).byteLength,0);
});

test('immutable media and invalid revisions never silently change identity',async()=>{
  for(const download of [false,true]) {
    const f=fixture();
    for(const expected of download?['not-a-checksum','b'.repeat(25)]:[f.old.slice(0,24),f.old]) {
      await assert.rejects(publicAsset(new Request('https://jotcoloring.com/api/'+(download?'download':'media')+'/jc-facebook-071/pdf?v='+expected),f.env,'jc-facebook-071',f.role,download),
        (e:unknown)=>e instanceof AppError&&e.code==='ASSET_REVISION_GONE'&&e.status===410);
    }
    assert.deepEqual(f.reads(),{heads:0,gets:0});
  }
});

test('recovery never exposes withdrawn, unverified, unavailable or wrong-sized files',async()=>{
  for(const kind of ['archived','unverified','missing-row','missing-object','wrong-size']) {
    const f=fixture();
    if(kind==='archived')f.sql.exec("UPDATE content SET status='archived'");
    if(kind==='unverified')f.sql.exec('UPDATE asset SET verified=0 WHERE content_version=2');
    if(kind==='missing-row')f.sql.exec('DELETE FROM content');
    if(kind==='missing-object')f.missing();
    if(kind==='wrong-size')f.wrongSize();
    await assert.rejects(publicAsset(new Request('https://jotcoloring.com/api/download/jc-facebook-071/pdf?v='+f.old.slice(0,24)),f.env,'jc-facebook-071',f.role,true),
      (e:unknown)=>e instanceof AppError&&e.status===(['missing-object','wrong-size'].includes(kind)?503:404),kind);
    assert.equal(f.reads().gets,0);
  }
});

test('obsolete download recovery is never stored in the edge cache, so withdrawals remain effective',async()=>{
  const f=fixture(),pending:Promise<unknown>[]=[],entries=new Map<string,Response>();
  const cache:ResponseCache={async match(key){return entries.get(key.url)?.clone();},async put(key,response){entries.set(key.url,response);}};
  const request=new Request('https://jotcoloring.com/api/download/jc-facebook-071/pdf?v='+f.old.slice(0,24));
  const run=()=>withPublicCache(request,f.env,'recovery-release',()=>publicAsset(request,f.env,'jc-facebook-071',f.role,true),cache,p=>pending.push(p));
  assert.equal((await run()).status,302);
  await Promise.all(pending);
  assert.equal(entries.size,0);
  f.sql.exec("UPDATE content SET status='archived'");
  await assert.rejects(run(),(e:unknown)=>e instanceof AppError&&e.status===404);
});
