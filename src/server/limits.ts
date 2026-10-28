import type {Env} from './types';
import {AppError,sha256} from './http';
/** Canonical D1 performs the increment atomically; no eventually-consistent cache counters. */
export async function rateLimit(request:Request,env:Env,scope:string,maximum:number,windowSeconds=60){
 if(!env.CATALOG_DB||!env.SESSION_SIGNING_SECRET)throw new AppError('SESSION_UNAVAILABLE','Private requests have not been configured.',503);
 const ip=request.headers.get('cf-connecting-ip')||(env.APP_ENV==='local'?'local-client':null);if(!ip)throw new AppError('FORBIDDEN','Verified request address is required.',403);
 const key=await sha256(env.SESSION_SIGNING_SECRET+'\0'+ip),window=Math.floor(Date.now()/1000/windowSeconds)*windowSeconds;
 const result=await env.CATALOG_DB.prepare('INSERT INTO request_limit(scope,key_hash,window_start,count) VALUES(?,?,?,1) ON CONFLICT(scope,key_hash,window_start) DO UPDATE SET count=count+1 RETURNING count').bind(scope,key,window).first<{count:number}>();
 if(!result||result.count>maximum)throw new AppError('RATE_LIMITED','Too many requests. Please wait before trying again.',429);
}
export async function verifyTurnstile(request:Request,env:Env,token:unknown){if(!env.TURNSTILE_SECRET_KEY)return;if(typeof token!=='string'||!token||token.length>2048)throw new AppError('CHALLENGE_REQUIRED','Complete the verification challenge.',403);const result=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:token,remoteip:request.headers.get('cf-connecting-ip'),idempotency_key:crypto.randomUUID()})});const body=await result.json() as {success:boolean;hostname?:string};if(!result.ok||!body.success||body.hostname!==new URL(request.url).hostname)throw new AppError('CHALLENGE_FAILED','Verification failed. Please try again.',403);}
