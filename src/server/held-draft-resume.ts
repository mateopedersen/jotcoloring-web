import type {Manifest} from './types';
import {canonicalJSON} from './http';
const heldIds=new Set(['jc-sonic-easy-001','jc-sonic-easy-011','jc-sonic-easy-021']);
export const IMPORT_ACTOR='operator:owner-authorized-import-20261031';
/** Preserve the three interrupted original drafts while publishing their reviewed topic revision. */
export function heldDraftRevision(prepared:Manifest,existing:{active_version:number|null;latest_version:number;status:string},original:Manifest,current:Manifest,heldJob:{owner:string;status:string;error_code:string}|null):Manifest{
 if(!heldIds.has(prepared.content_id)||!heldJob||heldJob.owner!==IMPORT_ACTOR||heldJob.status!=='failed'||heldJob.error_code!=='OWNER_FULL_BATCH_HOLD')throw Error('Existing content is not an owner-held draft');
 if(![1,2].includes(existing.latest_version)||existing.latest_version===1&&(existing.active_version!==null||existing.status!=='draft'))throw Error('Held draft changed concurrently');
 for(const key of ['content_id','slug','title','description','alt_text'] as const)if(original[key]!==prepared[key])throw Error('Held draft source identity changed');
 const line=(m:Manifest)=>m.assets.find(a=>a.role==='printable_webp_bw')?.sha256;
 const source=(m:Manifest)=>m.provenance.reference?.match(/Source SHA-256 ([a-f0-9]{64})/)?.[1];
 if(!line(original)||line(original)!==line(prepared)||!source(original)||source(original)!==source(prepared))throw Error('Held draft artwork changed');
 const m=structuredClone(prepared),ids=new Map(m.assets.map(a=>[a.asset_id,`${m.content_id}-${a.role}-v2`]));
 m.import_action='update';m.expected_version=1;m.idempotency_key+='-held-revision-2';
 for(const a of m.assets){a.asset_id=ids.get(a.asset_id)!;a.asset_version=2;a.object_key=`incoming/${m.content_id}/2/${a.role}-${a.sha256.slice(0,24)}.${a.mime==='application/pdf'?'pdf':a.mime.split('/')[1]}`;if(a.source_asset_id)a.source_asset_id=ids.get(a.source_asset_id)!;}
 if(existing.latest_version===2&&(canonicalJSON(current)!==canonicalJSON(m)||existing.active_version!==null&&existing.active_version!==2))throw Error('Resumed revision changed concurrently');
 return m;
}
