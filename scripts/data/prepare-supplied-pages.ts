/** Preserve supplied printable containers and the owner's existing logo verbatim. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash,createHmac} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import sharp from 'sharp';
import {PDFArray,PDFDocument,PDFDict,PDFName,PDFRawStream} from 'pdf-lib';
import {SEASONAL_TEN_ZIP_CHECKSUMS,PUBLIC_FIGURE_TOPIC_COUNTS,COLLECTIBLE_CHARACTER_ZIP_CHECKSUMS,LETTERS_26_ZIP_CHECKSUMS,ADDITIONAL_FIVE_ZIP_CHECKSUMS,NEW_EIGHT_A_ZIP_CHECKSUMS,NEW_THIRTEEN_R_ZIP_CHECKSUMS} from '../../src/server/reviewed-release-scope';
import {inspectSuppliedPagePixels} from './supplied-page-validation';
import {analyzeAgeImage,releaseAgeModel} from './age-vision';
import {selectPreparedCategories,preparedCategorySelection} from './category-selection';
import {ageBand} from '../../src/age/model';
import {renderSocial,siteIcon} from '../social/render';
import {socialBinding,contentSocialSpec} from '../../src/social/model';
import {BRAND_REVIEW_VERSION,brandLogoRGB,BRAND_LOGO_WIDTH,BRAND_LOGO_HEIGHT} from '../../src/server/branding';
import {drawGrayscalePDFJPEG,drawPDFBrandFooter} from '../../src/server/pdf-branding';
import {reviewPrintablePDF} from './pdf-review';
import {decodePDFPNGPrediction} from './pdf-predictor';
import {canonicalJSON} from '../../src/server/http';
import {validateManifest} from '../../src/server/manifest';
import type {Asset,Manifest} from '../../src/server/types';
const root=path.resolve(process.argv[2]);
const shard=Number(process.argv[3]||0),shards=Number(process.argv[4]||1);
const profile=process.argv[5]||'characters';if(!['characters','public-figures','seasonal-ten','letters','additional-five','new-eight','new-thirteen'].includes(profile))throw Error('Unknown supplied release profile');
const seasonal=profile==='seasonal-ten',publicFigures=profile==='public-figures',letters=profile==='letters',additionalFive=profile==='additional-five',newEight=profile==='new-eight',newThirteen=profile==='new-thirteen';
const expectedCount=seasonal?1000:publicFigures?283:letters?2600:additionalFive?500:newEight?800:newThirteen?1300:1700;
const rowsFile=publicFigures?'private-release/editorial-candidates-public-figures.json':letters?'private-release/editorial-candidates-letters.json':additionalFive?'private-release/editorial-candidates-additional-five-20261104.json':newEight?'private-release/editorial-candidates-new-eight-20261104.json':newThirteen?'private-release/editorial-candidates-new-thirteen-20261104.json':'private-release/editorial-candidates.json';
const rows=JSON.parse(await fs.readFile(path.join(root,rowsFile),'utf8'));
const expectedTopics=publicFigures?PUBLIC_FIGURE_TOPIC_COUNTS:Object.fromEntries(Object.keys(seasonal?SEASONAL_TEN_ZIP_CHECKSUMS:letters?LETTERS_26_ZIP_CHECKSUMS:additionalFive?ADDITIONAL_FIVE_ZIP_CHECKSUMS:newEight?NEW_EIGHT_A_ZIP_CHECKSUMS:newThirteen?NEW_THIRTEEN_R_ZIP_CHECKSUMS:COLLECTIBLE_CHARACTER_ZIP_CHECKSUMS).map(t=>[t,100]));
const requestedTopic=process.argv[6];if(requestedTopic&&!(requestedTopic in expectedTopics))throw Error('Topic is outside this exact release.');
if(Object.keys(expectedTopics).some(t=>rows.filter((r:any)=>r.topic===t).length!==expectedTopics[t])||rows.some((r:any)=>!(r.topic in expectedTopics)))throw Error('Complete exact topic inventory required');
const secrets=JSON.parse(await fs.readFile(process.env.JOT_SECRETS_FILE!,'utf8')).production;
const hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const sourcePlacementPattern=/q\s+([-+]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+))\s+0\s+0\s+([-+]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+))\s+([-+]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+))\s+([-+]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+))\s+cm\s+\/([A-Za-z0-9_.+-]+)\s+Do\s+Q/g;
function decodeASCII85(input:Uint8Array){
 const output:number[]=[],group:number[]=[];
 const emit=(values:number[],count=4)=>{let value=0;for(const digit of values)value=value*85+digit;if(value>0xffffffff)throw new Error('Invalid PDF ASCII85 value.');for(let shift=24;shift>=32-count*8;shift-=8)output.push(Math.floor(value/2**shift)&255);};
 for(let i=0;i<input.length;i++){
  const b=input[i]!;if(b===0||b===9||b===10||b===12||b===13||b===32)continue;
  if(b===126){if(input[i+1]===62)i++;break;}
  if(b===122){if(group.length)throw new Error('Invalid PDF ASCII85 zero group.');output.push(0,0,0,0);continue;}
  if(b<33||b>117)throw new Error('Invalid PDF ASCII85 character.');group.push(b-33);if(group.length===5){emit(group);group.length=0;}
 }
 if(group.length===1)throw new Error('Invalid final PDF ASCII85 group.');if(group.length>1){const count=group.length;while(group.length<5)group.push(84);emit(group,count-1);}
 return Buffer.from(output);
}
function decodePDFStream(stream:PDFRawStream,maxOutputLength:number){
 const raw=stream.dict.get(PDFName.of('Filter')),filters=raw instanceof PDFArray?raw.asArray().map(v=>v instanceof PDFName?v.toString().slice(1):''):raw instanceof PDFName?[raw.toString().slice(1)]:[];
 let bytes=Buffer.from(stream.getContents()),jpeg=false;
 for(const filter of filters){
  if(filter==='ASCII85Decode'||filter==='A85')bytes=decodeASCII85(bytes);
  else if(filter==='FlateDecode'||filter==='Fl')bytes=inflateSync(bytes,{maxOutputLength});
  else if(filter==='DCTDecode'||filter==='DCT'){jpeg=true;break;}
  else throw new Error('Unsupported PDF image filter: '+filter);
 }
 return{bytes,jpeg,filters};
}
function decodePDFImageBytes(stream:PDFRawStream,width:number,height:number){
 const decoded=decodePDFStream(stream,width*height*3+height),params=stream.dict.get(PDFName.of('DecodeParms'));
 if(!(params instanceof PDFDict))return decoded;
 const predictor=Number(params.get(PDFName.of('Predictor'))?.toString()||1);if(predictor===1)return decoded;
 if(decoded.jpeg||Number(params.get(PDFName.of('BitsPerComponent'))?.toString()||8)!==8||Number(params.get(PDFName.of('Columns'))?.toString()||1)!==width)throw Error('Unsupported supplied PDF predictor parameters');
 decoded.bytes=decodePDFPNGPrediction(decoded.bytes,width,height,Number(params.get(PDFName.of('Colors'))?.toString()||1),predictor);return decoded;
}
function sourceImagePlacement(doc:PDFDocument,name:PDFName){
 const found:{width:number;height:number;x:number;y:number}[]=[];
 for(const [,object] of doc.context.enumerateIndirectObjects())if(object instanceof PDFRawStream&&object.dict.get(PDFName.of('Subtype'))!==PDFName.of('Image')&&object.dict.get(PDFName.of('Filter'))?.toString().includes('FlateDecode')){
  const text=decodePDFStream(object,100_000).bytes.toString('ascii');for(const match of text.matchAll(sourcePlacementPattern))if(match[5]===name.toString().slice(1))found.push({width:Number(match[1]),height:Number(match[2]),x:Number(match[3]),y:Number(match[4])});
 }
 if(found.length!==1)throw new Error('Could not uniquely locate supplied PDF image placement.');return found[0];
}
async function repairSuppliedPDF(bytes:Buffer,title:string){
 const source=await PDFDocument.load(bytes,{ignoreEncryption:false});if(source.getPageCount()!==1)throw Error('Supplied PDF must contain one page.');
 const sourcePage=source.getPage(0),size=sourcePage.getSize();if(Math.abs(size.width-595.2756)>1||Math.abs(size.height-841.8898)>1)throw Error('Supplied PDF is not A4.');
 const resources=sourcePage.node.Resources()?.lookup(PDFName.of('XObject'),PDFDict);if(!resources)throw Error('Supplied PDF has no image resources.');
 let artwork:{rgb:Buffer;width:number;height:number;name:PDFName}|undefined,logoPlacement:{width:number;height:number;x:number;y:number}|undefined;
 for(const [nameValue,ref] of resources.entries()){
  const name=nameValue as PDFName,object=source.context.lookup(ref);if(!(object instanceof PDFRawStream)||object.dict.get(PDFName.of('Subtype'))!==PDFName.of('Image'))continue;
  const width=Number(object.dict.get(PDFName.of('Width'))?.toString()),height=Number(object.dict.get(PDFName.of('Height'))?.toString()),colorSpace=object.dict.get(PDFName.of('ColorSpace'))?.toString(),decodedStream=decodePDFImageBytes(object,width,height);
  if(colorSpace!=='/DeviceRGB'||!decodedStream.filters.some(f=>['FlateDecode','Fl','DCTDecode','DCT'].includes(f)))throw Error('Supplied PDF image encoding is unsupported.');
  const decoded=decodedStream.jpeg?await sharp(decodedStream.bytes,{limitInputPixels:25_000_000}).toColourspace('srgb').removeAlpha().raw().toBuffer():decodedStream.bytes;
  if(width===BRAND_LOGO_WIDTH&&height===BRAND_LOGO_HEIGHT&&decoded.length===brandLogoRGB().length&&decoded.every((value,index)=>value===brandLogoRGB()[index])){if(logoPlacement)throw Error('Supplied PDF contains duplicate logo images.');logoPlacement=sourceImagePlacement(source,name);}
  else{if(artwork)throw Error('Supplied PDF contains more than one artwork image.');if(width<100||height<100||decoded.length!==width*height*3)throw Error('Supplied PDF artwork dimensions are invalid.');artwork={rgb:Buffer.from(decoded),width,height,name};}
 }
 if(!logoPlacement||!artwork||logoPlacement.width<=0||logoPlacement.height<=0||logoPlacement.x<0||logoPlacement.y<0||logoPlacement.x+logoPlacement.width>size.width+.001||logoPlacement.y+logoPlacement.height>size.height+.001)throw Error('Supplied PDF logo is missing or outside its original page position.');
 const artPlacement=sourceImagePlacement(source,artwork.name),rgb=artwork.rgb;let output:Buffer|undefined;
 for(const quality of [96,94,92,90]){
  const jpeg=await sharp(rgb,{raw:{width:artwork.width,height:artwork.height,channels:3}}).toColourspace('b-w').jpeg({quality,chromaSubsampling:'4:4:4',mozjpeg:true}).toBuffer();
  const repaired=await PDFDocument.create(),page=repaired.addPage([size.width,size.height]);drawGrayscalePDFJPEG(repaired,page,jpeg,artwork.width,artwork.height,artPlacement);await drawPDFBrandFooter(repaired,page,logoPlacement);
  repaired.setTitle(title);repaired.setSubject('One-page A4 grayscale coloring artwork with the supplied JotColoring logo preserved in its original position.');repaired.setCreator('JotColoring');const candidate=Buffer.from(await repaired.save({useObjectStreams:true}));
  if(candidate.length<=1_000_000){await reviewPrintablePDF(candidate,'printable_pdf_a4_bw',true,title,logoPlacement);output=candidate;break;}
 }
 if(!output)throw Error('Repaired grayscale PDF exceeds the 1 MB site limit.');return {bytes:output,artwork_dimensions:{width:artwork.width,height:artwork.height},artwork_position:artPlacement,logo_position:logoPlacement};
}
const auditFile=publicFigures?'public-figure-combined-pdf-audit.json':letters?'letters-pdf-pair-audit.json':additionalFive?'additional-pdf-pair-audit-20261104.json':newEight?'new-eight-source-inventory-20261104.json':newThirteen?'new-thirteen-media-audit-20261104.json':'pdf-pair-audit.json';
const auditPath=additionalFive||newEight||newThirteen?path.join(root,'private-release',auditFile):path.join(root,auditFile);
const audit=JSON.parse(await fs.readFile(auditPath,'utf8'));
const auditedCount=newEight?audit.topics?.reduce((sum:number,t:any)=>sum+(t.paired_count||0),0):newThirteen?audit.design_count:audit.checked;
if(audit.status!=='PASS'||auditedCount!==expectedCount||rows.length!==expectedCount)throw Error('Complete supplied-file audit required.');
if(newEight&&audit.topics.some((t:any)=>t.crc_status!=='PASS'||t.issues.length||t.unmatched_stems.length||t.pdf_count!==100||t.webp_count!==100))throw Error('Exact complete paired source archives required.');
if(newThirteen&&audit.topics.some((t:any)=>t.pdf_count!==100||t.webp_count!==100||t.a4_single_page_pdf_count!==100||t.decoded_webp_count!==100))throw Error('Exact complete decoded source archives required.');
try{for(const [i,row] of rows.entries()){
 if(requestedTopic&&row.topic!==requestedTopic)continue;
 if(i%shards!==shard)continue;
 const out=row.preparation_folder;
 try{const cached=JSON.parse(await fs.readFile(path.join(out,'manifest.json'),'utf8'));if(cached.title!==row.title||cached.description!==row.description||cached.alt_text!==row.alt_text||canonicalJSON(cached.category_ids)!==canonicalJSON(row.category_ids)||cached.age_recommendation?.source_sha256!==row.source_sha256)throw Error('Prepared metadata changed; use a new preparation folder and review its new render.');console.log(JSON.stringify({completed:i+1,id:row.design_id,cached:true}));continue;}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
 const original=await fs.readFile(row.prepare_flags['--source-original']);
 if(hash(original)!==row.source_sha256)throw Error('Source checksum changed');
 const {data,info}=await sharp(original).toColourspace('srgb').removeAlpha().raw().toBuffer({resolveWithObject:true});
 // The supplied logo is intentionally placed differently from generated pages.
 // Check its reserved source region without erasing, moving, or recoloring pixels.
 const {logoPixels,frameChroma,edgeChroma}=inspectSuppliedPagePixels(data,info.width,info.height,info.channels);
 const pdf=execFileSync('/usr/bin/unzip',['-p',row.source_zip_path,row.source_pdf_path],{maxBuffer:2_000_000});
 if(hash(pdf)!==row.source_pdf_sha256||pdf.length>1_000_000)throw Error('Source PDF changed');
 const doc=await PDFDocument.load(pdf);const pages=doc.getPages();
 if(pages.length!==1||Math.abs(pages[0].getWidth()-595.28)>1||Math.abs(pages[0].getHeight()-841.89)>1)throw Error('Supplied PDF is not one-page A4');
 await fs.mkdir(out,{recursive:true,mode:0o700});
 const assets:Asset[]=[],reviews:any[]=[],files:Record<string,string>={source_original:row.prepare_flags['--source-original'],source_processed:row.prepare_flags['--source-original']};
 async function emit(role:string,bytes:Buffer,mime:string,width:number|null,height:number|null,page_count:number|null,bw=true,preservePath?:string){
  const sha=hash(bytes),ext=mime==='application/pdf'?'pdf':mime.split('/')[1],local=preservePath||path.join(out,role+'.'+ext);
  if(!preservePath)await fs.writeFile(local,bytes,{mode:0o600});files[role]=local;
  assets.push({asset_id:`${row.content_id}-${role}-v1`,role,storage_zone:'private_incoming',object_key:`incoming/${row.content_id}/1/${role}-${sha.slice(0,24)}.${ext}`,mime,bytes:bytes.length,width,height,page_count,sha256:sha,asset_version:1,black_and_white_verified:bw});
  const review={sha256:sha,role,mime,bytes:bytes.length,width,height,page_count,bw,reviewed_at:new Date().toISOString(),review_version:BRAND_REVIEW_VERSION};
  reviews.push({review,signature:createHmac('sha256',secrets.MEDIA_VALIDATION_SECRET).update(canonicalJSON(review)).digest('hex')});
 }
 await emit('printable_webp_bw',original,'image/webp',info.width,info.height,null,true,files.source_original);
 const repairedPDF=await repairSuppliedPDF(pdf,row.title);await emit('printable_pdf_a4_bw',repairedPDF.bytes,'application/pdf',null,null,1);
 for(const [role,width] of [['catalog_thumb_bw',400],['catalog_thumb_small_bw',240],['catalog_thumb_medium_bw',320],['catalog_preview_bw',900],['catalog_preview_mobile_bw',600]] as const){
  const resized=await sharp(original).resize({width,withoutEnlargement:true}).png().toBuffer();
  const bytes=await sharp(resized).webp({lossless:true,effort:4}).toBuffer(),meta=await sharp(bytes).metadata();
  // Lossless encoding preserves every pixel of the entire resized page, including its logo.
  const a=await sharp(resized).raw().toBuffer(),b=await sharp(bytes).raw().toBuffer();if(!a.equals(b))throw Error('Responsive encoding changed pixels');
  await emit(role,bytes,'image/webp',meta.width!,meta.height!,null);
 }
 const age=await analyzeAgeImage(original,{brandFooter:true});
 const categories=selectPreparedCategories(age.category_analysis,row.category_ids.join(','),row.category_review);
 const sourceType=row.source_type??(seasonal?'ai_generated':'user_owned');if(!['ai_generated','user_owned'].includes(sourceType))throw Error('Invalid source claim');
 const manifest:Manifest={schema_version:'1.0',color_preview_policy:'none',example_only:false,import_action:'create',idempotency_key:`supplied-${row.content_id}-${row.source_sha256.slice(0,20)}`,content_id:row.content_id,locale:'en',slug:row.slug,title:row.title,description:row.description,alt_text:row.alt_text,requested_status:'ready_for_review',category_ids:categories,tags:row.tags,age_recommendation:age,category_selection:preparedCategorySelection(age.category_analysis,age.source_sha256,categories.join(','),row.category_review),age_groups:[ageBand(age.band)!.group],provenance:{source_type:sourceType,rights_status:'documented',reference:`Source SHA-256 ${row.source_sha256}; supplied PDF SHA-256 ${row.source_pdf_sha256}; ${row.source_claim??(seasonal?'package manifests record AI generated artwork supplied by the JotColoring team;':'owner states JotColoring team created drawings;')} original PDF/WebP containers and supplied JotColoring logo are preserved verbatim in the private ZIP archive and backups. The published PDF is a grayscale-JPEG compatibility derivative required by the media gate; it retains the supplied art placement and exact logo pixels and position. Native raster container absent from supplied ZIP.`,license_label:'Free personal and educational use. Commercial use requires permission: jotcoloring@gmail.com.'},assets};
 const binding=socialBinding({...manifest,recommendedAge:age.band,sourceSHA256:row.source_sha256});
 const cover=await renderSocial(contentSocialSpec(binding),{logo:new Uint8Array(await fs.readFile('public/logo-3d.webp')),icon:await siteIcon(contentSocialSpec(binding).icon),art:[{slug:row.slug,title:row.title,alt:row.alt_text,line:original,sourceSHA256:row.source_sha256}]},binding);
 await emit('social_og',cover.bytes,'image/png',1200,630,null,false);assets.at(-1)!.source_asset_id=assets[0].asset_id;
 const checked=validateManifest(manifest,true);
 await fs.writeFile(path.join(out,'files.json'),JSON.stringify(files,null,2),{mode:0o600});
 await fs.writeFile(path.join(out,'reviews.json'),JSON.stringify(reviews,null,2),{mode:0o600});
 await fs.writeFile(path.join(out,'preservation.json'),JSON.stringify({original_webp_sha256:row.source_sha256,original_pdf_sha256:row.source_pdf_sha256,published_pdf_sha256:hash(repairedPDF.bytes),pdf_conversion:'RGB artwork encoded as DeviceGray JPEG for the site media gate; A4 artwork placement retained; exact approved logo pixels and original position retained',pdf_source_structurally_valid:true,logo_pixels:logoPixels,source_frame_chroma_pixels:frameChroma,source_edge_chroma_pixels:edgeChroma,logo_preserved:true,source_containers_preserved_in_private_archive:true,printable_webp_identical_to_supplied:true,published_pdf_is_compatibility_derivative:true,previews:'whole-page lossless resized copies',color_assets_created:false}),{mode:0o600});
 await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(checked,null,2),{mode:0o600});
 console.log(JSON.stringify({completed:i+1,id:row.design_id,assets:assets.length}));
}}finally{await releaseAgeModel();}
