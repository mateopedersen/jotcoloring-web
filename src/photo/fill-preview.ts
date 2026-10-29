import {floodRegion} from '../studio/flood-fill';
import {outlineRGBA} from './outline';
import type {ContourResult} from './contours';

// Preview paint is a separate buffer. It must never become the printable original.
export function createFillPreview(result:ContourResult){
 const original=outlineRGBA(result),paint=original.slice(),boundary=new Uint8ClampedArray(original.length);
 for(let i=0;i<result.width*result.height;i++)boundary[i*4+3]=255-original[i*4];
 let previous:Uint8ClampedArray|undefined;
 return {
  pixels:()=>paint.slice(),
  clear(){paint.set(original);previous=undefined;},
  undo(){if(!previous)return false;paint.set(previous);previous=undefined;return true;},
  fill(x:number,y:number,hex:string){
   if(!Number.isFinite(x)||!Number.isFinite(y)||!/^#[0-9a-f]{6}$/i.test(hex))throw new Error('Invalid preview fill');
   const spans=floodRegion(boundary,result.width,result.height,x,y,100,false);
   if(!spans.length)return {pixels:0,touchesEdge:false};
   previous=paint.slice();let pixels=0,touchesEdge=false;
   const color=[1,3,5].map(offset=>parseInt(hex.slice(offset,offset+2),16));
   for(let s=0;s<spans.length;s+=3){const [row,left,right]=spans.slice(s,s+3);touchesEdge ||= row===0||row===result.height-1||left===0||right===result.width-1;
    for(let col=left;col<=right;col++){const index=(row*result.width+col)*4;for(let c=0;c<3;c++)paint[index+c]=Math.round(color[c]*original[index]/255);pixels++;}
   }
   return {pixels,touchesEdge};
  }
 };
}

export function previewPoint(clientX:number,clientY:number,rect:{left:number;top:number;width:number;height:number},width:number,height:number){
 const scale=Math.min(rect.width/width,rect.height/height),left=rect.left+(rect.width-width*scale)/2,top=rect.top+(rect.height-height*scale)/2;
 const x=Math.floor((clientX-left)/scale),y=Math.floor((clientY-top)/scale);
 return x<0||y<0||x>=width||y>=height?null:{x,y};
}
