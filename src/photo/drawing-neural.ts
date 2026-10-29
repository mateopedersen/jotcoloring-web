import * as ort from 'onnxruntime-web/wasm';
import wasmURL from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import {prepareDrawingPixels,smoothDrawingPixels,drawingTensor,unpackDrawing,type DrawingMap} from './drawing';

export const DRAWING_MODEL='/models/photo/informative-drawing-544fb9a4.onnx';
export const DRAWING_MODEL_SHA256='544fb9a41348734fb3c83dd1decf7548b981c4127b986b151ea2ec79c63ed988';
let sessionPromise:Promise<ort.InferenceSession>|undefined;
async function session(){
 if(!sessionPromise)sessionPromise=(async()=>{
  ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;ort.env.wasm.wasmPaths={wasm:new URL(wasmURL,self.location.href).href};ort.env.wasm.initTimeout=60000;
  const response=await fetch(DRAWING_MODEL,{signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw new Error('The drawing processor could not be downloaded. Check your connection and retry.');
  const bytes=await response.arrayBuffer();if(bytes.byteLength!==17217777)throw new Error('The drawing processor download is incomplete. Please retry.');
  const digest=await crypto.subtle.digest('SHA-256',bytes),hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
  if(hash!==DRAWING_MODEL_SHA256)throw new Error('The drawing processor could not be verified. Please reload and retry.');
  try{return await ort.InferenceSession.create(bytes,{executionProviders:['wasm'],graphOptimizationLevel:'all',enableCpuMemArena:true});}
  catch{throw new Error('This browser could not start the drawing model. Try Direct trace in Processor options.');}
 })().catch(error=>{sessionPromise=undefined;throw error;});return sessionPromise;
}
export async function recognizeDrawing(rgba:Uint8ClampedArray,width:number,height:number,smoothing:number,progress:(message:string)=>void):Promise<DrawingMap>{
 progress('Loading the private drawing processor. First use downloads about 32 MB; your photo stays on this device.');
 const engine=await session();
 progress('Reducing surface texture while keeping the edges in your photo…');
 const input=smoothDrawingPixels(prepareDrawingPixels(rgba,width,height),smoothing),tensor=new ort.Tensor('float32',drawingTensor(input),[1,3,input.paddedHeight,input.paddedWidth]);
 progress('Drawing the shapes and details from your photo. This may take a little longer on phones…');
 let outputs:ort.InferenceSession.ReturnType|undefined;
 try{outputs=await engine.run({photo:tensor});const drawing=outputs.drawing;if(!drawing||!(drawing.data instanceof Float32Array)||drawing.dims.length!==4||drawing.dims[2]!==input.paddedHeight||drawing.dims[3]!==input.paddedWidth)throw new Error('Unexpected drawing output.');return unpackDrawing(drawing.data,input);}
 catch{throw new Error('The drawing model could not finish this photo. Try a smaller image or Direct trace in Processor options.');}
 finally{tensor.dispose();if(outputs)for(const value of Object.values(outputs))value.dispose();}
}
