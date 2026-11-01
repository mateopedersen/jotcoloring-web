import type {Env} from './types';

export interface ResponseCache {
  match(key:Request):Promise<Response|undefined>;
  put(key:Request,response:Response):Promise<void>;
}
type Policy={kind:'html'|'json'|'media'|'xml'|'text'|'redirect';catalog:boolean;seconds:number};
const staticPages=new Set(['about','accessibility','contact','cookies','faq','help','how-to-use','license','licensing','printing-guide','privacy','terms']);
const queryKeys=new Set(['q','page','limit','sort','category','subcategory','age','difficulty','recommended_age','marketingOnly','cursor','popular']);

/** Only published documents qualify. Private tools, jobs, admin, errors and writes never do. */
export function publicCachePolicy(request:Request):Policy|undefined{
  if(!['GET','HEAD'].includes(request.method)||request.headers.has('authorization')||request.headers.has('cf-access-jwt-assertion')||request.headers.has('range'))return;
  // Preserve authenticated/session semantics, including future personalized headers.
  if(request.headers.has('cookie')&&request.headers.get('cookie')?.trim())return;
  const url=new URL(request.url),path=url.pathname;
  if(url.search.length>1800)return;
  if(!url.search&&path==='/robots.txt')return{kind:'text',catalog:false,seconds:600};
  if(!url.search&&(path==='/sitemap.xml'||/^\/sitemaps\/(?:static|[1-9]\d{0,4})\.xml$/.test(path)))return{kind:'xml',catalog:true,seconds:600};
  if(/^\/api\/color-reference\/[A-Za-z0-9_-]+$/.test(path)&&[...url.searchParams.keys()].every(k=>k==='v'||k==='image')&&/^[a-f0-9]{24}$/.test(url.searchParams.get('v')||'')&&(!url.searchParams.has('image')||/^[a-f0-9]{64}$/.test(url.searchParams.get('image')||'')))return{kind:url.searchParams.has('image')?'media':'json',catalog:true,seconds:60};
  if(/^\/api\/(?:media|download)\/[A-Za-z0-9_-]+\/[A-Za-z0-9_]+$/.test(path)){
    if([...url.searchParams.keys()].some(k=>k!=='v'&&!(k==='display'&&path.startsWith('/api/media/')&&['240','320','400','600'].includes(url.searchParams.get(k)||'')))||!/^[a-f0-9]{24}(?:[a-f0-9]{40})?$/.test(url.searchParams.get('v')||''))return;
    return path.startsWith('/api/download/')?{kind:'redirect',catalog:true,seconds:60}:{kind:'media',catalog:true,seconds:300};
  }
  if([...url.searchParams.keys()].some(k=>!queryKeys.has(k)))return;
  if(/^\/api\/(?:catalog|search|categories)$/.test(path)||/^\/api\/(?:content|catalog)\/[A-Za-z0-9_-]+$/.test(path))return{kind:'json',catalog:true,seconds:60};
  if(path==='/'||/^\/coloring-pages\/(?:[a-z0-9-]+\/){0,2}$/.test(path)||/^\/coloring\/[a-z0-9-]+\/$/.test(path)||/^\/coloring-by-age\/(?:[a-z0-9-]+\/)?$/.test(path))return{kind:'html',catalog:true,seconds:120};
  if(!url.search&&staticPages.has(path.replace(/^\/|\/$/g,''))&&path.endsWith('/'))return{kind:'html',catalog:false,seconds:600};
}

function browserPolicy(policy:Policy){
  return policy.kind==='html'||policy.kind==='redirect'?'public, max-age=0, must-revalidate':policy.kind==='json'?'public, max-age=30':'public, max-age=300';
}

