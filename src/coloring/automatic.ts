/** Deterministic color suggestions for an existing outline. No drawing or remote inference.
 * Label enclosed paper regions, close one-pixel contour gaps in the segmentation
 * mask only, then multiply color beneath the original ink. Work is O(pixels).
 */
export const AUTOMATIC_COLOR_VERSION='outline-colors-v1';
export interface ColorContext {title?:string;description?:string;tags?:string[];category_ids?:string[];seed?:string;artBottom?:number}
type RGB=readonly[number,number,number];
type Theme='garden'|'woodland'|'ocean'|'food'|'space'|'winter'|'vehicles'|'fantasy'|'patterns'|'general';
const schemes:Record<Theme,readonly RGB[]>={
 garden:[[87,155,66],[139,187,73],[239,100,144],[249,189,50],[164,115,199],[247,137,70]],
 woodland:[[219,132,59],[163,111,73],[236,199,139],[86,151,68],[142,184,75],[220,110,149]],
 ocean:[[52,169,190],[95,198,205],[242,164,65],[238,120,119],[143,123,188],[125,175,80]],
 food:[[237,91,108],[247,184,68],[248,151,95],[250,202,143],[113,172,73],[185,115,159]],
 space:[[111,117,199],[82,173,202],[245,186,68],[219,124,160],[151,123,196],[235,139,72]],
 winter:[[94,175,194],[228,88,91],[63,139,103],[247,189,74],[149,125,182],[235,150,99]],
 vehicles:[[52,161,178],[239,153,66],[222,100,88],[131,175,112],[111,143,185],[191,156,121]],
 fantasy:[[161,113,199],[80,179,168],[244,183,67],[225,119,159],[120,168,88],[231,146,82]],
 patterns:[[49,159,160],[237,153,68],[207,106,153],[132,125,190],[149,181,94],[244,193,87]],
 general:[[80,165,171],[239,160,67],[207,113,151],[135,137,192],[125,175,93],[238,194,100]]
};
/** Reviewed subject words choose a palette, not a claim that each part is recognized. */
export function automaticColorTheme(context:ColorContext):Theme{
 const subject=(context.title||'').toLowerCase(),all=[subject,context.description,...context.tags||[],...context.category_ids||[]].join(' ').toLowerCase();
 const has=(s:string)=>new RegExp('\\b('+s+')\\b').test(all);
 if(/mandala|pattern|geometric/.test(subject))return'patterns';
 if(has('snowman|snowmen|winter|christmas|snowflake'))return'winter';
 if(has('cupcake|cake|strawberry|strawberries|food|dessert|fruit|candy'))return'food';
 if(has('ocean|underwater|coral|turtle|fish|dolphin|whale|seahorse'))return'ocean';
 if(has('rocket|astronaut|planet|galaxy|space'))return'space';
 if(has('car|truck|camper|bus|vehicle|train|airplane'))return'vehicles';
 if(has('dragon|unicorn|fairy|fantasy'))return'fantasy';
 if(has('fox|rabbit|owl|cat|dog|animal|animals|woodland|pets|farm'))return'woodland';
 if(has('flower|flowers|garden|butterfly|hibiscus|rose|roses|nature|leaves'))return'garden';
 if(has('mandala|patterns|geometric'))return'patterns';return'general';
}
interface Region {area:number;x:number;y:number;left:number;right:number;top:number;bottom:number;edge:boolean;color?:RGB}
export function automaticColorPixels(raw:Uint8Array|Uint8ClampedArray,width:number,height:number,context:ColorContext={}){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<16||height<16||width*height>2_000_000||raw.length!==width*height*4)throw new Error('Automatic colors require a decoded RGBA preview of at most 2 megapixels.');
 const bottom=context.artBottom??height;if(!Number.isSafeInteger(bottom)||bottom<1||bottom>height)throw new Error('Invalid artwork boundary.');
 const n=width*bottom,mask=new Uint8Array(n),dilated=new Uint8Array(n),labels=new Int32Array(n),queue=new Int32Array(n),distance=new Uint16Array(n),pixels=new Uint8Array(raw);
 // Transparent paper and colored footer/credits are not candidate paint regions.
 for(let i=0;i<n;i++){const p=i*4;mask[i]=Number(raw[p+3]<240||Math.min(raw[p],raw[p+1],raw[p+2])<206||Math.max(raw[p],raw[p+1],raw[p+2])-Math.min(raw[p],raw[p+1],raw[p+2])>12);}
 // A 3x3 morphological closing repairs tiny mask gaps without altering the source.
 for(let y=0;y<bottom;y++)for(let x=0;x<width;x++){const p=y*width+x;let ink=0;for(let dy=-1;dy<=1&&!ink;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<width&&ny>=0&&ny<bottom&&mask[ny*width+nx]){ink=1;break;}}dilated[p]=ink;}
 for(let y=1;y<bottom-1;y++)for(let x=1;x<width-1;x++){const p=y*width+x;let ink=1;for(let dy=-1;dy<=1&&ink;dy++)for(let dx=-1;dx<=1;dx++)if(!dilated[p+dy*width+dx]){ink=0;break;}mask[p]=ink;}
 const regions:Region[]=[{area:0,x:0,y:0,left:0,right:0,top:0,bottom:0,edge:true}];
 for(let start=0;start<n;start++){
  if(mask[start]||labels[start])continue;const id=regions.length;let head=0,tail=1;queue[0]=start;labels[start]=id;
  const r:Region={area:0,x:0,y:0,left:width,right:0,top:bottom,bottom:0,edge:false};
  while(head<tail){const p=queue[head++],x=p%width,y=Math.floor(p/width);r.area++;r.x+=x;r.y+=y;r.left=Math.min(r.left,x);r.right=Math.max(r.right,x);r.top=Math.min(r.top,y);r.bottom=Math.max(r.bottom,y);if(x===0||x===width-1||y===0||y===bottom-1)r.edge=true;
   // Inline neighbors avoid allocating an array for every pixel.
   const visit=(q:number)=>{if(!mask[q]&&!labels[q]){labels[q]=id;queue[tail++]=q;}};
   if(x)visit(p-1);if(x+1<width)visit(p+1);if(y)visit(p-width);if(y+1<bottom)visit(p+width);
  }r.x/=r.area;r.y/=r.area;regions.push(r);
 }
 const theme=automaticColorTheme(context),palette=schemes[theme],minArea=Math.max(3,Math.round(n/400000));let seed=2166136261;
 for(const c of context.seed||context.title||theme)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
 let coloredRegions=0,filledPixels=0;
 for(let id=1;id<regions.length;id++){
  const r=regions[id];if(r.edge||r.area<minArea)continue;
  const nx=r.x/width,ny=r.y/bottom,rw=r.right-r.left+1,rh=r.bottom-r.top+1,aspect=Math.max(rw/rh,rh/rw),compact=r.area/(rw*rh),rad=Math.hypot(nx-.5,(ny-.5)*1.1);
  let index=(Math.floor(nx*5)+Math.floor(ny*7)+(seed%palette.length))%palette.length;
  if(theme==='patterns')index=Math.floor(rad*18)%palette.length;
  else if(theme==='garden'){index=aspect>1.9||compact<.38?Math.floor(nx*4+ny*3)%2:2+(Math.floor(nx*4)+Math.floor(ny*4))%4;}
  else if(theme==='woodland'){index=(nx>.23&&nx<.77&&ny>.22&&ny<.84&&r.area>n*.0018)?Math.floor(ny*4)%3:3+(Math.floor(nx*5)+Math.floor(ny*3))%3;}
  else if(theme==='food'){index=aspect>2.4||compact<.3?4:ny<.48?0:1+Math.floor(ny*7)%3;}
  else if(theme==='winter'){if(r.area>n*.025&&nx>.25&&nx<.75)r.color=[232,243,246];else index=(Math.floor(nx*5)+Math.floor(ny*5))%5;}
  else if(theme==='ocean'){index=r.area>n*.14?0:(Math.floor(nx*5)+Math.floor(ny*4))%palette.length;}
  else if(theme==='vehicles'){if(ny>.62&&r.area>n*.001&&r.area<n*.03&&rw/rh>.65&&rw/rh<1.5)r.color=[109,124,132];else index=r.area>n*.015?0:index;}
  if(!r.color)r.color=palette[index];
  // An enclosed frame can contain a very large background; keep it light.
  if(r.area>n*.26)r.color=r.color.map(v=>Math.round(v*.24+255*.76)) as unknown as RGB;
  coloredRegions++;filledPixels+=r.area;
 }
 // Nearest-region color reaches antialiased edges without widening black lines.
 for(let y=0;y<bottom;y++)for(let x=0;x<width;x++){const p=y*width+x;if(!labels[p]&&raw[p*4]>42&&raw[p*4+3]>=240){let chosen=0;for(const q of [x?p-1:-1,x+1<width?p+1:-1,y?p-width:-1,y+1<bottom?p+width:-1])if(q>=0&&labels[q]>0&&regions[labels[q]].color){chosen=labels[q];break;}if(chosen)labels[p]=-chosen;}}
 for(let p=0;p<n;p++)if(labels[p]>0&&regions[labels[p]].color)distance[p]=60000;
 for(let y=0;y<bottom;y++)for(let x=0;x<width;x++){const p=y*width+x;if(!distance[p])continue;distance[p]=Math.min(distance[p],x?distance[p-1]+1:0,y?distance[p-width]+1:0);}
 for(let y=bottom-1;y>=0;y--)for(let x=width-1;x>=0;x--){const p=y*width+x;if(!distance[p])continue;distance[p]=Math.min(distance[p],x+1<width?distance[p+1]+1:0,y+1<bottom?distance[p+width]+1:0);}
 for(let p=0;p<n;p++){
  const id=Math.abs(labels[p]),r=regions[id];if(!r?.color)continue;const k=p*4;if(raw[k+3]<240||Math.min(raw[k],raw[k+1],raw[k+2])<=42)continue;
  const x=p%width,y=Math.floor(p/width),span=Math.max(5,Math.sqrt(r.area)*.24),edge=Math.min(1,distance[p]/span),light=.93+.1*edge+.025*(1-(y-r.top)/Math.max(1,r.bottom-r.top))-.018*(x-r.left)/Math.max(1,r.right-r.left);
  for(let c=0;c<3;c++)pixels[k+c]=Math.round(Math.min(255,r.color[c]*light)*raw[k+c]/255);
 }
 return{pixels,theme,coloredRegions,filledPixels,coverage:filledPixels/n,version:AUTOMATIC_COLOR_VERSION};
}
