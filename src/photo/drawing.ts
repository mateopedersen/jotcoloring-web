import {MAX_WORK_PIXELS,validateSettings,type OutlineSettings} from './outline';
import {coloringBoundaries} from './regions';
import {photoExposureGain,countColoringRegions,type ContourResult} from './contours';

export interface DrawingPixels {rgb:Float32Array;width:number;height:number;paddedWidth:number;paddedHeight:number}
export interface DrawingMap {gray:Float32Array;width:number;height:number}
export const DRAWING_LIMIT=768;

export function drawingDimensions(width:number,height:number){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<32||height<32||width*height>MAX_WORK_PIXELS)throw new Error('Invalid photo dimensions.');
 // One uniform scale; no square squeeze, crop, mirror, or rotation.
 const scale=Math.min(DRAWING_LIMIT/Math.max(width,height),Math.sqrt(589824/(width*height)),Math.max(1.5,512/Math.max(width,height)));
 const w=Math.max(8,Math.round(width*scale)),h=Math.max(8,Math.round(height*scale));
 return {width:w,height:h,paddedWidth:Math.ceil(w/4)*4,paddedHeight:Math.ceil(h/4)*4};
}

/** RGB on white paper. The drawing model uses RGB 0..1, unlike TEED's BGR means. */
export function prepareDrawingPixels(rgba:Uint8ClampedArray,width:number,height:number):DrawingPixels{
 const dims=drawingDimensions(width,height);if(rgba.length!==width*height*4)throw new Error('Invalid photo pixels.');
 const {width:w,height:h}=dims,rgb=new Float32Array(w*h*3),gain=photoExposureGain(rgba);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const sx=Math.max(0,Math.min(width-1,(x+.5)*width/w-.5)),sy=Math.max(0,Math.min(height-1,(y+.5)*height/h-.5));
  const x0=Math.floor(sx),y0=Math.floor(sy),x1=Math.min(width-1,x0+1),y1=Math.min(height-1,y0+1),fx=sx-x0,fy=sy-y0;
  for(let c=0;c<3;c++){
   const value=(xx:number,yy:number)=>{const p=(yy*width+xx)*4,a=rgba[p+3]/255;return Math.min(255,rgba[p+c]*gain)*a+255*(1-a);};
   rgb[(y*w+x)*3+c]=(value(x0,y0)*(1-fx)+value(x1,y0)*fx)*(1-fy)+(value(x0,y1)*(1-fx)+value(x1,y1)*fx)*fy;
  }
 }
 return {rgb,...dims};
}

/** Edge-aware texture smoothing: a dark boundary never averages with distant white paper. */
export function smoothDrawingPixels(input:DrawingPixels,amount:number):DrawingPixels{
 if(!Number.isFinite(amount)||amount<0||amount>100)throw new Error('Invalid texture setting.');
 if(amount===0)return input;
 const {width:w,height:h}=input,sigma=12+amount*.5,range=new Float32Array(766);
 for(let i=0;i<range.length;i++)range[i]=Math.exp(-i*i/(2*sigma*sigma));
 const offsets:{x:number;y:number;weight:number}[]=[];
 for(let y=-4;y<=4;y++)for(let x=-4;x<=4;x++)if(x*x+y*y<=16)offsets.push({x,y,weight:Math.exp(-(x*x+y*y)/50)});
 let rgb=input.rgb;
 for(let pass=0;pass<2;pass++){
  const next=new Float32Array(rgb.length);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=(y*w+x)*3,r=rgb[i],g=rgb[i+1],b=rgb[i+2];let total=0,rr=0,gg=0,bb=0;
   for(const o of offsets){const j=(Math.max(0,Math.min(h-1,y+o.y))*w+Math.max(0,Math.min(w-1,x+o.x)))*3,diff=Math.min(765,Math.round(Math.abs(r-rgb[j])+Math.abs(g-rgb[j+1])+Math.abs(b-rgb[j+2]))),weight=o.weight*range[diff];total+=weight;rr+=rgb[j]*weight;gg+=rgb[j+1]*weight;bb+=rgb[j+2]*weight;}
   next[i]=rr/total;next[i+1]=gg/total;next[i+2]=bb/total;
  }
  rgb=next;
 }
 return {...input,rgb};
}

export function drawingTensor(input:DrawingPixels){
 const {width:w,height:h,paddedWidth:pw,paddedHeight:ph,rgb}=input;if(rgb.length!==w*h*3)throw new Error('Invalid drawing pixels.');
 const n=pw*ph,data=new Float32Array(n*3);
 for(let y=0;y<ph;y++)for(let x=0;x<pw;x++){const p=(Math.min(y,h-1)*w+Math.min(x,w-1))*3;for(let c=0;c<3;c++)data[c*n+y*pw+x]=rgb[p+c]/255;}
 return data;
}

