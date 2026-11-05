import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareUpdateManifest} from '../src/ui/admin-content';
import {validateManifest} from '../src/server/manifest';
import type {Asset,Manifest} from '../src/server/types';

function fixture():Manifest {
  const asset=(role:string,overrides:Partial<Asset>={}):Asset=>({
    asset_id:`original-${role}`,role,storage_zone:'private_incoming',
    object_key:`incoming/accepted/${role}.webp`,mime:'image/webp',bytes:8000,
    width:1000,height:1500,sha256:'a'.repeat(64),asset_version:2,...overrides,
  });
  const source=asset('printable_webp_bw');
  const reference={source_asset_id:source.asset_id,source_sha256:source.sha256};
  return {
    schema_version:'1.0',example_only:true,import_action:'create',
    idempotency_key:'previous-import',content_id:'content-regression',locale:'en',
    slug:'source-reference-regression',title:'Source reference regression',
    requested_status:'ready_for_review',category_ids:[],tags:[],
    provenance:{source_type:'fixture',rights_status:'test_only'},
    // Put a derivative before its source to exercise the complete ID mapping.
    assets:[asset('social_og',{...reference,mime:'image/png',width:1200,height:630}),
      source,asset('catalog_thumb_bw'),asset('catalog_preview_bw'),
      asset('color_inspiration',reference),asset('home_half_color',reference)],
  };
}

test('editing accepted content preserves source-bound social and color assets in a valid new revision',()=>{
  const previous=fixture(),before=structuredClone(previous);
  validateManifest(previous);
  let sequence=0;
  const updated=prepareUpdateManifest(previous,2,()=>`revision-uuid-${++sequence}`);
  assert.doesNotThrow(()=>validateManifest(updated));
  assert.equal(updated.import_action,'update');
  assert.equal(updated.expected_version,2);
  assert.equal(updated.requested_status,'ready_for_review');
  assert.notEqual(updated.idempotency_key,previous.idempotency_key);
  const source=updated.assets.find(asset=>asset.role==='printable_webp_bw')!;
  assert.equal(new Set(updated.assets.map(asset=>asset.asset_id)).size,previous.assets.length);
  updated.assets.forEach((asset,index)=>{
    const old=previous.assets[index];
    assert.notEqual(asset.asset_id,old.asset_id);
    assert.deepEqual({...asset,asset_id:old.asset_id,source_asset_id:old.source_asset_id},
      {...old,source_asset_id:old.source_asset_id});
    if(old.source_asset_id)assert.equal(asset.source_asset_id,source.asset_id);
  });
  updated.tags.push('independent-copy');
  assert.deepEqual(previous,before);
});

test('editing cannot silently repair missing or ambiguous derivative source identities',()=>{
  const missing=fixture();missing.assets[0].source_asset_id='nonexistent-source';
  assert.throws(()=>prepareUpdateManifest(missing,2),/missing source/);
  const duplicate=fixture();duplicate.assets[2].asset_id=duplicate.assets[1].asset_id;
  assert.throws(()=>prepareUpdateManifest(duplicate,2),/duplicate asset IDs/);
});

test('editing keeps stale derivative checksums invalid instead of refreshing their approval',()=>{
  const stale=fixture();stale.assets[0].source_sha256='b'.repeat(64);
  const updated=prepareUpdateManifest(stale,2);
  assert.equal(updated.assets[0].source_sha256,'b'.repeat(64));
  assert.throws(()=>validateManifest(updated),/Manifest validation failed/);
});
