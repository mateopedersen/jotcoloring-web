import type {Project,Source} from './model';

// Some WebKit environments cannot persist Blob objects in IndexedDB. Keep the
// original bytes and MIME type in the same transaction, then restore the Blob
// at the storage boundary so the rest of Studio sees the usual project shape.
type StoredBytes={__jcBlob:1;type:string;bytes:ArrayBuffer};
type StoredProject=Omit<Project,'source'|'thumbnail'>&{source:Omit<Source,'blob'>&{blob:Blob|StoredBytes};thumbnail?:Blob|StoredBytes};
async function pack(blob:Blob):Promise<StoredBytes>{return {__jcBlob:1,type:blob.type,bytes:await blob.arrayBuffer()};}
function unpack(value:Blob|StoredBytes):Blob{
 if(value instanceof Blob)return value;
 if(value?.__jcBlob!==1||!(value.bytes instanceof ArrayBuffer))throw new Error('The saved image could not be read.');
 return new Blob([value.bytes],{type:value.type});
}
export async function packProject(project:Project):Promise<StoredProject>{
 return {...project,source:{...project.source,blob:await pack(project.source.blob)},thumbnail:project.thumbnail?await pack(project.thumbnail):undefined};
}
export function unpackProject(project:Project|StoredProject):Project{
 return {...project,source:{...project.source,blob:unpack(project.source.blob)},thumbnail:project.thumbnail?unpack(project.thumbnail):undefined};
}
export function mayRetryBinary(error:unknown):boolean{
 if(!(error instanceof Error))return false;
 const cause=error.cause;
 return ['UnknownError','DataCloneError','NotSupportedError'].includes(error.name)||cause instanceof Error&&['UnknownError','DataCloneError','NotSupportedError'].includes(cause.name);
}
