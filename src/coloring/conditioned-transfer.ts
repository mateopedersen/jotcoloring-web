/** Transfers a model's spatial color prior onto SOURCE-owned regions. It never
 * uses the model's contours, and never assigns colors by component index. */
export const CONDITIONED_ENGINE='pixel-conditioned-v3';
export interface TransferMetrics {regions:number;coherentRegions:number;inkPixels:number;changedInkPixels:number;footerUnchanged:boolean;colorFraction:number;toneFraction:number;inkAlignment:number}
const gray=(p:Uint8Array,i:number)=>Math.min(p[i],p[i+1],p[i+2]);
export function colorPrompt(title:string,description:string,plan?:{objects:{name:string;parts:string}[];notes:string}){
 const context=(title+'. '+description).replace(/[\x00-\x1f<>]/g,' ').slice(0,600);
 const instructions=plan?plan.objects.map(o=>o.name+': '+o.parts).join('. ')+'. '+plan.notes:'Use plausible colors for each visible object; water and clear sky blue, white animals white, foliage green.';
 return ('Color the exact supplied black-and-white coloring page. Preserve every original contour, object, face, pose, proportion and composition. '+
 'Use this object-specific color plan: '+instructions+'. '+
 'Make a polished digital coloring illustration with rich harmonious colors, clean smooth fills and gentle tonal depth. No rough pencil texture. Keep blank paper and margins white. Separate materials clearly. Do not add, remove, redraw or move any detail. No new text or scenery. Preserve black lines. '+
 'Catalog context, only if visible: '+context).slice(0,3000);
}
function hueBin(r:number,g:number,b:number){
 const hi=Math.max(r,g,b),lo=Math.min(r,g,b),d=hi-lo;
 if(d<25||d/Math.max(hi,1)<.14)return 18+Math.min(3,Math.floor(hi/64));
 let hue=hi===r?(g-b)/d:hi===g?(b-r)/d+2:(r-g)/d+4;hue=(hue*60+360)%360;return Math.min(17,Math.floor(hue/20));
}
export function transferConditionedColor(source:Uint8Array,prior:Uint8Array,width:number,height:number,artBottom:number):{pixels:Uint8Array;metrics:TransferMetrics}{
 const n=width*artBottom;
 if(!Number.isSafeInteger(width*height)||width<16||height<16||width*height>2_400_000||artBottom<8||artBottom>height||source.length!==width*height*4||prior.length!==source.length)throw new Error('Invalid color transfer dimensions');
 const ink=new Uint8Array(n),modelInk=new Uint8Array(n),barrier=new Uint8Array(n),dilated=new Uint8Array(n);
 let inkPixels=0,matched=0;
 for(let i=0;i<n;i++){ink[i]=gray(source,i*4)<80?1:0;barrier[i]=gray(source,i*4)<206?1:0;modelInk[i]=gray(prior,i*4)<105&&Math.max(prior[i*4],prior[i*4+1],prior[i*4+2])-gray(prior,i*4)<45?1:0;inkPixels+=ink[i];}
 // Distance to model ink measures displacement before the original is restored.
 const distance=new Uint16Array(n).fill(65535);
 for(let i=0;i<n;i++)if(modelInk[i])distance[i]=0;
 for(let y=0;y<artBottom;y++)for(let x=0;x<width;x++){const i=y*width+x;distance[i]=Math.min(distance[i],x?distance[i-1]+1:65535,y?distance[i-width]+1:65535);}
 for(let y=artBottom-1;y>=0;y--)for(let x=width-1;x>=0;x--){const i=y*width+x;distance[i]=Math.min(distance[i],x+1<width?distance[i+1]+1:65535,y+1<artBottom?distance[i+width]+1:65535);if(ink[i]&&distance[i]<=Math.max(5,Math.round(width*.012)))matched++;}
 // Close one-pixel breaks; all labels remain derived from the source image.
 for(let y=0;y<artBottom;y++)for(let x=0;x<width;x++){const i=y*width+x;if(!barrier[i])continue;for(let yy=Math.max(0,y-1);yy<=Math.min(artBottom-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(width-1,x+1);xx++)dilated[yy*width+xx]=1;}
 for(let y=1;y<artBottom-1;y++)for(let x=1;x<width-1;x++){const i=y*width+x;let solid=1;for(let yy=y-1;yy<=y+1&&solid;yy++)for(let xx=x-1;xx<=x+1;xx++)if(!dilated[yy*width+xx]){solid=0;break;}barrier[i]=solid;}
 // Inpaint only the dark neutral contour band. A bounded neighborhood keeps
 // dark materials, animal markings and cave interiors intact. Average nearby
 // pigment instead of propagating rows, which creates stripes in curved areas.
 const pigment=prior.slice(),queue=new Int32Array(n),removeInk=new Uint8Array(n);
 for(let y=0;y<artBottom;y++)for(let x=0;x<width;x++){const p=(y*width+x)*4,hi=Math.max(prior[p],prior[p+1],prior[p+2]);if(hi>=110||hi-gray(prior,p)>=35)continue;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<width&&yy>=0&&yy<artBottom)removeInk[yy*width+xx]=1;}}

 for(let y=0;y<artBottom;y++)for(let x=0;x<width;x++){
  const i=y*width+x,p=i*4;
  if(!removeInk[i])continue;
  let weight=0,r=0,g=0,b=0;
  for(let dy=-7;dy<=7;dy++)for(let dx=-7;dx<=7;dx++){
   const xx=x+dx,yy=y+dy;if(xx<0||xx>=width||yy<0||yy>=artBottom)continue;
   const q=(yy*width+xx)*4;
   if(removeInk[yy*width+xx])continue;
   const w=1/(1+dx*dx+dy*dy);weight+=w;r+=prior[q]*w;g+=prior[q+1]*w;b+=prior[q+2]*w;
  }
  if(weight){pigment[p]=Math.round(r/weight);pigment[p+1]=Math.round(g/weight);pigment[p+2]=Math.round(b/weight);}
 }
 let head=0,tail=0;
 const labels=new Int32Array(n),out=source.slice();let regions=0,coherentRegions=0,colored=0,toned=0;
 for(let start=0;start<n;start++){
  if(barrier[start]||labels[start])continue;regions++;head=0;tail=1;queue[0]=start;labels[start]=regions;let border=false;
  const counts=new Uint32Array(22),sumR=new Float64Array(22),sumG=new Float64Array(22),sumB=new Float64Array(22);
  while(head<tail){const i=queue[head++],x=i%width,y=Math.floor(i/width),p=i*4;const bin=hueBin(pigment[p],pigment[p+1],pigment[p+2]);counts[bin]++;sumR[bin]+=pigment[p];sumG[bin]+=pigment[p+1];sumB[bin]+=pigment[p+2];if(!x||x===width-1||!y||y===artBottom-1)border=true;
   for(const j of [x?i-1:-1,x+1<width?i+1:-1,i-width,i+width])if(j>=0&&j<n&&!barrier[j]&&!labels[j]){labels[j]=regions;queue[tail++]=j;}
  }
  let mode=0;for(let k=1;k<22;k++)if(counts[k]>counts[mode])mode=k;
  const share=counts[mode]/tail,coherent=tail<n*.4&&(tail<n*.01||share>=.86),paper=border&&tail>n*.35&&counts[21]/tail>.75;
  if(coherent)coherentRegions++;
  const base=[sumR[mode]/counts[mode],sumG[mode]/counts[mode],sumB[mode]/counts[mode]],center=(base[0]+base[1]+base[2])/3;
  for(let q=0;q<tail;q++){const i=queue[q],p=i*4,light=(pigment[p]+pigment[p+1]+pigment[p+2])/3,shade=Math.max(.9,Math.min(1.08,(light+60)/(center+60)));for(let k=0;k<3;k++)out[p+k]=paper?source[p+k]:Math.round(Math.min(255,coherent?base[k]*shade:pigment[p+k])*gray(source,p)/255);}
 }
 // Extend source-region pigment into antialiased edges; do not reintroduce
 // unrelated model contours as colored seams around the preserved black ink.
 const filled=out.slice();
 for(let i=0;i<n;i++){
  const p=i*4;
  if(ink[i]){out[p]=source[p];out[p+1]=source[p+1];out[p+2]=source[p+2];}
  else if(barrier[i]){
   const x=i%width,y=Math.floor(i/width);let nearest=-1,best=99;
   for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
    const xx=x+dx,yy=y+dy;if(xx<0||xx>=width||yy<0||yy>=artBottom)continue;
    const j=yy*width+xx,d=dx*dx+dy*dy;
    if(!barrier[j]&&d<best&&gray(source,j*4)>230){nearest=j;best=d;}
   }
   for(let k=0;k<3;k++)out[p+k]=Math.round((nearest<0?pigment[p+k]:Math.min(255,filled[nearest*4+k]*255/gray(source,nearest*4)))*gray(source,p)/255);
  }
  if(Math.max(out[p],out[p+1],out[p+2])-Math.min(out[p],out[p+1],out[p+2])>28)colored++;
  if(gray(source,p)>245&&gray(out,p)<237)toned++;
 }

 return{pixels:out,metrics:{regions,coherentRegions,inkPixels,changedInkPixels:0,footerUnchanged:true,colorFraction:colored/n,toneFraction:toned/n,inkAlignment:inkPixels?matched/inkPixels:0}};
}
export function transferPasses(metrics:TransferMetrics){return metrics.inkPixels>20&&metrics.changedInkPixels===0&&metrics.footerUnchanged&&(metrics.colorFraction>=.003||metrics.toneFraction>=.008)&&metrics.colorFraction<=.98&&metrics.inkAlignment>=.62;}
