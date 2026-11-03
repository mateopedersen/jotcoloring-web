import * as ort from 'onnxruntime-web/webgl';
import {normalizeEdges,type EdgeMap} from './contours';
import {fastPhotoTensor,FAST_GRID} from './fast-input';
// The already licensed TEED checkpoint is 249 KB. This GPU-only runtime does
// not import or download the much larger WASM processor. CPU fallback is local.
const MODEL='/models/photo/teed-webgl-390ad3ec.onnx';
const HASH='390ad3ec062c1beec8c27e4157142955cb325dde912e2622a9de2abdccca92e4';
let sessionPromise:Promise<ort.InferenceSession>|undefined;
async function session(){
 if(!sessionPromise)sessionPromise=(async()=>{
  const canvas=new OffscreenCanvas(1,1),gl=canvas.getContext('webgl2');if(!gl)throw Error('GPU outlines unavailable');
  const response=await fetch(MODEL,{signal:AbortSignal.timeout(5000)});if(!response.ok)throw Error('Contour model unavailable');
  const bytes=await response.arrayBuffer();if(bytes.byteLength!==248700)throw Error('Incomplete contour model');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  if(hash!==HASH)throw Error('Unverified contour model');
  ort.env.webgl.contextId='webgl2';ort.env.webgl.pack=true;
  return ort.InferenceSession.create(bytes,{executionProviders:['webgl'],graphOptimizationLevel:'all'});
 })().catch(error=>{sessionPromise=undefined;throw error;});return sessionPromise;
}
export async function fastNeuralContours(raw:Uint8ClampedArray,width:number,height:number):Promise<{fine:EdgeMap;coarse?:EdgeMap}>{
 const engine=await session();
 const run=async(longest:number)=>{
  const input=fastPhotoTensor(raw,width,height,longest),tensor=new ort.Tensor('float32',input.data,[1,3,FAST_GRID,FAST_GRID]);
  let outputs:ort.InferenceSession.ReturnType|undefined;
  try{outputs=await engine.run({photo:tensor});const edges=outputs.edges;
   if(!edges||!(edges.data instanceof Float32Array)||edges.dims[2]!==input.paddedHeight||edges.dims[3]!==input.paddedWidth)throw Error('Invalid contour map');
   return normalizeEdges(edges.data,input.width,input.height,input.paddedWidth,input.paddedHeight);
  }finally{tensor.dispose();if(outputs)for(const value of Object.values(outputs))value.dispose();}
 };
 return {fine:await run(512),coarse:await run(256)};
}
