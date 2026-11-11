import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {categoryLineage} from '../../src/taxonomy/catalog';
import {NOVEMBER_10_ARTIST_TOPICS} from '../../src/taxonomy/november-10-artists';
import {NOVEMBER_10_ARTIST_TOPIC_COUNTS,NOVEMBER_10_ARTIST_ZIP_SHA256S,NOVEMBER_10_ARTISTS_RELEASE_ID} from '../../src/server/november-10-artists-scope';
import {canonicalJSON} from '../../src/server/http';

const work=path.resolve(process.cwd(),'../incoming-2026-11-10/artist-coloring');
const reviewRoot=path.join(work,'private-review');
const privateRoot=path.join(work,'private-release');
const inventory=JSON.parse(await fs.readFile(path.join(reviewRoot,'original-source-inventory.json'),'utf8')) as any[];
const sourceAudit=JSON.parse(await fs.readFile(path.join(reviewRoot,'source-audit.json'),'utf8')) as any;
const approvedTopics=new Map(NOVEMBER_10_ARTIST_TOPICS.map(row=>[row.id,row]));
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const lowercaseFirst=(value:string)=>value?value[0]!.toLowerCase()+value.slice(1):value;
const escapeRegExp=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

async function preparationFolder(source:any,metadata:any,metadataHash:string){
 const base=path.join(work,'private-prepared',NOVEMBER_10_ARTISTS_RELEASE_ID,source.topic,source.content_id);
 try{
  const existing=JSON.parse(await fs.readFile(path.join(base,'manifest.json'),'utf8'));
  if(Object.entries(metadata).some(([key,value])=>canonicalJSON(existing[key])!==canonicalJSON(value)))return base+'-metadata-'+metadataHash.slice(0,12);
 }catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
 return base;
}

function visualPhrase(note:string,name:string){
 let value=note.trim().replace(/[.\s]+$/,'');
 const namePrefix=new RegExp('^'+escapeRegExp(name)+'\\s+','i');
 if(namePrefix.test(value))value=value.replace(namePrefix,'');
 value=value.replace(/^(?:is shown|is pictured|appears in|appears as)\s+/i,'');
 const replacements:[RegExp,string][]=[
  [/^sits\b/i,'Seated'],[/^is seated\b/i,'Seated'],[/^stands\b/i,'Standing'],[/^walks\b/i,'Walking'],[/^holds\b/i,'Holding'],[/^sings\b/i,'Singing'],[/^plays\b/i,'Playing'],[/^wears\b/i,'Wearing'],[/^leans\b/i,'Leaning'],[/^looks\b/i,'Looking'],[/^adjusts\b/i,'Adjusting'],[/^points\b/i,'Pointing'],[/^reaches\b/i,'Reaching'],[/^writes\b/i,'Writing'],[/^works\b/i,'Working'],[/^examines\b/i,'Examining'],[/^reads\b/i,'Reading'],[/^carries\b/i,'Carrying'],[/^moves\b/i,'Moving'],[/^performs\b/i,'Performing'],[/^draws\b/i,'Drawing'],[/^uses\b/i,'Using'],[/^kneels\b/i,'Kneeling'],[/^crouches\b/i,'Crouching'],[/^smiles\b/i,'Smiling'],[/^talks\b/i,'Talking'],[/^gestures\b/i,'Gesturing'],[/^selects\b/i,'Selecting'],[/^operates\b/i,'Operating'],[/^opens\b/i,'Opening'],[/^pulls\b/i,'Pulling'],[/^arranges\b/i,'Arranging'],[/^checks\b/i,'Checking'],[/^ties\b/i,'Tying'],[/^raises\b/i,'Raising'],[/^extends\b/i,'Extending'],[/^studies\b/i,'Studying']
 ];
 if(/^and another\b/i.test(value))value=value.replace(/^and another\s+/i,'With another ');
 else for(const [pattern,replacement] of replacements){if(pattern.test(value)){value=value.replace(pattern,replacement);break;}}
 return value.replace(/^close\b/i,'Close').replace(/^full-length\b/i,'Full-length');
}

