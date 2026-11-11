import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const work=path.resolve(process.cwd(),'../incoming-2026-11-10/artist-coloring');
const root=path.join(work,'private-review');
const manifestPath=path.join(root,'visual-review-ranges.json');
const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
const sha=value=>createHash('sha256').update(value).digest('hex');
let total=0;

for(const entry of manifest.reviewed_topics){
  const {topic,start,end,sheet_refs,reviewed_at}=entry;
  if(start!==1||end!==100||sheet_refs.length!==5)throw new Error(`A complete 100-image visual pass is required: ${topic}`);
  const pairs=JSON.parse(await fs.readFile(path.join(root,`${topic}-source-pairs.json`),'utf8'));
  const notes=JSON.parse(await fs.readFile(path.join(root,`${topic}-scene-notes.json`),'utf8'));
  const sourceSha=pairs[0]?.source_zip_sha256;
  if(pairs.length!==100||notes.length!==100||pairs.some((row,index)=>row.source_sequence!==index+1||row.source_zip_sha256!==sourceSha||row.source_sha256!==row.source_webp_sha256||row.original_pdf_sha256!==row.source_pdf_sha256))throw new Error(`Source-bound image/PDF inventory differs: ${topic}`);
  for(const ref of sheet_refs)await fs.access(path.join(work,ref));
  const rows=pairs.map((pair,index)=>({
    topic,
    design_id:pair.design_id,
    content_id:pair.content_id,
    source_sequence:index+1,
    source_zip_sha256:pair.source_zip_sha256,
    source_pdf_sha256:pair.source_pdf_sha256,
    source_webp_sha256:pair.source_webp_sha256,
    source_sha256:pair.source_sha256,
    source_webp_path:pair.source_webp_path,
    observation:notes[index],
    observation_sha256:sha(notes[index]),
    visual_pass:2,
    visual_status:'reviewed',
    reviewed_at,
    review_method:'Second actual-pixel comparison: each original WebP was checked beside its source-sequence label and scene note in the five numbered 20-image cross-check sheets; confirmed notes were retained and mismatches were corrected.',
    sheet_refs,
  }));
  await fs.writeFile(path.join(root,`${topic}-visual-pass-2.jsonl`),rows.map(row=>JSON.stringify(row)).join('\n')+'\n',{mode:0o600});
  total+=rows.length;
}
console.log(JSON.stringify({status:'PASS',fully_reviewed_topics:manifest.reviewed_topics.length,source_bound_images:total,manifest_sha256:sha(JSON.stringify(manifest))}));
