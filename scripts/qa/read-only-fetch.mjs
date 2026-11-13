/** Bounded retries for release verification reads. Never replay a mutation. */
import {setTimeout as delay} from 'node:timers/promises';

/** @param {Response} response */
export function transientReadStatus(response){
  return [408,429,500,502,503,504].includes(response.status);
}

/** @param {any} error */
function transientNetworkError(error){
  if(error?.name==='TimeoutError')return true;
  return new Set(['UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_SOCKET',
    'ECONNRESET','ECONNREFUSED','ETIMEDOUT','EAI_AGAIN','ENETUNREACH','EHOSTUNREACH'])
    .has(error?.cause?.code||error?.code);
}

/**
 * @param {RequestInfo|URL} url
 * @param {RequestInit} options
 * @param {{fetchImpl?:(url:RequestInfo|URL,options:RequestInit)=>Promise<Response>,wait?:(milliseconds:number)=>Promise<unknown>,retryResponse?:(response:Response)=>boolean|Promise<boolean>,timeoutMs?:number}} policy
 * @returns {Promise<Response>}
 */
export async function readOnlyFetch(url,options={},policy={}){
  const method=(options.method||'GET').toUpperCase();
  if(!['GET','HEAD'].includes(method)||options.body!=null)throw new TypeError('Only bodyless GET and HEAD verification reads may be retried');
  const {fetchImpl=fetch,wait=delay,retryResponse=transientReadStatus,timeoutMs=20000}=policy;
  const pauses=[1000,4000];
  for(let attempt=0;attempt<3;attempt++){
    options.signal?.throwIfAborted();
    const timeout=AbortSignal.timeout(timeoutMs);
    const signal=options.signal?AbortSignal.any([options.signal,timeout]):timeout;
    let response;
    try{
      response=await fetchImpl(url,{...options,method,signal});
    }catch(error){
      if(options.signal?.aborted||!transientNetworkError(error)||attempt===2)throw error;
      await wait(pauses[attempt]);
      continue;
    }
    if(attempt===2||!await retryResponse(response))return response;
    await response.body?.cancel();
    await wait(pauses[attempt]);
  }
  throw new Error('Verification read exhausted its retry bound');
}
