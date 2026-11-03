/** Small source-bound manifests let millions of references live in R2, not JS. */
export const REFERENCE_VERSION='image-conditioned-colors-v1';
export interface ColorReferenceRecord {
 version:typeof REFERENCE_VERSION;id:string;source_sha256:string;preview_sha256:string;
 reference_sha256:string;key:string;width:number;height:number;bytes:number;
 review:{status:'approved';source_sha256:string;reference_sha256:string;notes:string;reviewed_at:string};
}
const hash=(value:unknown)=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export const colorRecordKey=(source:string)=>{if(!hash(source))throw new Error('Invalid source hash');return `published/color-ideas/v1/${source}/reference.json`;};
export function validateColorRecord(raw:unknown,source:string,id:string):ColorReferenceRecord{
 const r=raw as ColorReferenceRecord;
 if(!r||r.version!==REFERENCE_VERSION||r.id!==id||!hash(source)||r.source_sha256!==source||!hash(r.preview_sha256)||!hash(r.reference_sha256)||r.key!==`published/color-ideas/v1/${source}/${r.reference_sha256}.webp`||![r.width,r.height,r.bytes].every(Number.isSafeInteger)||r.width<64||r.height<64||r.width*r.height>2_400_000||r.bytes<100||r.bytes>2_000_000||r.review?.status!=='approved'||r.review.source_sha256!==source||r.review.reference_sha256!==r.reference_sha256||typeof r.review.notes!=='string'||r.review.notes.trim().length<30||!Number.isFinite(Date.parse(r.review.reviewed_at)))throw new Error('Unreviewed or mismatched color reference');
 return r;
}
