export const AGE_VERSION='jot-age-vision-1.1.1';
export const VISION_MODEL='Xenova/clip-vit-base-patch32';
export const VISION_REVISION='6b7c523703ae26e39be4b03774966f8571c7f523';
export const AGE_BANDS=[
 {id:'3-5',label:'Ages 3–5',short:'3–5',title:'Big spaces. Little discoveries.',description:'Start with broad coloring spaces and fewer details.',min:3,max:5,group:'kids',color:'#d47a32'},
 {id:'6-8',label:'Ages 6–8',short:'6–8',title:'A little more to explore.',description:'Build a colorful scene with manageable details.',min:6,max:8,group:'kids',color:'#629073'},
 {id:'9-12',label:'Ages 9–12',short:'9–12',title:'Let the details draw you in.',description:'Explore richer scenes, patterns and smaller spaces.',min:9,max:12,group:'kids',color:'#5a8eae'},
 {id:'13-17',label:'Ages 13–17',short:'13–17',title:'Make room for your own style.',description:'Spend time on layered scenes and intricate details.',min:13,max:17,group:'teens',color:'#9674b0'},
 {id:'adults',label:'Adults',short:'Adults',title:'A deeper kind of coloring break.',description:'Settle into fine lines, small spaces and intricate patterns.',min:18,max:null,group:'adults',color:'#a86648'}
] as const;
export type AgeBand=typeof AGE_BANDS[number]['id'];
export interface ImageDetailMetrics {width:number;height:number;inkRatio:number;edgeDensity:number;regions:number;smallRegionRatio:number;medianRegionRatio:number;largestRegionRatio:number;largeAreaShare:number;smallAreaShare:number}
export interface AgeAssessment {version:typeof AGE_VERSION;source_sha256:string;model:typeof VISION_MODEL;model_revision:typeof VISION_REVISION;band:AgeBand;score:number;metrics:ImageDetailMetrics;visual_scores:number[];subjects:Array<{label:string;score:number}>;analyzed_at:string}
export const DETAIL_LABELS=[
 'a preschool coloring page with a few large simple shapes and very little decoration',
 'a children’s coloring page with a large cartoon character and some small background decorations',
 'a coloring page for older children with clear main shapes and a moderately detailed scene',
 'a complex coloring page with fine outlines, overlapping subjects and many smaller spaces',
 'a highly intricate all-over pattern coloring page with almost no large open coloring spaces'
] as const;
export const SUBJECT_LABELS=['animals','flowers and plants','fantasy castles and magical scenes','geometric mandala patterns','holiday decorations','cars and other vehicles','outer space and astronauts','ocean animals and underwater scenes','food and desserts','dinosaurs','buildings and street scenes','landscapes and nature','people','alphabet letters and numbers','toys and simple objects','birds','insects','abstract decorative patterns'] as const;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export function bandForScore(score:number):AgeBand{if(!Number.isFinite(score)||score<0||score>100)throw new Error('Invalid detail score.');return score<23?'3-5':score<42?'6-8':score<62?'9-12':score<80?'13-17':'adults';}
export function recommendAge(metrics:ImageDetailMetrics,visualScores:readonly number[]){
 if(visualScores.length!==5||visualScores.some(s=>!Number.isFinite(s)||s<0)||visualScores.reduce((a,b)=>a+b,0)<=0)throw new Error('A real visual classification is required.');
 const pixel=25*clamp((metrics.inkRatio-.015)/.27)+18*clamp(Math.log2(1+metrics.regions)/Math.log2(801))+12*metrics.smallRegionRatio+20*metrics.smallAreaShare+25*clamp((metrics.edgeDensity-.015)/.24);
 const total=visualScores.reduce((a,b)=>a+b,0),visual=visualScores.reduce((n,s,i)=>n+s/total*i*25,0);
 // Broad central coloring spaces matter more than optional tiny background decoration.
 const accessible=32*clamp(metrics.largestRegionRatio/.16)+22*clamp(metrics.largeAreaShare/.6);
 let value=pixel*.9+visual*.1-accessible;
 // Reserve advanced recommendations for pages dominated by small coloring spaces.
 if(metrics.largeAreaShare<.08&&metrics.largestRegionRatio<.012&&metrics.smallAreaShare>.45&&metrics.regions>180)value=Math.max(value,80+12*clamp(metrics.inkRatio/.3));
 if(metrics.regions>80||metrics.inkRatio>.12||metrics.edgeDensity>.14)value=Math.max(23,value);
 const score=Math.round(Math.max(0,Math.min(100,value))*100)/100;
 return{score,band:bandForScore(score)};
}
/** Actual decoded pixels only. No filenames, titles, tags or declared ages are inputs. */
export function analyzeDetailPixels(rgb:Uint8Array,width:number,height:number):ImageDetailMetrics{
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<32||height<32||width*height>1000000||rgb.length!==width*height*3)throw new Error('Use a decoded RGB image between 32 px and one megapixel.');
 const n=width*height,ink=new Uint8Array(n);let count=0,transitions=0,minX=width,minY=height,maxX=0,maxY=0;
 for(let i=0;i<n;i++){const p=i*3,v=.2126*rgb[p]+.7152*rgb[p+1]+.0722*rgb[p+2];if(v<185){ink[i]=1;count++;const x=i%width,y=Math.floor(i/width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}
 if(count<12||count/n>.85)throw new Error('The image must contain a visible coloring outline on a light background.');
 const boxWidth=maxX-minX+1,boxHeight=maxY-minY+1,area=boxWidth*boxHeight;
 if(boxWidth<24||boxHeight<24)throw new Error('The drawing is too small to analyze reliably.');
 for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const i=y*width+x;if(x<maxX&&ink[i]!==ink[i+1])transitions++;if(y<maxY&&ink[i]!==ink[i+width])transitions++;}
 // Seal single-pixel antialias gaps before measuring enclosed coloring spaces.
 const blocked=new Uint8Array(ink);for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){const i=y*width+x;if(ink[i]||ink[i-1]&&ink[i+1]||ink[i-width]&&ink[i+width])blocked[i]=1;}
 const seen=new Uint8Array(n),queue=new Uint32Array(n),areas:number[]=[],salient:number[]=[];
 for(let start=0;start<n;start++){if(blocked[start]||seen[start])continue;let head=0,tail=1,touches=false,central=0;queue[0]=start;seen[start]=1;
  while(head<tail){const i=queue[head++],x=i%width,y=Math.floor(i/width);if(x===0||x===width-1||y===0||y===height-1)touches=true;if(x>minX+boxWidth*.2&&x<maxX-boxWidth*.2&&y>minY+boxHeight*.15&&y<maxY-boxHeight*.15)central++;for(const j of [x>0?i-1:-1,x<width-1?i+1:-1,y>0?i-width:-1,y<height-1?i+width:-1])if(j>=0&&!seen[j]&&!blocked[j]){seen[j]=1;queue[tail++]=j;}}
  if(!touches&&tail>=Math.max(12,area*.00015)){areas.push(tail/area);if(central/tail>=.5)salient.push(tail/area);}
 }
 const enclosed=areas.reduce((a,b)=>a+b,0);areas.sort((a,b)=>a-b);return{width,height,inkRatio:count/area,edgeDensity:transitions/area,regions:areas.length,smallRegionRatio:areas.length?areas.filter(a=>a<.0015).length/areas.length:0,medianRegionRatio:areas.length?areas[Math.floor(areas.length/2)]:1,largestRegionRatio:salient.length?Math.max(...salient):0,largeAreaShare:enclosed?salient.filter(a=>a>=.015).reduce((a,b)=>a+b,0)/enclosed:0,smallAreaShare:enclosed?areas.filter(a=>a<.0015).reduce((a,b)=>a+b,0)/enclosed:0};
}
export function ageBand(id:unknown){return AGE_BANDS.find(b=>b.id===id);}
export function ageLabel(id:AgeBand){return id==='adults'?'Recommended for adults':`Recommended ages ${ageBand(id)!.short}`;}
export function validAgeAssessment(value:unknown,sourceSHA?:string):value is AgeAssessment{
 if(!value||typeof value!=='object')return false;const v=value as AgeAssessment,m=v.metrics;
 if(v.version!==AGE_VERSION||v.model!==VISION_MODEL||v.model_revision!==VISION_REVISION||!ageBand(v.band)||!/^[a-f0-9]{64}$/.test(v.source_sha256)||sourceSHA&&v.source_sha256!==sourceSHA||!m||!Number.isInteger(m.width)||!Number.isInteger(m.height)||m.width<32||m.height<32||m.width*m.height>1000000)return false;
 for(const k of ['inkRatio','edgeDensity','smallRegionRatio','medianRegionRatio','largestRegionRatio','largeAreaShare','smallAreaShare'] as const)if(!Number.isFinite(m[k])||m[k]<0||m[k]>(k==='edgeDensity'?2:1))return false;
 if(!Number.isInteger(m.regions)||m.regions<0||m.regions>100000||!Array.isArray(v.visual_scores)||!Array.isArray(v.subjects)||v.subjects.length<1||v.subjects.length>3||v.subjects.some(s=>!SUBJECT_LABELS.includes(s.label as typeof SUBJECT_LABELS[number])||!Number.isFinite(s.score)||s.score<0||s.score>1)||!Number.isFinite(Date.parse(v.analyzed_at)))return false;
 try{const expected=recommendAge(m,v.visual_scores);return v.band===expected.band&&v.score===expected.score;}catch{return false;}
}
