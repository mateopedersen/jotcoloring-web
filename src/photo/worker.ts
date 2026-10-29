import {photoOutline,validateSettings,type OutlineSettings} from './outline';
import {preserveLineDrawing,countColoringRegions} from './contours';
import {finishDrawing,type DrawingMap} from './drawing';
let cached:{source:number;width:number;height:number;smoothing:number;map:DrawingMap}|undefined;
self.onmessage=async(event:MessageEvent<{id:number;source:number;raw:ArrayBuffer;width:number;height:number;settings:OutlineSettings;engine:'smart'|'direct'}>)=>{
 const {id,source,raw,width,height,settings,engine}=event.data;
 try{
  validateSettings(settings);if(engine!=='smart'&&engine!=='direct')throw new Error('Choose a supported drawing method.');
  const pixels=new Uint8ClampedArray(raw);let result=preserveLineDrawing(pixels,width,height,settings);
  if(!result&&engine==='direct'){const direct=photoOutline(pixels,width,height,settings);result={...direct,method:'direct',regions:countColoringRegions(direct.mask,width,height)};}
  if(!result){
   if(!cached||cached.source!==source||cached.width!==width||cached.height!==height||cached.smoothing!==settings.smoothing){
    const {recognizeDrawing}=await import('./drawing-neural');
    const map=await recognizeDrawing(pixels,width,height,settings.smoothing,message=>self.postMessage({id,progress:message}));
    cached={source,width,height,smoothing:settings.smoothing,map};
   }
   self.postMessage({id,progress:'Preparing clear print strokes and checking enclosed coloring areas…'});
   result=finishDrawing(cached.map,width,height,settings,pixels);
  }
  const transfer:ArrayBuffer[]=[result.mask.buffer as ArrayBuffer];if(result.gray)transfer.push(result.gray.buffer as ArrayBuffer);
  self.postMessage({id,...result},{transfer});
 }catch(error){self.postMessage({id,error:error instanceof Error?error.message:'The drawing could not be prepared. Try again, or choose Direct trace in Processor options.'});}
};
