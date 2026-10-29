import * as ort from 'onnxruntime-web/wasm';
import wasmURL from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import {preparePhotoTensor,normalizeEdges,type EdgeMap} from './contours';

export const PHOTO_MODEL='/models/photo/teed-biped-7-9f7e3406.onnx';
export const PHOTO_MODEL_SHA256='9f7e3406f561ddd5d25fea1f09c36cb4a4bf4efcbe983a3ed3548788445e8c05';
let sessionPromise:Promise<ort.InferenceSession>|undefined;
async function session(){
 if(!sessionPromise)sessionPromise=(async()=>{
  // Single-thread WASM works without cross-origin isolation and keeps photos on-device.
  ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;ort.env.wasm.wasmPaths={wasm:new URL(wasmURL,self.location.href).href};ort.env.wasm.initTimeout=45000;
  const response=await fetch(PHOTO_MODEL,{signal:AbortSignal.timeout(45000)});
  if(!response.ok)throw new Error('The contour model could not be downloaded. Check your connection and try again.');
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength>1_000_000)throw new Error('Unexpected contour model file. Please reload this page.');
  const digest=await crypto.subtle.digest('SHA-256',bytes),hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
  if(hash!==PHOTO_MODEL_SHA256)throw new Error('The contour model could not be verified. Please reload this page.');
  try{return await ort.InferenceSession.create(bytes,{executionProviders:['wasm'],graphOptimizationLevel:'all',enableCpuMemArena:true});}
  catch{throw new Error('Smart contours could not start. Check your connection and retry, or choose Direct trace in Processor options.');}
 })().catch(error=>{sessionPromise=undefined;throw error;});
 return sessionPromise;
}

export async function recognizeContours(rgba:Uint8ClampedArray,width:number,height:number,progress:(message:string)=>void):Promise<{fine:EdgeMap;coarse?:EdgeMap}>{
 progress('Loading the private photo processor. First use downloads about 15 MB; your photo stays on this device.');
 const engine=await session();
 const run=async(longest:number)=>{
  const input=preparePhotoTensor(rgba,width,height,longest),tensor=new ort.Tensor('float32',input.data,[1,3,input.paddedHeight,input.paddedWidth]);
  let outputs:ort.InferenceSession.ReturnType;
  try{outputs=await engine.run({photo:tensor});}catch{tensor.dispose();throw new Error('Smart contours could not finish this photo. Try a smaller image, or choose Direct trace in Processor options.');}
  const edges=outputs.edges;
  try{if(!edges||!(edges.data instanceof Float32Array)||edges.dims.length!==4||edges.dims[2]!==input.paddedHeight||edges.dims[3]!==input.paddedWidth)throw new Error('The photo processor returned an unexpected image size.');
   return normalizeEdges(edges.data,input.width,input.height,input.paddedWidth,input.paddedHeight);
  }finally{tensor.dispose();for(const output of Object.values(outputs))output.dispose();}
 };
 progress('Following the people, objects and contours in your original photo…');const fine=await run(1024);
 progress('Separating the main outlines from small surface textures…');const coarse=Math.max(width,height)>512?await run(512):undefined;
 return {fine,coarse};
}
