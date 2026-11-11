import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
import sharp from 'sharp';
import {unzipSync} from 'fflate';

const work=path.resolve(process.argv[2]);
const workspaceRoot=path.resolve(work,'../../..');
const onlyTopic=process.argv[3];
const root=path.join(work,'source-zips');
const output=path.join(work,'private-review');
const copyInventory=JSON.parse(await fs.readFile(path.join(root,'copy-inventory.json'),'utf8'));
const listing=JSON.parse(await fs.readFile(path.join(work,'archive-listing.json'),'utf8')) as any[];
const topics=copyInventory.archives.map((a:any)=>({
  slug:path.basename(a.name,'.zip').replace(/^JotColoring[-_]/i,'').replace(/[-_]Coloring[-_]Pages$/i,'').replace(/[-_]100[-_]PDF[-_]100[-_]WebP$/i,'').replace(/_/g,'-').toLowerCase(),
  archive:a,
}));
if(onlyTopic&&!topics.some((t:any)=>t.slug===onlyTopic))throw new Error('Topic outside the exact 25-archive intake.');
const hash=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const audit:any={status:'PASS',release_id:'november-10-artists-20261110',archive_count:0,design_count:0,unique_webp_count:0,unique_pdf_count:0,failed_pairs:[],topics:[] as any[],created_at:new Date().toISOString()};
const sourceRows:any[]=[];const allWebpHashes=new Set<string>(),allPdfHashes=new Set<string>();
await fs.mkdir(output,{recursive:true,mode:0o700});
for(const {slug,archive} of topics){
 if(onlyTopic&&slug!==onlyTopic)continue;
 const archivePath=path.resolve(workspaceRoot,archive.copy);
 const archiveBytes=await fs.readFile(archivePath);
 const archiveHash=hash(archiveBytes);
 if(archiveHash!==archive.sha256||archiveBytes.length!==archive.bytes)throw new Error('Immutable source archive changed: '+archive.name);
 const zip=unzipSync(new Uint8Array(archiveBytes));
 const names=Object.keys(zip).filter(n=>/\.(pdf|webp)$/i.test(n));
 const byBase=(name:string)=>path.posix.basename(name).replace(/\.(?:pdf|webp)$/i,'');
 const pdfList=names.filter(n=>/\.pdf$/i.test(n)),webpList=names.filter(n=>/\.webp$/i.test(n));
 const pdfs=new Map(pdfList.map(n=>[byBase(n),n]));
 const webps=new Map(webpList.map(n=>[byBase(n),n]));
 if(names.length!==200||pdfList.length!==100||webpList.length!==100||pdfs.size!==100||webps.size!==100||pdfs.size!==webps.size||[...pdfs.keys()].some(k=>!webps.has(k))||[...webps.keys()].some(k=>!pdfs.has(k)))throw new Error('Exact PDF/WebP name pairing failed: '+archive.name);
 const pairs=[];let oversizePDFs=0;
 for(const [baseName,pdfName] of [...pdfs.entries()].sort(([a],[b])=>a.localeCompare(b))){
  const webpName=webps.get(baseName)!;const stem=pdfName.slice(0,pdfName.lastIndexOf('/'));const pdf=zip[pdfName],webp=zip[webpName];
  const pdfHash=hash(pdf),webpHash=hash(webp);
  allPdfHashes.add(pdfHash);allWebpHashes.add(webpHash);
  if(pdf.length>1_000_000)oversizePDFs++;
  const document=await PDFDocument.load(pdf,{ignoreEncryption:false});
  if(document.getPageCount()!==1)throw new Error('Source PDF is not a single page: '+archive.name+' '+pdfName);
  const page=document.getPage(0),pageSize=page.getSize();
  const a4=(Math.abs(pageSize.width-595.28)<5&&Math.abs(pageSize.height-841.89)<5)||(Math.abs(pageSize.width-841.89)<5&&Math.abs(pageSize.height-595.28)<5);
  if(!a4)throw new Error('Source PDF is not A4: '+archive.name+' '+pdfName+' '+JSON.stringify(pageSize));
  const image=sharp(webp,{limitInputPixels:25_000_000});
  const meta=await image.metadata();
  if(meta.format!=='webp'||!meta.width||!meta.height)throw new Error('Source WebP metadata is invalid: '+archive.name+' '+webpName);
  const decoded=await sharp(webp,{limitInputPixels:25_000_000}).flatten({background:'#fff'}).toColourspace('srgb').removeAlpha().raw().toBuffer({resolveWithObject:true});
  if(decoded.info.width!==meta.width||decoded.info.height!==meta.height||decoded.data.length<1000)throw new Error('Source WebP pixels did not decode: '+archive.name+' '+webpName);
  const base=path.posix.basename(pdfName).replace(/\.pdf$/i,''),seq=/(?:^|[-_])(\d{1,3})(?:[-_]|$)/.exec(base)?.[1];
  if(!seq)throw new Error('Source design sequence missing: '+archive.name+' '+webpName);
  const number=Number(seq);if(number<1||number>100)throw new Error('Source design number is out of the 100-item set: '+webpName);
  const designId=`${slug}__${String(number).padStart(3,'0')}`;
  const row={topic:slug,collection:slug,source_sequence:number,sequence:number,design_id:designId,content_id:`jc-${slug}-${String(number).padStart(3,'0')}`,slug:`${slug}-coloring-page-${String(number).padStart(3,'0')}`,archive_name:archive.name,source_zip_path:archivePath,source_zip_sha256:archiveHash,source_webp_path:webpName,source_webp_sha256:webpHash,original_webp_sha256:webpHash,source_sha256:webpHash,source_webp_bytes:webp.length,source_webp_width:meta.width,source_webp_height:meta.height,source_pdf_path:pdfName,source_pdf_sha256:pdfHash,original_pdf_sha256:pdfHash,source_pdf_bytes:pdf.length,pdf_page_count:1,pdf_a4:true};
  pairs.push(row);sourceRows.push(row);
 }
 if(pairs.length!==100||new Set(pairs.map(r=>r.design_id)).size!==100)throw new Error('Topic does not contain exactly 100 unique matched pairs: '+slug);
 audit.archive_count++;audit.design_count+=pairs.length;
 audit.topics.push({topic:slug,archive_name:archive.name,archive_sha256:archiveHash,design_count:pairs.length,pdf_count:pdfs.size,webp_count:webps.size,a4_single_page_pdf_count:pairs.length,decoded_webp_count:pairs.length,oversize_source_pdfs:oversizePDFs,unique_webp_hashes:new Set(pairs.map(r=>r.source_webp_sha256)).size,source_dimensions:[...new Set(pairs.map(r=>`${r.source_webp_width}x${r.source_webp_height}`))]});
 const topicFile=path.join(output,slug+'-source-pairs.json');
 await fs.writeFile(topicFile,JSON.stringify(pairs,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({topic:slug,pairs:pairs.length,a4PDFs:pairs.length,decodedWebPs:pairs.length,oversizePDFs}));
}
if(!onlyTopic&&(audit.archive_count!==25||audit.design_count!==2500))throw new Error('Full 25-topic exact intake required.');
audit.unique_webp_count=allWebpHashes.size;audit.unique_pdf_count=allPdfHashes.size;
if(audit.failed_pairs.length)audit.status='FAIL';
await fs.writeFile(path.join(output,'source-audit.json'),JSON.stringify(audit,null,2)+'\n',{mode:0o600});
await fs.writeFile(path.join(output,'original-source-inventory.json'),JSON.stringify(sourceRows,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({status:audit.status,topics:audit.archive_count,designs:audit.design_count,uniqueWebPs:audit.unique_webp_count,uniquePDFs:audit.unique_pdf_count,sourceAudit:path.join(output,'source-audit.json')}));
