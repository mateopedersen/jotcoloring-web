import type {ContourResult} from './contours';
import {countColoringRegions} from './contours';
export type RetouchTool='erase'|'restore'|'ink';
/** Bounded local correction history. All edits remain in original image coordinates. */
export function createRetouchSession(source:ContourResult){
 const base=source.gray?.slice()||Uint8Array.from(source.mask,v=>v?0:255),gray=base.slice(),history:Uint8Array[]=[],width=source.width,height=source.height;let before:Uint8Array|undefined;
 function begin(){before=gray.slice();}
 function paint(from:{x:number;y:number},to:{x:number;y:number},radius:number,tool:RetouchTool){
  if(![from.x,from.y,to.x,to.y,radius].every(Number.isFinite)||radius<.5||radius>64)throw new Error('Invalid correction coordinates.');
  const steps=Math.min(10000,Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/Math.max(1,radius*.4))));
  for(let k=0;k<=steps;k++){const x=from.x+(to.x-from.x)*k/steps,y=from.y+(to.y-from.y)*k/steps;for(let yy=Math.max(0,Math.floor(y-radius));yy<=Math.min(height-1,Math.ceil(y+radius));yy++)for(let xx=Math.max(0,Math.floor(x-radius));xx<=Math.min(width-1,Math.ceil(x+radius));xx++){if((xx-x)**2+(yy-y)**2>radius*radius)continue;const i=yy*width+xx;gray[i]=tool==='restore'?base[i]:tool==='erase'?255:0;}}
 }
 function result():ContourResult{const mask=Uint8Array.from(gray,v=>v<155?1:0);return{...source,gray:gray.slice(),mask,inkPixels:mask.reduce((a,b)=>a+b,0),regions:countColoringRegions(mask,width,height)};}
 return{gray,begin,paint,finish(){if(before){history.push(before);while(history.length>6||history.length*gray.length>16_000_000)history.shift();before=undefined;}return result();},cancel(){if(before){gray.set(before);before=undefined;}return result();},undo(){const last=history.pop();if(last)gray.set(last);return result();},reset(){begin();gray.set(base);return this.finish();},get canUndo(){return history.length>0;}};
}
export function mountPhotoRetouch(c:{root:HTMLElement;canvas:HTMLCanvasElement;result:()=>ContourResult|undefined;change:(r:ContourResult)=>void;show:()=>void;disableFill:()=>void;message:(s:string)=>void}){
 const el=<T extends HTMLElement>(s:string)=>c.root.querySelector<T>(s)!;let tool:RetouchTool|undefined,session:ReturnType<typeof createRetouchSession>|undefined,pointer:number|undefined,last:{x:number;y:number}|undefined;
 const point=(e:PointerEvent)=>{const r=c.canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*c.canvas.width,y:(e.clientY-r.top)/r.height*c.canvas.height};};
 const paint=()=>{if(!session)return;const ctx=c.canvas.getContext('2d')!,image=ctx.createImageData(c.canvas.width,c.canvas.height);for(let i=0;i<session.gray.length;i++){image.data[i*4]=image.data[i*4+1]=image.data[i*4+2]=session.gray[i];image.data[i*4+3]=255;}ctx.putImageData(image,0,0);};
 function setTool(next?:RetouchTool){tool=next;c.canvas.dataset.retouch=next||'';c.root.querySelectorAll<HTMLButtonElement>('[data-retouch-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.retouchTool===next)));if(next){c.disableFill();c.show();c.message(next==='erase'?'Brush over stray lines to erase them.':next==='restore'?'Brush over an edited area to restore the converted lines.':'Draw a short line to close a gap. Use a small brush near delicate details.');}}
 c.root.querySelectorAll<HTMLButtonElement>('[data-retouch-tool]').forEach(b=>b.onclick=()=>setTool(tool===b.dataset.retouchTool?undefined:b.dataset.retouchTool as RetouchTool));
 el<HTMLInputElement>('[data-retouch-size]').oninput=e=>{el('[data-retouch-size-value]').textContent=(e.target as HTMLInputElement).value+' px';};
 c.canvas.addEventListener('pointerdown',e=>{if(!tool||!session||e.button!==0)return;e.preventDefault();pointer=e.pointerId;c.canvas.setPointerCapture(pointer);last=point(e);session.begin();session.paint(last,last,Number(el<HTMLInputElement>('[data-retouch-size]').value)/2,tool);paint();});
 c.canvas.addEventListener('pointermove',e=>{if(pointer!==e.pointerId||!tool||!session||!last)return;e.preventDefault();const next=point(e);session.paint(last,next,Number(el<HTMLInputElement>('[data-retouch-size]').value)/2,tool);last=next;paint();});
 c.canvas.addEventListener('pointerup',e=>{if(pointer!==e.pointerId||!session)return;pointer=undefined;last=undefined;c.change(session.finish());el<HTMLButtonElement>('[data-retouch-undo]').disabled=!session.canUndo;c.message('Correction kept. Downloads and Studio use these same lines.');});
 c.canvas.addEventListener('pointercancel',()=>{if(pointer===undefined||!session)return;pointer=undefined;last=undefined;c.change(session.cancel());});
 el<HTMLButtonElement>('[data-retouch-undo]').onclick=()=>{if(session){c.change(session.undo());el<HTMLButtonElement>('[data-retouch-undo]').disabled=!session.canUndo;}};el<HTMLButtonElement>('[data-retouch-reset]').onclick=()=>{if(session){c.change(session.reset());el<HTMLButtonElement>('[data-retouch-undo]').disabled=!session.canUndo;}};
 return{load(result:ContourResult){session=createRetouchSession(result);setTool();el<HTMLButtonElement>('[data-retouch-undo]').disabled=true;},stop(){setTool();},get active(){return!!tool;}};
}