export function unpackDrawing(prediction:Float32Array,input:DrawingPixels):DrawingMap{
 const {width,height,paddedWidth,paddedHeight}=input;if(prediction.length!==paddedWidth*paddedHeight)throw new Error('Unexpected drawing dimensions.');
 const gray=new Float32Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=prediction[y*paddedWidth+x];if(!Number.isFinite(p))throw new Error('Invalid drawing output.');gray[y*width+x]=Math.max(0,Math.min(1,p));}
 return {gray,width,height};
}

function sample(gray:Float32Array,w:number,h:number,x:number,y:number){
 x=Math.max(0,Math.min(w-1,x));y=Math.max(0,Math.min(h-1,y));const xx=Math.floor(x),yy=Math.floor(y),fx=x-xx,fy=y-yy;
 return (gray[yy*w+xx]*(1-fx)+gray[yy*w+Math.min(w-1,xx+1)]*fx)*(1-fy)+(gray[Math.min(h-1,yy+1)*w+xx]*(1-fx)+gray[Math.min(h-1,yy+1)*w+Math.min(w-1,xx+1)]*fx)*fy;
}

/** Keep the model's actual strokes and anti-aliasing. Skeletonizing its broad gray
 * responses turns small facial features into polygons, so we never do that here. */
export function finishDrawing(map:DrawingMap,width:number,height:number,settings:OutlineSettings,source?:Uint8ClampedArray):ContourResult{
 validateSettings(settings);drawingDimensions(width,height);if(map.gray.length!==map.width*map.height)throw new Error('Invalid drawing map.');
 const gray=new Uint8Array(width*height),mask=new Uint8Array(width*height),evidence=new Float32Array(width*height);
 const floor=.015-settings.detail*.00012,gamma=settings.weight==='fine'?.64:.5,gain=settings.weight==='fine'?1.45:1.6;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  let value=sample(map.gray,map.width,map.height,(x+.5)*map.width/width-.5,(y+.5)*map.height/height-.5);
  if(!Number.isFinite(value)||value<0||value>1)throw new Error('Invalid drawing output.');
  const i=y*width+x,ink=Math.max(0,1-value-floor);evidence[i]=ink;gray[i]=Math.round(255*(1-Math.min(1,Math.pow(ink,gamma)*gain)));mask[i]=gray[i]<155?1:0;
 }
 // Isolated one-pixel dirt is not an outline. Never discard a connected eye,
 // whisker, letter, or short stroke merely because it is small.
 const original=mask.slice();for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
  const i=y*width+x;if(!original[i])continue;let neighbors=0;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dx||dy)neighbors+=original[i+dy*width+dx];
  if(!neighbors){mask[i]=0;gray[i]=255;}
 }
 if(settings.closeGaps){
  joinDrawingBreaks(mask,gray,evidence,width,height);
  if(source){const areas=coloringBoundaries(gray,width,height,source);for(let i=0;i<gray.length;i++)if(areas.boundary[i])gray[i]=0;}
 }
 if(settings.weight==='bold'){
  const before=gray.slice();for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){const i=y*width+x;gray[i]=Math.min(before[i],before[i-1],before[i+1],before[i-width],before[i+width]);}
 }
 let inkPixels=0;for(let i=0;i<mask.length;i++){mask[i]=gray[i]<155?1:0;inkPixels+=mask[i];}
 if(inkPixels<16)throw new Error('No clear outlines were found. Try a sharper photo or choose Direct trace.');
 return {mask,gray,width,height,inkPixels,threshold:155,method:'faithful',regions:countColoringRegions(mask,width,height)};
}

/** Bridge only opposing stroke endpoints, at most two missing pixels, and only
 * where the drawing already supplies visible evidence. No arbitrary region closures. */
export function joinDrawingBreaks(mask:Uint8Array,gray:Uint8Array,evidence:Float32Array,w:number,h:number){
 const before=mask.slice(),ends=new Uint8Array(mask.length);
 for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){const i=y*w+x;if(!before[i])continue;let count=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dx||dy)count+=before[i+dy*w+dx];if(count<=2)ends[i]=1;}
 for(let y=3;y<h-3;y++)for(let x=3;x<w-3;x++){
  const i=y*w+x;if(!ends[i])continue;
  for(const [dx,dy]of[[1,0],[0,1],[1,1],[1,-1]]){
   // An endpoint must already point along this direction, not across an eye.
   if(!before[i-dy*w-dx])continue;
   for(let step=2;step<=3;step++){
    const j=i+(dy*w+dx)*step;if(!ends[j]||!before[j+dy*w+dx])continue;let allowed=true;
    for(let k=1;k<step;k++){const p=i+(dy*w+dx)*k;if(before[p]||evidence[p]<.025)allowed=false;}
    if(allowed)for(let k=1;k<step;k++){const p=i+(dy*w+dx)*k;mask[p]=1;gray[p]=Math.min(gray[i],gray[j]);}
   }
  }
 }
}
