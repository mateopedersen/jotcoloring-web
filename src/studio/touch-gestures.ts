import type {Point} from './model';
/** A tap commits only on release. Panning/pinching never commits its first touch. */
export class TouchFillGate{
 private pending?:{id:number;point:Point;x:number;y:number;version:number};
 begin(id:number,point:Point,x:number,y:number,version:number){this.pending={id,point:{...point},x,y,version};}
 move(id:number,x:number,y:number){if(this.pending?.id===id&&Math.hypot(x-this.pending.x,y-this.pending.y)>8)this.cancel();}
 cancel(){this.pending=undefined;}
 finish(id:number,version:number){if(this.pending?.id!==id)return;const tap=this.pending;this.cancel();return tap.version===version?tap.point:undefined;}
}
export function pinchScale(initialDistance:number,initialZoom:number,distance:number){return Math.max(.25,Math.min(12,initialZoom*Math.max(0,distance)/Math.max(1,initialDistance)));}
