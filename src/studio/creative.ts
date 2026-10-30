import {hexToHsv,hsvToHex,type Point,type Symmetry,type Project,type PaintEffect} from './model';

export const PALETTES = [
  {name:'Garden party',colors:['#df5e84','#f9b853','#efdc9a','#649c64','#305e48','#9f78b6']},
  {name:'Woodland',colors:['#c8753e','#e8bd7a','#88a66d','#35654b','#6e4d3b','#d4c5a1']},
  {name:'Ocean glass',colors:['#173f60','#237e9c','#47b7ba','#99d8cf','#f3d399','#eb8c68']},
  {name:'Candy shop',colors:['#ed6689','#fdacb9','#f5c951','#85c5a8','#88b8e3','#b8a0d2']},
  {name:'Sunset',colors:['#f6d17a','#ed985b','#db674c','#ad4d6f','#705287','#343b6c']},
  {name:'Earth & clay',colors:['#b56340','#d08a64','#d9b795','#94a47b','#546b55','#4e4037']},
  {name:'Winter lights',colors:['#b84745','#d7b15f','#326a56','#92b5ac','#6887a8','#dedde9']},
  {name:'Bold basics',colors:['#ed334b','#ff8b34','#f8cf37','#4ba866','#367bc1','#9454ae']},
] as const;
export function harmonies(color:string,mode='analogous'){
  const [h,s,v]=hexToHsv(color),offsets=mode==='complementary'?[0,180,165,195]:mode==='triadic'?[0,120,240]:mode==='monochrome'?[0,0,0,0,0]:[-40,-20,0,20,40];
  return offsets.map((offset,i)=>hsvToHex((h+offset+360)%360,mode==='monochrome'?Math.max(.15,s-i*.13):s,mode==='monochrome'?Math.max(.2,v-i*.13):v));
}
export function symmetryPoints(point:Point,mode:Symmetry='none',width:number,height:number):Point[]{
  if(mode==='horizontal')return [point,{...point,x:width-point.x}];
  if(mode==='vertical')return [point,{...point,y:height-point.y}];
  if(mode==='both')return [point,{...point,x:width-point.x},{...point,y:height-point.y},{...point,x:width-point.x,y:height-point.y}];
  const count=mode==='radial-4'?4:mode==='radial-8'?8:mode==='radial-12'?12:mode==='radial-16'?16:1;
  return Array.from({length:count},(_,i)=>{const a=i*2*Math.PI/count,x=point.x-width/2,y=point.y-height/2;return {...point,x:width/2+x*Math.cos(a)-y*Math.sin(a),y:height/2+x*Math.sin(a)+y*Math.cos(a)};});
}
export function smoothPoint(last:Point,next:Point,amount:number):Point{const t=1-Math.min(.9,Math.max(0,amount));return {...next,x:last.x+(next.x-last.x)*t,y:last.y+(next.y-last.y)*t};}
export function boundsOfSpans(spans:number[]){let x=Infinity,y=Infinity,right=-Infinity,bottom=-Infinity;for(let i=0;i<spans.length;i+=3){x=Math.min(x,spans[i+1]);y=Math.min(y,spans[i]);right=Math.max(right,spans[i+2]);bottom=Math.max(bottom,spans[i]);}return Number.isFinite(x)?{x,y,width:right-x+1,height:bottom-y+1}:{x:0,y:0,width:1,height:1};}
export function replacePaintColor(project:Project,from:string,to:string,scope:'layer'|'all'){
  let count=0;for(const l of project.layers){if(l.locked||scope==='layer'&&l.id!==project.activeLayer)continue;for(const op of l.operations){if(op.color.toLowerCase()===from.toLowerCase()){op.color=to;count++;}if('effect' in op&&op.effect?.secondary.toLowerCase()===from.toLowerCase()){op.effect.secondary=to;count++;}}}
  if(scope==='all'){for(const t of project.texts)if(t.color.toLowerCase()===from.toLowerCase()){t.color=to;count++;}for(const o of project.objects)for(const k of Object.keys(o.colors))if(o.colors[k].toLowerCase()===from.toLowerCase()){o.colors[k]=to;count++;}}
  return count;
}
export function extractPalette(pixels:Uint8ClampedArray,limit=8){const bins=new Map<string,{r:number;g:number;b:number;n:number}>();for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]<100)continue;const[r,g,b]=[pixels[i],pixels[i+1],pixels[i+2]];if(Math.min(r,g,b)>242||Math.max(r,g,b)<12)continue;const key=[r,g,b].map(v=>Math.round(v/32)).join(',');const bin=bins.get(key)||{r:0,g:0,b:0,n:0};bin.r+=r;bin.g+=g;bin.b+=b;bin.n++;bins.set(key,bin);}return [...bins.values()].sort((a,b)=>b.n-a.n).slice(0,limit).map(v=>'#'+[v.r,v.g,v.b].map(n=>Math.round(n/v.n).toString(16).padStart(2,'0')).join(''));}
export function paintStyle(c:CanvasRenderingContext2D,color:string,effect:PaintEffect|undefined,b:{x:number;y:number;width:number;height:number}):string|CanvasGradient|CanvasPattern{
  if(!effect||effect.type==='solid')return color;
  if(effect.type==='linear'){const a=effect.angle*Math.PI/180,cx=b.x+b.width/2,cy=b.y+b.height/2,r=(Math.abs(b.width*Math.cos(a))+Math.abs(b.height*Math.sin(a)))/2;const g=c.createLinearGradient(cx-Math.cos(a)*r,cy-Math.sin(a)*r,cx+Math.cos(a)*r,cy+Math.sin(a)*r);g.addColorStop(0,color);g.addColorStop(1,effect.secondary);return g;}
  if(effect.type==='radial'){const g=c.createRadialGradient(b.x+b.width/2,b.y+b.height/2,0,b.x+b.width/2,b.y+b.height/2,Math.max(b.width,b.height)/2);g.addColorStop(0,color);g.addColorStop(1,effect.secondary);return g;}
  const tile=document.createElement('canvas'),s=Math.max(6,Math.min(120,effect.spacing));tile.width=tile.height=s;const t=tile.getContext('2d')!;t.fillStyle=effect.secondary;t.fillRect(0,0,s,s);t.fillStyle=color;
  if(effect.type==='dots'){t.beginPath();t.arc(s/2,s/2,s/5,0,Math.PI*2);t.fill();}
  else if(effect.type==='weave'){t.fillRect(0,0,s/3,s);t.fillRect(0,s/3,s,s/3);t.globalAlpha=.35;t.fillStyle=effect.secondary;t.fillRect(0,s/3,s/3,s/3);}
  else if(effect.type==='bricks'){t.strokeStyle=color;t.lineWidth=Math.max(1,s/14);t.strokeRect(0,0,s,s/2);t.beginPath();t.moveTo(s/2,s/2);t.lineTo(s/2,s);t.stroke();}
  else if(effect.type==='scales'){t.strokeStyle=color;t.lineWidth=Math.max(1,s/12);for(const [x,y] of [[0,0],[s,0],[s/2,s/2]]){t.beginPath();t.arc(x,y,s/2,0,Math.PI);t.stroke();}}
  else if(effect.type==='checks'){t.fillRect(0,0,s/2,s/2);t.fillRect(s/2,s/2,s/2,s/2);}
  else{t.strokeStyle=color;t.lineWidth=s/3;for(let i=-1;i<2;i++){t.beginPath();t.moveTo(i*s,0);t.lineTo((i+1)*s,s);t.stroke();}}
  return c.createPattern(tile,'repeat')||color;
}
