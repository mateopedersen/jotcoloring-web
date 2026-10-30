import fs from 'node:fs/promises';
import sharp from 'sharp';
import catalog from '../../src/icons/catalog.json';
import {iconDocument} from '../../src/icons/render';
import {ROOT_CATEGORIES} from '../../src/taxonomy/catalog';
await fs.mkdir('outputs/icons-local',{recursive:true});
const sets={categories:ROOT_CATEGORIES.map(c=>c.icon),subjects:['woodland','pets','farm-animals','birds','ocean-life','foxes','cats','dogs','butterflies','dragons','owls','sea-turtles','gardens','snowmen','insects','jungle-animals','safari-animals','reptiles','polar-animals'],footer:catalog.icons.filter(i=>i.id.startsWith('nav-')).map(i=>i.id)};
for(const [name,ids] of Object.entries(sets)){const tiles=[];for(const [i,id] of ids.entries()){const svg=await iconDocument(id,148),image=await sharp(Buffer.from(svg)).png().toBuffer();tiles.push({input:image,left:i%5*200+26,top:Math.floor(i/5)*205+10});const label=Buffer.from(`<svg width="196" height="34"><text x="98" y="20" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#171717">${id}</text></svg>`);tiles.push({input:label,left:i%5*200,top:Math.floor(i/5)*205+164});}await sharp({create:{width:1000,height:Math.ceil(ids.length/5)*205,channels:3,background:'#fffaf4'}}).composite(tiles).png().toFile('outputs/icons-local/'+name+'.png');}
