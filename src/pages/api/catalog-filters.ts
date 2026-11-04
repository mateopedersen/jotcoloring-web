import type {APIRoute} from 'astro';
import {catalogFilterFormURL} from '../../ui/filter-url';

// Native GET fallback uses exactly the same scope-preserving resolver as the UI.
export const GET:APIRoute=({url})=>{
 try{
  const source=url.searchParams.get('source')||'';
  if(!source.startsWith('/')||source.startsWith('//')||source.length>4096)throw new Error('Invalid source.');
  const current=new URL(source,url.origin);
  if(current.origin!==url.origin)throw new Error('Invalid origin.');
  const target=catalogFilterFormURL(current.href,url.searchParams);
  return new Response(null,{status:303,headers:{Location:target.pathname+target.search+target.hash,'Cache-Control':'no-store'}});
 }catch{return new Response('Choose a valid coloring collection and try again.',{status:400,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});}
};
