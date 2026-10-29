import {photoOutline,validateSettings,type OutlineSettings} from './outline';
import {preserveLineDrawing,smartContours,countColoringRegions,type EdgeMap} from './contours';
let cached:{source:number;width:number;height:number;fine:EdgeMap;coarse?:EdgeMap}|undefined;
self.onmessage=async(event:MessageEvent<{id:number;source:number;raw:ArrayBuffer;width:number;height:number;settings:OutlineSettings;engine:'smart'|'direct'}>)=>{
 const {id,source,raw,width,height,settings,engine}=event.data;
 try{
  validateSettings(settings);const pixels=new Uint8ClampedArray(raw);
  let result=preserveLineDrawing(pixels,width,height,settings);
  if(!result&&engine==='direct'){const direct=photoOutline(pixels,width,height,settings);result={...direct,method:'direct',regions:countColoringRegions(direct.mask,width,height)};}
  if(!result){
   if(!cached||cached.source!==source||cached.width!==width||cached.height!==height){
    const {recognizeContours}=await import('./neural');
    const maps=await recognizeContours(pixels,width,height,message=>self.postMessage({id,progress:message}));
    cached={source,width,height,...maps};
   }
   self.postMessage({id,progress:'Cleaning the strokes and connecting small, visible gaps…'});
   result=smartContours(cached.fine,cached.coarse,width,height,settings);
  }
  self.postMessage({id,...result},{transfer:[result.mask.buffer]});
 }catch(error){self.postMessage({id,error:error instanceof Error?error.message:'The outlines could not be prepared. Try again, or choose Direct trace in the processor options.'});}
};
