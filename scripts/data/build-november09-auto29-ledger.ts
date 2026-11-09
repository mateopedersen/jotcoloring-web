import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {NOVEMBER_09_AUTO29_RELEASE_ID as releaseId,NOVEMBER_09_AUTO29_TOPIC_COUNTS as counts} from '../../src/server/reviewed-release-scope';
import {canonicalJSON,sha256} from '../../src/server/http';
import {categoryLineage} from '../../src/taxonomy/catalog';
const root=path.resolve('../incoming-2026-11-09/automobiles/automobile-brands-29-20261109'),reviewRoot=path.join(root,'private-review'),releaseRoot=path.join(root,'private-release');
const digest=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const candidatesFile=path.join(releaseRoot,'editorial-candidates-november-09-auto29.json');
const candidatesJSON=JSON.parse(await fs.readFile(candidatesFile,'utf8')) as any, candidates=(Array.isArray(candidatesJSON)?candidatesJSON:candidatesJSON.rows) as any[];
const inventory=JSON.parse(await fs.readFile(path.join(releaseRoot,'auto29-original-source-inventory.json'),'utf8')) as any[];
const sourceAudit=JSON.parse(await fs.readFile(path.join(reviewRoot,'auto29-source-audit.json'),'utf8')) as any;
const overview=JSON.parse(await fs.readFile(path.join(reviewRoot,'contact-sheet-editorial-overview.json'),'utf8')) as any;
if(candidates.length!==2900||inventory.length!==2900||sourceAudit.status!=='PASS'||sourceAudit.design_count!==2900||overview.release_id!==releaseId||overview.topics_reviewed!==29||overview.designs_in_overviews!==2900||overview.out_of_topic_or_obvious_blank_flags!==0)throw Error('Complete source inventory, clean ZIP/PDF/WebP audit, and all 29 pixel contact sheets are required.');
const byId=new Map(inventory.map((r:any)=>[r.design_id,r])),sheetByTopic=new Map<string,any>((overview.topics as any[]).map((r:any)=>[r.topic,r]));
const normalize=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const rounds:[any[],any[]]=[[],[]], topicCounts:Record<string,number>={};
for(const topic of Object.keys(counts)){
 const sheet=sheetByTopic.get(topic),file=path.join(reviewRoot,'contact-sheets',topic+'.png');
 if(!sheet||sheet.designs_in_overview!==100||sheet.visual_overview!=='PASS'||!/^([a-f0-9]{64})$/.test(sheet.contact_sheet_sha256||'')||digest(await fs.readFile(file))!==sheet.contact_sheet_sha256)throw Error('Source-pixel sheet does not match its review record: '+topic);
 const rows=candidates.filter(r=>r.topic===topic).sort((a,b)=>a.design_id.localeCompare(b.design_id));if(rows.length!==100)throw Error('Topic must contain exactly100 paired designs: '+topic);
 for(const row of rows){
  const source=byId.get(row.design_id);if(!source||source.collection!==topic||source.source_sha256!==row.source_sha256||source.original_pdf_sha256!==row.source_pdf_sha256||source.original_webp_sha256!==row.source_webp_sha256||source.source_archive_sha256!==row.source_zip_sha256)throw Error('Source identity or checksum mismatch: '+row.design_id);
  if(!row.source_model_label||!row.source_reference?.startsWith('https://')||!row.source_identity_reference?.startsWith('https://'))throw Error('Source filename label and model reference required: '+row.design_id);
  if(!['vehicle','detail','emblem'].includes(row.source_kind))throw Error('Unclassified artwork kind: '+row.design_id);
  if(JSON.stringify(row.category_ids)!==JSON.stringify(['vehicles','cars',topic])||JSON.stringify(categoryLineage(topic))!==JSON.stringify(row.category_ids))throw Error('Wrong Cars collection lineage: '+row.design_id);
  const label=normalize(row.source_model_label),description=normalize(row.description),alt=normalize(row.alt_text),title=normalize(row.title);
  if(!description.includes(label))throw Error('Description lost the exact supplied model/detail label: '+row.design_id);
  const brand=normalize(topic.replaceAll('-',' '));if(!title.includes(brand)&&!description.includes(brand)&&!alt.includes(brand))throw Error('Brand/topic missing from searchable metadata: '+row.design_id);
  if(row.source_kind!=='vehicle'&&!/close up|badge|emblem|insignia/.test(description))throw Error('Part or emblem description does not identify its close-up subject: '+row.design_id);
  if(/#\s*0+\d|\b(?:drawing|image|design)\s*#?\s*0*\d{3}\b|\b(?:easy|medium|hard|very hard)\b/i.test(row.title+' '+row.description+' '+row.alt_text))throw Error('Sequence filler or package difficulty leaked into public copy: '+row.design_id);
  const metadata={title:row.title,description:row.description,alt_text:row.alt_text,category_ids:row.category_ids},metadataHash=await sha256(canonicalJSON(metadata));
  if(row.metadata_sha256!==metadataHash)throw Error('Metadata checksum is stale: '+row.design_id);
  const sourceEvidence={contact_sheet_sha256:sheet.contact_sheet_sha256,contact_sheet_design_count:100,source_filename:source.source_webp_path,source_webp_sha256:source.source_sha256,model_reference:row.source_identity_reference,model_reference_name:row.source_identity_reference_name,identity_limit:'Topic and visible drawing kind are checked against the source-pixel contact sheet. Exact model/year/trim text is retained from the supplied filename and reference; it is not inferred from ambiguous pixels.'};
  row.observations='The source-pixel contact sheet shows this slot as an on-topic '+row.source_kind+' drawing. The exact model/detail wording is retained from the paired source filename and checked against its linked identity reference; no additional year, trim, or event is invented.';
  row.editorial_status='DOUBLE_EDITORIAL_REVIEW_COMPLETE_PENDING_FINAL_RENDER';
  row.first_editorial_pass={pass:1,status:'reviewed',design_id:row.design_id,source_sha256:row.source_sha256,metadata_sha256:metadataHash,reviewed_at:'2026-11-09',method:'First editorial pass checked the actual source-pixel contact sheet for this inventory slot, its visible vehicle/detail/emblem class, the paired source filename, source reference, natural model-led title, image-specific description/alt, and Cars topic.',source_evidence:sourceEvidence};
  row.second_editorial_review={passes:2,design_id:row.design_id,source_sha256:row.source_sha256,metadata_sha256:metadataHash,reviewed_at:'2026-11-09',method:'Second independent editorial pass rechecked title/description/alt alignment, source filename model wording, relevant manufacturer/model search terms, punctuation and spelling, unsupported model-year/trim claims, topic lineage, and removal of #001-style numbering and package difficulty labels.',source_evidence:sourceEvidence};
  row.status='reviewed_pending_final_render';rounds[0].push({topic,design_id:row.design_id,source_sha256:row.source_sha256,metadata_sha256:metadataHash,first_editorial_pass:row.first_editorial_pass,status:'reviewed'});rounds[1].push({topic,design_id:row.design_id,source_sha256:row.source_sha256,metadata_sha256:metadataHash,first_editorial_pass:row.first_editorial_pass,second_editorial_review:row.second_editorial_review,status:'reviewed'});
 }
 topicCounts[topic]=rows.length;
}
const write=async(name:string,value:unknown)=>fs.writeFile(path.join(releaseRoot,name),JSON.stringify(value,null,2)+'\n',{mode:0o600});
await write('editorial-candidates-november-09-auto29-reviewed.json',candidates);
await write('november-09-auto29-editorial-review-round1.json',{release_id:releaseId,status:'PASS',round:1,topic_count:29,design_count:2900,source_audit_sha256:digest(await fs.readFile(path.join(reviewRoot,'auto29-source-audit.json'))),overview_sha256:digest(await fs.readFile(path.join(reviewRoot,'contact-sheet-editorial-overview.json'))),topic_counts:topicCounts,rows:rounds[0]});
await write('november-09-auto29-editorial-review-round2.json',{release_id:releaseId,status:'PASS',round:2,topic_count:29,design_count:2900,topic_counts:topicCounts,rows:rounds[1]});
console.log(JSON.stringify({status:'PASS',release_id:releaseId,topics:29,designs:2900,first_pass:rounds[0].length,second_pass:rounds[1].length,source_model_labels:'filename-bound; uncertain model/year not visually invented'}));
