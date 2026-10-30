import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {STUDIO_PAGES,studioPageSvg} from '../../src/studio/library/catalog';
import {STUDIO_SUBJECTS} from '../../src/studio/library/subjects';
import {objectSvg} from '../../src/studio/objects';
const out='outputs/studio-v5';await mkdir(out,{recursive:true});
const failures:string[]=[],hashes=new Map<string,string>(),inks:number[]=[],start=Date.now();
for(let sheet=0;sheet<5;sheet++){
 const canvas=createCanvas(1000,1200),c=canvas.getContext('2d');c.fillStyle='#f7f5ef';c.fillRect(0,0,1000,1200);c.font='15px sans-serif';
 for(let i=0;i<25;i++){const s=STUDIO_SUBJECTS[sheet*25+i];if(!s)continue;const im=await loadImage(Buffer.from(objectSvg(s)));const x=i%5*200,y=Math.floor(i/5)*240;c.drawImage(im,x+13,y+5,174,194);c.fillStyle='#111';c.fillText(s.title.slice(0,25),x+12,y+223);}
 await writeFile(`${out}/subjects-${sheet+1}.png`,canvas.toBuffer('image/png'));
}
for(let i=0;i<STUDIO_PAGES.length;i++){
 const page=STUDIO_PAGES[i],svg=studioPageSvg(page,{width:128,height:176});
 if(/<script|foreignObject|javascript:|NaN|Infinity|undefined/.test(svg))failures.push(page.id+': unsafe SVG');
 try{const image=await loadImage(Buffer.from(svg)),canvas=createCanvas(128,176),c=canvas.getContext('2d');c.drawImage(image,0,0);const pixels=c.getImageData(0,0,128,176).data;let ink=0;for(let p=0;p<pixels.length;p+=4){if(pixels[p]<180)ink++;if(pixels[p]!==pixels[p+1]||pixels[p]!==pixels[p+2]){failures.push(page.id+': colored source');break;}}inks.push(ink);if(ink<100||ink>128*176*.8)failures.push(page.id+': ink ratio '+ink);const hash=createHash('sha256').update(pixels).digest('hex');if(hashes.has(hash))failures.push(page.id+': duplicate of '+hashes.get(hash));else hashes.set(hash,page.id);
 }catch(e){failures.push(page.id+': '+String(e));}
 if((i+1)%1000===0)console.log(`Checked ${i+1} / ${STUDIO_PAGES.length}`);
}
const report={pages:STUDIO_PAGES.length,subjects:STUDIO_SUBJECTS.length,uniqueRasterImages:hashes.size,inkRange:[Math.min(...inks),Math.max(...inks)],failures,seconds:(Date.now()-start)/1000};
await writeFile(`${out}/catalog-audit.json`,JSON.stringify(report,null,2));console.log(report);if(failures.length)process.exitCode=1;
