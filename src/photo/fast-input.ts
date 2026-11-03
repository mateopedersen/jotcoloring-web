import {preparePhotoTensor} from './contours';
export const FAST_GRID=512;
/** Uniform resize followed by replicated edge padding, never a square squeeze. */
export function fastPhotoTensor(raw:Uint8ClampedArray,width:number,height:number,longest=FAST_GRID,grid=FAST_GRID){
 if(!Number.isInteger(longest)||longest<64||longest>grid)throw Error('Invalid analysis size');
 if(!Number.isInteger(grid)||grid<64||grid>FAST_GRID||grid%8)throw Error('Invalid analysis grid');
 const input=preparePhotoTensor(raw,width,height,longest),plane=grid*grid,sourcePlane=input.paddedWidth*input.paddedHeight,data=new Float32Array(plane*3);
 for(let c=0;c<3;c++)for(let y=0;y<grid;y++)for(let x=0;x<grid;x++)data[c*plane+y*grid+x]=input.data[c*sourcePlane+Math.min(y,input.paddedHeight-1)*input.paddedWidth+Math.min(x,input.paddedWidth-1)];
 return {...input,data,paddedWidth:grid,paddedHeight:grid};
}
