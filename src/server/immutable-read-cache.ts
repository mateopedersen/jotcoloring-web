import type {Bucket,StoredObject} from './types';
/** Per-invocation bytes only, for the exact immutable keys in one signed bundle.
 * This is not an approval cache: callers still check hash, MIME, current review
 * and social binding. Published objects and recovery readbacks never use it. */
export function immutableReadCache(bucket:Bucket,keys:readonly string[],maxBytes=20_000_000):Bucket{
 const allowed=new Set(keys),cache=new Map<string,{bytes:Uint8Array;metadata:Omit<StoredObject,'body'|'arrayBuffer'|'text'>}>();let used=0;
 const forget=(key:string)=>{const old=cache.get(key);if(old){used-=old.bytes.length;cache.delete(key);}};
 const fresh=(entry:{bytes:Uint8Array;metadata:Omit<StoredObject,'body'|'arrayBuffer'|'text'>}):StoredObject=>({...entry.metadata,body:new Blob([new Uint8Array(entry.bytes)]).stream(),arrayBuffer:async()=>new Uint8Array(entry.bytes).buffer,text:async()=>new TextDecoder().decode(entry.bytes)});
 return {
  async get(key,options){
   if(options!==undefined||!allowed.has(key))return bucket.get(key,options);
   const hit=cache.get(key);if(hit)return fresh(hit);
   const object=await bucket.get(key);if(!object||object.size>maxBytes-used)return object;
   const bytes=new Uint8Array(await object.arrayBuffer());if(bytes.length!==object.size||bytes.length>maxBytes-used)return {...object,body:new Blob([bytes]).stream(),arrayBuffer:async()=>bytes.slice().buffer,text:async()=>new TextDecoder().decode(bytes)};
   const metadata={key:object.key,size:object.size,etag:object.etag,httpEtag:object.httpEtag,httpMetadata:object.httpMetadata,customMetadata:object.customMetadata};const entry={bytes,metadata};cache.set(key,entry);used+=bytes.length;return fresh(entry);
  },
  head(key){return bucket.head(key);},
  async put(key,value,options){forget(key);return bucket.put(key,value,options);},
  async delete(keys){for(const key of typeof keys==='string'?[keys]:keys)forget(key);return bucket.delete(keys);},
  list(options){return bucket.list(options);}
 };
}
