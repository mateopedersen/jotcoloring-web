import type {APIRoute} from 'astro';
import {env} from 'cloudflare:workers';
import {sitemapIndex} from '../server/sitemap';
import {errorResponse} from '../server/http';
import type {Env} from '../server/types';
export const prerender=false;
export const GET:APIRoute=async({url})=>{try{return await sitemapIndex(env as unknown as Env,url)}catch(error){return errorResponse(error)}};
