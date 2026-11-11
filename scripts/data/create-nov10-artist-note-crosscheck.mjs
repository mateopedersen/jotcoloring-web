import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {unzipSync} from 'fflate';

const work=path.resolve(process.argv[2]);
const selected=process.argv[3]||'all';
const sourceDir=path.join(work,'source-zips');
const reviewDir=path.join(work,'private-review');
const output=path.join(work,'contact-sheets','note-crosscheck-20');
await fs.mkdir(output,{recursive:true,mode:0o700});
const archives=(await fs.readdir(sourceDir)).filter(name=>name.toLowerCase().endsWith('.zip')).sort();
const cellW=260,cellH=495,imgW=240,imgH=339,cols=5,rows=4;
const topics=[];
for(const archive of archives){
 const topic=archive.toLowerCase().replace(/\.zip$/,'').replace(/^jotcoloring[-_]/,'').replace(/[-_]coloring[-_]pages$/,'').replace(/[-_]100[-_]pdf[-_]100[-_]webp$/,'').replace(/_/g,'-');
 if(selected!=='all'&&topic!==selected)continue;
 const bytes=new Uint8Array(await fs.readFile(path.join(sourceDir,archive)));
 const zip=unzipSync(bytes),images=Object.entries(zip).filter(([name])=>/\.webp$/i.test(name)).map(([name,data])=>{
  const match=name.match(/(?:^|[-_])(\d{1,3})(?:[-_])/);
  if(!match)throw new Error('Source sequence is missing from image member: '+name);
  return {name,data,sequence:Number(match[1])};
 }).sort((a,b)=>a.sequence-b.sequence);
 const notes=JSON.parse(await fs.readFile(path.join(reviewDir,topic+'-scene-notes.json'),'utf8'));
 if(images.length!==100||notes.length!==100)throw new Error('Missing exact source artwork or note count: '+topic);
 for(let start=0;start<100;start+=20){
  const layers=[];
  for(let j=0;j<20;j++){
   const index=start+j,{name:filename,data:imageBytes,sequence}=images[index];
   if(sequence!==index+1)throw new Error('Source sequence is missing or duplicated: '+topic+' '+sequence);
   const resized=await sharp(imageBytes).resize(imgW,imgH,{fit:'contain',background:'#fff'}).png().toBuffer();
   const escaped=notes[sequence-1].replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
   const words=escaped.split(/\s+/),lines=[];let line='';
   for(const word of words){const candidate=line?line+' '+word:word;if(candidate.length>35&&line){lines.push(line);line=word;}else line=candidate;}
   if(line)lines.push(line);if(lines.length>6)throw new Error('Observation is too long for sheet: '+topic+' '+sequence);
   const x=(j%cols)*cellW,y=Math.floor(j/cols)*cellH;
   const label=Buffer.from(`<svg width="${cellW}" height="42"><rect width="100%" height="100%" fill="white"/><text x="10" y="28" font-size="21" font-family="Arial" fill="#222">${topic} · ${String(sequence).padStart(3,'0')}</text></svg>`);
   const caption=Buffer.from(`<svg width="${cellW-12}" height="108"><rect width="100%" height="100%" fill="#fff"/>${lines.map((text,i)=>`<text x="4" y="${17+i*17}" font-size="13" font-family="Arial" fill="#111">${text}</text>`).join('')}</svg>`);
   layers.push({input:label,left:x,top:y});layers.push({input:resized,left:x+10,top:y+43});layers.push({input:caption,left:x+6,top:y+382});
  }
  const file=path.join(output,`${topic}-${String(start+1).padStart(3,'0')}-${String(start+20).padStart(3,'0')}.png`);
  await sharp({create:{width:cols*cellW,height:rows*cellH,channels:3,background:'#eee'}}).composite(layers).png({compressionLevel:9}).toFile(file);
  topics.push({topic,file});
 }
 console.log(JSON.stringify({topic,sheets:5}));
}
console.log(JSON.stringify({status:'PASS',selected,topics:topics.length?new Set(topics.map(row=>row.topic)).size:0,sheets:topics.length,output}));
