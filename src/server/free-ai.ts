import {COLOR_VISION_MODEL} from '../coloring/semantic-color-plan';
import type {Env} from './types';
import {AppError} from './http';
import {gatewayDigest,gatewaySignature,signatureData} from './gateway-signature';
/** A per-project counter cannot guarantee account-wide free allowance on Workers Paid.
 * Only an independently enforced zero-charge provider gateway may satisfy this binding.
 * No implementation is deployed by default; missing enforcement always disables inference.
 */
export function freeAIConfiguration(env:Env){const enabled=env.AI_BILLING_MODE==='free_only',daily=Number(env.AI_FREE_DAILY_NEURONS||'0'),perJob=Number(env.AI_FREE_MAX_JOB_NEURONS||'0');return {enabled,daily,perJob,ready:enabled&&((!!env.AI_FREE_ONLY_GATEWAY)||(!!env.AI_FREE_GATEWAY_URL&&/^https:\/\/[-a-z0-9.]+\.workers\.dev\/?$/.test(env.AI_FREE_GATEWAY_URL)&&!!env.AI_FREE_GATEWAY_SECRET&&env.AI_FREE_GATEWAY_SECRET.length>=32))&&Number.isSafeInteger(daily)&&daily>0&&daily<=10000&&Number.isSafeInteger(perJob)&&perJob>=300&&perJob<=daily};}
export async function reserveFreeNeurons(env:Env,jobId:string){const cfg=freeAIConfiguration(env);if(!cfg.ready||!env.CATALOG_DB)throw new AppError('FREE_ONLY_UNVERIFIED','A provider-enforced free-only allowance is not configured. No inference was sent.',503);try{await env.CATALOG_DB.prepare('INSERT INTO ai_free_reservation(job_id,day,neurons,daily_limit) VALUES(?,?,?,?) ON CONFLICT(job_id) DO NOTHING').bind(jobId,new Date().toISOString().slice(0,10),cfg.perJob,cfg.daily).run()}catch(error){if(String(error).includes('FREE_NEURONS_EXHAUSTED'))throw new AppError('FREE_NEURONS_EXHAUSTED','The free generation allowance is exhausted for today.',429);throw error}}
// Queue consumers allow 15 minutes of wall time; leave ample room for processing.
export const FREE_GATEWAY_TIMEOUT_MS=300_000;
export async function freeOnlyInference(env:Env,model:string,jobId:string,body:ReadableStream<Uint8Array>,contentType:string,catalogJobKey?:string){
 if(catalogJobKey){
  const cfg=freeAIConfiguration(env);if(!cfg.ready||!env.CATALOG_DB||cfg.perJob!==300||cfg.daily>9000)throw new AppError('FREE_ONLY_UNVERIFIED','The free-only color service is not configured.',503);
  try{await env.CATALOG_DB.prepare('INSERT INTO color_ai_reservation(request_id,job_key,day,neurons,daily_limit) VALUES(?,?,?,?,?)').bind(jobId,catalogJobKey,new Date().toISOString().slice(0,10),model===COLOR_VISION_MODEL?600:300,cfg.daily).run();}
  catch(error){if(String(error).includes('FREE_NEURONS_EXHAUSTED'))throw new AppError('FREE_NEURONS_EXHAUSTED','The free allowance is exhausted for today.',429);throw error;}
 }else await reserveFreeNeurons(env,jobId);
 const cfg=freeAIConfiguration(env),bytes=new Uint8Array(await new Response(body).arrayBuffer()),timestamp=String(Date.now()),hash=await gatewayDigest(bytes);
 const reserved=catalogJobKey&&model===COLOR_VISION_MODEL?600:cfg.perJob;
 const headers={'Content-Type':contentType,'X-AI-Model':model,'Idempotency-Key':jobId,'X-Max-Neurons':String(reserved),'X-Max-Charge-USD':'0','X-Request-Timestamp':timestamp,...(env.AI_FREE_GATEWAY_SECRET?{'X-Request-Signature':await gatewaySignature(env.AI_FREE_GATEWAY_SECRET,signatureData(timestamp,jobId,model,String(reserved),hash))}:{})};
 const request=new Request(env.AI_FREE_GATEWAY_URL?new URL('/inference',env.AI_FREE_GATEWAY_URL):'https://free-only-gateway.internal/inference',{method:'POST',headers,body:bytes});
 let response:Response;
 try{response=env.AI_FREE_ONLY_GATEWAY?await env.AI_FREE_ONLY_GATEWAY.fetch(request):await fetch(request,{redirect:'manual',signal:AbortSignal.timeout(model===COLOR_VISION_MODEL?90_000:FREE_GATEWAY_TIMEOUT_MS)})}
 catch(error){const name=error instanceof Error?error.name:'';throw new AppError(name==='TimeoutError'?'FREE_GATEWAY_TIMEOUT':name==='AbortError'?'FREE_GATEWAY_ABORTED':'FREE_GATEWAY_TRANSPORT_FAILED','The provider connection ended without a confirmed result.',503,{inference_attempted:'unknown'})}
 if(!response.ok){
  let code='HTTP_'+response.status,attempted='unknown';
  try{const failure=await response.json() as {error?:unknown;inference_attempted?:unknown};if(typeof failure.error==='string'&&/^[A-Z][A-Z0-9_]{1,80}$/.test(failure.error))code=failure.error;if(typeof failure.inference_attempted==='boolean')attempted=String(failure.inference_attempted)}catch{/* Preserve only status when no structured diagnostic is available. */}
  throw new AppError('FREE_GATEWAY_'+code,'The provider-enforced free allowance is unavailable.',code==='PROVIDER_3030'?422:503,{inference_attempted:attempted,gateway_http_status:String(response.status)});
 }
 if(response.headers.get('X-Zero-Charge-Enforced')!=='true'||!response.headers.get('X-Provider-Receipt'))throw new AppError('FREE_GATEWAY_RECEIPT_MISSING','The free-only provider did not provide its enforcement receipt.',502,{inference_attempted:'unknown'});
 await env.CATALOG_DB!.prepare(catalogJobKey?'UPDATE color_ai_reservation SET provider_receipt=? WHERE request_id=?':'UPDATE ai_free_reservation SET provider_receipt=? WHERE job_id=?').bind(response.headers.get('X-Provider-Receipt'),jobId).run();
 try{return await response.json()}catch{throw new AppError('FREE_GATEWAY_RESPONSE_INVALID','The provider response could not be decoded.',502,{inference_attempted:'true'})}
}
