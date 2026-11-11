import type {APIRoute} from 'astro';
import {env} from 'cloudflare:workers';
import {groupedSitemap} from '../../../server/sitemap';
import {errorResponse} from '../../../server/http';
import type {Env} from '../../../server/types';
export const prerender=false;
export const GET:APIRoute=async({url,params})=>{try{return await groupedSitemap(env as unknown as Env,url,params.kind||'',params.part||'')}catch(error){return errorResponse(error)}};
