import {createHash} from 'node:crypto';
const canonical=(row:Record<string,unknown>)=>JSON.stringify(Object.fromEntries(Object.keys(row).sort().map(k=>[k,row[k]])));
function ident(s:string){if(!/^[a-z][a-z0-9_]*$/.test(s))throw new Error('Unsafe SQL identifier');return '"'+s+'"';}
type Column={name:string;type:string;primary_position?:number};
export function tablePageSQL(table:string,columns:Column[],pk:string[],cursor=false,limit=128){
  if(!Number.isInteger(limit)||limit<1||limit>256||!pk.length)throw new Error('Invalid bounded page');
  const ref=(name:string)=>ident(table)+'.'+ident(name);
  const selected=columns.map(c=>c.type.toUpperCase()==='INTEGER'?`CAST(${ref(c.name)} AS TEXT) AS ${ident(c.name)}`:ref(c.name)).join(',');
  // ORDER BY must use the ORIGINAL column, never the cast-to-text output alias.
  const where=cursor?`WHERE (${pk.map(ref).join(',')}) > (${pk.map(()=>'?').join(',')})`:'';
  return `SELECT ${selected} FROM ${ident(table)} ${where} ORDER BY ${pk.map(ref).join(',')} LIMIT ${limit}`;
}
export type ReadQuery=(id:string,sql:string,params?:unknown[])=>Promise<Record<string,any>[]>;
export async function verifyRestoredDatabase(query:ReadQuery,target:string,meta:any){
  const schema=await query(target,"SELECT type,name,tbl_name AS 'table' FROM sqlite_master WHERE type IN ('table','index','trigger') AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY type,name");
  if(JSON.stringify(schema.map(canonical))!==JSON.stringify(meta.schema_objects.map(canonical)))throw new Error('Restored schema object inventory differs');
  const tables:Record<string,{rows:number;sha256:string}>={};let totalRows=0;
  for(const [table,expected]of Object.entries<any>(meta.tables)){
    const info=await query(target,`PRAGMA table_info(${ident(table)})`),cols=info.map(c=>({name:c.name,type:c.type,primary_position:c.pk}));
    if(JSON.stringify(cols)!==JSON.stringify(expected.columns))throw new Error('Restored column schema differs: '+table);
    const pk=expected.primary_key as string[],hash=createHash('sha256');let last:unknown[]|undefined,count=0;
    while(true){const rows=await query(target,tablePageSQL(table,cols,pk,Boolean(last)),last||[]);for(const row of rows){hash.update(canonical(row)+'\n');count++;if(++totalRows>100000)throw new Error('Restored row bound exceeded');}if(rows.length<128)break;last=pk.map(k=>rows[rows.length-1][k]);}
    const actual={rows:count,sha256:hash.digest('hex')};if(actual.rows!==expected.rows||actual.sha256!==expected.sha256)throw new Error('Restored durable table checksum differs: '+table);tables[table]=actual;
  }
  if((await query(target,'PRAGMA foreign_key_check')).length)throw new Error('Restored foreign keys invalid');
  const sequences=await query(target,'SELECT name,CAST(seq AS TEXT) AS seq FROM sqlite_sequence ORDER BY name');if(JSON.stringify(sequences.map(canonical))!==JSON.stringify(meta.autoincrement_sequences.map(canonical)))throw new Error('Restored autoincrement high-water marks differ');
  const broken=await query(target,"SELECT c.id FROM content c WHERE c.status='published' AND (NOT EXISTS(SELECT 1 FROM content_revision r WHERE r.content_id=c.id AND r.version=c.active_version) OR (SELECT COUNT(DISTINCT a.role) FROM asset a WHERE a.content_id=c.id AND a.content_version=c.active_version AND a.verified=1 AND a.role IN ('catalog_thumb_bw','catalog_preview_bw','printable_webp_bw','printable_pdf_a4_bw'))<>4)");if(broken.length)throw new Error('Restored active revision/asset relationship invalid');
  return{tables,total_rows:totalRows,schema_objects:schema.length,foreign_keys:'PASS',active_revision_assets:'PASS',autoincrement_sequences:'PASS'};
}
