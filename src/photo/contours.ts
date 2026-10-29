import {MAX_WORK_PIXELS, validateSettings, type OutlineSettings, type OutlineResult} from './outline';

export interface EdgeMap {data:Float32Array;width:number;height:number}
export type PhotoMethod='smart'|'faithful'|'drawing'|'direct';
export interface ContourResult extends OutlineResult {method:PhotoMethod;regions:number}

/** Recover underexposed contours with one bounded, global gain; never move or invent pixels. */
export function photoExposureGain(rgba:Uint8ClampedArray){
 const histogram=new Uint32Array(256);let total=0;
 for(let p=0;p<rgba.length;p+=16){if(rgba[p+3]<250)continue;histogram[Math.max(rgba[p],rgba[p+1],rgba[p+2])]++;total++;}
 if(!total)return 1;
 let cumulative=0,low=0,high=255;
 for(let i=0;i<256;i++){cumulative+=histogram[i];if(cumulative>=total*.02){low=i;break;}}
 cumulative=0;for(let i=0;i<256;i++){cumulative+=histogram[i];if(cumulative>=total*.98){high=i;break;}}
 return high<110&&high-low>=20?Math.min(4,210/Math.max(1,high)):1;
}

/** Resize in one scale and pad only the right/bottom. Never stretch the scene to a square. */
export function neuralDimensions(width:number,height:number,longest=1024){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<32||height<32||width*height>MAX_WORK_PIXELS||!Number.isInteger(longest)||longest<64||longest>1024)throw new Error('Invalid photo dimensions.');
 const scale=Math.min(1,longest/Math.max(width,height),Math.sqrt(786432/(width*height)));
 const w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
 return {width:w,height:h,paddedWidth:Math.ceil(w/8)*8,paddedHeight:Math.ceil(h/8)*8};
}

function sample(data:Float32Array,width:number,height:number,x:number,y:number){
 x=Math.max(0,Math.min(width-1,x));y=Math.max(0,Math.min(height-1,y));
 const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(width-1,x0+1),y1=Math.min(height-1,y0+1),fx=x-x0,fy=y-y0;
 return (data[y0*width+x0]*(1-fx)+data[y0*width+x1]*fx)*(1-fy)+(data[y1*width+x0]*(1-fx)+data[y1*width+x1]*fx)*fy;
}

export function preparePhotoTensor(rgba:Uint8ClampedArray,width:number,height:number,longest=1024){
 const dims=neuralDimensions(width,height,longest);if(rgba.length!==width*height*4)throw new Error('Invalid photo pixels.');
 const {width:w,height:h,paddedWidth:pw,paddedHeight:ph}=dims,n=pw*ph,data=new Float32Array(n*3),means=[104.007,116.669,122.679],gain=photoExposureGain(rgba);
 for(let y=0;y<ph;y++)for(let x=0;x<pw;x++){
  const sx=Math.max(0,Math.min(width-1,(Math.min(x,w-1)+.5)*width/w-.5)),sy=Math.max(0,Math.min(height-1,(Math.min(y,h-1)+.5)*height/h-.5));
  const x0=Math.floor(sx),y0=Math.floor(sy),x1=Math.min(width-1,x0+1),y1=Math.min(height-1,y0+1),fx=sx-x0,fy=sy-y0;
  const positions=[(y0*width+x0)*4,(y0*width+x1)*4,(y1*width+x0)*4,(y1*width+x1)*4],weights=[(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy];
  for(let c=0;c<3;c++){let value=0;for(let k=0;k<4;k++){const p=positions[k],a=rgba[p+3]/255;value+=(Math.min(255,rgba[p+2-c]*gain)*a+255*(1-a))*weights[k];}data[c*n+y*pw+x]=value-means[c];}
 }
 return {data,...dims};
}

/** TEED's fused sigmoid has a nonzero floor; normalize only the unpadded source area. */
export function normalizeEdges(prediction:Float32Array,width:number,height:number,paddedWidth:number,paddedHeight:number):EdgeMap{
 if(prediction.length!==paddedWidth*paddedHeight||width>paddedWidth||height>paddedHeight)throw new Error('Unexpected contour model output.');
 let min=Infinity,max=-Infinity;const data=new Float32Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const v=prediction[y*paddedWidth+x];if(!Number.isFinite(v))throw new Error('Invalid contour model output.');min=Math.min(min,v);max=Math.max(max,v);}
 // Do not amplify numerical noise into invented lines on a blank image.
 if(max-min<.08)return {data,width,height};
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)data[y*width+x]=(prediction[y*paddedWidth+x]-min)/(max-min);
 return {data,width,height};
}

