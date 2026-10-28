import {gatewayDigest,signatureData,verifyGatewaySignature,GATEWAY_MODEL} from '../../src/server/gateway-signature';
interface GatewayEnv {AI:{run(model:string,input:unknown,options?:{returnRawResponse:boolean}):Promise<unknown>};AI_FREE_GATEWAY_SECRET:string;ACCOUNT_BILLING_PLAN:string;ENFORCED_ACCOUNT_ID:string}
const json=(value:unknown,status:number,headers:Record<string,string>={})=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'private,no-store','X-Content-Type-Options':'nosniff',...headers}});
/** Only documented numeric platform codes cross the boundary, never request text. */
export function safeProviderFailure(error:unknown){
 const known=new Set(['5007','5004','3039','3003','5018','5016','3023','3041','5035','5019','5005','3042','3006','3007','3008','3036','3040']);
 const value=error as {code?:unknown;message?:unknown};const explicit=String(value?.code||'');
 const code=known.has(explicit)?explicit:typeof value?.message==='string'?(value.message.match(/\b(?:5007|5004|3039|3003|5018|5016|3023|3041|5035|5019|5005|3042|3006|3007|3008|3036|3040)\b/)?.[0]):undefined;
 return code?'PROVIDER_'+code:'PROVIDER_ERROR';
}
async function providerErrorCode(response:Response){
 const reader=response.body?.getReader();if(!reader)return 'PROVIDER_HTTP_'+response.status;
 let text='',size=0;const decoder=new TextDecoder();
 for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>8192){await reader.cancel();return 'PROVIDER_HTTP_'+response.status}text+=decoder.decode(value,{stream:true})}
 try{const body=JSON.parse(text) as {internalCode?:unknown;errors?:{code?:unknown}[]};return safeProviderFailure({code:body.internalCode||body.errors?.[0]?.code})}catch{return 'PROVIDER_HTTP_'+response.status}
}
async function boundedBody(request:Request){const reader=request.body?.getReader();if(!reader)throw new Error('invalid');const chunks:Uint8Array[]=[];let size=0;for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>1_500_000){await reader.cancel();throw new Error('limit')}chunks.push(value)}const b=new Uint8Array(size);let at=0;for(const c of chunks){b.set(c,at);at+=c.length}return b;}
export default {async fetch(request:Request,env:GatewayEnv){
 const url=new URL(request.url);if(url.pathname!=='/inference'||request.method!=='POST')return json({error:'NOT_FOUND'},404);
 if(env.ACCOUNT_BILLING_PLAN!=='workers_free'||!/^\w{32}$/.test(env.ENFORCED_ACCOUNT_ID||'')||!env.AI_FREE_GATEWAY_SECRET||env.AI_FREE_GATEWAY_SECRET.length<32||!env.AI)return json({error:'FREE_ONLY_NOT_CONFIGURED'},503);
 const timestamp=request.headers.get('X-Request-Timestamp')||'',id=request.headers.get('Idempotency-Key')||'',model=request.headers.get('X-AI-Model')||'',cap=request.headers.get('X-Max-Neurons')||'',signature=request.headers.get('X-Request-Signature')||'';
 if(!/^\d{13}$/.test(timestamp)||Math.abs(Date.now()-Number(timestamp))>60000||!/^[0-9a-f-]{36}$/.test(id)||model!==GATEWAY_MODEL||!/^\d{3,5}$/.test(cap)||Number(cap)<300||Number(cap)>10000)return json({error:'UNAUTHORIZED'},401);
 try{const bytes=await boundedBody(request),data=signatureData(timestamp,id,model,cap,await gatewayDigest(bytes));if(!await verifyGatewaySignature(env.AI_FREE_GATEWAY_SECRET,data,signature))return json({error:'UNAUTHORIZED'},401);
 const contentType=request.headers.get('Content-Type')||'';if(!contentType.startsWith('multipart/form-data;'))return json({error:'INVALID_INPUT'},422);
 const form=await new Response(bytes,{headers:{'Content-Type':contentType}}).formData();const allowed=new Set(['prompt','width','height','input_image_0']);for(const k of form.keys())if(!allowed.has(k)||form.getAll(k).length!==1)return json({error:'INVALID_INPUT'},422);
 const prompt=form.get('prompt'),width=String(form.get('width')),height=String(form.get('height'));if(typeof prompt!=='string'||prompt.length<10||prompt.length>3000||!['1024x1024','1024x1536','1536x1024'].includes(width+'x'+height))return json({error:'INVALID_INPUT'},422);
 const image=form.get('input_image_0');if(image){if(typeof image==='string'||image.type!=='image/png'||image.size>1_400_000)return json({error:'INVALID_PHOTO'},422);const b=new Uint8Array(await image.arrayBuffer());if(b.length<24||![137,80,78,71,13,10,26,10].every((x,i)=>b[i]===x))return json({error:'INVALID_PHOTO'},422);const view=new DataView(b.buffer,b.byteOffset,b.byteLength),w=view.getUint32(16),h=view.getUint32(20);if(w<1||h<1||w>=512||h>=512)return json({error:'INVALID_PHOTO'},422);}
 // No retries: unknown provider outcome is reconciled by the main job ledger.
 const encoded=new Response(form);let result:Response;try{result=await env.AI.run(GATEWAY_MODEL,{multipart:{body:encoded.body,contentType:encoded.headers.get('content-type')}},{returnRawResponse:true}) as Response}catch(error){return json({error:safeProviderFailure(error),inference_attempted:true},503)}
 if(!(result instanceof Response))return json({error:'INVALID_PROVIDER_OUTPUT',inference_attempted:true},502);
 if(!result.ok)return json({error:await providerErrorCode(result),inference_attempted:true},503);
 if(!result.body||!result.headers.get('content-type')?.includes('application/json')||Number(result.headers.get('content-length')||'0')>12_000_100)return json({error:'INVALID_PROVIDER_OUTPUT',inference_attempted:true},502);
 // Forward the byte stream without parsing/stringifying megabytes of base64 on
 // the Workers Free CPU allowance. The private jobs worker validates the result.
 return new Response(result.body,{status:200,headers:{'Content-Type':'application/json','Cache-Control':'private,no-store','X-Content-Type-Options':'nosniff','X-Zero-Charge-Enforced':'true','X-Provider-Receipt':'free-account:'+env.ENFORCED_ACCOUNT_ID+':'+id}});
 }catch{return json({error:'GATEWAY_INPUT_ERROR',inference_attempted:false},422);}
}};
