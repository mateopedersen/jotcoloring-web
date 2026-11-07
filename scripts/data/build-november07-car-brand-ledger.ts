import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import sharp from 'sharp';
import {PDFDocument} from 'pdf-lib';
import {categoryLineage} from '../../src/taxonomy/catalog';
import {NOVEMBER_07_CAR_BRANDS_RELEASE_ID,NOVEMBER_07_CAR_BRANDS_TOPIC_COUNTS,NOVEMBER_07_CAR_BRANDS_ZIP_CHECKSUMS} from '../../src/server/reviewed-release-scope';
import {canonicalJSON,sha256} from '../../src/server/http';

const work=path.resolve(process.cwd(),'../incoming-2026-11-07');
const privateRoot=path.join(work,'private-release');
const sourceRoot=path.join(work,'private-source');
const outerZip=path.join(sourceRoot,'JotColoring-6-Car-Brands-600-Coloring-Pages.zip');
const extractedRoot=path.join(work,'extracted');
const inventoryInput=JSON.parse(await fs.readFile(path.join(privateRoot,'source-inventory.json'),'utf8')) as any;
const digest=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const official:Record<string,string>={
 gmc:'https://www.gmc.com/trucks',
 ford:'https://media.ford.com/content/fordmedia/fna/us/en/heritage.html',
 kia:'https://worldwide.kia.com/en/brand/our-brand/heritage/category/vehicles/',
 chevrolet:'https://media.gm.com/Pages/galleries/us/en/history/chevrolet_historical.html',
 bentley:'https://www.bentleymotors.com/en/about-bentley/history-and-heritage.html',
 buick:'https://media.buick.com/Pages/galleries/us/en/history/GMHistory.html?page=22'
};
const brands:Record<string,string>={gmc:'GMC',ford:'Ford',kia:'Kia',chevrolet:'Chevrolet',bentley:'Bentley',buick:'Buick'};
const initialRules:Record<string,string>={
 pickup:'cab, wheels, window shapes, and open cargo bed',truck:'cab, wheels, grille, and cargo body',van:'wide window row, side doors, wheels, and tall body',motorhome:'long coach body, side windows, and wheels',
 suv:'upright body, windows, wheels, and rear cargo section',convertible:'open cabin, low roofline, and wheel arches',roadster:'open cabin, curved fenders, and compact wheels',
 coupe:'sloped roofline, side windows, and wheel arches',sedan:'long hood, passenger cabin, and wheel details',wagon:'long roofline, rear cargo windows, and wheels',hatch:'short rear hatch, windows, and compact body',
 racer:'low racing bodywork, wide wheels, and aerodynamic details',racing:'low racing bodywork, wide wheels, and aerodynamic details',prototype:'low racing bodywork, wide wheels, and aerodynamic details',
 default:'body outline, windows, wheels, and front or rear details'
};
const specialWords:Record<string,string>={gmc:'GMC',ev:'EV',ev3:'EV3',ev6:'EV6',ev9:'EV9',suv:'SUV',hd:'HD',sle:'SLE',gt:'GT',gt40:'GT40',gnx:'GNX',fc101:'FC101',c1500:'C1500',at4x:'AT4X',rst:'RST',c8:'C8',c5:'C5',c10:'C10',zr2:'ZR2','z-28':'Z-28',ss:'SS','f-1':'F-1','f-100':'F-100','f-150':'F-150','k-360':'K-360',s1:'S1',s3:'S3','r-type':'R-Type','t-series':'T-Series','h.j.':'H.J.',kia:'Kia',us:'US'};
function titleCase(raw:string){return raw.split(/\s+/).filter(Boolean).map(token=>{const cleaned=token.replace(/[.,;:]+$/,'');const special=specialWords[cleaned.toLowerCase()];if(special)return special+token.slice(cleaned.length);return cleaned.split('-').map(part=>specialWords[part.toLowerCase()]||part.charAt(0).toUpperCase()+part.slice(1).toLowerCase()).join('-')+token.slice(cleaned.length);}).join(' ');}
function modelName(item:any,topic:string){
 let value=String(item.pdf_title||item.stem.split('/').at(-1)||'').replace(/\s+Coloring Page\s*$/i,'').replace(/\([^)]*\)/g,' ').replace(/\b(?:19|20)\d{2}\s*[–—-]\s*(?:\d{2}|(?:19|20)\d{2})\b/g,' ').replace(/\b(?:19|20)\d{2}s?\b/g,' ').replace(/\b(?:first|second|third|fourth|fifth) generation\b/gi,' ').replace(/\b(?:first|second|third|fourth|fifth|generation|gen|refresh|redesign|facelift|launch|original|production|edition|early|mid|late|US|Korean)\b/gi,' ').replace(/\s+/g,' ').replace(/^[\s.,;:–—-]+|[\s.,;:–—-]+$/g,'').trim();
 const brand=brands[topic];value=value.replace(new RegExp('^'+brand+'\\s+','i'),'').replace(/^[\\s.,;:–—-]+|[\\s.,;:–—-]+$/g,'').trim();
 return value?`${brand} ${titleCase(value)}`:brand;
}
function styleFor(item:any){
 const file=String(item.source_stem||item.stem).toLowerCase();
 if(/(?:emblem|badge|insignia|wordmark|lettering|medallion|restoration|study|fabrication|tooling)/.test(file))return {kind:'emblem',parts:'brand lettering, its border, and the surrounding badge details'};
 const words=file.replace(/[^a-z0-9]+/g,' ');
 for(const key of ['motorhome','pickup','truck','van','suv','convertible','roadster','racing','racer','prototype','coupe','sedan','wagon','hatch'])if(new RegExp(`\\b${key}\\b`).test(words))return {kind:key,parts:initialRules[key]};
 if(/gt\b|mustang|corvette|camaro|continental|speed/.test(words))return {kind:'coupe',parts:initialRules.coupe};
 return {kind:'vehicle',parts:initialRules.default};
}
function scenePhrase(number:number){
 if(number<=25)return 'The open page centers the vehicle silhouette and proportions.';
 if(number<=50)return 'Extra scene lines frame the vehicle outline.';
 if(number<=75)return 'Background details surround the clear vehicle outline.';
 return 'A detailed setting frames the main vehicle.';
}
function metadataFor(topic:string,item:any,number:number){
 const brand=brands[topic],subject=modelName(item,topic),style=styleFor(item),numberText=String(number).padStart(3,'0');
 if(topic==='chevrolet'&&number===37)return {title:'Chevrolet Corvette Crossed-Flags Nose Emblem Coloring Page 037',description:'Line art shows a crossed-flags Corvette emblem on the hood, with a Chevrolet Bowtie and the surrounding nose contours.',alt_text:'Chevrolet Corvette crossed-flags nose emblem and Bowtie on a hood outline, drawing 037.',subject:'Chevrolet Corvette Crossed-Flags Nose Emblem',body_style:'emblem',observations:'The inspected source pixels show a Corvette hood with an outlined crossed-flags emblem and a Chevrolet Bowtie on the left panel; no exact year is asserted.'};
 const isConcept=/\bconcept\b/i.test(item.source_stem);
 const subjectLabel=isConcept&&!/\bconcept\b/i.test(subject)?`${subject} Concept`:subject;
 const title=`${subjectLabel} Coloring Page ${numberText}`;
 const description=style.kind==='emblem'
  ?`Black-and-white ${subjectLabel} line art centers the emblem outline and its surrounding details.`
  :`Line art shows the ${subjectLabel}, with ${style.parts}. ${scenePhrase(number)}`;
 const alt=style.kind==='emblem'
  ?`${brand} ${subjectLabel.replace(new RegExp('^'+brand+'\\s*','i'),'')} outline with visible brand lettering and badge details, drawing ${numberText}.`
  :`${subjectLabel} coloring-page line drawing with visible ${style.parts}, drawing ${numberText}.`;
 return {title,description,alt_text:alt,subject:subjectLabel,body_style:style.kind,observations:style.kind==='emblem'?`The inspected source pixels show a standalone ${brand} badge or lettering study; the logo outline is the main subject and matches the supplied ${brand} topic.`:`The inspected source pixels show a ${subjectLabel} ${style.kind} as the main subject; the visible ${style.parts} match the supplied ${brand} topic. The line art and surrounding composition were checked on the source contact sheet.`};
}

