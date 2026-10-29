export const PHOTO_ALGORITHM='jot-photo-drawing-3.0';
export const MAX_PHOTO_PIXELS=32_000_000;
export const MAX_WORK_PIXELS=2_400_000;
export const MAX_PHOTO_BYTES=20_000_000;
export interface OutlineSettings{detail:number;smoothing:number;weight:'fine'|'medium'|'bold';closeGaps:boolean}
export const DEFAULT_SETTINGS:OutlineSettings={detail:55,smoothing:45,weight:'medium',closeGaps:true};
export interface OutlineResult{gray?:Uint8Array;mask:Uint8Array;width:number;height:number;inkPixels:number;threshold:number}
export function validateSettings(s:OutlineSettings){if(!s||!Number.isFinite(s.detail)||s.detail<0||s.detail>100||!Number.isFinite(s.smoothing)||s.smoothing<0||s.smoothing>100||!['fine','medium','bold'].includes(s.weight)||typeof s.closeGaps!=='boolean')throw new Error('Choose valid outline settings.');}
/** Deterministic, source-pixel coordinates throughout: no crop, synthesis or warping. */
export function photoOutline(rgba:Uint8ClampedArray,width:number,height:number,settings:OutlineSettings=DEFAULT_SETTINGS):OutlineResult{
 validateSettings(settings);const n=width*height;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<32||height<32||n>MAX_WORK_PIXELS||rgba.length!==n*4)throw new Error('This photo is outside the supported processing size.');
 let color=new Float32Array(n*3),scratch=new Float32Array(n*3);
 // Monotonic shadow normalization reveals faint dark contours without changing coordinates.
 for(let i=0;i<n;i++){const alpha=rgba[i*4+3]/255;for(let c=0;c<3;c++)color[i*3+c]=255*Math.sqrt((rgba[i*4+c]*alpha+255*(1-alpha))/255);}
 // A small symmetric scale-space filter suppresses fabric/grain without moving the scene.
 const kernel=[1,4,6,4,1];for(let pass=0;pass<(settings.smoothing>=60?2:1);pass++)for(const vertical of [false,true]){for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=(y*width+x)*3;for(let c=0;c<3;c++){let sum=0;for(let k=-2;k<=2;k++){const xx=vertical?x:Math.max(0,Math.min(width-1,x+k)),yy=vertical?Math.max(0,Math.min(height-1,y+k)):y;sum+=color[(yy*width+xx)*3+c]*kernel[k+2];}scratch[p+c]=sum/16;}}[color,scratch]=[scratch,color];}
 // Separable bilateral smoothing keeps strong boundaries in their original positions.
 const sigma=10+settings.smoothing*.65,lut=new Float32Array(766);for(let i=0;i<lut.length;i++)lut[i]=Math.exp(-((i/3)**2)/(2*sigma*sigma));
 for(const vertical of [false,true]){for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x,p=i*3;let sum=1,r=color[p],g=color[p+1],b=color[p+2];for(let k=-2;k<=2;k++){if(k===0)continue;const xx=vertical?x:Math.max(0,Math.min(width-1,x+k)),yy=vertical?Math.max(0,Math.min(height-1,y+k)):y,j=(yy*width+xx)*3,d=Math.min(765,Math.round(Math.abs(color[p]-color[j])+Math.abs(color[p+1]-color[j+1])+Math.abs(color[p+2]-color[j+2]))),w=lut[d]*(Math.abs(k)===1?.68:.2);sum+=w;r+=color[j]*w;g+=color[j+1]*w;b+=color[j+2]*w;}scratch[p]=r/sum;scratch[p+1]=g/sum;scratch[p+2]=b/sum;}[color,scratch]=[scratch,color];}
 const magnitude=new Float32Array(n),direction=new Uint8Array(n),hist=new Uint32Array(256);let candidates=0;
 for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){const i=y*width+x;let best=0,gx=0,gy=0;
  // Strongest RGB-channel gradient also detects boundaries between equal-luminance colors.
  for(let c=0;c<3;c++){const a=(i-width-1)*3+c,b=(i-width)*3+c,d=(i-1)*3+c,e=(i+1)*3+c,g=(i+width-1)*3+c,h=(i+width)*3+c,j=(i+width+1)*3+c,f=(i-width+1)*3+c;const dx=(color[f]+2*color[e]+color[j]-color[a]-2*color[d]-color[g])/4,dy=(color[g]+2*color[h]+color[j]-color[a]-2*color[b]-color[f])/4,m=dx*dx+dy*dy;if(m>best){best=m;gx=dx;gy=dy;}}
  const m=Math.sqrt(best);magnitude[i]=m;const ax=Math.abs(gx),ay=Math.abs(gy);direction[i]=ay<=ax*.4142?0:ay>=ax*2.4142?2:gx*gy>=0?1:3;if(m>3){hist[Math.min(255,Math.round(m))]++;candidates++;}
 }
 let cumulative=0,percentile=8;for(let i=4;i<256;i++){cumulative+=hist[i];if(cumulative>=candidates*.72){percentile=i;break;}}
 const high=Math.max(5,Math.min(65,percentile*(1.55-settings.detail*.012))),low=high*.35,thin=new Float32Array(n),queue=new Uint32Array(n),mask=new Uint8Array(n);let head=0,tail=0;
 for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){const i=y*width+x,m=magnitude[i],d=direction[i],offset=d===0?1:d===2?width:d===1?width+1:width-1;
  if(m>=low&&m>=magnitude[i-offset]&&m>=magnitude[i+offset]){thin[i]=m;if(m>=high){mask[i]=1;queue[tail++]=i;}}
 }
 // Hysteresis follows faint connected contours; isolated low-contrast texture stays white.
 while(head<tail){const i=queue[head++],x=i%width,y=Math.floor(i/width);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=width||yy<0||yy>=height)continue;const j=yy*width+xx;if(!mask[j]&&thin[j]>=low){mask[j]=1;queue[tail++]=j;}}}
 const visited=new Uint8Array(n),minimum=Math.max(2,Math.round((13-settings.detail*.1)*Math.max(.5,Math.sqrt(n)/1000)));
 for(let start=0;start<n;start++){if(!mask[start]||visited[start])continue;head=0;tail=1;queue[0]=start;visited[start]=1;while(head<tail){const i=queue[head++],x=i%width,y=Math.floor(i/width);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=width||yy<0||yy>=height)continue;const j=yy*width+xx;if(mask[j]&&!visited[j]){visited[j]=1;queue[tail++]=j;}}}if(tail<minimum)for(let i=0;i<tail;i++)mask[queue[i]]=0;}
 if(settings.closeGaps){const before=mask.slice();for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){const i=y*width+x;if(!before[i]&&(before[i-1]&&before[i+1]||before[i-width]&&before[i+width]||before[i-width-1]&&before[i+width+1]||before[i-width+1]&&before[i+width-1]))mask[i]=1;}}
 const output=mask.slice();if(settings.weight!=='fine'){for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){const i=y*width+x;if(!mask[i])continue;output[i-1]=output[i+1]=output[i-width]=output[i+width]=1;if(settings.weight==='bold'){output[i-width-1]=output[i-width+1]=output[i+width-1]=output[i+width+1]=1;}}}
 let inkPixels=0;for(const v of output)inkPixels+=v;
 if(inkPixels<16)throw new Error('No clear contours were found. Try a sharper photo or increase Detail.');
 return{mask:output,width,height,inkPixels,threshold:high};
}
export function maskRGBA(mask:Uint8Array,width:number,height:number){if(mask.length!==width*height)throw new Error('Invalid outline mask.');const raw=new Uint8ClampedArray(mask.length*4);for(let i=0;i<mask.length;i++){const v=mask[i]?0:255;raw[i*4]=raw[i*4+1]=raw[i*4+2]=v;raw[i*4+3]=255;}return raw;}
export function workingDimensions(width:number,height:number){if(!Number.isInteger(width)||!Number.isInteger(height)||width<64||height<64||width*height>MAX_PHOTO_PIXELS)throw new Error('Choose a photo between 64 pixels and 32 megapixels.');const ratio=Math.min(1,2400/Math.max(width,height),Math.sqrt(MAX_WORK_PIXELS/(width*height))),w=Math.floor(width*ratio),h=Math.floor(height*ratio);if(w<32||h<32)throw new Error('This photo is too narrow to create clear outlines. Choose a less extreme aspect ratio.');return{width:w,height:h};}

/** Display the same anti-aliased linework in preview, exports, and Studio. */
export function outlineRGBA(result:OutlineResult){
 if(!result.gray)return maskRGBA(result.mask,result.width,result.height);
 if(result.gray.length!==result.width*result.height)throw new Error('Invalid drawing pixels.');
 const raw=new Uint8ClampedArray(result.gray.length*4);
 for(let i=0;i<result.gray.length;i++){raw[i*4]=raw[i*4+1]=raw[i*4+2]=result.gray[i];raw[i*4+3]=255;}return raw;
}
