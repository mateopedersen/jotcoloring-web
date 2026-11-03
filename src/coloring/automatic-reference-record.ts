import {COLOR_VISION_MODEL} from './semantic-color-plan';
import {CONDITIONED_ENGINE,transferPasses,type TransferMetrics} from './conditioned-transfer';
export interface AutomaticReferenceRecord {
 version:typeof CONDITIONED_ENGINE;id:string;source_sha256:string;preview_sha256:string;reference_sha256:string;key:string;width:number;height:number;bytes:number;
 assessment:{status:'machine_checked';method:typeof CONDITIONED_ENGINE;model:string;source_sha256:string;preview_sha256:string;reference_sha256:string;prompt_sha256:string;checked_at:string;metrics:TransferMetrics;semantic:{status:'machine_passed';model:string;plan_sha256:string;review_sha256:string}};
}
const hash=(s:unknown)=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
export function automaticReferencePrefix(id:string,source:string,preview:string){if(!/^[a-zA-Z0-9_-]{1,128}$/.test(id)||!hash(source)||!hash(preview))throw new Error('Invalid automatic color identity');return `published/color-ideas/v3/${id}/${source}/${preview}`;}
export function automaticReferenceKey(id:string,source:string,preview:string){return automaticReferencePrefix(id,source,preview)+'/reference.json';}
export function validateAutomaticReference(raw:unknown,id:string,source:string,preview:string):AutomaticReferenceRecord{
 const r=raw as AutomaticReferenceRecord,a=r?.assessment;
 if(!r||r.version!==CONDITIONED_ENGINE||r.id!==id||r.source_sha256!==source||r.preview_sha256!==preview||!hash(r.reference_sha256)||r.key!==automaticReferencePrefix(id,source,preview)+'/'+r.reference_sha256+'.webp'||![r.width,r.height,r.bytes].every(Number.isSafeInteger)||r.width<64||r.height<64||r.width*r.height>2_400_000||r.bytes<100||r.bytes>2_000_000||!a||a.status!=='machine_checked'||a.method!==CONDITIONED_ENGINE||a.source_sha256!==source||a.preview_sha256!==preview||a.reference_sha256!==r.reference_sha256||!hash(a.prompt_sha256)||a.model!=='@cf/black-forest-labs/flux-2-klein-4b'||!Number.isFinite(Date.parse(a.checked_at))||!a.semantic||a.semantic.status!=='machine_passed'||a.semantic.model!==COLOR_VISION_MODEL||!hash(a.semantic.plan_sha256)||!hash(a.semantic.review_sha256)||!a.metrics||!Object.values(a.metrics).every(v=>typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))||!transferPasses(a.metrics))throw new Error('Invalid machine-checked color reference');
 return r;
}
