import {createRemoteJWKSet,jwtVerify,SignJWT,type JWTPayload} from 'jose';
import type {Env} from './types';
import {AppError,requireOrigin} from './http';
export function adminIdentity(payload:JWTPayload,env:Env){if(payload.type!=='app')throw new Error('token type');if(typeof payload.sub==='string'&&payload.sub){const subjectAllowed=(env.ADMIN_ALLOWED_SUBJECTS||'').split(',').map(x=>x.trim()).includes(payload.sub),emailAllowed=typeof payload.email==='string'&&(env.ADMIN_ALLOWED_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean).includes(payload.email.toLowerCase());if(!subjectAllowed&&!emailAllowed)throw new Error('identity');return payload.sub;}if(payload.sub===''&&typeof payload.common_name==='string'&&(env.ADMIN_ALLOWED_SERVICE_TOKENS||'').split(',').map(x=>x.trim()).includes(payload.common_name))return 'service:'+payload.common_name;throw new Error('identity');}
const jwksCache=new Map<string,ReturnType<typeof createRemoteJWKSet>>();
export async function requireAdmin(request:Request,env:Env){
 const issuer=env.ACCESS_TEAM_DOMAIN?.replace(/\/$/,'');if(!issuer||!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer)||!env.ACCESS_APPLICATION_AUD||(!env.ADMIN_ALLOWED_SUBJECTS&&!env.ADMIN_ALLOWED_SERVICE_TOKENS&&!env.ADMIN_ALLOWED_EMAILS))throw new AppError('ADMIN_UNAVAILABLE','Administrator access has not been configured.',503);
 const token=request.headers.get('cf-access-jwt-assertion');if(!token)throw new AppError('UNAUTHORIZED','Sign in through the configured administrator access.',401);
 try{let jwks=jwksCache.get(issuer);if(!jwks){jwks=createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));jwksCache.set(issuer,jwks)}const {payload}=await jwtVerify(token,jwks,{issuer,audience:env.ACCESS_APPLICATION_AUD,algorithms:['RS256'],requiredClaims:['exp','iat','sub','aud','iss']});const subject=adminIdentity(payload,env);if(!['GET','HEAD','OPTIONS'].includes(request.method))requireOrigin(request);return {subject};}catch{throw new AppError('FORBIDDEN','Administrator access was not accepted.',403)}
}
const cookieName='jc_session';
function secret(env:Env){if(!env.SESSION_SIGNING_SECRET||env.SESSION_SIGNING_SECRET.length<32)throw new AppError('SESSION_UNAVAILABLE','Private generation is not configured yet.',503);return new TextEncoder().encode(env.SESSION_SIGNING_SECRET)}
export async function session(request:Request,env:Env,create=false):Promise<{owner:string;cookie?:string}>{
 const cookie=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
 if(cookie){try{const {payload}=await jwtVerify(cookie,secret(env),{issuer:'jotcoloring',audience:'creator',algorithms:['HS256']});if(typeof payload.sub==='string')return {owner:payload.sub}}catch{/* expired or forged cookies never grant ownership */}}
 if(!create)throw new AppError('UNAUTHORIZED','Start a private session to continue.',401);
 const owner=crypto.randomUUID();const token=await new SignJWT({}).setProtectedHeader({alg:'HS256'}).setSubject(owner).setIssuer('jotcoloring').setAudience('creator').setIssuedAt().setExpirationTime('7d').sign(secret(env));
 const secure=new URL(request.url).protocol==='https:'?'; Secure':'';return {owner,cookie:`${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${secure}`};
}
