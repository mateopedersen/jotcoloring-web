import * as ort from 'onnxruntime-web/webgl';
import receipt from '../../public/models/photo/drawing-webgl.json';
import {fastPhotoTensor} from './fast-input';
import {smoothDrawingPixels,drawingTensor,unpackDrawing,type DrawingPixels,type DrawingMap} from './drawing';
let sessionPromise:Promise<ort.InferenceSession>|undefined;
const hash=async(bytes:ArrayBuffer)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
async function session(){
 if(!sessionPromise)sessionPromise=(async()=>{
  if(typeof DecompressionStream==='undefined'||!new OffscreenCanvas(1,1).getContext('webgl2'))throw Error('GPU drawing unavailable');
  const response=await fetch('/models/photo/'+receipt.file,{signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Drawing model unavailable');
  const transport=await response.arrayBuffer();if(transport.byteLength!==receipt.bytes||await hash(transport)!==receipt.transportSHA256)throw Error('Incomplete drawing model');
  const bytes=await new Response(new Blob([transport]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  if(bytes.byteLength!==receipt.decodedBytes||await hash(bytes)!==receipt.decodedSHA256)throw Error('Drawing model verification failed');
  ort.env.webgl.contextId='webgl2';ort.env.webgl.pack=true;
  return ort.InferenceSession.create(bytes,{executionProviders:['webgl'],graphOptimizationLevel:'all'});
 })().catch(error=>{sessionPromise=undefined;throw error;});return sessionPromise;
}
export async function quickDrawing(raw:Uint8ClampedArray,width:number,height:number,smoothing:number):Promise<DrawingMap>{
 const engine=await session(),grid=receipt.grid,source=fastPhotoTensor(raw,width,height,grid,grid),n=grid*grid,rgb=new Float32Array(source.width*source.height*3),means=[104.007,116.669,122.679];
 for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++)for(let c=0;c<3;c++)rgb[(y*source.width+x)*3+c]=source.data[(2-c)*n+y*grid+x]+means[2-c];
 const input:DrawingPixels=smoothDrawingPixels({...source,rgb},smoothing),tensor=new ort.Tensor('float32',drawingTensor(input),[1,3,grid,grid]);let outputs:ort.InferenceSession.ReturnType|undefined;
 try{outputs=await engine.run({photo:tensor});const drawing=outputs.drawing;if(!drawing||!(drawing.data instanceof Float32Array))throw Error('Invalid drawing output');return unpackDrawing(drawing.data,input);}
 finally{tensor.dispose();if(outputs)for(const value of Object.values(outputs))value.dispose();}
}
