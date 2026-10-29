/** Apply only the local search migration and backfill current published editorial text. */
import fs from 'node:fs/promises';
import {createCatalog} from '../../src/server/catalog';
import {localStorage} from './local-storage';
import type {Database} from '../../src/server/types';
if(process.argv[2]!=='--local-only')throw new Error('Explicit --local-only required.');
const mf=localStorage();try{
 const search=await mf.getD1Database('SEARCH_DB') as Database,catalog=await mf.getD1Database('CATALOG_DB') as Database;
 const columns=await search.prepare('PRAGMA table_info(search_document)').all<{name:string}>();
 if(!columns.results.some(c=>c.name==='description')){const sql=await fs.readFile('migrations/search/0005_search_relevance.sql','utf8');await search.batch(sql.split('\n').map(line=>line.trim()).filter(Boolean).map(line=>search.prepare(line)));}
 const rows=await catalog.prepare("SELECT id,title,description,alt_text,active_version FROM content WHERE status='published' AND active_version IS NOT NULL").all<{id:string;title:string;description:string;alt_text:string;active_version:number}>();
 const repo=createCatalog({CATALOG_DB:catalog}),categories=await repo.categories();
 for(const row of rows.results){const item=await repo.get(row.id);if(!item)continue;await search.prepare("UPDATE search_document SET title=?,description=?,alt_text=?,tags=?,categories=?,category_ids=?,age_groups=?,difficulty=?,recommended_age=? WHERE id=? AND source_version=? AND visibility='published'").bind(item.title,item.description,item.alt,item.tags.join(' '),(item.category_ids||[]).map(id=>id+' '+(categories.find(c=>c.id===id)?.name||id)).join(' '),JSON.stringify(item.category_ids||[]),JSON.stringify(item.age_groups),item.difficulty,item.recommendedAge?.band||null,item.id,item.version).run();}

 const tracking=await search.prepare("SELECT name FROM sqlite_master WHERE name='d1_migrations'").first();if(tracking){const existing=await search.prepare('SELECT id FROM d1_migrations WHERE name=?').bind('0005_search_relevance.sql').first();if(!existing)await search.prepare('INSERT INTO d1_migrations(name) VALUES(?)').bind('0005_search_relevance.sql').run();}
 console.log(JSON.stringify({environment:'local',publishedBackfill:rows.results.length,remote:false}));
}finally{await mf.dispose();}