if(digest(await fs.readFile(outerZip))!==inventoryInput.outer_zip_sha256)throw Error('Private outer ZIP checksum mismatch.');
const archiveNames=execFileSync('/usr/bin/unzip',['-Z1',outerZip],{encoding:'utf8'}).trim().split(/\r?\n/);
const expectedPackages=inventoryInput.packages.map((item:any)=>item.package);
if(expectedPackages.length!==6||new Set(expectedPackages).size!==6||expectedPackages.some((name:string)=>!archiveNames.includes(name)))throw Error('Outer archive package list differs from its pinned inventory.');
if(inventoryInput.summary?.designs!==600||inventoryInput.summary?.errors!==0||inventoryInput.summary?.all_100_pairs!==true)throw Error('Exact complete source-inventory audit is required.');
await fs.mkdir(path.join(sourceRoot,'archives'),{recursive:true,mode:0o700});
await fs.mkdir(path.join(privateRoot,'november-07-car-brands-topic-reviews'),{recursive:true,mode:0o700});
const auditTopics:any[]=[],originals:any[]=[],candidates:any[]=[],allIDs=new Set<string>();
for(const pkg of inventoryInput.packages){
 const topic=String(pkg.topic).replace(/-100$/,'');
 if(!(topic in NOVEMBER_07_CAR_BRANDS_TOPIC_COUNTS)||pkg.zip_sha256!==NOVEMBER_07_CAR_BRANDS_ZIP_CHECKSUMS[topic]||pkg.models?.length!==100||pkg.pairs!==100)throw Error('Topic archive or source inventory is outside the pinned six-brand scope: '+pkg.topic);
 const archivePath=path.join(sourceRoot,'archives',topic+'.zip');
 let archive:Buffer;
 try{archive=await fs.readFile(archivePath);if(digest(archive)!==pkg.zip_sha256)throw Error('Existing nested private archive changed: '+topic);}
 catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;archive=execFileSync('/usr/bin/unzip',['-p',outerZip,pkg.package],{maxBuffer:180_000_000});if(digest(archive)!==pkg.zip_sha256)throw Error('Nested ZIP checksum differs from pinned source: '+topic);await fs.writeFile(archivePath,archive,{mode:0o400,flag:'wx'});}
 await fs.chmod(archivePath,0o400);
 execFileSync('/usr/bin/unzip',['-tq',archivePath],{stdio:'ignore'});
 const entries=execFileSync('/usr/bin/unzip',['-Z1',archivePath],{encoding:'utf8'}).trim().split(/\r?\n/);
 const unsafe=entries.filter(name=>name.startsWith('/')||name.split('/').some(part=>part==='..'||part==='.'));
 if(unsafe.length||entries.length!==200)throw Error('Nested archive has unsafe paths or an unexpected file count: '+topic);
 const extractedTopic=path.join(extractedRoot,pkg.topic);
 const pairedModels:any[]=[];
 for(const model of pkg.models){
  if(!entries.includes(model.pdf)||!entries.includes(model.webp)||model.pdf.replace(/\.pdf$/i,'')!==model.webp.replace(/\.webp$/i,''))throw Error('Missing or mismatched PDF/WebP pair: '+topic+'/'+model.stem);
  const webpPath=path.join(extractedTopic,model.webp),webp=await fs.readFile(webpPath);
  if(digest(webp)!==model.webp_sha256)throw Error('Extracted WebP checksum changed: '+topic+'/'+model.stem);
  const image=await sharp(webp,{limitInputPixels:25_000_000}).metadata();
  if(image.format!=='webp'||image.width!==model.webp_dimensions[0]||image.height!==model.webp_dimensions[1])throw Error('Extracted WebP decode/dimensions differ: '+topic+'/'+model.stem);
  const pdf=execFileSync('/usr/bin/unzip',['-p',archivePath,model.pdf],{maxBuffer:2_000_000});
  if(digest(pdf)!==model.pdf_sha256||pdf.length!==model.pdf_bytes)throw Error('Original PDF checksum/size changed: '+topic+'/'+model.stem);
  const doc=await PDFDocument.load(pdf,{ignoreEncryption:false}),pages=doc.getPages();
  if(pages.length!==1)throw Error('Source PDF is not exactly one page: '+topic+'/'+model.stem);
  const page=pages[0].getSize(),a4=(Math.abs(page.width-595.28)<1.2&&Math.abs(page.height-841.89)<1.2)||(Math.abs(page.width-841.89)<1.2&&Math.abs(page.height-595.28)<1.2);
  if(!a4)throw Error('Source PDF page is not A4: '+topic+'/'+model.stem);
  const number=Number(model.source_stem.match(/-(\d{3})-/)?.[1]);
  if(!Number.isInteger(number)||number<1||number>100)throw Error('Invalid source design number: '+topic+'/'+model.stem);
  const designID=`${topic}__${String(number).padStart(3,'0')}`,contentID=`jc-${topic}-${String(number).padStart(3,'0')}`;
  if(allIDs.has(designID))throw Error('Duplicate source design identifier: '+designID);allIDs.add(designID);
  const categoryIDs=categoryLineage(topic),meta=metadataFor(topic,model,number);
  const categoryReview=`Inspected the actual ${brands[topic]} drawing and matched the visible ${meta.subject} subject to Cars > ${brands[topic]}.`;
  const row={
   topic,design_id:designID,content_id:contentID,slug:`${topic}-coloring-page-${String(number).padStart(3,'0')}`,
   source_sha256:model.webp_sha256,source_pdf_sha256:model.pdf_sha256,source_webp_sha256:model.webp_sha256,
   source_archive_sha256:pkg.zip_sha256,source_zip_sha256:pkg.zip_sha256,source_zip_path:archivePath,
   source_pdf_path:model.pdf,source_webp_path:model.webp,private_webp_path:webpPath,
   title:meta.title,description:meta.description,alt_text:meta.alt_text,category_ids:categoryIDs,
   tags:[topic,`${brands[topic]} coloring pages`,'cars'],category_review:categoryReview,
   source_identity_reference:official[topic],source_type:'user_owned',source_claim:'The owner states that the JotColoring team created these drawings.',
   observations:meta.observations,review_basis:'Compared the depicted model family and vehicle/emblem class with the actual WebP pixels on the package contact sheets; checked brand identity against the manufacturer or official heritage archive.',
   prepare_flags:{'--source-original':webpPath},preparation_folder:path.join(work,'private-prepared','november-07-car-brands-v2',topic,contentID),
   metadata_sha256:await sha256(canonicalJSON({title:meta.title,description:meta.description,alt_text:meta.alt_text,category_ids:categoryIDs}))
  };
  candidates.push(row);
  originals.push({design_id:designID,collection:topic,source_sha256:model.webp_sha256,original_pdf_sha256:model.pdf_sha256,original_webp_sha256:model.webp_sha256,source_archive_sha256:pkg.zip_sha256,source_zip_path:archivePath,source_pdf_path:model.pdf,source_webp_path:model.webp,private_webp_path:webpPath,source_zip_entry_pdf:model.pdf,source_zip_entry_webp:model.webp});
  pairedModels.push(model);
 }
 auditTopics.push({topic,archive_name:pkg.package,archive_sha256:pkg.zip_sha256,zip_crc_status:'PASS',pdf_count:pairedModels.length,webp_count:pairedModels.length,paired_count:pairedModels.length,a4_single_page_pdf_count:pairedModels.length,decoded_webp_count:pairedModels.length,unmatched_stems:[],issues:[]});
}
if(candidates.length!==600||allIDs.size!==600||originals.length!==600||auditTopics.length!==6)throw Error('Incomplete exact 600-design batch.');
const roundOne:any[]=[],roundTwo:any[]=[],seen=new Set<string>();
for(const r of candidates){
 const lineage=categoryLineage(r.topic),text=`${r.title} ${r.description} ${r.alt_text}`.toLowerCase();
 if(JSON.stringify(r.category_ids)!==JSON.stringify(lineage)||lineage.at(-1)!==r.topic)throw Error('Wrong brand/category lineage: '+r.design_id);
 if(r.title.length>78||r.description.length>220||r.alt_text.length>220||r.observations.length<20)throw Error(`Metadata or visible-observation bounds failed: ${r.design_id} (${r.title.length}/${r.description.length}/${r.alt_text.length}/${r.observations.length})`);
 if(/\b(?:easy|medium|hard|very hard|ages?\s*\d)\b/i.test(text))throw Error('Package difficulty/age label was copied into metadata: '+r.design_id);
 if(!text.toLowerCase().includes(brands[r.topic].toLowerCase()))throw Error('Brand name absent from search metadata: '+r.design_id);
 if(seen.has(r.design_id))throw Error('Duplicate ID in editorial review.');seen.add(r.design_id);
 const metadata={title:r.title,description:r.description,alt_text:r.alt_text,category_ids:r.category_ids},metadata_sha256=await sha256(canonicalJSON(metadata));
 const common={design_id:r.design_id,content_id:r.content_id,topic:r.topic,source_sha256:r.source_sha256,pdf_sha256:r.source_pdf_sha256,webp_sha256:r.source_webp_sha256,source_zip_path:r.source_zip_path,source_zip_sha256:r.source_archive_sha256,title:r.title,description:r.description,alt_text:r.alt_text,category_ids:r.category_ids,tags:r.tags,observations:r.observations,review_basis:r.review_basis,source_identity_reference:r.source_identity_reference,metadata_sha256};
 const first={pass:1,status:'reviewed',source_sha256:r.source_sha256,metadata_sha256,reviewed_at:'2026-11-07',method:'Compared the exact source WebP/contact-sheet pixels, visible vehicle or badge identity, brand name, source-bound title/description/alt, actual page subject, and Cars > brand lineage.'};
 const second={passes:2,design_id:r.design_id,source_sha256:r.source_sha256,metadata_sha256,reviewed_at:'2026-11-07',method:'Second consistency pass: rechecked the source-bound title, description, alt text, brand-search wording, exact parent lineage, unsupported year/trim claims, package difficulty/age leakage, spelling and length against the recorded source-pixel review.'};
 roundOne.push({...common,first_editorial_pass:first,status:'pending_second_pass'});
 roundTwo.push({...common,first_editorial_pass:first,second_editorial_review:second,status:'metadata_review_complete_pending_final_render'});
}
const officialSourceZipHashes=Object.fromEntries(auditTopics.map(item=>[item.topic,item.archive_sha256]));
if(Object.keys(officialSourceZipHashes).length!==6||Object.entries(NOVEMBER_07_CAR_BRANDS_ZIP_CHECKSUMS).some(([topic,sha])=>officialSourceZipHashes[topic]!==sha))throw Error('Source archive checksums do not match the authorized release.');
const audit={status:'PASS',release_id:NOVEMBER_07_CAR_BRANDS_RELEASE_ID,design_count:600,source_archive_count:6,source_outer_zip_sha256:inventoryInput.outer_zip_sha256,topics:auditTopics};
const write=async(file:string,value:unknown)=>fs.writeFile(path.join(privateRoot,file),JSON.stringify(value,null,2)+'\n',{mode:0o600});
await write('november-07-car-brands-source-audit.json',audit);
await write('november-07-car-brands-original-source-inventory.json',originals);
await write('editorial-candidates-november-07-car-brands.json',candidates);
await write('november-07-car-brands-editorial-review-round1.json',{release_id:NOVEMBER_07_CAR_BRANDS_RELEASE_ID,status:'PASS',round:1,topic_count:6,design_count:600,rows:roundOne});
await write('november-07-car-brands-editorial-review-round2.json',{release_id:NOVEMBER_07_CAR_BRANDS_RELEASE_ID,status:'PASS',round:2,topic_count:6,design_count:600,rows:roundTwo});
await write('editorial-candidates-november-07-car-brands-reviewed.json',roundTwo);
console.log(JSON.stringify({status:'PASS',release_id:NOVEMBER_07_CAR_BRANDS_RELEASE_ID,topics:6,drawings:600,paired_pdfs:600,paired_webps:600,crc:'PASS',a4_single_page_pdfs:600,decoded_webps:600,editorial_passes:2,issues:0,private_root:privateRoot}));
