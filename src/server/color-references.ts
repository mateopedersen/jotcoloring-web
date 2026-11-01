import type {Env} from './types';
import {AppError,json,sha256} from './http';
import {colorRecordKey,validateColorRecord} from '../coloring/reference-record';

export async function publicColorReference(request:Request,env:Env,id:string){
 const v=new URL(request.url).searchParams.get('v');
 if(!/^[a-zA-Z0-9_-]{1,128}$/.test(id)||!v||!/^[a-f0-9]{24}$/.test(v))throw new AppError('NOT_FOUND','Color reference not found.',404);
 if(!env.CATALOG_DB||!env.PUBLISHED)throw new AppError('STORAGE_UNAVAILABLE','Color reference unavailable.',503);
 const source=await env.CATALOG_DB.prepare("SELECT a.sha256,p.sha256 AS preview_sha256 FROM asset a JOIN content c ON c.id=a.content_id AND c.active_version=a.content_version JOIN asset p ON p.content_id=c.id AND p.content_version=c.active_version AND p.role='catalog_preview_bw' AND p.verified=1 WHERE c.id=? AND c.status='published' AND a.role='printable_webp_bw' AND a.verified=1").bind(id).first<{sha256:string;preview_sha256:string}>();
 if(!source||source.sha256.slice(0,24)!==v)throw new AppError('NOT_FOUND','Coloring page not found.',404);
 const object=await env.PUBLISHED.get(colorRecordKey(source.sha256));
 if(!object)return json({status:'pending',reference:null},200,{'Cache-Control':'public,max-age=30,s-maxage=60'});
 if(object.size>8000)throw new AppError('ASSET_INVALID','Color reference unavailable.',503);
 let record;try{record=validateColorRecord(JSON.parse(await object.text()),source.sha256,id);}catch{throw new AppError('ASSET_INVALID','Color reference unavailable.',503);}
 if(record.preview_sha256!==source.preview_sha256)return json({status:'pending',reference:null},200,{'Cache-Control':'public,max-age=30'});
 const image=new URL(request.url).searchParams.get('image');
 if(image){
  if(image!==record.reference_sha256)throw new AppError('NOT_FOUND','Color reference not found.',404);
  const file=await env.PUBLISHED.get(record.key);if(!file||file.size!==record.bytes)throw new AppError('ASSET_INVALID','Color reference unavailable.',503);
  const bytes=await file.arrayBuffer();if(await sha256(new Uint8Array(bytes))!==record.reference_sha256)throw new AppError('ASSET_INVALID','Color reference unavailable.',503);
  return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':'image/webp','Content-Length':String(record.bytes),'Cache-Control':'public,max-age=300','X-Content-Type-Options':'nosniff',ETag:`"${record.reference_sha256}"`}});
 }
 const reference=env.PUBLIC_MEDIA_BASE_URL==='https://assets.jotcoloring.com'?`https://assets.jotcoloring.com/${record.key}`:`/api/color-reference/${encodeURIComponent(id)}?v=${v}&image=${record.reference_sha256}`;
 return json({status:'ready',reference,sha256:record.reference_sha256,width:record.width,height:record.height},200,{'Cache-Control':'public,max-age=30,s-maxage=60'});
}
