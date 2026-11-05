import type {Manifest} from '../server/types';

/** New revisions need new asset IDs even when the verified bytes are reused. */
export function prepareUpdateManifest(previous:Manifest,latestVersion:number,uuid=()=>crypto.randomUUID()):Manifest {
  if(!previous||!Number.isSafeInteger(latestVersion)||latestVersion<1||!Array.isArray(previous.assets))throw new Error('No usable content revision is available.');
  const revision=structuredClone(previous),idempotencyKey=uuid(),assetIds=new Map<string,string>();
  for(const asset of revision.assets){
    if(!asset.asset_id||assetIds.has(asset.asset_id))throw new Error('The content revision has missing or duplicate asset IDs.');
    assetIds.set(asset.asset_id,`asset-${uuid()}`);
  }
  const assets=revision.assets.map(asset=>{
    const updated={...asset,asset_id:assetIds.get(asset.asset_id)!};
    // Social and color derivatives must continue to reference this revision's source.
    if(asset.source_asset_id!=null){
      const sourceId=assetIds.get(asset.source_asset_id);
      if(!sourceId)throw new Error('A derived asset references a missing source in this content revision.');
      updated.source_asset_id=sourceId;
    }
    return updated;
  });
  return {...revision,import_action:'update',expected_version:latestVersion,idempotency_key:idempotencyKey,requested_status:'ready_for_review',assets};
}

export function availableContentActions(item:{status:string;latest_version:number;active_version:number|null;revision_ready:number|boolean}) {
  const actions=['Edit'];
  if(item.revision_ready&&(item.status!=='published'||item.latest_version!==item.active_version))actions.push('Publish');
  if(item.status==='published')actions.push('Archive');
  return actions;
}