function titleCase(value:string){
 const small=new Set(['a','an','and','as','at','by','for','from','in','of','on','or','the','to','with','under','beside']);
 return value.split(/(\s+)/).map((part,index)=>{
  if(!part.trim())return part;
  const first=part[0]!.toLocaleLowerCase('en-US');
  return index>0&&small.has(part.toLocaleLowerCase('en-US'))?part.toLocaleLowerCase('en-US'):first.toLocaleUpperCase('en-US')+part.slice(1);
 }).join('');
}

function titleFor(row:any,note:string,name:string){
 let phrase=visualPhrase(note,name);
 const participles:Record<string,string>={listens:'Listening',records:'Recording',reviews:'Reviewing',speaks:'Speaking',paints:'Painting',claps:'Clapping',bows:'Bowing',touches:'Touching',rests:'Resting',tunes:'Tuning',unrolls:'Unrolling',folds:'Folding',handles:'Handling',watches:'Watching',rolls:'Rolling',steadies:'Steadying',sets:'Setting',lifts:'Lifting',places:'Placing',sings:'Singing',holds:'Holding',looks:'Looking',stands:'Standing',sits:'Sitting',reaches:'Reaching',works:'Working',writes:'Writing',reads:'Reading',walks:'Walking',checks:'Checking',smiles:'Smiling',adjusts:'Adjusting',gestures:'Gesturing',plays:'Playing'};
 phrase=phrase.replace(/^([a-z]+)\b/i,(word)=>participles[word.toLowerCase()]||word);
 if(/^(?:Seated|Standing|\w+ing)\b/.test(phrase))phrase=phrase.replace(/\band\s+([a-z]+)\b/gi,(whole,verb)=>participles[verb.toLowerCase()]?`and ${participles[verb.toLowerCase()].toLowerCase()}`:whole);
 return `${name} Coloring Page: ${titleCase(phrase)}`.replace(/\s+/g,' ').trim();
}

function altFor(row:any,note:string,name:string){
 return `Black and white coloring illustration. ${note.trim()}`;
}

