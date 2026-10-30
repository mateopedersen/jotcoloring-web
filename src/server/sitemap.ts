import type {Env} from './types';
import {categoryPath,categoryById} from '../taxonomy/catalog';
import {AGE_BANDS} from '../age/model';
import {AppError} from './http';
export const SITEMAP_SEGMENT_SIZE=10000;
export const escapeXML=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const open='<?xml version="1.0" encoding="UTF-8"?>';
const headers={'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public,max-age=300,s-maxage=600','X-Content-Type-Options':'nosniff'};
function originFor(env:Env,requestURL:URL){const local=['localhost','127.0.0.1','[::1]'].includes(requestURL.hostname);const url=new URL(local?requestURL.origin:env.PUBLIC_SITE_URL||requestURL.origin);if(!['https:','http:'].includes(url.protocol))throw new AppError('CONFIGURATION_INVALID','Site URL is invalid.',503);return url.origin;}
export async function sitemapIndex(env:Env,url:URL){if(!env.CATALOG_DB)throw new AppError('CATALOG_UNAVAILABLE','Catalog is unavailable.',503);const origin=originFor(env,url);const row=await env.CATALOG_DB.prepare('SELECT MAX(ordinal) AS maximum FROM sitemap_entry').first<{maximum:number|null}>();const segments=Math.ceil((row?.maximum||0)/SITEMAP_SEGMENT_SIZE);if(segments>49999)throw new AppError('SITEMAP_LIMIT','Catalog sitemap index needs a nested site partition.',503);const paths=['static',...Array.from({length:segments},(_,i)=>String(i+1))];return new Response(open+'<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(p=>`<sitemap><loc>${escapeXML(origin+'/sitemaps/'+p+'.xml')}</loc></sitemap>`).join('')+'</sitemapindex>',{headers});}
type SitemapItem={path:string;updated?:string;images?:string[]};
type SitemapRow={ordinal:number;slug:string;updated_at:string;content_id:string;preview_key:string|null;preview_sha:string|null;print_key:string|null;print_sha:string|null};
function imageURL(env:Env,origin:string,id:string,role:string,key:string|null,sha:string|null){
 if(!key||!sha)return null;
 return env.PUBLIC_MEDIA_BASE_URL?`${env.PUBLIC_MEDIA_BASE_URL.replace(/\/$/,'')}/${key.split('/').map(encodeURIComponent).join('/')}`:`${origin}/api/media/${encodeURIComponent(id)}/${role}?v=${sha.slice(0,24)}`;
}
export async function sitemapSegment(env:Env,url:URL,segment:string){
 if(!env.CATALOG_DB)throw new AppError('CATALOG_UNAVAILABLE','Catalog is unavailable.',503);
 const origin=originFor(env,url);let entries:SitemapItem[]=[];
 if(segment==='static'){
  const categories=await env.CATALOG_DB.prepare('SELECT id FROM category ORDER BY id').all<{id:string}>();
  entries=[...AGE_BANDS.map(a=>({path:'/coloring-by-age/'+encodeURIComponent(a.id)+'/'})),{path:'/'},{path:'/coloring-pages/'},{path:'/coloring-by-age/'},{path:'/about/'},{path:'/privacy/'},{path:'/terms/'},{path:'/license/'},{path:'/licensing/'},{path:'/help/'},{path:'/faq/'},{path:'/cookies/'},{path:'/accessibility/'},{path:'/printing-guide/'},{path:'/how-to-use/'},{path:'/contact/'},{path:'/create/photo/'},{path:'/create/text/'},{path:'/studio/'},{path:'/drawing-board/'},...categories.results.filter(x=>categoryById(x.id)).map(x=>({path:categoryPath(x.id)}))];
 }else{
  if(!/^[1-9]\d{0,4}$/.test(segment))throw new AppError('NOT_FOUND','Sitemap not found.',404);
  const start=(Number(segment)-1)*SITEMAP_SEGMENT_SIZE;
  const rows=await env.CATALOG_DB.prepare(`SELECT s.ordinal,s.slug,s.updated_at,s.content_id,p.object_key AS preview_key,p.sha256 AS preview_sha,w.object_key AS print_key,w.sha256 AS print_sha FROM sitemap_entry s JOIN content c ON c.id=s.content_id AND c.status='published' AND c.active_version IS NOT NULL LEFT JOIN asset p ON p.content_id=c.id AND p.content_version=c.active_version AND p.role='catalog_preview_bw' AND p.verified=1 LEFT JOIN asset w ON w.content_id=c.id AND w.content_version=c.active_version AND w.role='printable_webp_bw' AND w.verified=1 WHERE s.visibility='published' AND s.ordinal>? AND s.ordinal<=? ORDER BY s.ordinal LIMIT ?`).bind(start,start+SITEMAP_SEGMENT_SIZE,SITEMAP_SEGMENT_SIZE).all<SitemapRow>();
  if(!rows.results.length){const max=await env.CATALOG_DB.prepare('SELECT MAX(ordinal) AS maximum FROM sitemap_entry').first<{maximum:number|null}>();if(start>=(max?.maximum||0))throw new AppError('NOT_FOUND','Sitemap not found.',404);}
  entries=rows.results.map(x=>({path:'/coloring/'+encodeURIComponent(x.slug)+'/',updated:x.updated_at,images:[imageURL(env,origin,x.content_id,'catalog_preview_bw',x.preview_key,x.preview_sha),imageURL(env,origin,x.content_id,'printable_webp_bw',x.print_key,x.print_sha)].filter((v):v is string=>!!v)}));
 }
 const xml=open+'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'+entries.map(x=>`<url><loc>${escapeXML(origin+x.path)}</loc>${x.updated?`<lastmod>${escapeXML(new Date(x.updated).toISOString())}</lastmod>`:''}${(x.images||[]).map(image=>`<image:image><image:loc>${escapeXML(image)}</image:loc></image:image>`).join('')}</url>`).join('')+'</urlset>';
 return new Response(xml,{headers});
}