function removeSpecks(mask:Uint8Array,width:number,height:number,minimum:number){
 const seen=new Uint8Array(mask.length),queue=new Uint32Array(mask.length);
 for(let start=0;start<mask.length;start++){
  if(!mask[start]||seen[start])continue;let head=0,tail=1;queue[0]=start;seen[start]=1;
  while(head<tail){const i=queue[head++],x=i%width,y=Math.floor(i/width);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=width||yy<0||yy>=height)continue;const j=yy*width+xx;if(mask[j]&&!seen[j]){seen[j]=1;queue[tail++]=j;}}}
  if(tail<minimum)for(let k=0;k<tail;k++)mask[queue[k]]=0;
 }
}

/** Zhang–Suen thinning preserves connectivity and holes while reducing broad responses to a stroke. */
export function thinContours(input:Uint8Array,width:number,height:number){
 const mask=input.slice(),remove=new Uint32Array(mask.length);let changed=true;
 for(let round=0;round<32&&changed;round++){
  changed=false;for(let phase=0;phase<2;phase++){
   let count=0;for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
    const i=y*width+x;if(!mask[i])continue;
    const p=[mask[i-width],mask[i-width+1],mask[i+1],mask[i+width+1],mask[i+width],mask[i+width-1],mask[i-1],mask[i-width-1]];
    let neighbors=0,transitions=0;for(let k=0;k<8;k++){neighbors+=p[k];if(!p[k]&&p[(k+1)%8])transitions++;}
    if(neighbors<2||neighbors>6||transitions!==1)continue;
    if(phase===0?(p[0]*p[2]*p[4]||p[2]*p[4]*p[6]):(p[0]*p[2]*p[6]||p[0]*p[4]*p[6]))continue;
    remove[count++]=i;
   }
   if(count)changed=true;for(let k=0;k<count;k++)mask[remove[k]]=0;
  }
 }
 return mask;
}

/** Join only short, source-supported gaps between existing strokes. */
export function connectSupportedGaps(mask:Uint8Array,evidence:Float32Array,width:number,height:number,minimum:number){
 const output=mask.slice(),directions=[[1,0],[0,1],[1,1],[1,-1]];
 for(let y=3;y<height-3;y++)for(let x=3;x<width-3;x++){
  const i=y*width+x;if(!mask[i])continue;
  for(const [dx,dy]of directions){let supported=true;
   for(let step=1;step<=3;step++){
    const j=(y+dy*step)*width+x+dx*step;
    if(mask[j]){if(step>1&&supported)for(let k=1;k<step;k++)output[(y+dy*k)*width+x+dx*k]=1;break;}
    if(evidence[j]<minimum)supported=false;
   }
  }
 }
 return output;
}

function finish(mask:Uint8Array,width:number,height:number,settings:OutlineSettings,method:PhotoMethod,threshold:number):ContourResult{
 const output=mask.slice(),radius=settings.weight==='bold'?2:settings.weight==='medium'?1:0;
 if(radius)for(let y=0;y<height;y++)for(let x=0;x<width;x++){if(!mask[y*width+x])continue;for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){if(dx*dx+dy*dy>radius*radius+1)continue;const xx=x+dx,yy=y+dy;if(xx>=0&&xx<width&&yy>=0&&yy<height)output[yy*width+xx]=1;}}
 let inkPixels=0;for(const v of output)inkPixels+=v;if(inkPixels<16)throw new Error('No clear contours were found. Try a sharper photo or increase Detail.');
 return {mask:output,width,height,inkPixels,threshold,method,regions:countColoringRegions(output,width,height)};
}

/** Count enclosed white components, using the same four-neighbor topology as a paint bucket. */
export function countColoringRegions(mask:Uint8Array,width:number,height:number){
 const seen=new Uint8Array(mask.length),queue=new Uint32Array(mask.length);let count=0;
 const minimum=Math.max(12,Math.round(width*height*.000025));
 for(let start=0;start<mask.length;start++){
  if(mask[start]||seen[start])continue;let head=0,tail=1,touchesBorder=false;queue[0]=start;seen[start]=1;
  while(head<tail){const i=queue[head++],x=i%width,y=Math.floor(i/width);if(x===0||y===0||x===width-1||y===height-1)touchesBorder=true;
   for(const j of [x?i-1:-1,x<width-1?i+1:-1,y?i-width:-1,y<height-1?i+width:-1])if(j>=0&&!mask[j]&&!seen[j]){seen[j]=1;queue[tail++]=j;}}
  if(!touchesBorder&&tail>=minimum)count++;
 }
 return count;
}

