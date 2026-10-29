import type {APIRoute} from 'astro';
import {env} from 'cloudflare:workers';
import {publicAsset} from '../../../server/assets';
import type {Env} from '../../../server/types';
import {AppError} from '../../../server/http';
const handle:APIRoute=async({params,request})=>{const slug=params.file?.replace(/\.png$/,'');if(!params.file?.endsWith('.png')||!slug||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return new Response(null,{status:404});try{const bindings=env as unknown as Env;const item=await bindings.CATALOG_DB?.prepare("SELECT id FROM content WHERE slug=? AND status='published' AND active_version IS NOT NULL").bind(slug).first<{id:string}>();if(!item)return new Response(null,{status:404});const response=await publicAsset(request,bindings,item.id,'social_og');const headers=new Headers(response.headers);headers.set('Cross-Origin-Resource-Policy','cross-origin');headers.set('Access-Control-Allow-Origin','*');if(response.status!==304)headers.set('Content-Type','image/png');return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers});}catch(error){return new Response(null,{status:error instanceof AppError?error.status:503});}};
export const GET=handle;export const HEAD=handle;
