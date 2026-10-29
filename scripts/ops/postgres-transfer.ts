import fs from 'node:fs';
import readline from 'node:readline';
import {createHash} from 'node:crypto';

export interface Pg {query<T=Record<string,unknown>>(sql:string,params?:unknown[]):Promise<{rows:T[]}>;exec(sql:string):Promise<unknown>;transaction<T>(fn:(tx:Pg)=>Promise<T>):Promise<T>}
type Cell = string|null;
export type DataRow = Record<string,Cell>;
interface Column {name:string;type:string;primary_position:number}
interface Table {name:string;columns:Column[];row_count:number;sha256:string}
export interface Snapshot {schema:string;file_sha256:string;outbox_watermark:string;tables:Table[];rows:number}
const LEGACY_TABLES = ['category','content','content_revision','content_category','content_tag','content_age','asset','asset_review','slug_redirect','import_job','import_item','outbox_event','processed_event','audit_event','category_count','creator_job','creator_upload','capacity_snapshot','request_limit','sitemap_entry','ai_free_reservation'];
export const TABLES=[...LEGACY_TABLES,'age_recommendation'];
export const canonical=(value:unknown):string=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a<b?-1:a>b?1:0)):v);
export const sha=(value:string)=>createHash('sha256').update(value).digest('hex');
const ident=(value:string)=>{if(!/^[a-z][a-z0-9_]*$/.test(value))throw new Error('Unsafe SQL identifier');return '"'+value+'"';};
async function fileHash(file:string){const hash=createHash('sha256');for await(const chunk of fs.createReadStream(file))hash.update(chunk);return hash.digest('hex');}
export async function* lines(file:string){let number=0;const stream=readline.createInterface({input:fs.createReadStream(file),crlfDelay:Infinity});for await(const text of stream){number++;if(text.length>2_000_000)throw new Error('Oversized snapshot line');if(!text)throw new Error('Empty snapshot line');yield{number,value:JSON.parse(text)};}}
export async function inspectSnapshot(file:string):Promise<Snapshot>{
 let header:any,footer:any,current:Table|undefined,digest:any;const tables:Table[]=[];let actual=0;
 const finish=()=>{if(current){current.sha256=digest.digest('hex');if(current.row_count!==actual)throw new Error('Table count mismatch: '+current.name);}};
 for await(const {number,value:v} of lines(file)){
  if(footer)throw new Error('Data after snapshot footer');
  if(v.kind==='header'){if(number!==1||header)throw new Error('Unexpected header');if(!['jotcoloring-catalog-transfer/1','jotcoloring-catalog-transfer/2'].includes(v.schema)||canonical(v.tables)!==canonical(v.schema==='jotcoloring-catalog-transfer/1'?LEGACY_TABLES:TABLES)||v.integer_encoding!=='decimal-string')throw new Error('Unsupported snapshot schema');header=v;}
  else if(v.kind==='table'){
   if(!header||v.table!==header.tables[tables.length])throw new Error('Unexpected table order');finish();
   if(!Number.isSafeInteger(v.row_count)||v.row_count<0||!Array.isArray(v.columns))throw new Error('Invalid table metadata');
   const columns=v.columns as Column[];for(const c of columns){ident(c.name);if(!['TEXT','INTEGER'].includes(c.type)||!Number.isSafeInteger(c.primary_position)||c.primary_position<0)throw new Error('Invalid column metadata');}
   if(new Set(columns.map(c=>c.name)).size!==columns.length||!columns.some(c=>c.primary_position))throw new Error('Invalid primary key');
   current={name:v.table,columns,row_count:v.row_count,sha256:''};tables.push(current);digest=createHash('sha256');actual=0;
  }else if(v.kind==='row'){
   if(!current||v.table!==current.name)throw new Error('Unexpected row table');validateRow(current,v.data);
   const data=canonical(v.data);if(sha(data)!==v.sha256)throw new Error('Row checksum mismatch');digest.update(data+'\n');actual++;
  }else if(v.kind==='footer'){finish();footer=v;}
  else throw new Error('Unknown snapshot line');
 }
 if(!header||!footer||tables.length!==header.tables.length)throw new Error('Incomplete snapshot');
 for(const t of tables)if(footer.tables?.[t.name]?.rows!==t.row_count||footer.tables?.[t.name]?.sha256!==t.sha256)throw new Error('Table checksum mismatch: '+t.name);
 const rows=tables.reduce((n,t)=>n+t.row_count,0);if(rows!==footer.rows||footer.outbox_watermark!==header.outbox_watermark)throw new Error('Footer mismatch');
 return{schema:header.schema,file_sha256:await fileHash(file),outbox_watermark:header.outbox_watermark,tables,rows};
}
function validateRow(table:Table,data:DataRow){
 if(!data||typeof data!=='object'||Array.isArray(data)||canonical(Object.keys(data).sort())!==canonical(table.columns.map(c=>c.name).sort()))throw new Error('Column mismatch: '+table.name);
 for(const c of table.columns){const v=data[c.name];if(v!==null&&typeof v!=='string')throw new Error('Lossy cell encoding');if(v!==null&&c.type==='INTEGER'&&!/^-?\d+$/.test(v))throw new Error('Invalid decimal integer');}
}
async function targetSchema(db:Pg,snapshot:Snapshot){
 for(const table of snapshot.tables){const result=await db.query<{column_name:string;data_type:string}>('SELECT column_name,data_type FROM information_schema.columns WHERE table_schema=\'public\' AND table_name=$1 ORDER BY ordinal_position',[table.name]);const found=new Map(result.rows.map(r=>[r.column_name,r.data_type]));if(found.size!==table.columns.length||table.columns.some(c=>found.get(c.name)!==(c.type==='INTEGER'?'bigint':'text')))throw new Error('Target schema mismatch: '+table.name);}
}
function keys(table:Table){return table.columns.filter(c=>c.primary_position).sort((a,b)=>a.primary_position-b.primary_position).map(c=>c.name);}
async function writeRow(db:Pg,table:Table,data:DataRow,replace=false){
 validateRow(table,data);const columns=table.columns.map(c=>c.name),primary=keys(table),other=columns.filter(c=>!primary.includes(c));
 const conflict=replace&&other.length?'DO UPDATE SET '+other.map(c=>`${ident(c)}=EXCLUDED.${ident(c)}`).join(','):'DO NOTHING';
 await db.query(`INSERT INTO ${ident(table.name)} (${columns.map(ident).join(',')}) VALUES (${columns.map((_,i)=>'$'+(i+1)).join(',')}) ON CONFLICT (${primary.map(ident).join(',')}) ${conflict}`,columns.map(c=>data[c]));
 if(!replace){const existing=await db.query<DataRow>(`SELECT ${columns.map(c=>`${ident(c)}::text AS ${ident(c)}`).join(',')} FROM ${ident(table.name)} WHERE ${primary.map((c,i)=>`${ident(c)}=$${i+1}`).join(' AND ')}`,primary.map(c=>data[c]));if(existing.rows.length!==1||canonical(existing.rows[0])!==canonical(data))throw new Error('Existing row conflicts with snapshot: '+table.name);}
}
export async function importSnapshot(db:Pg,file:string,options:{batchSize?:number;stopAfterBatches?:number}={}){
 const snapshot=await inspectSnapshot(file);await targetSchema(db,snapshot);const batchSize=options.batchSize||64;if(batchSize<1||batchSize>256)throw new Error('Batch size must be1–256');
 await db.query('INSERT INTO transfer_checkpoint(snapshot_sha256,last_line,status) VALUES($1,0,\'importing\') ON CONFLICT DO NOTHING',[snapshot.file_sha256]);
 const state=(await db.query<{last_line:string;status:string}>('SELECT last_line::text,status FROM transfer_checkpoint WHERE snapshot_sha256=$1',[snapshot.file_sha256])).rows[0];
 if(state.status==='complete')return{snapshot,status:'already-complete',batches:0,rows:0};
 const prior=Number(state.last_line);let batch:{number:number;table:Table;data:DataRow}[]=[],batches=0,rows=0;let current:Table|undefined;
 const flush=async()=>{if(!batch.length)return;const pending=batch;batch=[];await db.transaction(async tx=>{for(const r of pending)await writeRow(tx,r.table,r.data);await tx.query('UPDATE transfer_checkpoint SET last_line=$2,updated_at=now() WHERE snapshot_sha256=$1',[snapshot.file_sha256,pending[pending.length-1].number]);});batches++;rows+=pending.length;if(options.stopAfterBatches&&batches>=options.stopAfterBatches)throw new Error('SIMULATED_INTERRUPTION_AFTER_COMMIT');};
 for await(const {number,value:v} of lines(file)){
  if(v.kind==='table'){await flush();current=snapshot.tables.find(t=>t.name===v.table);}
  if(v.kind==='row'&&number>prior){if(!current||sha(canonical(v.data))!==v.sha256)throw new Error('Snapshot changed during import');batch.push({number,table:current,data:v.data});if(batch.length>=batchSize)await flush();}
 }
 await flush();if(await fileHash(file)!==snapshot.file_sha256)throw new Error('Snapshot changed during import');
 // Preserve explicit source sequence values without allowing the next insert to collide.
 for(const [table,column] of [['outbox_event','seq'],['audit_event','id'],['sitemap_entry','ordinal']])await db.query(`SELECT setval(pg_get_serial_sequence('${table}','${column}'),GREATEST(COALESCE(MAX(${ident(column)}),0),1),COALESCE(MAX(${ident(column)}),0)>0) FROM ${ident(table)}`);
 await db.query('UPDATE transfer_checkpoint SET status=\'complete\',updated_at=now() WHERE snapshot_sha256=$1',[snapshot.file_sha256]);
 return{snapshot,status:'complete',batches,rows};
}
export async function compareSnapshot(db:Pg,snapshot:Snapshot){
 const results=[];
 for(const table of snapshot.tables){
  const digest=createHash('sha256');let count=0;const primary=keys(table),select=table.columns.map(c=>`${ident(c.name)}::text AS ${ident(c.name)}`).join(',');
  await db.transaction(async tx=>{await tx.exec(`DECLARE verify_rows NO SCROLL CURSOR FOR SELECT ${select} FROM ${ident(table.name)} AS source_row ORDER BY ${primary.map(c=>'source_row.'+ident(c)).join(',')}`);while(true){const r=await tx.query<DataRow>('FETCH FORWARD 256 FROM verify_rows');if(!r.rows.length)break;for(const row of r.rows){digest.update(canonical(row)+'\n');count++;}}await tx.exec('CLOSE verify_rows');});
  const checksum=digest.digest('hex');results.push({table:table.name,rows:count,expected_rows:table.row_count,sha256:checksum,expected_sha256:table.sha256,status:count===table.row_count&&checksum===table.sha256?'PASS':'FAIL'});
 }
 return results;
}
export async function rebuildSearch(db:Pg,ids?:string[]){
 let after='';while(true){const selected=ids?ids:(await db.query<{id:string}>('SELECT id FROM content WHERE id>$1 ORDER BY id LIMIT 256',[after])).rows.map(r=>r.id);if(!selected.length)break;
 await db.query(`INSERT INTO search_projection(id,source_version,visibility,locale,title,tags,categories,category_ids,age_groups,difficulty,published_at,sort_score,recommended_age)
 SELECT c.id,c.latest_version,c.status,c.locale,c.title,
 COALESCE((SELECT string_agg(t.tag,' ' ORDER BY t.tag) FROM content_tag t WHERE t.content_id=c.id),''),
 COALESCE((SELECT string_agg(cat.id||' '||cat.name,' ' ORDER BY cat.id) FROM content_category cc JOIN category cat ON cat.id=cc.category_id WHERE cc.content_id=c.id),''),
 ARRAY(SELECT cc.category_id FROM content_category cc WHERE cc.content_id=c.id ORDER BY cc.position,cc.category_id),
 ARRAY(SELECT a.age FROM content_age a WHERE a.content_id=c.id ORDER BY a.age),c.difficulty,c.published_at,c.sort_score,
 (SELECT ar.band FROM age_recommendation ar JOIN asset a ON a.content_id=ar.content_id AND a.content_version=ar.content_version AND a.role='printable_webp_bw' AND a.sha256=ar.source_sha256 WHERE ar.content_id=c.id AND ar.content_version=c.active_version)
 FROM content c WHERE c.id=ANY($1::text[]) ON CONFLICT(id) DO UPDATE SET source_version=EXCLUDED.source_version,visibility=EXCLUDED.visibility,locale=EXCLUDED.locale,title=EXCLUDED.title,tags=EXCLUDED.tags,categories=EXCLUDED.categories,category_ids=EXCLUDED.category_ids,age_groups=EXCLUDED.age_groups,difficulty=EXCLUDED.difficulty,published_at=EXCLUDED.published_at,sort_score=EXCLUDED.sort_score,recommended_age=EXCLUDED.recommended_age WHERE EXCLUDED.source_version>=search_projection.source_version`,[selected]);if(ids)break;after=selected[selected.length-1];}
}
export async function searchPostgres(db:Pg,query:{q?:string;category?:string;subcategory?:string;age?:string[];recommended_age?:string;difficulty?:string[];sort?:string}){
 const words=(query.q||'').normalize('NFKC').trim().slice(0,160).split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0,12);
 if(!words.length)return[];const expression=words.map(word=>`'${word}':*`).join(' & '),params:unknown[]=[expression];const where=["p.visibility='published'", "p.document @@ to_tsquery('simple',$1)"];
 for(const category of [query.category,query.subcategory])if(category){params.push(category);where.push(`$${params.length}=ANY(p.category_ids)`);}
 if(query.recommended_age){params.push(query.recommended_age);where.push(`p.recommended_age=$${params.length}`);}if(query.age?.length){params.push(query.age);where.push(`p.age_groups&&$${params.length}::text[]`);}if(query.difficulty?.length){params.push(query.difficulty);where.push(`p.difficulty=ANY($${params.length}::text[])`);}
 const sort=query.sort==='title'?'lower(p.title) ASC,p.id ASC':query.sort==='newest'?'p.published_at DESC,p.id DESC':'p.sort_score DESC,p.id DESC';
 return(await db.query<{id:string;slug:string}>(`SELECT p.id,c.slug FROM search_projection p JOIN content c ON c.id=p.id WHERE ${where.join(' AND ')} ORDER BY ${sort} LIMIT 48`,params)).rows;
}
export interface ContentEvent {event_id:string;seq:string;content_id:string;version:string;event_type:'published'|'archived';content:DataRow;related:Record<string,DataRow[]>}
export async function applyContentEvent(db:Pg,snapshot:Snapshot,event:ContentEvent){
 if(event.content.id!==event.content_id||event.content.latest_version!==event.version||event.content.status!==event.event_type||!/^\d+$/.test(event.version)||!/^\d+$/.test(event.seq))throw new Error('Invalid event identity/version');
 const payload=sha(canonical(event)),get=(name:string)=>{const table=snapshot.tables.find(t=>t.name===name);if(!table)throw new Error('Missing snapshot schema');return table;};
 return db.transaction(async tx=>{
  const recorded=(await tx.query<{payload_sha256:string}>('SELECT payload_sha256 FROM migration_event WHERE event_id=$1',[event.event_id])).rows[0];if(recorded){if(recorded.payload_sha256!==payload)throw new Error('Event ID payload conflict');return'duplicate';}
  const existing=(await tx.query<{latest_version:string;status:string}>('SELECT latest_version::text,status FROM content WHERE id=$1 FOR UPDATE',[event.content_id])).rows[0];
  let disposition='applied';
  if(existing&&BigInt(existing.latest_version)>BigInt(event.version))disposition='stale';
  else if(existing&&existing.latest_version===event.version){
   const table=get('content');const found=(await tx.query<DataRow>(`SELECT ${table.columns.map(c=>`${ident(c.name)}::text AS ${ident(c.name)}`).join(',')} FROM content WHERE id=$1`,[event.content_id])).rows[0];
   if(canonical(found)!==canonical(event.content))throw new Error('Same-version content payload conflict');disposition='covered-by-snapshot';
  }
  else {
   for(const [table,rows] of Object.entries(event.related)){if(!['category','content_revision','asset','content_category','content_tag','content_age','age_recommendation','slug_redirect'].includes(table))throw new Error('Unsupported event relation');for(const row of rows){validateRow(get(table),row);if(table!=='category'&&row.content_id!==event.content_id)throw new Error('Cross-content event row');}}
   const assets=event.related.asset||[];
   if(event.event_type==='published')for(const role of ['catalog_thumb_bw','catalog_preview_bw','printable_webp_bw','printable_pdf_a4_bw'])if(!assets.some(a=>a.role===role&&a.content_version===event.content.active_version&&a.verified==='1'))throw new Error('Published event missing active verified asset '+role);
   for(const row of event.related.category||[])await writeRow(tx,get('category'),row);
   await writeRow(tx,get('content'),event.content,true);
   const oldCategories=new Set((await tx.query<{category_id:string}>('SELECT category_id FROM content_category WHERE content_id=$1',[event.content_id])).rows.map(r=>r.category_id));
   for(const table of ['content_category','content_tag','content_age','age_recommendation'])await tx.query(`DELETE FROM ${ident(table)} WHERE content_id=$1`,[event.content_id]);
   for(const table of ['content_revision','asset','content_category','content_tag','content_age','age_recommendation','slug_redirect'])for(const row of event.related[table]||[])await writeRow(tx,get(table),row,true);
   await tx.query('INSERT INTO sitemap_entry(content_id,slug,updated_at,visibility) VALUES($1,$2,$3,$4) ON CONFLICT(content_id) DO UPDATE SET slug=EXCLUDED.slug,updated_at=EXCLUDED.updated_at,visibility=EXCLUDED.visibility',[event.content_id,event.content.slug,event.content.updated_at,event.content.status]);
   const newCategories=new Set((event.related.content_category||[]).map(r=>r.category_id!));
   for(const categoryId of new Set([...oldCategories,...newCategories])){const delta=(event.event_type==='published'&&newCategories.has(categoryId)?1:0)-(existing?.status==='published'&&oldCategories.has(categoryId)?1:0);if(delta)await tx.query('INSERT INTO category_count(category_id,published_count) VALUES($1,GREATEST(0,$2::bigint)) ON CONFLICT(category_id) DO UPDATE SET published_count=GREATEST(0,category_count.published_count+$2::bigint)',[categoryId,delta]);}
   await rebuildSearch(tx,[event.content_id]);
  }
  await tx.query('INSERT INTO migration_event(event_id,content_id,version,payload_sha256,disposition) VALUES($1,$2,$3,$4,$5)',[event.event_id,event.content_id,event.version,payload,disposition]);
  await tx.query('INSERT INTO outbox_event(seq,event_id,content_id,version,event_type,created_at,attempts) VALUES($1,$2,$3,$4,$5,$6,0) ON CONFLICT(event_id) DO NOTHING',[event.seq,event.event_id,event.content_id,event.version,event.event_type,event.content.updated_at]);
  return disposition;
 });
}
/** Small rehearsal fixture helper only; production import stays streamed. */
export async function loadRows(file:string){const result:Record<string,DataRow[]>={};for await(const {value:v} of lines(file))if(v.kind==='row')(result[v.table]??=[]).push(v.data);return result;}