/** Preserve existing line drawings instead of outlining both sides of every black stroke. */
export function preserveLineDrawing(rgba:Uint8ClampedArray,width:number,height:number,settings:OutlineSettings):ContourResult|null{
 validateSettings(settings);if(rgba.length!==width*height*4||width*height>MAX_WORK_PIXELS)throw new Error('Invalid drawing pixels.');
 const n=width*height,mask=new Uint8Array(n);let white=0,dark=0,mid=0,color=0,solid=0;
 for(let i=0;i<n;i++){const p=i*4,a=rgba[p+3]/255,r=rgba[p]*a+255*(1-a),g=rgba[p+1]*a+255*(1-a),b=rgba[p+2]*a+255*(1-a),v=(r+g+b)/3;
  if(Math.max(r,g,b)-Math.min(r,g,b)>25)color++;if(v>235)white++;else if(v<75)dark++;else mid++;if(v<170)mask[i]=1;}
 if(white/n<.65||dark/n<.001||dark/n>.22||mid/n>.14||color/n>.008)return null;
 for(let y=2;y<height-2;y++)for(let x=2;x<width-2;x++){const i=y*width+x;if(mask[i]&&mask[i-2]&&mask[i+2]&&mask[i-width*2]&&mask[i+width*2])solid++;}
 if(solid/Math.max(1,dark)>.4)return null;
 return finish(mask,width,height,{...settings,weight:'fine'},'drawing',170);
}

export function smartContours(fine:EdgeMap,coarse:EdgeMap|undefined,width:number,height:number,settings:OutlineSettings):ContourResult{
 validateSettings(settings);neuralDimensions(width,height);if(fine.data.length!==fine.width*fine.height||coarse&&coarse.data.length!==coarse.width*coarse.height)throw new Error('Invalid contour map.');
 const w=fine.width,h=fine.height,n=w*h,evidence=new Float32Array(n);
 const smoothing=settings.smoothing/100;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x,p=fine.data[i];if(!Number.isFinite(p)||p<0||p>1)throw new Error('Invalid contour confidence.');
  // Larger context suppresses fine texture without adding a separately drawn scene.
  let support=p;if(coarse){let best=0;const cx=(x+.5)*coarse.width/w-.5,cy=(y+.5)*coarse.height/h-.5;
   for(const [dx,dy]of [[0,0],[1,0],[-1,0],[0,1],[0,-1]])best=Math.max(best,sample(coarse.data,coarse.width,coarse.height,cx+dx,cy+dy));support=best;}
  evidence[i]=p*(1-smoothing*.72+smoothing*.72*Math.sqrt(support));
 }
 const high=.52-settings.detail*.0038,low=high*.4,mask=new Uint8Array(n),queue=new Uint32Array(n);let head=0,tail=0;
 for(let i=0;i<n;i++)if(evidence[i]>=high){mask[i]=1;queue[tail++]=i;}
 while(head<tail){const i=queue[head++],x=i%w,y=Math.floor(i/w);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=w||yy<0||yy>=h)continue;const j=yy*w+xx;if(!mask[j]&&evidence[j]>=low){mask[j]=1;queue[tail++]=j;}}}
 removeSpecks(mask,w,h,Math.max(3,Math.round(12-settings.detail*.08+settings.smoothing*.05)));
 let thin=thinContours(mask,w,h);
 if(settings.closeGaps)thin=connectSupportedGaps(thin,evidence,w,h,low*.6);
 // Rasterize connected centerlines at the original output resolution. Nearest-neighbor
 // scaling alone breaks diagonal strokes when an input has been reduced for inference.
 const scaled=new Uint8Array(width*height),sx=width/w,sy=height/h;
 const line=(x0:number,y0:number,x1:number,y1:number)=>{const steps=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));for(let k=0;k<=steps;k++){const f=steps?k/steps:0,x=Math.round(x0+(x1-x0)*f),y=Math.round(y0+(y1-y0)*f);if(x>=0&&x<width&&y>=0&&y<height)scaled[y*width+x]=1;}};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(thin[y*w+x]){
  const x0=Math.round((x+.5)*sx-.5),y0=Math.round((y+.5)*sy-.5);line(x0,y0,x0,y0);
  for(const[dx,dy]of[[1,0],[-1,1],[0,1],[1,1]]){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<w&&yy<h&&thin[yy*w+xx])line(x0,y0,Math.round((xx+.5)*sx-.5),Math.round((yy+.5)*sy-.5));}
 }
 return finish(scaled,width,height,settings,'smart',high);
}
