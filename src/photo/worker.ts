import {refineDrawingMap} from './refine';
import {photoOutline,validateSettings,type OutlineSettings} from './outline';
import {preserveLineDrawing,countColoringRegions,smartContours} from './contours';
import {finishDrawing,type DrawingMap} from './drawing';
import {fastPhotoDrawing} from './fast';
let cached:{source:number;width:number;height:number;smoothing:number;map:DrawingMap}|undefined;
let quickCached:typeof cached;
self.onmessage=async(event:MessageEvent<{id:number;source:number;raw:ArrayBuffer;width:number;height:number;settings:OutlineSettings;engine:'auto'|'fast'|'smart'|'direct'}>)=>{
 const {id,source,raw,width,height,settings,engine}=event.data;
 try{
  validateSettings(settings);if(!['auto','fast','smart','direct'].includes(engine))throw new Error('Choose a supported drawing method.');
  const pixels=new Uint8ClampedArray(raw);let result=preserveLineDrawing(pixels,width,height,settings);
  if(!result&&engine==='auto'){
   self.postMessage({id,progress:'Preparing your photo’s shapes and details…'});
   try{
    if(!quickCached||quickCached.source!==source||quickCached.width!==width||quickCached.height!==height||quickCached.smoothing!==settings.smoothing){const {quickDrawing}=await import('./quick-drawing');quickCached={source,width,height,smoothing:settings.smoothing,map:await quickDrawing(pixels,width,height,settings.smoothing)};}
    self.postMessage({id,progress:'Finishing clean lines and coloring spaces…'});
    result=finishDrawing(refineDrawingMap(quickCached.map,pixels,width,height,settings),width,height,settings,pixels);
   }catch(error){
    console.debug('GPU drawing unavailable:',error instanceof Error?error.message:'unsupported');
    try{const {fastNeuralContours}=await import('./fast-neural');const maps=await fastNeuralContours(pixels,width,height);result=smartContours(maps.fine,maps.coarse,width,height,{...settings,smoothing:Math.min(100,settings.smoothing+25),weight:Math.min(width,height)<512&&settings.weight==='medium'?'fine':settings.weight});}
    catch{self.postMessage({id,progress:'Using offline outlines for this browser…'});result=fastPhotoDrawing(pixels,width,height,settings);}
   }
  }
  if(!result&&engine==='fast'){self.postMessage({id,progress:'Tracing the shapes and details in your photo…'});result=fastPhotoDrawing(pixels,width,height,settings);}
  if(!result&&engine==='direct'){const direct=photoOutline(pixels,width,height,settings);result={...direct,method:'direct',regions:countColoringRegions(direct.mask,width,height)};}
  if(!result){
   if(!cached||cached.source!==source||cached.width!==width||cached.height!==height||cached.smoothing!==settings.smoothing){
    const {recognizeDrawing}=await import('./drawing-neural');
    const map=await recognizeDrawing(pixels,width,height,settings.smoothing,message=>self.postMessage({id,progress:message}));
    cached={source,width,height,smoothing:settings.smoothing,map};
   }
   self.postMessage({id,progress:'Preparing clear print strokes and checking enclosed coloring areas…'});
   const refined=refineDrawingMap(cached.map,pixels,width,height,settings);
   result=finishDrawing(refined,width,height,settings,pixels);
  }
  const transfer:ArrayBuffer[]=[result.mask.buffer as ArrayBuffer];if(result.gray)transfer.push(result.gray.buffer as ArrayBuffer);
  self.postMessage({id,...result},{transfer});
 }catch(error){self.postMessage({id,error:error instanceof Error?error.message:'The drawing could not be prepared. Try again, or choose Direct trace in Processor options.'});}
};