export function publicCacheKey(request:Request,environment:string,release:string,epoch:string){
  const url=new URL(request.url);url.hash='';url.searchParams.sort();
  const country=(request as Request&{cf?:{country?:string}}).cf?.country;
  const geo=typeof country==='string'&&/^[A-Z]{2}$/.test(country)?country:'unknown';
  // A synthetic path prevents user query parameters from colliding with cache metadata.
  const key=new URL('/__jot_cache/'+encodeURIComponent(environment)+'/'+encodeURIComponent(release)+'/'+geo+'/'+encodeURIComponent(epoch),url.origin);
  key.searchParams.set('page',url.pathname+url.search);
  return new Request(key,{method:'GET'});
}

export async function withPublicCache(request:Request,env:Env,release:string,next:()=>Promise<Response>,cache:ResponseCache|undefined,waitUntil:(promise:Promise<unknown>)=>void):Promise<Response>{
  const policy=publicCachePolicy(request),url=new URL(request.url);
  const enabled=cache&&policy&&['staging','production'].includes(env.APP_ENV||'')&&env.PUBLIC_SITE_URL&&url.origin===new URL(env.PUBLIC_SITE_URL).origin;
  const finish=(response:Response,state:string)=>{
    const headers=new Headers(response.headers);headers.set('X-JotColoring-Cache',state);
    if(state==='HIT'||state==='MISS')headers.set('Cache-Control',browserPolicy(policy!));
    return new Response(request.method==='HEAD'?null:response.body,{status:response.status,statusText:response.statusText,headers});
  };
  if(!enabled)return finish(await next(),'BYPASS');
  let epoch='static';
  if(policy.catalog){
    if(!env.CATALOG_DB)return finish(await next(),'BYPASS');
    try{
      // Publication/archive events advance this indexed sequence atomically with the content.
      // Query it for each request: no process-local TTL can hide a withdrawal or new revision.
      // The search projection can finish after publication. Its monotonic receipt
      // also invalidates any result cached while that publication was still queued.
      const row=await env.CATALOG_DB.prepare('SELECT seq,(SELECT rowid FROM processed_event ORDER BY rowid DESC LIMIT 1) AS projected FROM outbox_event ORDER BY seq DESC LIMIT 1').first<{seq:number;projected:number|null}>();
      epoch=String(row?.seq||0)+'.'+String(row?.projected||0);
    }catch{return finish(await next(),'BYPASS');}
  }
  const key=publicCacheKey(request,env.APP_ENV!,release,epoch);
  try{
    const hit=await cache!.match(key);
    if(hit){
      if(request.headers.get('if-none-match')&&request.headers.get('if-none-match')===hit.headers.get('etag')){
        return finish(new Response(null,{status:304,headers:{ETag:hit.headers.get('etag')!}}),'HIT');
      }
      return finish(hit,'HIT');
    }
  }catch{/* The cache is an optimization; an unavailable cache never blocks the origin. */}
  const response=await next(),type=response.headers.get('content-type')||'';
  const correctType=policy.kind==='html'?type.includes('text/html'):policy.kind==='json'?type.includes('application/json'):policy.kind==='xml'?type.includes('application/xml'):policy.kind==='text'?type.includes('text/plain'):type.startsWith('image/')||type.includes('application/pdf');
  let safeRedirect=false;
  if(policy.kind==='redirect'&&response.status===302){try{const target=new URL(response.headers.get('location')||'');safeRedirect=target.protocol==='https:'&&target.hostname==='assets.jotcoloring.com'&&target.pathname.startsWith('/published/')&&!target.username&&!target.password&&!target.port;}catch{/* Invalid or relative redirects are never cached. */}}
  if(request.method==='GET'&&((response.status===200&&correctType)||safeRedirect)&&!response.headers.has('set-cookie')&&!/\b(?:private|no-store)\b/i.test(response.headers.get('cache-control')||'')){
    const stored=response.clone(),headers=new Headers(stored.headers);headers.set('Cache-Control',`public, max-age=${policy.seconds}`);
    waitUntil(cache!.put(key,new Response(stored.body,{status:response.status,headers})).catch(()=>{}));
    return finish(response,'MISS');
  }
  return finish(response,'BYPASS');
}
