/** Render five representative prepared print PDFs for the final visual gate. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

const repo=process.cwd(),intake=path.resolve(repo,'../incoming-2026-11-07/private-release');
const rows=JSON.parse(await fs.readFile(path.join(intake,'editorial-candidates-november-07-five-topics-reviewed.json'),'utf8')) as any[];
const picks=[['rhino',1],['gymnastics',1],['rescue-bots',1],['pusheen',1],['puppy',5]] as const;
const output=path.join(intake,'november-07-five-topic-pdf-renders');await fs.mkdir(output,{recursive:true,mode:0o700});
const audit:any[]=[];
for(const [sourceTopic,number] of picks){
 const id=sourceTopic==='puppy'?`dogs__puppy-${String(number).padStart(3,'0')}`:`${sourceTopic}__${String(number).padStart(3,'0')}`;
 const row=rows.find(item=>item.design_id===id);if(!row)throw new Error('Missing representative source row '+id);
 const files=JSON.parse(await fs.readFile(path.join(row.preparation_folder,'files.json'),'utf8'));
 const pdf=files.printable_pdf_a4_bw;if(!pdf)throw new Error('Missing prepared printable PDF '+id);
 const prefix=path.join(output,`${sourceTopic}-${String(number).padStart(3,'0')}`);
 execFileSync('pdftoppm',['-f','1','-l','1','-scale-to','700','-png',pdf,prefix],{stdio:'ignore'});
 const render=prefix+'-1.png',bytes=new Uint8Array(await fs.readFile(render)),metadata=await sharp(bytes).metadata();
 if(!metadata.width||metadata.width<490||metadata.width>500||metadata.height!==700)throw new Error(`Unexpected representative PDF render dimensions ${id}: ${metadata.width}x${metadata.height}`);
 audit.push({design_id:id,title:row.title,pdf_sha256:createHash('sha256').update(await fs.readFile(pdf)).digest('hex'),render_path:render,render_sha256:createHash('sha256').update(bytes).digest('hex'),width:metadata.width,height:metadata.height});
}
const tiles=await Promise.all(audit.map(async(item,index)=>({input:await sharp(item.render_path).resize(280,395,{fit:'contain',background:'#fff'}).png().toBuffer(),left:index*300+10,top:10})));
const contact=path.join(intake,'november-07-five-topic-pdf-renders-contact-sheet.png');
await sharp({create:{width:1500,height:415,channels:3,background:'#ece7df'}}).composite(tiles).png().toFile(contact);
await fs.writeFile(path.join(intake,'november-07-five-topic-pdf-render-audit.json'),JSON.stringify({status:'rendered_pending_visual_review',samples:audit,contact_sheet:contact},null,2)+'\n');
console.log(JSON.stringify({status:'rendered_pending_visual_review',samples:audit.length,contact_sheet:contact}));
