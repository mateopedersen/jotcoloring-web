/** Node-only rendering for OG covers and icon regression tests. */
import fs from 'node:fs/promises';
import {ICON_SPRITE,illustrationName} from './registry';
import catalog from './catalog.json';
export async function iconDocument(name:string,size=128){
 const source=await fs.readFile('public'+ICON_SPRITE,'utf8');
 const scene=catalog.scenes.find(item=>item.id===name);
 const id=scene?scene.id:illustrationName(name),viewBox=scene?.viewBox||catalog.viewBox;
 const [, ,w,h]=viewBox.split(' ').map(Number);
 const inner=source.replace(/^\s*<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size*h/w}" viewBox="${viewBox}" fill="none">${inner}<use href="#${id}"/></svg>`;
}
