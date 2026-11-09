import {NAVIGATION_COLLECTIONS,collectionPath} from '../taxonomy/navigation';
import {canonicalNumberSubject,numberTopic} from '../taxonomy/number-topics';
import type {Env} from './types';
import {categoryPath,categoryById} from '../taxonomy/catalog';
import {AGE_BANDS} from '../age/model';
import {AppError} from './http';
import {ALL_COLORING_PAGES_PATH,catalogAllPath} from '../taxonomy/routes';
import {COLORING_TAXONOMY} from '../taxonomy/catalog';
export const SITEMAP_SEGMENT_SIZE=1000;
// Public files have a tighter limit than the protocol's 50,000 URL ceiling.
// Keep the publication fragments small: their durable ordinals and rebuild
// fences must not change when the public grouping changes.
export const PUBLIC_SITEMAP_LIMIT=10000;
export const escapeXML=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const open='<?xml version="1.0" encoding="UTF-8"?>';
const headers={'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public,max-age=0,must-revalidate','X-Content-Type-Options':'nosniff'};
function originFor(env:Env,requestURL:URL){const local=['localhost','127.0.0.1','[::1]'].includes(requestURL.hostname);const url=new URL(local?requestURL.origin:env.PUBLIC_SITE_URL||requestURL.origin);if(!['https:','http:'].includes(url.protocol))throw new AppError('CONFIGURATION_INVALID','Site URL is invalid.',503);return url.origin;}
export async function buildSitemapIndex(env:Env,url:URL){if(!env.CATALOG_DB)throw new AppError('CATALOG_UNAVAILABLE','Catalog is unavailable.',503);const origin=originFor(env,url);const row=await env.CATALOG_DB.prepare('SELECT MAX(ordinal) AS maximum FROM sitemap_entry').first<{maximum:number|null}>();const segments=Math.ceil((row?.maximum||0)/SITEMAP_SEGMENT_SIZE);if(segments>49999)throw new AppError('SITEMAP_LIMIT','Catalog sitemap index needs a nested site partition.',503);const paths=['static',...Array.from({length:segments},(_,i)=>String(i+1))];return new Response(open+'<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(p=>`<sitemap><loc>${escapeXML(origin+'/sitemaps/'+p+'.xml')}</loc></sitemap>`).join('')+'</sitemapindex>',{headers});}
type SitemapItem={path:string;updated?:string;images?:string[]};
type SitemapRow={ordinal:number;slug:string;updated_at:string;content_id:string;preview_key:string|null;preview_sha:string|null;print_key:string|null;print_sha:string|null};
function imageURL(env:Env,origin:string,id:string,role:string,key:string|null,sha:string|null){
 if(!key||!sha)return null;
 return env.PUBLIC_MEDIA_BASE_URL?`${env.PUBLIC_MEDIA_BASE_URL.replace(/\/$/,'')}/${key.split('/').map(encodeURIComponent).join('/')}`:`${origin}/api/media/${encodeURIComponent(id)}/${role}?v=${sha.slice(0,24)}`;
}
export async function buildSitemapSegment(env:Env,url:URL,segment:string){
 if(!env.CATALOG_DB)throw new AppError('CATALOG_UNAVAILABLE','Catalog is unavailable.',503);
 const origin=originFor(env,url);let entries:SitemapItem[]=[];
 if(segment==='static'){
  const categories=await env.CATALOG_DB.prepare("SELECT DISTINCT cc.category_id AS id FROM content_category cc JOIN content c ON c.id=cc.content_id WHERE c.status='published' AND c.active_version IS NOT NULL ORDER BY cc.category_id").all<{id:string}>();
  const numbers=await env.CATALOG_DB.prepare("SELECT DISTINCT ("+canonicalNumberSubject()+") AS number FROM content c WHERE c.status='published' AND c.active_version IS NOT NULL AND EXISTS(SELECT 1 FROM content_category cc WHERE cc.content_id=c.id AND cc.category_id='numbers')").all<{number:string}>();
  entries=[...AGE_BANDS.map(a=>({path:'/coloring-by-age/'+encodeURIComponent(a.id)+'/'})),{path:'/'},{path:'/coloring-pages/'},{path:'/coloring-by-age/'},{path:'/about/'},{path:'/privacy/'},{path:'/terms/'},{path:'/license/'},{path:'/licensing/'},{path:'/help/'},{path:'/faq/'},{path:'/cookies/'},{path:'/accessibility/'},{path:'/printing-guide/'},{path:'/how-to-use/'},{path:'/contact/'},{path:'/create/photo/'},{path:'/create/text/'},{path:'/studio/'},{path:'/drawing-board/'},...categories.results.filter(x=>categoryById(x.id)).map(x=>({path:categoryPath(x.id)})),...NAVIGATION_COLLECTIONS.filter(c=>c.roots.some(id=>categories.results.some(row=>row.id===id))).map(c=>({path:collectionPath(c.id)})),...numbers.results.flatMap(row=>{const topic=numberTopic(row.number);return topic?[{path:topic.path}]:[];})];
  const published=new Set(categories.results.map(row=>row.id));
  const directories=[...NAVIGATION_COLLECTIONS.filter(c=>COLORING_TAXONOMY.some(t=>t.parent&&c.roots.includes(t.parent)&&published.has(t.id))).map(c=>collectionPath(c.id)),...COLORING_TAXONOMY.filter(c=>published.has(c.id)&&(c.id==='numbers'||COLORING_TAXONOMY.some(child=>child.parent===c.id&&published.has(child.id)))).map(c=>categoryPath(c.id))];
  entries.push({path:ALL_COLORING_PAGES_PATH},...directories.map(path=>({path:catalogAllPath(path)})));
  entries=[...new Map(entries.map(entry=>[entry.path,entry])).values()];
 }else{
  if(!/^[1-9]\d{0,4}$/.test(segment))throw new AppError('NOT_FOUND','Sitemap not found.',404);
  const start=(Number(segment)-1)*SITEMAP_SEGMENT_SIZE;
  const rows=await env.CATALOG_DB.prepare(`SELECT s.ordinal,s.slug,s.updated_at,s.content_id,p.object_key AS preview_key,p.sha256 AS preview_sha,w.object_key AS print_key,w.sha256 AS print_sha FROM sitemap_entry s JOIN content c ON c.id=s.content_id AND c.status='published' AND c.active_version IS NOT NULL LEFT JOIN asset p ON p.content_id=c.id AND p.content_version=c.active_version AND p.role='catalog_preview_bw' AND p.verified=1 LEFT JOIN asset w ON w.content_id=c.id AND w.content_version=c.active_version AND w.role='printable_webp_bw' AND w.verified=1 WHERE s.visibility='published' AND s.ordinal>? AND s.ordinal<=? ORDER BY s.ordinal LIMIT ?`).bind(start,start+SITEMAP_SEGMENT_SIZE,SITEMAP_SEGMENT_SIZE).all<SitemapRow>();
  if(!rows.results.length){const max=await env.CATALOG_DB.prepare('SELECT MAX(ordinal) AS maximum FROM sitemap_entry').first<{maximum:number|null}>();if(start>=(max?.maximum||0))throw new AppError('NOT_FOUND','Sitemap not found.',404);}
  entries=rows.results.map(x=>({path:'/coloring/'+encodeURIComponent(x.slug)+'/',updated:x.updated_at,images:[imageURL(env,origin,x.content_id,'catalog_preview_bw',x.preview_key,x.preview_sha),imageURL(env,origin,x.content_id,'printable_webp_bw',x.print_key,x.print_sha)].filter((v):v is string=>!!v)}));
 }
 const modified=(await env.CATALOG_DB.prepare('SELECT path_key,lastmod FROM discovery_page').all<{path_key:string;lastmod:string}>()).results;
 for(const item of entries){const row=modified.find(x=>(x.path_key.startsWith('category:')?categoryPath(x.path_key.slice(9)):x.path_key)===item.path);if(row&&!item.updated)item.updated=row.lastmod;}
 const xml=open+'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'+entries.map(x=>`<url><loc>${escapeXML(origin+x.path)}</loc>${x.updated?`<lastmod>${escapeXML(new Date(x.updated).toISOString())}</lastmod>`:''}${(x.images||[]).map(image=>`<image:image><image:loc>${escapeXML(image)}</image:loc></image:image>`).join('')}</url>`).join('')+'</urlset>';
 return new Response(xml,{headers});
}

// Public requests read prepared immutable fragments; no full catalog or bucket scan.
export async function sitemapIndex(env:Env,url:URL){
 const groups=publicSitemapGroups(await preparedFragments(env));
 const origin=originFor(env,url),xml=open+'<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+groups.map(g=>`<sitemap><loc>${escapeXML(origin+g.path)}</loc><lastmod>${new Date(lastModified(g.fragments)).toISOString()}</lastmod></sitemap>`).join('')+'</sitemapindex>';
 return new Response(xml,{headers:{...headers,'Last-Modified':new Date(Math.max(...groups.map(g=>lastModified(g.fragments)))).toUTCString(),ETag:'"'+await import('./http').then(m=>m.sha256(new TextEncoder().encode(xml)))+'"'}});
}

type PreparedFragment={segment:string;object_key:string;etag:string;generated_at:string;url_count:number;bytes:number};
export type PublicSitemapKind='pages'|'coloring-pages'|'coloring'|'images';
type SitemapGroup={kind:PublicSitemapKind;part:number;path:string;fragments:PreparedFragment[]};
const MAX_PUBLIC_XML_BYTES=40_000_000;
const lastModified=(fragments:PreparedFragment[])=>Math.max(...fragments.map(r=>Date.parse(r.generated_at)));
async function preparedFragments(env:Env){
 if(!env.CATALOG_DB)throw new AppError('CATALOG_UNAVAILABLE','Catalog unavailable.',503);
 const rows=(await env.CATALOG_DB.prepare('SELECT segment,object_key,etag,generated_at,url_count,bytes FROM discovery_fragment ORDER BY segment').all<PreparedFragment>()).results;
 if(!rows.some(r=>r.segment==='static'))throw new AppError('SITEMAP_PREPARING','Sitemap is being prepared.',503);
 if(rows.some(r=>!Number.isSafeInteger(r.url_count)||r.url_count<0||r.url_count>(r.segment==='static'?PUBLIC_SITEMAP_LIMIT:SITEMAP_SEGMENT_SIZE)||!Number.isSafeInteger(r.bytes)||r.bytes<0||r.bytes>MAX_PUBLIC_XML_BYTES||!Number.isFinite(Date.parse(r.generated_at))))throw new AppError('SITEMAP_UNAVAILABLE','Sitemap metadata is unavailable.',503);
 return rows;
}
function publicSitemapGroups(rows:PreparedFragment[]):SitemapGroup[]{
 const groups:SitemapGroup[]=[],statics=rows.filter(r=>r.segment==='static');
 const add=(kind:PublicSitemapKind,fragments:PreparedFragment[])=>{const part=groups.filter(g=>g.kind===kind).length+1;groups.push({kind,part,path:`/sitemaps/${kind}/${part}.xml`,fragments});};
 add('pages',statics);add('coloring-pages',statics);
 const drawings=rows.filter(r=>/^[1-9]\d{0,4}$/.test(r.segment)&&r.url_count>0).sort((a,b)=>Number(a.segment)-Number(b.segment));
 for(const kind of ['coloring','images'] as const){
  let batch:PreparedFragment[]=[],units=0,bytes=0;
  for(const row of drawings){
   // Every prepared drawing entry contains at most the preview and print image.
   // Thus image files also cap the number of image:loc records at 10,000.
   const multiplier=kind==='images'?2:1;
   if(batch.length&&(units+row.url_count*multiplier>PUBLIC_SITEMAP_LIMIT||bytes+row.bytes>MAX_PUBLIC_XML_BYTES-1000||batch.length>=(kind==='images'?5:10))){add(kind,batch);batch=[];units=0;bytes=0;}
   batch.push(row);units+=row.url_count*multiplier;bytes+=row.bytes;
  }
  if(batch.length)add(kind,batch);
 }
 if(groups.length>PUBLIC_SITEMAP_LIMIT)throw new AppError('SITEMAP_LIMIT','Sitemap index needs a new partition.',503);
 return groups;
}
/** Type-specific public XML is assembled only from already verified, immutable
 * R2 fragments. At most ten bounded reads, with two reads in flight. New normal
 * publications change this view through the existing discovery epoch. */
export async function groupedSitemap(env:Env,url:URL,kind:string,part:string){
 if(!['pages','coloring-pages','coloring','images'].includes(kind)||!/^\d{1,5}$/.test(part)||Number(part)<1||String(Number(part))!==part)throw new AppError('NOT_FOUND','Sitemap not found.',404);
 const group=publicSitemapGroups(await preparedFragments(env)).find(g=>g.kind===kind&&g.part===Number(part));
 if(!group)throw new AppError('NOT_FOUND','Sitemap not found.',404);
 const bodies:string[]=[];
 for(let start=0;start<group.fragments.length;start+=2){
  const texts=await Promise.all(group.fragments.slice(start,start+2).map(async row=>{
   const object=await env.PUBLISHED?.get(row.object_key);
   if(!object||object.size!==row.bytes)throw new AppError('SITEMAP_UNAVAILABLE','Sitemap unavailable.',503);
   const text=await object.text(),entries=text.match(/<url>\s*[\s\S]*?<\/url>/g)||[];
   if(entries.length!==row.url_count||!text.endsWith('</urlset>'))throw new AppError('SITEMAP_UNAVAILABLE','Sitemap entries are unavailable.',503);
   return entries;
  }));
  for(const entries of texts)for(const entry of entries){
   const loc=entry.match(/<loc>([^<]+)<\/loc>/)?.[1];if(!loc)throw new AppError('SITEMAP_UNAVAILABLE','Sitemap location is unavailable.',503);
   const path=loc.replace(/^https?:\/\/[^/]+/,'');
   const catalog=path.startsWith('/coloring-pages/')||path.startsWith('/collections/')||path.startsWith('/coloring-by-age/');
   if(kind==='pages'&&catalog||kind==='coloring-pages'&&!catalog)continue;
   if((kind==='coloring'||kind==='images')&&!path.startsWith('/coloring/'))throw new AppError('SITEMAP_UNAVAILABLE','Invalid drawing sitemap location.',503);
   if(kind==='images'&&!entry.includes('<image:image>'))continue;
   bodies.push(kind==='images'?entry:entry.replace(/<image:image>[\s\S]*?<\/image:image>/g,''));
  }
 }
 const imageCount=bodies.reduce((total,entry)=>total+(entry.match(/<image:loc>/g)||[]).length,0);
 const xml=open+'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'+(kind==='images'?' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"':'')+'>'+bodies.join('')+'</urlset>';
 if(bodies.length>PUBLIC_SITEMAP_LIMIT||imageCount>PUBLIC_SITEMAP_LIMIT||new TextEncoder().encode(xml).length>MAX_PUBLIC_XML_BYTES)throw new AppError('SITEMAP_LIMIT','Sitemap partition exceeds its limit.',503);
 const etag=await import('./http').then(m=>m.sha256(new TextEncoder().encode(kind+':'+part+':'+group.fragments.map(r=>r.etag).join(':'))));
 return new Response(xml,{headers:{...headers,ETag:'"'+etag+'"','Last-Modified':new Date(lastModified(group.fragments)).toUTCString()}});
}
export async function sitemapSegment(env:Env,url:URL,segment:string){
 if(!/^(static|[1-9]\d{0,4})$/.test(segment))throw new AppError('NOT_FOUND','Sitemap not found.',404);
 const row=await env.CATALOG_DB?.prepare('SELECT object_key,etag,generated_at FROM discovery_fragment WHERE segment=?').bind(segment).first<{object_key:string;etag:string;generated_at:string}>();
 if(!row)throw new AppError('NOT_FOUND','Sitemap not found.',404);
 const object=await env.PUBLISHED?.get(row.object_key);if(!object)throw new AppError('SITEMAP_UNAVAILABLE','Sitemap unavailable.',503);
 return new Response(object.body,{headers:{...headers,ETag:'"'+row.etag+'"','Last-Modified':new Date(row.generated_at).toUTCString()}});
}

