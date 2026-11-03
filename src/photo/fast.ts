import {photoOutline,validateSettings,MAX_WORK_PIXELS,type OutlineSettings} from './outline';
import {preserveLineDrawing,smartContours,type ContourResult} from './contours';

/** Source-coordinate contour extraction. No model download, synthesis or crop.
 * Limit the analysis grid, then rasterize connected strokes at the source size.
 * Coarse-scale evidence rejects disconnected surface noise; small closed loops
 * remain eligible because they may be eyes, buttons, lettering or other detail. */
export function fastPhotoDrawing(rgba:Uint8ClampedArray,width:number,height:number,settings:OutlineSettings):ContourResult{
 validateSettings(settings);
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<32||height<32||width*height>MAX_WORK_PIXELS||rgba.length!==width*height*4)throw Error('Invalid photo dimensions.');
 const drawing=preserveLineDrawing(rgba,width,height,settings);if(drawing)return drawing;
 const ratio=Math.min(1,1000/Math.max(width,height),Math.sqrt(700000/(width*height)));
 const w=Math.max(32,Math.round(width*ratio)),h=Math.max(32,Math.round(height*ratio));
 // Extreme aspect ratios are already bounded by workingDimensions. Do not
 // independently clamp a dimension and stretch a source here.
 if(w/width!==h/height&&Math.abs(w/width-h/height)>.02)throw Error('Choose a less narrow photo.');
 const raw=resample(rgba,width,height,w,h),cleanup=settings.cleanup??55;
 const fine=photoOutline(raw,w,h,{...settings,detail:Math.max(0,settings.detail-cleanup*.12),smoothing:Math.min(100,settings.smoothing+cleanup*.15),weight:'fine',closeGaps:settings.closeGaps});
 const cw=Math.max(32,Math.round(w/2)),ch=Math.max(32,Math.round(h/2));
 let coarse:ReturnType<typeof photoOutline>|undefined;
 try{coarse=photoOutline(resample(raw,w,h,cw,ch),cw,ch,{...settings,detail:settings.detail*.65,smoothing:Math.max(65,settings.smoothing),weight:'fine',closeGaps:false});}catch{/* Fine contours can exist even when the coarser image is featureless. */}
 const support=new Uint8Array(w*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const cx=Math.min(cw-1,Math.floor((x+.5)*cw/w)),cy=Math.min(ch-1,Math.floor((y+.5)*ch/h));
  if(!coarse){support[y*w+x]=1;continue;}
  for(let dy=-2;dy<=2&&!support[y*w+x];dy++)for(let dx=-2;dx<=2;dx++){
   const xx=cx+dx,yy=cy+dy;if(xx>=0&&xx<cw&&yy>=0&&yy<ch&&coarse.mask[yy*cw+xx]){support[y*w+x]=1;break;}
  }
 }
 const seen=new Uint8Array(w*h),queue=new Uint32Array(w*h),mask=fine.mask.slice();
 for(let start=0;start<mask.length;start++){
  if(!mask[start]||seen[start])continue;
  let head=0,tail=1,supported=0,ends=0;queue[0]=start;seen[start]=1;
  while(head<tail){const i=queue[head++],x=i%w,y=Math.floor(i/w);supported+=support[i];let neighbors=0;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(!dx&&!dy)continue;const xx=x+dx,yy=y+dy,j=yy*w+xx;
    if(xx<0||xx>=w||yy<0||yy>=h||!mask[j])continue;neighbors++;
    if(!seen[j]){seen[j]=1;queue[tail++]=j;}
   }
   if(neighbors<=1)ends++;
  }
  const tiny=tail<3+cleanup*.07,unsupportedOpen=ends>0&&supported===0&&tail<4+cleanup*.22;
  if(tiny||unsupportedOpen)for(let j=0;j<tail;j++)mask[queue[j]]=0;
 }
 // The shared centerline rasterizer reconnects adjacent analysis pixels on the
 // output grid, avoiding dashed diagonals when analysis was downsampled.
 const result=smartContours({data:Float32Array.from(mask),width:w,height:h},undefined,width,height,settings);
 return {...result,method:'fast'};
}

function resample(source:Uint8ClampedArray,width:number,height:number,w:number,h:number){
 if(w===width&&h===height)return source;
 const result=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const sx=Math.max(0,Math.min(width-1,(x+.5)*width/w-.5)),sy=Math.max(0,Math.min(height-1,(y+.5)*height/h-.5));
  const x0=Math.floor(sx),y0=Math.floor(sy),x1=Math.min(width-1,x0+1),y1=Math.min(height-1,y0+1),fx=sx-x0,fy=sy-y0;
  for(let c=0;c<4;c++)result[(y*w+x)*4+c]=(source[(y0*width+x0)*4+c]*(1-fx)+source[(y0*width+x1)*4+c]*fx)*(1-fy)+(source[(y1*width+x0)*4+c]*(1-fx)+source[(y1*width+x1)*4+c]*fx)*fy;
 }
 return result;
}
