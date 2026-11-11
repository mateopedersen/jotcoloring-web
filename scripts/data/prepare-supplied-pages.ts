import {NOVEMBER_11_FOUR_RELEASE_ID,NOVEMBER_11_FOUR_TOPIC_COUNTS,NOVEMBER_11_FOUR_ZIP_SHA256S} from '../../src/server/november-11-four-scope';
import {NOVEMBER_10_ARTIST_TOPIC_COUNTS,NOVEMBER_10_ARTIST_ZIP_SHA256S} from '../../src/server/reviewed-release-scope';
/** Preserve supplied printable containers and the owner's existing logo verbatim. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash,createHmac} from 'node:crypto';
import sharp from 'sharp';
import {PDFArray,PDFDocument,PDFDict,PDFName,PDFRawStream,PDFRef} from 'pdf-lib';
import {SEASONAL_TEN_ZIP_CHECKSUMS,PUBLIC_FIGURE_TOPIC_COUNTS,COLLECTIBLE_CHARACTER_ZIP_CHECKSUMS,LETTERS_26_ZIP_CHECKSUMS,ADDITIONAL_FIVE_ZIP_CHECKSUMS,NEW_EIGHT_A_ZIP_CHECKSUMS,NEW_THIRTEEN_R_ZIP_CHECKSUMS,NOVEMBER_27_TOPIC_COUNTS,NOVEMBER_06_TOPIC_COUNTS,NOVEMBER_07_CAR_BRANDS_TOPIC_COUNTS,NOVEMBER_07_FIVE_TOPIC_COLLECTION_COUNTS,NOVEMBER_07_FIVE_TOPIC_SOURCE_COUNTS,NOVEMBER_07_ALL_67_TOPIC_COUNTS,NOVEMBER_08_AUTOMOBILE_TOPIC_COUNTS,NOVEMBER_09_AUTO29_TOPIC_COUNTS,SCOOBY_DOO_TOPIC_COUNTS,SCOOBY_DOO_ZIP_SHA256,GTA6_TOPIC_COUNTS,GTA6_SOURCE_ZIP_SHA256,GTA6_REPLACEMENT_042_PNG_SHA256,GTA6_REPLACEMENT_042_WEBP_SHA256,GTA6_REPLACEMENT_DESIGN_ID} from '../../src/server/reviewed-release-scope';
import {inspectSuppliedPagePixels} from './supplied-page-validation';
import {analyzeAgeImage,releaseAgeModel} from './age-vision';
import {selectPreparedCategories,preparedCategorySelection} from './category-selection';
import {ageBand} from '../../src/age/model';
import {renderSocial,siteIcon} from '../social/render';
import {socialBinding,contentSocialSpec} from '../../src/social/model';
import {BRAND_REVIEW_VERSION,brandLogoRGB,BRAND_LOGO_WIDTH,BRAND_LOGO_HEIGHT} from '../../src/server/branding';
import {drawGrayscalePDFJPEG,drawPDFBrandFooter} from '../../src/server/pdf-branding';
import {isA4PageSize,reviewPrintablePDF} from './pdf-review';
import {decodePDFImageBytes, sourceImagePlacement} from './supplied-pdf-source';
import {canonicalJSON} from '../../src/server/http';
import {validateManifest} from '../../src/server/manifest';
import type {Asset,Manifest} from '../../src/server/types';
const root=path.resolve(process.argv[2]);
const shard=Number(process.argv[3]||0),shards=Number(process.argv[4]||1);
const profile=process.argv[5]||'characters';if(!['characters','public-figures','seasonal-ten','letters','additional-five','new-eight','new-thirteen','november-27','november-06','november-07-car-brands','november-07-five-topics','november-07-all-67','november-08-automobile-brands','november-09-auto29','scooby-doo-40','gta-6-120','november-10-artists','november-11-four-topics'].includes(profile))throw Error('Unknown supplied release profile');
const seasonal=profile==='seasonal-ten',publicFigures=profile==='public-figures',letters=profile==='letters',additionalFive=profile==='additional-five',newEight=profile==='new-eight',newThirteen=profile==='new-thirteen',november27=profile==='november-27',november06=profile==='november-06',november07CarBrands=profile==='november-07-car-brands',november07FiveTopics=profile==='november-07-five-topics',november07All67=profile==='november-07-all-67',november08Automobiles=profile==='november-08-automobile-brands',november09Auto29=profile==='november-09-auto29',scooby40=profile==='scooby-doo-40',gta6=profile==='gta-6-120';
const fourTopics=profile==='november-11-four-topics';
const artist25=profile==='november-10-artists';
const expectedCount=fourTopics?400:artist25?2500:gta6?120:november09Auto29?Object.values(NOVEMBER_09_AUTO29_TOPIC_COUNTS).reduce((sum,count)=>sum+count,0):november08Automobiles?Object.values(NOVEMBER_08_AUTOMOBILE_TOPIC_COUNTS).reduce((sum,count)=>sum+count,0):scooby40?40:november07All67?Object.values(NOVEMBER_07_ALL_67_TOPIC_COUNTS).reduce((sum,count)=>sum+count,0):seasonal?1000:publicFigures?283:letters?2600:additionalFive?500:newEight?800:newThirteen?1300:november27?Object.values(NOVEMBER_27_TOPIC_COUNTS).reduce((sum,count)=>sum+count,0):november06?Object.values(NOVEMBER_06_TOPIC_COUNTS).reduce((sum,count)=>sum+count,0):november07CarBrands?Object.values(NOVEMBER_07_CAR_BRANDS_TOPIC_COUNTS).reduce((sum,count)=>sum+count,0):november07FiveTopics?Object.values(NOVEMBER_07_FIVE_TOPIC_COLLECTION_COUNTS).reduce((sum,count)=>sum+count,0):1700;
const rowsFile=fourTopics?'private-release/editorial-candidates-november-11-four-topics.json':artist25?'private-release/editorial-candidates-november-10-artists-20261110.json':gta6?'private-release/editorial-candidates-gta-6.json':november09Auto29?'private-release/editorial-candidates-november-09-auto29.json':november08Automobiles?'private-release/editorial-candidates-november-08-automobiles-36.json':scooby40?'private-release/editorial-candidates-scooby-doo-40-20261108.json':november07All67?'private-release/editorial-candidates-november-07-all-67.json':publicFigures?'private-release/editorial-candidates-public-figures.json':letters?'private-release/editorial-candidates-letters.json':additionalFive?'private-release/editorial-candidates-additional-five-20261104.json':newEight?'private-release/editorial-candidates-new-eight-20261104.json':newThirteen?'private-release/editorial-candidates-new-thirteen-20261104.json':november27?'private-release/editorial-candidates-november-27.json':november06?'private-release/editorial-candidates-november-06.json':november07CarBrands?'private-release/editorial-candidates-november-07-car-brands.json':november07FiveTopics?'private-release/editorial-candidates-november-07-five-topics.json':'private-release/editorial-candidates.json';
const loaded=JSON.parse(await fs.readFile(path.join(root,rowsFile),'utf8'));
const rows=fourTopics||november07All67||scooby40||artist25||november09Auto29||gta6||artist25?loaded.rows:loaded;
const expectedTopics=fourTopics?NOVEMBER_11_FOUR_TOPIC_COUNTS:artist25?NOVEMBER_10_ARTIST_TOPIC_COUNTS:gta6?GTA6_TOPIC_COUNTS:november09Auto29?NOVEMBER_09_AUTO29_TOPIC_COUNTS:november08Automobiles?NOVEMBER_08_AUTOMOBILE_TOPIC_COUNTS:scooby40?SCOOBY_DOO_TOPIC_COUNTS:november07All67?NOVEMBER_07_ALL_67_TOPIC_COUNTS:november27?NOVEMBER_27_TOPIC_COUNTS:november06?NOVEMBER_06_TOPIC_COUNTS:november07CarBrands?NOVEMBER_07_CAR_BRANDS_TOPIC_COUNTS:november07FiveTopics?NOVEMBER_07_FIVE_TOPIC_COLLECTION_COUNTS:publicFigures?PUBLIC_FIGURE_TOPIC_COUNTS:Object.fromEntries(Object.keys(seasonal?SEASONAL_TEN_ZIP_CHECKSUMS:letters?LETTERS_26_ZIP_CHECKSUMS:additionalFive?ADDITIONAL_FIVE_ZIP_CHECKSUMS:newEight?NEW_EIGHT_A_ZIP_CHECKSUMS:newThirteen?NEW_THIRTEEN_R_ZIP_CHECKSUMS:COLLECTIBLE_CHARACTER_ZIP_CHECKSUMS).map(t=>[t,100]));
const requestedTopic=process.argv[6];if(requestedTopic&&!(requestedTopic in expectedTopics))throw Error('Topic is outside this exact release.');
if(Object.keys(expectedTopics).some(t=>rows.filter((r:any)=>r.topic===t).length!==expectedTopics[t])||rows.some((r:any)=>!(r.topic in expectedTopics)))throw Error('Complete exact topic inventory required');
const secrets=JSON.parse(await fs.readFile(process.env.JOT_SECRETS_FILE!,'utf8')).production;
const hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
/** Resolve Device and ICCBased image component counts without treating a valid producer profile as a damaged PDF. */
function pdfImageChannels(doc:PDFDocument,stream:PDFRawStream):1|3{
 const raw=stream.dict.get(PDFName.of('ColorSpace'));
 const spec=raw instanceof PDFRef?doc.context.lookup(raw):raw;
 if(spec instanceof PDFName){if(spec.toString()==='/DeviceGray')return 1;if(spec.toString()==='/DeviceRGB')return 3;}
 if(spec instanceof PDFArray&&spec.get(0)?.toString()==='/ICCBased'){
  const ref=spec.get(1),profile=ref instanceof PDFRef?doc.context.lookup(ref):ref;
  if(profile instanceof PDFRawStream){const channels=Number(profile.dict.get(PDFName.of('N'))?.toString());if(channels===1||channels===3)return channels;}
 }
 throw new Error('Supplied PDF uses an unsupported image color space.');
}
async function repairSuppliedPDF(bytes:Buffer,title:string,replacementPage?:Buffer){
 const source=await PDFDocument.load(bytes,{ignoreEncryption:false});if(source.getPageCount()!==1)throw Error('Supplied PDF must contain one page.');
 const sourcePage=source.getPage(0),size=sourcePage.getSize();if(!isA4PageSize(size))throw Error('Supplied PDF is not A4.');
 const resources=sourcePage.node.Resources()?.lookup(PDFName.of('XObject'),PDFDict);if(!resources)throw Error('Supplied PDF has no image resources.');
 let artwork:{rgb:Buffer;width:number;height:number;channels:1|3;name:PDFName}|undefined,logoPlacement:{width:number;height:number;x:number;y:number}|undefined;
 for(const [nameValue,ref] of resources.entries()){
  const name=nameValue as PDFName,object=source.context.lookup(ref);if(!(object instanceof PDFRawStream)||object.dict.get(PDFName.of('Subtype'))!==PDFName.of('Image'))continue;
  const width=Number(object.dict.get(PDFName.of('Width'))?.toString()),height=Number(object.dict.get(PDFName.of('Height'))?.toString()),channels=pdfImageChannels(source,object),decodedStream=decodePDFImageBytes(object,width,height);
  if(!decodedStream.filters.some(f=>['FlateDecode','Fl','DCTDecode','DCT'].includes(f)))throw Error('Supplied PDF image encoding is unsupported.');
  const pixels=decodedStream.jpeg?await sharp(decodedStream.bytes,{limitInputPixels:25_000_000}).toColourspace('srgb').removeAlpha().raw().toBuffer():decodedStream.bytes,decodedChannels=decodedStream.jpeg?3:channels;
  if(pixels.length!==width*height*decodedChannels)throw Error('Supplied PDF image samples do not match their dimensions.');
  if(width===BRAND_LOGO_WIDTH&&height===BRAND_LOGO_HEIGHT&&decodedChannels===3&&pixels.length===brandLogoRGB().length&&pixels.every((value,index)=>value===brandLogoRGB()[index])){if(logoPlacement)throw Error('Supplied PDF contains duplicate logo images.');logoPlacement=sourceImagePlacement(source,name);}
  else{if(artwork)throw Error('Supplied PDF contains more than one artwork image.');if(width<100||height<100||channels!==1&&channels!==3)throw Error('Supplied PDF artwork dimensions are invalid.');artwork={rgb:Buffer.from(pixels),width,height,channels:decodedChannels,name};}
 }
 if(!logoPlacement||!artwork||logoPlacement.width<=0||logoPlacement.height<=0||logoPlacement.x<0||logoPlacement.y<0||logoPlacement.x+logoPlacement.width>size.width+.001||logoPlacement.y+logoPlacement.height>size.height+.001)throw Error('Supplied PDF logo is missing or outside its original page position.');
 const artPlacement=sourceImagePlacement(source,artwork.name);const replacement= replacementPage?await sharp(replacementPage,{limitInputPixels:25_000_000}).toColourspace('srgb').removeAlpha().raw().toBuffer({resolveWithObject:true}):undefined;const preparedArtwork=replacement?{rgb:Buffer.from(replacement.data),width:replacement.info.width,height:replacement.info.height,channels:replacement.info.channels as 1|3}:{rgb:artwork.rgb,width:artwork.width,height:artwork.height,channels:artwork.channels};const pdfPlacement=replacement?{x:0,y:0,width:size.width,height:size.height}:artPlacement;let output:Buffer|undefined;
 for(const quality of [96,94,92,90]){
  const jpeg=await sharp(preparedArtwork.rgb,{raw:{width:preparedArtwork.width,height:preparedArtwork.height,channels:preparedArtwork.channels}}).toColourspace('b-w').jpeg({quality,chromaSubsampling:'4:4:4',mozjpeg:true}).toBuffer();
  const repaired=await PDFDocument.create(),page=repaired.addPage([size.width,size.height]);drawGrayscalePDFJPEG(repaired,page,jpeg,preparedArtwork.width,preparedArtwork.height,pdfPlacement);await drawPDFBrandFooter(repaired,page,logoPlacement);
  repaired.setTitle(title);repaired.setSubject('One-page A4 grayscale coloring artwork with the supplied JotColoring logo preserved in its original position.');repaired.setCreator('JotColoring');const candidate=Buffer.from(await repaired.save({useObjectStreams:true}));
  if(candidate.length<=1_000_000){await reviewPrintablePDF(candidate,'printable_pdf_a4_bw',true,title,logoPlacement);output=candidate;break;}
 }
 if(!output)throw Error('Repaired grayscale PDF exceeds the 1 MB site limit.');return {bytes:output,artwork_dimensions:{width:preparedArtwork.width,height:preparedArtwork.height},artwork_position:pdfPlacement,logo_position:logoPlacement};
}
const auditFile=fourTopics?'source-audit.json':artist25?'source-audit.json':gta6?'gta6-source-audit.json':november09Auto29?'auto29-source-audit.json':november08Automobiles?'november-08-automobiles-36-source-audit.json':scooby40?'scooby-doo-40-source-audit.json':november07All67?'november-07-all-67-source-integrity.json':publicFigures?'public-figure-combined-pdf-audit.json':letters?'letters-pdf-pair-audit.json':additionalFive?'additional-pdf-pair-audit-20261104.json':newEight?'new-eight-source-inventory-20261104.json':newThirteen?'new-thirteen-media-audit-20261104.json':november27?'november-27-source-audit.json':november06?'november-06-source-audit.json':november07CarBrands?'november-07-car-brands-source-audit.json':november07FiveTopics?'november-07-five-topic-source-audit.json':'pdf-pair-audit.json';
const auditPath=artist25||fourTopics?path.join(root,'private-review',auditFile):gta6?path.join(root,'private-release',auditFile):november09Auto29?path.join(root,'private-review',auditFile):november08Automobiles||additionalFive||newEight||newThirteen||november27||november06||november07CarBrands||november07FiveTopics||november07All67||scooby40?path.join(root,'private-release',auditFile):path.join(root,auditFile);
const audit=JSON.parse(await fs.readFile(auditPath,'utf8'));
const auditedCount=artist25||fourTopics?audit.design_count:gta6?audit.paired_artworks:november09Auto29||november08Automobiles||scooby40||november07All67?audit.design_count:newEight?audit.topics?.reduce((sum:number,t:any)=>sum+(t.paired_count||0),0):newThirteen?audit.design_count:november07CarBrands?audit.topics?.reduce((sum:number,t:any)=>sum+(t.pdf_count||0),0):november07FiveTopics?audit.topics?.reduce((sum:number,t:any)=>sum+(t.paired||0),0):audit.checked;
if(fourTopics&&(audit.release_id!==NOVEMBER_11_FOUR_RELEASE_ID||audit.archive_count!==4||audit.design_count!==400||audit.unique_pdf_count!==400||audit.unique_webp_count!==400||audit.topics?.length!==4||Object.entries(NOVEMBER_11_FOUR_TOPIC_COUNTS).some(([topic,count])=>audit.topics.find((t:any)=>t.topic===topic)?.design_count!==count||audit.topics.find((t:any)=>t.topic===topic)?.archive_sha256!==NOVEMBER_11_FOUR_ZIP_SHA256S[topic])))throw Error('Complete checksum-pinned four-topic source audit required.');
if(artist25&&(audit.archive_count!==25||audit.design_count!==2500||audit.unique_pdf_count!==2500||audit.unique_webp_count!==2500||audit.topics?.length!==25||Object.entries(NOVEMBER_10_ARTIST_TOPIC_COUNTS).some(([topic,count])=>audit.topics.find((t:any)=>t.topic===topic)?.design_count!==count||audit.topics.find((t:any)=>t.topic===topic)?.archive_sha256!==NOVEMBER_10_ARTIST_ZIP_SHA256S[topic])))throw Error('The complete checksum-pinned 25-artist source audit is required.');
if((!gta6&&audit.status!=='PASS')||auditedCount!==expectedCount||rows.length!==expectedCount)throw Error('Complete supplied-file audit required.');
if(gta6&&(audit.release!=='gta-6-120'||audit.zip_sha256!==GTA6_SOURCE_ZIP_SHA256||audit.archive_crc!=='PASS'||audit.paired_artworks!==120||audit.pdfs_one_page_a4!==120||audit.pdfs_rendered_and_validated!==120||audit.webps_decoded_dimensions_bytes_verified!==120||audit.pair_composition_pass!==120))throw Error('Exact checksum-pinned GTA 6 PDF/WebP paired-source audit required.');
if(scooby40&&(audit.topic_count!==1||audit.archive_count!==1||audit.unique_source_webp_count!==40||audit.zip_sha256!==SCOOBY_DOO_ZIP_SHA256||audit.topics?.[0]?.topic!=='scooby-doo'||audit.topics?.[0]?.paired!==40||audit.topics?.[0]?.a4_single_page_pdf_count!==40||audit.topics?.[0]?.decoded_webp_count!==40||audit.topics?.[0]?.zip_crc_status!=='PASS'||audit.topics?.[0]?.problems?.length))throw Error('Exact checksum-pinned Scooby-Doo source audit required.');
if(november07All67&&(audit.topic_count!==67||audit.archive_count!==67||audit.unique_source_webp_count!==6700))throw Error('The complete checksum-pinned 67-topic source integrity audit is required.');
if(november08Automobiles&&(audit.topic_count!==36||audit.archive_count!==36||audit.unique_source_webp_count!==3600||Object.keys(audit.topics||{}).length!==36||Object.entries(NOVEMBER_08_AUTOMOBILE_TOPIC_COUNTS).some(([topic,count])=>audit.topics?.[topic]?.pairs!==count||audit.topics?.[topic]?.zip_crc_status!=='PASS'||audit.topics?.[topic]?.pdf_count!==count||audit.topics?.[topic]?.webp_count!==count||audit.topics?.[topic]?.a4_single_page_pdf_count!==count||audit.topics?.[topic]?.decoded_webp_count!==count||audit.topics?.[topic]?.oversize_source_pdfs!==0)))throw Error('The exact complete 36-topic paired automobile source audit is required.');
if(november09Auto29&&(audit.topic_count!==29||audit.archive_count!==29||audit.unique_source_webp_count!==2900||audit.source_inventory_sha256!=='b39a41de1a08a7592f98a5ed725a8361f169c080ef91fc46be213dca4708d19a'||Object.keys(audit.topics||{}).length!==29||Object.entries(NOVEMBER_09_AUTO29_TOPIC_COUNTS).some(([topic,count])=>audit.topics?.[topic]?.pairs!==count||audit.topics?.[topic]?.zip_crc_status!=='PASS'||audit.topics?.[topic]?.pdf_count!==count||audit.topics?.[topic]?.webp_count!==count||audit.topics?.[topic]?.a4_single_page_pdf_count!==count||audit.topics?.[topic]?.decoded_webp_count!==count||audit.topics?.[topic]?.oversize_source_pdfs!==0)))throw Error('The exact complete 29-topic paired automobile source audit is required.');
if(newEight&&audit.topics.some((t:any)=>t.crc_status!=='PASS'||t.issues.length||t.unmatched_stems.length||t.pdf_count!==100||t.webp_count!==100))throw Error('Exact complete paired source archives required.');
if((newThirteen||november27||november06||november07CarBrands)&&audit.topics.some((t:any)=>t.pdf_count!==expectedTopics[t.topic]||t.webp_count!==expectedTopics[t.topic]||t.a4_single_page_pdf_count!==expectedTopics[t.topic]||t.decoded_webp_count!==expectedTopics[t.topic]||(november06||november07CarBrands)&&t.zip_crc_status!=='PASS'))throw Error('Exact complete decoded source archives required.');
if(november07FiveTopics&&audit.topics.some((t:any)=>t.pdf_count!==NOVEMBER_07_FIVE_TOPIC_SOURCE_COUNTS[t.topic]||t.webp_count!==NOVEMBER_07_FIVE_TOPIC_SOURCE_COUNTS[t.topic]||t.paired!==NOVEMBER_07_FIVE_TOPIC_SOURCE_COUNTS[t.topic]||!t.level_counts||Object.values(t.level_counts).some((n:any)=>n!==25)||t.problems?.length))throw Error('Exact complete five-topic source archive audit required.');
try{for(const [i,row] of rows.entries()){
 if(requestedTopic&&row.topic!==requestedTopic)continue;
 if(i%shards!==shard)continue;
 const out=row.preparation_folder;
 try{const cached=JSON.parse(await fs.readFile(path.join(out,'manifest.json'),'utf8'));if(cached.title!==row.title||cached.description!==row.description||cached.alt_text!==row.alt_text||canonicalJSON(cached.category_ids)!==canonicalJSON(row.category_ids)||cached.age_recommendation?.source_sha256!==(row.printable_webp_sha256||row.source_sha256))throw Error('Prepared metadata changed; use a new preparation folder and review its new render.');console.log(JSON.stringify({completed:i+1,id:row.design_id,cached:true}));continue;}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
 if(fourTopics||november07All67||november08Automobiles||artist25||november09Auto29||scooby40||gta6)await fs.mkdir(out,{recursive:true,mode:0o700});
 let originalSourcePath=row.prepare_flags?.['--source-original'] as string|undefined;
 if((fourTopics||november07All67||november08Automobiles||artist25||november09Auto29||scooby40||gta6)&&!originalSourcePath)originalSourcePath='archive:'+row.source_zip_path+'|'+row.source_webp_path;
 if(!originalSourcePath)throw Error('Source WebP path is unavailable.');
 const original=originalSourcePath.startsWith('archive:')?Buffer.from(execFileSync('/usr/bin/unzip',['-p',row.source_zip_path,row.source_webp_path],{maxBuffer:25_000_000})):await fs.readFile(originalSourcePath);
 if(hash(original)!==row.source_sha256)throw Error('Source checksum changed');
 const processedSourcePath=row.prepare_flags?.['--source-processed'] as string|undefined,processedRaster=processedSourcePath?await fs.readFile(processedSourcePath):original,processedHash=hash(processedRaster),expectedProcessedHash=row.prepared_source_sha256||row.source_sha256;if(processedHash!==expectedProcessedHash)throw Error('Prepared working raster checksum changed');
 if(gta6&&row.design_id===GTA6_REPLACEMENT_DESIGN_ID&&processedHash!==GTA6_REPLACEMENT_042_PNG_SHA256)throw Error('GTA 6 replacement image checksum changed');
 const workingWebP=processedSourcePath?await sharp(processedRaster).webp({lossless:true,effort:4}).toBuffer():original,workingWebPSha=hash(workingWebP);if(gta6&&row.design_id===GTA6_REPLACEMENT_DESIGN_ID&&workingWebPSha!==GTA6_REPLACEMENT_042_WEBP_SHA256)throw Error('GTA 6 replacement WebP does not match its pinned checksum');
 const {data,info}=await sharp(workingWebP).toColourspace('srgb').removeAlpha().raw().toBuffer({resolveWithObject:true});
 // The supplied logo is intentionally placed differently from generated pages.
 // Check its reserved source region without erasing, moving, or recoloring pixels.
 const {logoPixels,frameChroma,edgeChroma}=inspectSuppliedPagePixels(data,info.width,info.height,info.channels);
 const pdf=execFileSync('/usr/bin/unzip',['-p',row.source_zip_path,row.source_pdf_path],{maxBuffer:2_000_000});
 if(hash(pdf)!==row.source_pdf_sha256||pdf.length>1_000_000)throw Error('Source PDF changed');
 const doc=await PDFDocument.load(pdf);const pages=doc.getPages();
 if(pages.length!==1||!isA4PageSize({width:pages[0].getWidth(),height:pages[0].getHeight()}))throw Error('Supplied PDF is not one-page A4');
 await fs.mkdir(out,{recursive:true,mode:0o700});
 const assets:Asset[]=[],reviews:any[]=[],files:Record<string,string>={source_original:originalSourcePath,source_processed:processedSourcePath||originalSourcePath};
 async function emit(role:string,bytes:Buffer,mime:string,width:number|null,height:number|null,page_count:number|null,bw=true,preservePath?:string){
  const sha=hash(bytes),ext=mime==='application/pdf'?'pdf':mime.split('/')[1],local=preservePath||path.join(out,role+'.'+ext);
  if(!preservePath)await fs.writeFile(local,bytes,{mode:0o600});files[role]=local;
  assets.push({asset_id:`${row.content_id}-${role}-v1`,role,storage_zone:'private_incoming',object_key:`incoming/${row.content_id}/1/${role}-${sha.slice(0,24)}.${ext}`,mime,bytes:bytes.length,width,height,page_count,sha256:sha,asset_version:1,black_and_white_verified:bw});
  const review={sha256:sha,role,mime,bytes:bytes.length,width,height,page_count,bw,reviewed_at:new Date().toISOString(),review_version:BRAND_REVIEW_VERSION};
  reviews.push({review,signature:createHmac('sha256',secrets.MEDIA_VALIDATION_SECRET).update(canonicalJSON(review)).digest('hex')});
 }
 await emit('printable_webp_bw',workingWebP,'image/webp',info.width,info.height,null,true,processedHash===row.source_sha256?files.source_original:undefined);
 let replacementPageForPDF:Buffer|undefined;const clearRect=row.prepare_flags?.['--pdf-logo-clear'];if(clearRect){const [left,top,width,height]=String(clearRect).split(',').map(Number);if([left,top,width,height].some(n=>!Number.isSafeInteger(n)||n<0)||left+width>info.width||top+height>info.height)throw Error('Invalid replacement logo cleanup rectangle');replacementPageForPDF=await sharp(processedRaster).composite([{input:{create:{width,height,channels:4,background:'#fff'}},left,top}]).png().toBuffer();}
 const repairedPDF=await repairSuppliedPDF(pdf,row.title,replacementPageForPDF);await emit('printable_pdf_a4_bw',repairedPDF.bytes,'application/pdf',null,null,1);
 for(const [role,width] of [['catalog_thumb_bw',400],['catalog_thumb_small_bw',240],['catalog_thumb_medium_bw',320],['catalog_preview_bw',900],['catalog_preview_mobile_bw',600]] as const){
  const resized=await sharp(workingWebP).resize({width,withoutEnlargement:true}).png().toBuffer();
  const bytes=await sharp(resized).webp({lossless:true,effort:4}).toBuffer(),meta=await sharp(bytes).metadata();
  // Lossless encoding preserves every pixel of the entire resized page, including its logo.
  const a=await sharp(resized).raw().toBuffer(),b=await sharp(bytes).raw().toBuffer();if(!a.equals(b))throw Error('Responsive encoding changed pixels');
  await emit(role,bytes,'image/webp',meta.width!,meta.height!,null);
 }
 const age=await analyzeAgeImage(workingWebP,{brandFooter:true});
 const categories=selectPreparedCategories(age.category_analysis,row.category_ids.join(','),row.category_review);
 const sourceType=row.source_type??(seasonal?'ai_generated':'user_owned');if(!['ai_generated','user_owned'].includes(sourceType))throw Error('Invalid source claim');
 const manifest:Manifest={schema_version:'1.0',color_preview_policy:'none',example_only:false,import_action:'create',idempotency_key:`supplied-${row.content_id}-${row.source_sha256.slice(0,20)}`,content_id:row.content_id,locale:'en',slug:row.slug,title:row.title,description:row.description,alt_text:row.alt_text,requested_status:'ready_for_review',category_ids:categories,tags:row.tags,age_recommendation:age,category_selection:preparedCategorySelection(age.category_analysis,age.source_sha256,categories.join(','),row.category_review),age_groups:[ageBand(age.band)!.group],provenance:{source_type:sourceType,rights_status:'documented',reference:`Source SHA-256 ${row.source_sha256}; supplied PDF SHA-256 ${row.source_pdf_sha256}; ${row.source_claim??(seasonal?'package manifests record AI generated artwork supplied by the JotColoring team;':'owner states JotColoring team created drawings;')} the supplied PDF and WebP are retained as separately checksummed original containers. ${processedHash!==row.source_sha256?`processed working raster SHA-256 ${processedHash} (derived from the supplied source; not a native original).`:''} The published A4 PDF is a grayscale-JPEG compatibility derivative required by the media gate; it retains the supplied artwork placement and exact logo pixels and position. No separate PNG or other raster container was supplied.`,license_label:'Free personal and educational use. Commercial use requires permission: jotcoloring@gmail.com.'},assets};
 const binding=socialBinding({...manifest,recommendedAge:age.band,sourceSHA256:workingWebPSha});
 const cover=await renderSocial(contentSocialSpec(binding),{logo:new Uint8Array(await fs.readFile('public/logo-3d.webp')),icon:await siteIcon(contentSocialSpec(binding).icon),art:[{slug:row.slug,title:row.title,alt:row.alt_text,line:workingWebP,sourceSHA256:workingWebPSha}]},binding);
 await emit('social_og',cover.bytes,'image/png',1200,630,null,false);assets.at(-1)!.source_asset_id=assets[0].asset_id;
 const checked=validateManifest(manifest,true);
 await fs.writeFile(path.join(out,'files.json'),JSON.stringify(files,null,2),{mode:0o600});
 await fs.writeFile(path.join(out,'reviews.json'),JSON.stringify(reviews,null,2),{mode:0o600});
 await fs.writeFile(path.join(out,'preservation.json'),JSON.stringify({original_webp_sha256:row.source_sha256,original_pdf_sha256:row.source_pdf_sha256,prepared_source_sha256:processedHash,published_webp_sha256:workingWebPSha,published_pdf_sha256:hash(repairedPDF.bytes),pdf_conversion:'RGB artwork encoded as DeviceGray JPEG for the site media gate; A4 artwork placement retained; exact approved logo pixels and original position retained',pdf_source_structurally_valid:true,logo_pixels:logoPixels,source_frame_chroma_pixels:frameChroma,source_edge_chroma_pixels:edgeChroma,logo_preserved:true,source_containers_preserved_in_private_archive:true,printable_webp_identical_to_supplied:workingWebPSha===row.source_sha256,published_pdf_is_compatibility_derivative:true,replacement_source_used:processedHash!==row.source_sha256,previews:'whole-page lossless resized copies',color_assets_created:false}),{mode:0o600});
 await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(checked,null,2),{mode:0o600});
 console.log(JSON.stringify({completed:i+1,id:row.design_id,assets:assets.length}));
}}finally{await releaseAgeModel();}
