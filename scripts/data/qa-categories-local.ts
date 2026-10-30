import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const origin='http://localhost:4322',out=path.resolve('outputs/category-audit'),items=(await(await fetch(origin+'/api/catalog?limit=48')).json()).items;
await fs.mkdir(out,{recursive:true});const jobs=[],thumbs=[];
for(const [i,item] of items.entries()){const response=await fetch(new URL(item.lineArtUrl,origin));if(!response.ok)throw new Error('Missing local image');const bytes=Buffer.from(await response.arrayBuffer()),file=path.join(out,item.id+'.webp');await fs.writeFile(file,bytes);jobs.push({id:item.id,file,sha256:createHash('sha256').update(bytes).digest('hex'),branded:true});const image=await sharp(bytes).resize(180,240,{fit:'contain',background:'#fff'}).png().toBuffer();thumbs.push({input:image,left:i%6*190,top:Math.floor(i/6)*270});const label=Buffer.from(`<svg width="180" height="24"><text x="2" y="18" font-size="11">${i+1}. ${item.slug}</text></svg>`);thumbs.push({input:label,left:i%6*190,top:Math.floor(i/6)*270+243});}
await sharp({create:{width:1140,height:Math.ceil(items.length/6)*270,channels:3,background:'#eee'}}).composite(thumbs).png().toFile(path.join(out,'contact-sheet.png'));
await fs.writeFile(path.join(out,'jobs.jsonl'),jobs.map(j=>JSON.stringify(j)).join('\n')+'\n');await fs.writeFile(path.join(out,'catalog.json'),JSON.stringify(items,null,2));console.log({files:jobs.length,out});
