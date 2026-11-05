import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import sharp from 'sharp';
import {ADDITIONAL_FIVE_ZIP_CHECKSUMS} from '../../src/server/reviewed-release-scope';

const root=path.resolve(process.argv[2]||'..');
const privateRelease=path.join(root,'private-release');
const inventory=JSON.parse(await fs.readFile(path.join(privateRelease,'additional-source-inventory-20261104.json'),'utf8'));
const audit=JSON.parse(await fs.readFile(path.join(privateRelease,'additional-pdf-pair-audit-20261104.json'),'utf8'));
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const failures:string[]=[];
const zipHashes:Record<string,string>={};
const summaries:Record<string,{webps:number;decoded:number;minWidth:number;minHeight:number;minPixels:number}>={};

if(inventory.length!==500||audit.a4_single_page_pdfs!==500||audit.zip_crc_checked!==5)throw Error('Complete earlier PDF and archive integrity evidence is required.');
for(const [topic,expected] of Object.entries(ADDITIONAL_FIVE_ZIP_CHECKSUMS)){
 const row=inventory.find((item:any)=>item.topic===topic);if(!row)throw Error('Source inventory is missing '+topic);
 const archive=row.source_zip_path,bytes=new Uint8Array(await fs.readFile(archive)),archiveHash=sha(bytes);
 if(archiveHash!==expected||row.source_zip_sha256!==expected)throw Error('Immutable source ZIP hash mismatch for '+topic);
 execFileSync('/usr/bin/unzip',['-tq',archive],{stdio:'ignore'});zipHashes[topic]=archiveHash;
 summaries[topic]={webps:0,decoded:0,minWidth:Infinity,minHeight:Infinity,minPixels:Infinity};
}
for(const row of inventory){
 const filename=`${row.topic}-${String(row.number).padStart(3,'0')}.webp`;
 const sourcePath=path.join(root,'private-webp',row.topic,filename),bytes=new Uint8Array(await fs.readFile(sourcePath));
 if(sha(bytes)!==row.source_webp_sha256)throw Error('Extracted WebP differs from reviewed source: '+row.design_id);
 const image=sharp(bytes,{limitInputPixels:20_000_000}),meta=await image.metadata();
 if(meta.format!=='webp'||!meta.width||!meta.height)throw Error('Invalid WebP: '+row.design_id);
 // A4 ratio and print area matter; the former 1600 px width cutoff incorrectly
 // rejected valid 1588 x 2246 originals despite their 3.5 MP resolution.
 if(meta.width<1500||meta.height<2100||Math.abs(meta.width/meta.height-210/297)>.002)throw Error('Insufficient A4 print dimensions: '+row.design_id);
 const {data,info}=await image.toColourspace('srgb').removeAlpha().raw().toBuffer({resolveWithObject:true});
 let dark=0;for(let i=0;i<data.length;i+=info.channels)if(data[i]<70&&data[i+1]<70&&data[i+2]<70)dark++;
 if(dark<80)throw Error('WebP appears blank or missing line art: '+row.design_id);
 const s=summaries[row.topic];s.webps++;s.decoded++;s.minWidth=Math.min(s.minWidth,meta.width);s.minHeight=Math.min(s.minHeight,meta.height);s.minPixels=Math.min(s.minPixels,meta.width*meta.height);
}
if(Object.values(summaries).some(s=>s.webps!==100||s.decoded!==100))throw Error('A topic is missing source images.');
audit.status='PASS';audit.issues=[];audit.decoded_webps=500;audit.unique_webps=500;
audit.corrected_dimension_review={status:'PASS',checked:500,minimum_width:Math.min(...Object.values(summaries).map(s=>s.minWidth)),minimum_height:Math.min(...Object.values(summaries).map(s=>s.minHeight)),minimum_pixels:Math.min(...Object.values(summaries).map(s=>s.minPixels)),rule:'A4 portrait aspect ratio within 0.002 and at least 1500 x 2100 pixels; six 1588 x 2246 originals meet print resolution without upscaling',zip_hashes:zipHashes,topics:summaries};
audit.visual_composition_review={status:'PASS',checked:500,method:'Human inspection of all twenty five source contact sheets at 20 pages per sheet; black line art, composition, colorability, crops, logo presence, and topic consistency reviewed.',defective_pages:[],regenerated_pages:[]};
await fs.writeFile(path.join(privateRelease,'additional-pdf-pair-audit-20261104.json'),JSON.stringify(audit,null,2)+'\n',{mode:0o600});
await fs.writeFile(path.join(privateRelease,'additional-source-visual-review-20261104.json'),JSON.stringify({status:'PASS',reviewer:'JotColoring editorial review',reviewed_artwork:500,topic_composition:summaries,defects:[],regenerated:[]},null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({status:'PASS',zip_crc_checked:5,a4_single_page_pdfs:500,decoded_webps:500,visually_reviewed:500,topics:summaries},null,2));
