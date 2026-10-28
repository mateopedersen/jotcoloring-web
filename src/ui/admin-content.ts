import type {Manifest} from '../server/types';

/** New revisions need new asset IDs even when the verified bytes are reused. */
export function prepareUpdateManifest(previous:Manifest,latestVersion:number,uuid=()=>crypto.randomUUID()):Manifest {
  if(!previous||!Number.isSafeInteger(latestVersion)||latestVersion<1||!Array.isArray(previous.assets))throw new Error('No usable content revision is available.');
  return {...structuredClone(previous),import_action:'update',expected_version:latestVersion,idempotency_key:uuid(),requested_status:'ready_for_review',assets:previous.assets.map(asset=>({...asset,asset_id:`asset-${uuid()}`}))};
}

export function availableContentActions(item:{status:string;latest_version:number;active_version:number|null;revision_ready:number|boolean}) {
  const actions=['Edit'];
  if(item.revision_ready&&(item.status!=='published'||item.latest_version!==item.active_version))actions.push('Publish');
  if(item.status==='published')actions.push('Archive');
  return actions;
}
