import fs from 'node:fs/promises';
import path from 'node:path';
import {remoteContext} from './release-context';
import {NOVEMBER_07_FIVE_TOPIC_COLLECTION_COUNTS} from '../../src/server/reviewed-release-scope';

const work=path.resolve(process.cwd(),'../incoming-2026-11-07'),privateRoot=path.join(work,'private-release');
const candidates=JSON.parse(await fs.readFile(path.join(privateRoot,'editorial-candidates-november-07-five-topics.json'),'utf8')) as any[];
if(candidates.length!==500||Object.keys(NOVEMBER_07_FIVE_TOPIC_COLLECTION_COUNTS).length!==5)throw Error('Exact private 500-item release required.');
const {env,requests}=await remoteContext('production',{requestLimit:1000});
async function selectIn(column:'id'|'slug',values:string[]){
 const out:any[]=[];
 for(let i=0;i<values.length;i+=50){const part=values.slice(i,i+50),placeholders=part.map(()=>'?').join(',');
  const page=await env.CATALOG_DB!.prepare(`SELECT id,slug,status,latest_version FROM content WHERE ${column} IN (${placeholders})`).bind(...part).all<any>();out.push(...(page.results||[]));}
 return out;
}
const ids=await selectIn('id',candidates.map(row=>row.content_id)),slugs=await selectIn('slug',candidates.map(row=>row.slug));
const existingDogs=await env.CATALOG_DB!.prepare("SELECT DISTINCT c.id,c.slug,a.sha256 AS source_webp_sha256 FROM content c JOIN content_category cc ON cc.content_id=c.id JOIN asset a ON a.content_id=c.id AND a.content_version=c.active_version WHERE cc.category_id='dogs' AND c.status='published' AND a.role='printable_webp_bw'").all<any>();
const packagedDogs=candidates.filter(row=>row.source_topic==='puppy'),knownSourceHashes=new Map((existingDogs.results||[]).map((row:any)=>[row.source_webp_sha256,row]));
const duplicates=packagedDogs.filter(row=>knownSourceHashes.has(row.source_sha256)).map(row=>({design_id:row.design_id,source_sha256:row.source_sha256,existing:knownSourceHashes.get(row.source_sha256)}));
const report={checked_at:new Date().toISOString(),release_id:'november-07-five-topics-20261107',status:ids.length||slugs.length?'COLLISION':duplicates.length?'SOURCE_DUPLICATES':'PASS',production_records_checked:true,candidates:candidates.length,expected_collections:5,existing_id_collisions:ids,existing_slug_collisions:slugs,existing_dogs_published:(existingDogs.results||[]).length,identical_puppy_source_in_existing_dogs:duplicates,requests:requests()};
await fs.writeFile(path.join(privateRoot,'five-topic-production-preflight.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({status:report.status,candidates:report.candidates,id_collisions:ids.length,slug_collisions:slugs.length,published_dogs:report.existing_dogs_published,identical_puppy_sources:duplicates.length,requests:report.requests}));
if(report.status!=='PASS')process.exitCode=1;
