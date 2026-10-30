import {makeCanvas} from '../ui/canvas';
export {makeCanvas,loadSource,canvasBlob} from '../ui/canvas';
import type { Project, PaintLayer,TextObject } from './model';
import {drawObject} from './objects';
import {paintOperation} from './paint-render';
import {brandedCanvas,sourceWithoutFooter} from './branding';
const composites=new WeakMap<HTMLCanvasElement,HTMLCanvasElement>();
export function lineMask(image:CanvasImageSource,width:number,height:number,hasBrandFooter?:boolean){
  const canvas=sourceWithoutFooter(image,width,height,hasBrandFooter),ctx=canvas.getContext('2d',{willReadFrequently:true})!;const data=ctx.getImageData(0,0,width,height);
  for(let i=0;i<data.data.length;i+=4){const brightness=.2126*data.data[i]+.7152*data.data[i+1]+.0722*data.data[i+2];const alpha=data.data[i+3]/255;data.data[i]=data.data[i+1]=data.data[i+2]=0;data.data[i+3]=Math.round((255-brightness)*alpha);}
  ctx.putImageData(data,0,0);return canvas;
}
export function renderLayer(layer:PaintLayer,canvas:HTMLCanvasElement){
  const c=canvas.getContext('2d')!;c.clearRect(0,0,canvas.width,canvas.height);c.lineCap='round';c.lineJoin='round';
  for(const op of layer.operations)paintOperation(c,op,canvas.width,canvas.height);
}
export function compose(project:Project,mask:HTMLCanvasElement,target?:HTMLCanvasElement,cache?:Map<string,HTMLCanvasElement>){
  let canvas=target?composites.get(target):undefined;if(!canvas||canvas.width!==project.source.width||canvas.height!==project.source.height){canvas=makeCanvas(project.source.width,project.source.height);if(target)composites.set(target,canvas);}const c=canvas.getContext('2d')!;c.clearRect(0,0,canvas.width,canvas.height);c.fillStyle=project.background||'#ffffff';c.fillRect(0,0,canvas.width,canvas.height);
  if(project.lineVisible&&!project.keepOutlines){c.save();c.globalAlpha=project.lineOpacity??1;c.drawImage(mask,0,0);c.restore();}
  let below:HTMLCanvasElement|undefined;for(const layer of project.layers){if(!layer.visible||layer.clipBelow&&!below)continue;let lc=cache?.get(layer.id);if(!lc){lc=makeCanvas(canvas.width,canvas.height);renderLayer(layer,lc);}if(layer.clipBelow&&below){const clipped=makeCanvas(canvas.width,canvas.height),cc=clipped.getContext('2d')!;cc.drawImage(lc,0,0);cc.globalCompositeOperation='destination-in';cc.drawImage(below,0,0);lc=clipped;}below=lc;c.save();c.globalAlpha=layer.opacity??1;c.globalCompositeOperation=layer.blend||'source-over';c.drawImage(lc,0,0);c.restore();}
  if(project.lineVisible&&project.keepOutlines){c.save();c.globalAlpha=project.lineOpacity??1;c.drawImage(mask,0,0);c.restore();}
  for(const object of project.objects||[])drawObject(c,object);
  for(const text of project.texts)drawTextObject(c,text);
  return brandedCanvas(canvas,target);
}
export function outlineCanvas(project:Project,mask:HTMLCanvasElement){const canvas=makeCanvas(project.source.width,project.source.height),c=canvas.getContext('2d')!;c.fillStyle='#fff';c.fillRect(0,0,canvas.width,canvas.height);c.drawImage(mask,0,0);return brandedCanvas(canvas);}

export function drawTextObject(c:CanvasRenderingContext2D,text:TextObject){if(!text.visible)return;c.save();c.translate(text.x,text.y);c.rotate(text.rotation*Math.PI/180);c.scale(text.scale,text.scale);c.fillStyle=text.color;c.font=`${text.italic?'italic ':''}${text.weight||600} ${text.size}px ${text.font||'sans-serif'}`;c.textAlign=text.align;c.textBaseline='top';text.text.split('\n').forEach((line,i)=>{if(text.outline){c.strokeStyle=text.color;c.lineWidth=Math.max(1,text.size/35);c.strokeText(line,0,i*text.size*1.25);}else c.fillText(line,0,i*text.size*1.25);});c.restore();}
