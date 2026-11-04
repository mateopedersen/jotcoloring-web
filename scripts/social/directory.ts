/** The catalog entrance has its own multi-theme cover, separate from the homepage. */
import sharp from 'sharp';
import {createCanvas,convertSVGTextToPath} from '@napi-rs/canvas';
import {createHash} from 'node:crypto';
import {stampPNG} from '../../src/social/png';
import {OG_VERSION,type SocialSpec} from '../../src/social/model';
import type {RenderAssets} from './render';

const xml=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const themes:Record<string,string>={'woodland-friends':'Animals','butterfly-garden':'Flowers','friendly-dragon':'Fantasy','botanical-mandala':'Mandalas','space-explorer':'Space','ocean-adventure':'Ocean','camper-adventure':'Vehicles','dinosaur-valley':'Dinosaurs','sweet-treats':'Food'};
export async function renderDirectory(spec:SocialSpec,assets:RenderAssets,binding:{version:string;key:string;path:string}){
 const selected=spec.art.map(slug=>assets.art.find(art=>art.slug===slug));
 if(selected.length!==9||selected.some(art=>!art))throw new Error('The directory cover requires its nine approved source drawings.');
 const art=selected as RenderAssets['art'],boxes:Array<{text:string;x:number;y:number;width:number;height:number;size:number}>=[],context=createCanvas(4,4).getContext('2d');
 const text=(value:string,x:number,y:number,size:number,fill='#261a15',weight=800)=>{context.font=`${weight} ${size}px ${weight===800?'JotExtra':'JotMedium'}`;boxes.push({text:value,x,y:y-size,width:context.measureText(value).width,height:size*1.25,size});return `<text x="${x}" y="${y}" font-family="${weight===800?'JotExtra':'JotMedium'}" font-weight="${weight}" font-size="${size}" fill="${fill}">${xml(value)}</text>`;};
 const uri=async(bytes:Uint8Array)=>'data:image/png;base64,'+(await sharp(bytes).png().toBuffer()).toString('base64');
 const logo=await uri(assets.logo),tiles=await Promise.all(art.map(async(item,index)=>{
  // Contain the full page. The promotional split uses only its accepted color companion.
  const line=await sharp(item.line).resize(154,140,{fit:'contain',background:'#ffffff'}).png().toBuffer();
  const colored=item.color?await sharp(item.color).resize(154,140,{fit:'contain',background:'#ffffff'}).extract({left:0,top:0,width:77,height:140}).png().toBuffer():undefined;
  const picture=await uri(colored?await sharp(line).composite([{input:colored,left:0,top:0}]).png().toBuffer():line);
  const x=590+(index%3)*196,y=32+Math.floor(index/3)*181;
  return `<g><rect x="${x}" y="${y+5}" width="184" height="168" rx="17" fill="#e5c9ad"/><rect x="${x}" y="${y}" width="184" height="168" rx="17" fill="#fff" stroke="#e3cbb5"/><image href="${picture}" x="${x+15}" y="${y+6}" width="154" height="140"/>${text(themes[item.slug],x+16,y+157,14,'#693a22',550)}</g>`;
 }));
 const chips=spec.badges;let chipX=48;
 const badges=chips.map(label=>{context.font='550 16px JotMedium';const w=context.measureText(label).width+32,part=`<rect x="${chipX}" y="518" width="${w}" height="42" rx="13" fill="#fff" stroke="#dfb58d"/>${text(label,chipX+16,545,16,'#8e3615',550)}`;chipX+=w+10;return part;}).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#fffdf8"/><stop offset="1" stop-color="#ffe6c9"/></linearGradient><linearGradient id="edge" x2="0" y2="1"><stop stop-color="#ff8d29"/><stop offset="1" stop-color="#d6440a"/></linearGradient></defs><rect width="1200" height="630" fill="url(#bg)"/><rect width="12" height="630" fill="url(#edge)"/><circle cx="1120" cy="20" r="330" fill="#ffd4a7" opacity=".4"/><image href="${logo}" x="43" y="26" width="340" height="112" preserveAspectRatio="xMinYMid meet"/>${text(spec.label,48,180,13,'#9c431e',550)}${text(spec.key==='all-pages'?'All':'Free',43,266,78)}${text('Coloring',43,348,78)}${text('Pages',43,430,78,'#db4d0b')}${text(spec.key==='all-pages'?'Every drawing. Ready for your colors.':'Explore a collection. Find your page.',48,477,21,'#583a28',550)}${badges}${tiles.join('')}<path d="M48 591H1156" stroke="#dbba98"/>${text('jotcoloring.com'+spec.paths[0].replace(/\/$/,''),48,616,15,'#7e421f',550)}${text('PRINT IT. COLOR IT. MAKE IT YOURS.',848,616,12,'#7e421f',550)}</svg>`;
 for(const box of boxes)if(box.x<20||box.x+box.width>1180||box.y<15||box.y+box.height>629)throw new Error('Directory cover text escaped the safe area: '+box.text);
 const outlined=svg.replace(/<text\b[^>]*>[\s\S]*?<\/text>/g,node=>String(convertSVGTextToPath(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">${node}</svg>`)).replace(/^[\s\S]*?<svg[^>]*>/,'').replace(/<\/svg>\s*$/,''));
 const sources=art.map(item=>({slug:item.slug,sha256:item.sourceSHA256})),png=await sharp(Buffer.from(outlined)).png({compressionLevel:9,palette:true,colours:256,dither:0,effort:10}).toBuffer(),bytes=Buffer.from(stampPNG(png,{...binding,sources}));
 if(bytes.length>1_000_000)throw new Error('Directory cover exceeds the social image budget.');
 return{bytes,alt:'JotColoring Free Coloring Pages collection cover with nine real drawings: woodland animals, butterfly and flowers, dragon, floral mandala, astronaut, sea turtle, camper van, dinosaurs, and strawberry cupcakes. Each page compares colorful inspiration with its original outline.',report:{version:OG_VERSION,key:spec.key,kind:spec.kind,width:1200,height:630,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),headlineTruncated:false,descriptionTruncated:false,textBoxes:boxes,sources,screenshotSHA256:null}};
}
