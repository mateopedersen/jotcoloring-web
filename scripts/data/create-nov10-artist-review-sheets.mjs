import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {unzipSync} from 'fflate';

const work=path.resolve(process.argv[2]);
const topic=process.argv[3]||'all';
if(topic!=='all'&&!/^[a-z0-9-]+$/.test(topic))throw new Error('Supply one exact artist topic or all.');
const zipDir=path.join(work,'source-zips');
const out=path.join(work,'contact-sheets','detail-20');
await fs.mkdir(out,{recursive:true});
const archives=(await fs.readdir(zipDir)).filter(name=>name.toLowerCase().endsWith('.zip'));
const cellW=260,cellH=390,imgW=240,imgH=339,cols=5,rows=4;
const selected=topic==='all'?archives:archives.filter(name=>name.toLowerCase().includes(topic));
if(topic!=='all'&&selected.length!==1)throw new Error('Exact topic archive not found or ambiguous.');
for(const zipName of selected){
 const slug=zipName.toLowerCase().replace(/\.zip$/,'').replace(/^jotcoloring[-_]/,'').replace(/[-_]coloring[-_]pages$/,'').replace(/[-_]100[-_]pdf[-_]100[-_]webp$/,'').replace(/_/g,'-');
 const entries=unzipSync(new Uint8Array(await fs.readFile(path.join(zipDir,zipName))));
 const images=Object.entries(entries).filter(([name])=>/\.webp$/i.test(name)).sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true}));
 if(images.length!==100)throw new Error(`Expected 100 images in ${zipName}; found ${images.length}.`);
 const svg=index=>Buffer.from(`<svg width="${cellW}" height="42"><rect width="100%" height="100%" fill="white"/><text x="12" y="29" font-size="23" font-family="Arial" fill="black">${slug} · ${String(index+1).padStart(3,'0')}</text></svg>`);
 for(let start=0;start<100;start+=20){
 const layers=[];
 for(let j=0;j<20;j++){
  const index=start+j,[name,bytes]=images[index];
  const cellX=(j%cols)*cellW,cellY=Math.floor(j/cols)*cellH;
  const resized=await sharp(bytes).resize(imgW,imgH,{fit:'contain',background:'#ffffff'}).png().toBuffer();
  layers.push({input:svg(index),left:cellX,top:cellY});
  layers.push({input:resized,left:cellX+10,top:cellY+44});
 }
 const file=path.join(out,`${slug}-${String(start+1).padStart(3,'0')}-${String(start+20).padStart(3,'0')}.png`);
 await sharp({create:{width:cols*cellW,height:rows*cellH,channels:3,background:'#eeeeee'}}).composite(layers).png().toFile(file);
 console.log(file);
 }
}
