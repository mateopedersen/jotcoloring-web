/** Apply a finite, checksum-bound editorial review and fresh age analysis locally.
 * Remote publication still goes through the versioned import/backup pipeline. */
import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
import {localStorage} from './local-storage';import {AGE_VERSION,ageBand,validAgeAssessment} from '../../src/age/model';
import {canonicalJSON} from '../../src/server/http';import type {Database,Manifest} from '../../src/server/types';
if(!process.argv.includes('--local-only'))throw new Error('Explicit --local-only is required.');
const review=JSON.parse(await fs.readFile('content/reviews/catalog-2026-10-29.json','utf8'));
const mf=localStorage();try{
 const db=await mf.getD1Database('CATALOG_DB') as Database,search=await mf.getD1Database('SEARCH_DB') as Database;
 const rows=await db.prepare("SELECT c.id,c.slug,c.active_version,r.manifest_json FROM content c JOIN content_revision r ON r.content_id=c.id AND r.version=c.active_version WHERE c.status='published'").all<any>();
 const prepared=[];
 for(const entry of review.items){const row=rows.results.find(r=>r.slug===entry.slug);if(!row)throw new Error('Reviewed page is missing: '+entry.slug);const m=JSON.parse(row.manifest_json) as Manifest,source=m.assets.find(a=>a.role==='printable_webp_bw');if(!source||source.sha256!==entry.source_sha256)throw new Error('Image changed; review the replacement: '+entry.slug);
 const age=JSON.parse(await fs.readFile(`.local/age-vision/assessments/${AGE_VERSION}-${source.sha256}.json`,'utf8'));if(!validAgeAssessment(age,source.sha256))throw new Error('Current pixel analysis required.');
 for(const key of ['title','description','alt_text'])if(typeof entry[key]!=='string'||!entry[key].trim())throw new Error('Reviewed copy is incomplete.');
 m.title=entry.title;m.description=entry.description;m.alt_text=entry.alt_text;m.tags=[...new Set([...m.tags,...entry.tags])];m.age_recommendation=age;m.age_groups=[ageBand(age.band)!.group];
 // Easy means a broadly open page, not simply a children's recommendation.
 m.difficulty=age.score<23?'easy':'detailed';prepared.push({row,m,age});
 }
 if(prepared.length!==18)throw new Error('Expected the complete finite review of 18 images.');
 if(process.argv.includes('--apply')){
 const statements=prepared.flatMap(({row,m,age})=>[
 db.prepare('UPDATE content SET title=?,description=?,alt_text=?,difficulty=? WHERE id=? AND active_version=?').bind(m.title,m.description,m.alt_text,m.difficulty,row.id,row.active_version),
 db.prepare('UPDATE content_revision SET manifest_json=?,manifest_sha256=? WHERE content_id=? AND version=?').bind(JSON.stringify(m),createHash('sha256').update(canonicalJSON(m)).digest('hex'),row.id,row.active_version),
 db.prepare('INSERT INTO age_recommendation(content_id,content_version,source_sha256,band,score_hundredths,method_version) VALUES(?,?,?,?,?,?) ON CONFLICT(content_id) DO UPDATE SET content_version=excluded.content_version,source_sha256=excluded.source_sha256,band=excluded.band,score_hundredths=excluded.score_hundredths,method_version=excluded.method_version').bind(row.id,row.active_version,age.source_sha256,age.band,Math.round(age.score*100),AGE_VERSION),
 db.prepare('DELETE FROM content_age WHERE content_id=?').bind(row.id),db.prepare('INSERT INTO content_age(content_id,age) VALUES(?,?)').bind(row.id,m.age_groups![0]),
 db.prepare('DELETE FROM content_tag WHERE content_id=?').bind(row.id),...m.tags.map(t=>db.prepare('INSERT INTO content_tag(content_id,tag) VALUES(?,?)').bind(row.id,t))]);
 await db.batch(statements);
 await search.batch(prepared.map(({row,m,age})=>search.prepare('UPDATE search_document SET title=?,description=?,alt_text=?,tags=?,age_groups=?,difficulty=?,recommended_age=? WHERE id=? AND source_version=?').bind(m.title,m.description,m.alt_text,m.tags.join(' '),JSON.stringify(m.age_groups),m.difficulty,age.band,row.id,row.active_version)));
 }
 console.log(JSON.stringify({localOnly:true,applied:process.argv.includes('--apply'),reviewed:prepared.length,pages:prepared.map(({m,age})=>({slug:m.slug,title:m.title,age:age.band,score:age.score}))}));
}finally{await mf.dispose();}
