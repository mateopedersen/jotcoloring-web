import type {APIRoute} from 'astro';
import {env} from 'cloudflare:workers';
import {sitemapSegment} from '../../server/sitemap';
import {errorResponse} from '../../server/http';
import type {Env} from '../../server/types';
export const prerender=false;
export const GET:APIRoute=async({url,params})=>{try{return await sitemapSegment(env as unknown as Env,url,params.segment||'')}catch(error){return errorResponse(error)}};