if(sourceAudit.status!=='PASS'||sourceAudit.release_id!==NOVEMBER_10_ARTISTS_RELEASE_ID||sourceAudit.archive_count!==25||sourceAudit.design_count!==2500||sourceAudit.unique_pdf_count!==2500||sourceAudit.unique_webp_count!==2500||inventory.length!==2500)throw new Error('The checksum verified source audit for every artist drawing is required.');
const allRows:any[]=[],allTitles=new Set<string>(),allSlugs=new Set<string>();
for(const [topic,count] of Object.entries(NOVEMBER_10_ARTIST_TOPIC_COUNTS)){
 const category=approvedTopics.get(topic),rows=inventory.filter(row=>row.topic===topic).sort((a,b)=>a.source_sequence-b.source_sequence);
 if(!category||rows.length!==count)throw new Error('Missing exact artist topic inventory: '+topic);
 const notes=JSON.parse(await fs.readFile(path.join(reviewRoot,topic+'-scene-notes.json'),'utf8')) as string[];
 let overrides:Record<string,any>={};try{overrides=JSON.parse(await fs.readFile(path.join(reviewRoot,topic+'-editorial-overrides.json'),'utf8'));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
 const visualRecords=(await fs.readFile(path.join(reviewRoot,topic+'-visual-pass-2.jsonl'),'utf8')).trim().split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
 if(notes.length!==count||visualRecords.length!==count)throw new Error('A complete second source-image review is missing: '+topic);
 const observations=new Map(visualRecords.map(record=>[record.design_id,record]));
 const lineage=categoryLineage(topic);
 if(!lineage.includes('music')||lineage.at(-1)!==topic)throw new Error('Artist category lineage is not under Music: '+topic);
 const topicTitles=new Set<string>();
 for(const source of rows){
  const visual=observations.get(source.design_id),sequence=source.source_sequence;
  if(!visual||visual.source_sha256!==source.source_sha256||visual.source_pdf_sha256!==source.source_pdf_sha256||visual.source_zip_sha256!==source.source_zip_sha256||visual.source_webp_path!==source.source_webp_path||visual.visual_status!=='reviewed'||visual.visual_pass!==2||visual.observation!==notes[sequence-1])throw new Error('Source-bound second-pass visual evidence differs: '+source.design_id);
  if(source.source_zip_sha256!==NOVEMBER_10_ARTIST_ZIP_SHA256S[topic]||source.source_sha256!==source.source_webp_sha256||source.original_pdf_sha256!==source.source_pdf_sha256||source.original_webp_sha256!==source.source_sha256)throw new Error('Original PDF/WebP/ZIP checksum binding differs: '+source.design_id);
  const note=notes[sequence-1]!,override=overrides[source.design_id];
  if(override&&(override.source_sha256!==source.source_sha256||override.description!==note))throw Error('Editorial override source or observation changed: '+source.design_id);
  const title=override?.title||titleFor(source,note,category.name),description=override?.description||note,alt_text=override?.alt_text||altFor(source,note,category.name);
  const metadata={title,description,alt_text,category_ids:lineage};
  const metadata_sha256=hash(canonicalJSON(metadata));
  if(!title.toLowerCase().includes(category.name.toLowerCase())||!/(?:coloring page)/i.test(title)||/[#\d]/.test(title+' '+description+' '+alt_text)||title.length>180||description.length>5000||alt_text.length>400)throw new Error('Invalid artist metadata or numbering in public copy: '+source.design_id);
  if(topicTitles.has(title))throw new Error('Duplicate artwork title must be resolved using its actual scene: '+source.design_id);
  topicTitles.add(title);
  const slug=source.slug;
  if(allTitles.has(`${topic}:${title}`)||allSlugs.has(slug))throw new Error('Duplicate artist title or URL: '+source.design_id);
  allTitles.add(`${topic}:${title}`);allSlugs.add(slug);
  const category_review=`The pictured artist and collection are the main topic; Music and ${category.name} are the reviewed parent and exact artist categories.`;
  const first_editorial_pass={pass:1,status:'pending_review',design_id:source.design_id,source_sha256:source.source_sha256,metadata_sha256,reviewed_at:null,method:'Candidate title, description and alt derived from the source-bound observation; final editorial review is pending.'};
  const second_editorial_review={passes:0,status:'pending_review',design_id:source.design_id,source_sha256:source.source_sha256,metadata_sha256,reviewed_at:null,method:'No second editorial approval is implied by candidate generation; exact generated copy must be reviewed before preparation.'};
  allRows.push({topic,design_id:source.design_id,content_id:source.content_id,slug,source_zip_path:source.source_zip_path,source_zip_sha256:source.source_zip_sha256,source_pdf_path:source.source_pdf_path,source_pdf_sha256:source.source_pdf_sha256,source_webp_path:source.source_webp_path,source_webp_sha256:source.source_webp_sha256,source_sha256:source.source_sha256,source_archive_sha256:source.source_zip_sha256,archive_name:source.archive_name,title,description,alt_text,category_ids:lineage,category_review,tags:[`${category.name} coloring pages`,category.name,'music','musician'],source_type:'user_owned',source_claim:'The owner states that the JotColoring team created these drawings.',observations:[note],visual_review:{...visual,scene_notes_sha256:hash(canonicalJSON(notes))},metadata_sha256,first_editorial_pass,second_editorial_review,status:'draft_editorial_candidate',prepare_flags:{},preparation_folder:await preparationFolder(source,metadata,metadata_sha256)});
 }
}
if(allRows.length!==2500||new Set(allRows.map(row=>row.design_id)).size!==2500||new Set(allRows.map(row=>row.content_id)).size!==2500)throw new Error('A complete unique artist release inventory is required.');
await fs.mkdir(privateRoot,{recursive:true,mode:0o700});
const body={release_id:NOVEMBER_10_ARTISTS_RELEASE_ID,expected_collections:25,expected_designs:2500,source_audit_sha256:hash(await fs.readFile(path.join(reviewRoot,'source-audit.json'),'utf8')),created_at:new Date().toISOString(),rows:allRows};
const output=path.join(privateRoot,'editorial-candidates-november-10-artists-20261110.json');
await fs.writeFile(output,JSON.stringify(body,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({status:'PASS',topics:25,designs:allRows.length,unique_titles:allTitles.size,unique_urls:allSlugs.size,source_bound_rows:allRows.filter(r=>r.visual_review.visual_status==='reviewed').length,numbering_leaks:0,output}));
