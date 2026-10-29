import {brandFooterLayout} from '../server/branding';
export const COLOR_PALETTES=[
 {id:'original',name:'Original colors',description:'A scene-matched coloring reference. The swatches come from the actual picture.'},
 {id:'pastel',name:'Soft pastels',description:'Gentler saturation and lighter color, with the reference’s shapes and shading intact.'},
 {id:'warm',name:'Warm daylight',description:'A subtle warm lift to the picture’s own colors, keeping greens, blues and natural tones recognizable.'},
 {id:'vivid',name:'Rich & vibrant',description:'Richer color and a little more contrast, using the same scene-matched reference.'},
 {id:'calm',name:'Cool & calm',description:'A quieter, slightly cooler interpretation of the picture’s existing colors.'},
 {id:'accents',name:'Creative accents',description:'Try lavender, rose or teal accents in the picture’s pink, purple and blue color families. Leafy greens and warm natural colors stay recognizable.'}
] as const;
export type ColorMood=typeof COLOR_PALETTES[number]['id'];
function validate(raw:Uint8ClampedArray,width:number,height:number){if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<32||height<32||width*height>2_400_000||raw.length!==width*height*4)throw new Error('Invalid color reference input.');}
function hsl(r:number,g:number,b:number){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2;if(!d)return[0,0,l];const s=d/(1-Math.abs(2*l-1));let h=max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;return[(h*60+360)%360,s,l];}
function rgb(h:number,s:number,l:number){const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;const t=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return t.map(v=>Math.round(Math.max(0,Math.min(1,v+m))*255));}
export function colorMoodRGB(r:number,g:number,b:number,mood:ColorMood):number[]{
 if(mood==='original'||Math.max(r,g,b)<42||Math.min(r,g,b)>245||Math.max(r,g,b)-Math.min(r,g,b)<16)return[r,g,b];
 let [h,s,l]=hsl(r,g,b);
 if(mood==='pastel'){s*=.7;l=l+(1-l)*.18;}
 else if(mood==='warm'){h=(h+(h>=175&&h<=260?-4:h>=70&&h<175?-3:3)+360)%360;s*=.97;l=Math.min(.97,l+.015);}
 else if(mood==='vivid'){s=Math.min(1,s*1.14);l=Math.max(.04,Math.min(.97,.5+(l-.5)*1.035));}
 else if(mood==='calm'){h=(h+(h>=175&&h<=280?4:0))%360;s*=.86;l=Math.min(.97,l+.025);}
 else if(mood==='accents'){if(h>315){h=285+(h-335)*.35;}else if(h>=200&&h<=260){h=180+(h-210)*.45;}else if(h>260&&h<=315){h=325+(h-285)*.3;}s*=.94;l=Math.min(.97,l+.02);}
 return rgb(h,s,l);
}
/** Grade an existing matched reference. Never assign arbitrary colors to regions. */
export function colorIdeaPixels(raw:Uint8ClampedArray,width:number,height:number,mood:ColorMood){
 validate(raw,width,height);if(!COLOR_PALETTES.some(p=>p.id===mood))throw new Error('Unknown color mood.');
 const pixels=new Uint8ClampedArray(raw),bottom=brandFooterLayout(width,height).footer.y;
 if(mood!=='original')for(let p=0;p<width*bottom*4;p+=4){if(raw[p+3]<240)continue;const c=colorMoodRGB(raw[p],raw[p+1],raw[p+2],mood);pixels[p]=c[0];pixels[p+1]=c[1];pixels[p+2]=c[2];}
 return{pixels};
}
const hex=(c:number[])=>'#'+c.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
/** Weighted actual-pixel clusters, excluding white paper, black ink and the brand band. */
export function referencePalette(raw:Uint8ClampedArray,width:number,height:number,count=5){
 validate(raw,width,height);if(!Number.isInteger(count)||count<1||count>8)throw new Error('Invalid palette size.');
 const bins=new Map<number,{count:number;rgb:number[]}>(),bottom=brandFooterLayout(width,height).footer.y,step=Math.max(1,Math.floor(width*bottom/14000));
 for(let n=0;n<width*bottom;n+=step){const p=n*4,r=raw[p],g=raw[p+1],b=raw[p+2],max=Math.max(r,g,b),min=Math.min(r,g,b);if(raw[p+3]<240||max<50||min>238||max-min<24)continue;const key=(r>>4)*256+(g>>4)*16+(b>>4),bin=bins.get(key)||{count:0,rgb:[0,0,0]};bin.count++;bin.rgb[0]+=r;bin.rgb[1]+=g;bin.rgb[2]+=b;bins.set(key,bin);}
 const candidates=[...bins.values()].map(v=>({count:v.count,rgb:v.rgb.map(c=>c/v.count)})).sort((a,b)=>b.count-a.count),chosen:number[][]=[];
 const distance=(a:number[],b:number[])=>.3*(a[0]-b[0])**2+.59*(a[1]-b[1])**2+.11*(a[2]-b[2])**2;
 while(candidates.length&&chosen.length<count){let index=0,best=-1;for(let i=0;i<candidates.length;i++){const c=candidates[i],d=chosen.length?Math.min(...chosen.map(v=>distance(c.rgb,v))):1;if(chosen.length&&d<400)continue;const score=Math.sqrt(c.count)*Math.sqrt(d);if(score>best){best=score;index=i;}}if(best<0)break;chosen.push(candidates.splice(index,1)[0].rgb);}
 return chosen.map(hex);
}
export function moodPalettes(colors:string[]){return Object.fromEntries(COLOR_PALETTES.map(p=>[p.id,colors.map(c=>{if(!/^#[0-9a-f]{6}$/i.test(c))throw new Error('Invalid palette color.');return hex(colorMoodRGB(...([1,3,5].map(n=>parseInt(c.slice(n,n+2),16)) as [number,number,number]),p.id));})]));}
