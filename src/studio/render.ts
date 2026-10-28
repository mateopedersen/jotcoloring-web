import type { Project, PaintLayer } from './model';
import {drawObject} from './objects';
import {brandedCanvas,sourceWithoutFooter} from './branding';
const composites=new WeakMap<HTMLCanvasElement,HTMLCanvasElement>();
export function makeCanvas(width:number,height:number){const c=document.createElement('canvas');c.width=width;c.height=height;return c;}
export async function loadSource(blob:Blob):Promise<HTMLImageElement>{const url=URL.createObjectURL(blob);try{const img=new Image();img.decoding='async';img.src=url;await img.decode();return img;}finally{URL.revokeObjectURL(url);}}
export function lineMask(image:CanvasImageSource,width:number,height:number,hasBrandFooter?:boolean){
  const canvas=sourceWithoutFooter(image,width,height,hasBrandFooter),ctx=canvas.getContext('2d',{willReadFrequently:true})!;const data=ctx.getImageData(0,0,width,height);
  for(let i=0;i<data.data.length;i+=4){const brightness=.2126*data.data[i]+.7152*data.data[i+1]+.0722*data.data[i+2];const alpha=data.data[i+3]/255;data.data[i]=data.data[i+1]=data.data[i+2]=0;data.data[i+3]=Math.round((255-brightness)*alpha);}
  ctx.putImageData(data,0,0);return canvas;
}
export function renderLayer(layer:PaintLayer,canvas:HTMLCanvasElement){
  const c=canvas.getContext('2d')!;c.clearRect(0,0,canvas.width,canvas.height);c.lineCap='round';c.lineJoin='round';
  for(const op of layer.operations){c.save();c.globalAlpha=op.opacity;
    if(op.kind==='stroke'){c.globalCompositeOperation=op.erase?'destination-out':'source-over';c.strokeStyle=op.color;c.fillStyle=op.color;c.lineWidth=op.size;if(op.points.length===1){c.beginPath();c.arc(op.points[0].x,op.points[0].y,op.size/2,0,Math.PI*2);c.fill();}else{c.beginPath();op.points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}}
    else{c.fillStyle=op.color;for(let i=0;i<op.spans.length;i+=3)c.fillRect(op.spans[i+1],op.spans[i],op.spans[i+2]-op.spans[i+1]+1,1);}
    c.restore();
  }
}
export function compose(project:Project,mask:HTMLCanvasElement,target?:HTMLCanvasElement,cache?:Map<string,HTMLCanvasElement>){
  let canvas=target?composites.get(target):undefined;if(!canvas||canvas.width!==project.source.width||canvas.height!==project.source.height){canvas=makeCanvas(project.source.width,project.source.height);if(target)composites.set(target,canvas);}const c=canvas.getContext('2d')!;c.clearRect(0,0,canvas.width,canvas.height);c.fillStyle='#ffffff';c.fillRect(0,0,canvas.width,canvas.height);
  if(project.lineVisible&&!project.keepOutlines)c.drawImage(mask,0,0);
  for(const layer of project.layers){if(!layer.visible)continue;let lc=cache?.get(layer.id);if(!lc){lc=makeCanvas(canvas.width,canvas.height);renderLayer(layer,lc);}c.drawImage(lc,0,0);}
  if(project.lineVisible&&project.keepOutlines)c.drawImage(mask,0,0);
  for(const object of project.objects||[])drawObject(c,object);
  for(const text of project.texts){if(!text.visible)continue;c.save();c.translate(text.x,text.y);c.rotate(text.rotation*Math.PI/180);c.scale(text.scale,text.scale);c.fillStyle=text.color;c.font=`600 ${text.size}px sans-serif`;c.textAlign=text.align;c.textBaseline='top';text.text.split('\n').forEach((line,i)=>c.fillText(line,0,i*text.size*1.25));c.restore();}
  return brandedCanvas(canvas,target);
}
export function outlineCanvas(project:Project,mask:HTMLCanvasElement){const canvas=makeCanvas(project.source.width,project.source.height),c=canvas.getContext('2d')!;c.fillStyle='#fff';c.fillRect(0,0,canvas.width,canvas.height);c.drawImage(mask,0,0);return brandedCanvas(canvas);}
export function canvasBlob(canvas:HTMLCanvasElement,type:string,quality?:number):Promise<Blob>{return new Promise((resolve,reject)=>canvas.toBlob(blob=>{if(!blob||!blob.size)reject(new Error('The image encoder returned an empty file.'));else if(blob.type!==type)reject(new Error(`This browser cannot export ${type.replace('image/','').toUpperCase()}. Use another browser; no file was downloaded.`));else resolve(blob);},type,quality));}
