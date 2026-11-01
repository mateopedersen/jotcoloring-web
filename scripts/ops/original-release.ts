import {requireDoubleEditorialApproval} from '../../src/server/editorial-approval';
export const ORIGINAL_RELEASE_ID='jotcoloring-originals-100-20261101';
/** Independent owner-authorized original artwork release. Legacy ZIP gates stay intact. */
export async function validateOriginalRelease(value:any){
 if(value?.release_id!==ORIGINAL_RELEASE_ID||value.status!=='ready_for_publication'||value.expected_designs!==100||!Array.isArray(value.items)||value.items.length!==100||!Number.isFinite(Date.parse(value.sealed_at)))throw Error('Complete sealed 100-design original release required');
 const ids=new Set(),slugs=new Set();
 for(const item of value.items){
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)||item.id!=='jc-original-'+item.slug||ids.has(item.id)||slugs.has(item.slug)||!/^[a-f0-9]{64}$/.test(item.source_sha256)||!/^[a-f0-9]{64}$/.test(item.manifest_sha256)||item.technical_audit!=='passed'||item.visual_status!=='approved'||item.review?.design_id!==item.id||item.review?.render_review?.status!=='approved'||Object.keys(item.assets||{}).length!==12||JSON.stringify(item.assets)!==JSON.stringify(item.review.render_review.assets))throw Error('Invalid, duplicate or unreviewed original design');
  await requireDoubleEditorialApproval(item.review,item.source_sha256);ids.add(item.id);slugs.add(item.slug);
 }
 return value;
}
