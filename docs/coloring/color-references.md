# Source-bound Color Ideas

The former `outline-colors-v1` fill does not recognize objects and is never a
semantic fallback. Reviewed showcase pairs and source-bound approved references
remain preferred. Other published pages enter the bounded `pixel-conditioned-v3`
background pipeline. A queued page is not a completed or verified color result.

## Automatic preparation for existing and future pages

The existing jobs Worker scans 100 published source records per scheduled tick.
A database trigger queues new published revisions; an opened Color Ideas panel
can also register the current verified source. The unique identity includes the
content ID, original printable checksum, preview checksum and engine version.
Archived or changed sources cannot activate a stale result. Homepage pins,
originals, blank PDF/Image downloads and ordinary catalog publication stay intact.

Every automatic job receives the actual image pixels three times:

1. Qwen 3.8 27B observes the original and proposes object/part-specific colors.
2. FLUX.2 Klein 4B colors that original using the observed plan. Its contours are
   not substituted for the source. Pigment transfers into source-owned regions;
   original dark pixels and the entire brand footer are preserved losslessly.
3. Qwen examines the original and final transferred image, records actual observed
   colors, and rejects material/character errors. This final assessment is blind to
   the proposed palette, so a valid white candle is not rejected merely because
   the planner suggested red stripes. Geometric checks also reject
   missing colors or unrelated output. This is machine assessment, not a human
   visual approval or a guarantee of correct recognition.

Only successful results receive a source-bound `machine_checked` manifest under
`published/color-ideas/v3/ID/SOURCE_SHA/PREVIEW_SHA/`. The source, result, plan,
observations and assessment are first copied to private BACKUPS and read back
with checksum verification. The public image is verified before its manifest
is activated. An approved manual reference always takes precedence.

The dedicated Workers Free account enforces the zero-charge ceiling. The main
paid account never runs this inference. Vision planning/review each reserve 600
neurons; image generation reserves 300. These conservative reservations share
one 9,000-neuron daily ledger with the existing text generator: at most six full
automatic jobs per UTC day when nothing else uses that allowance. Actual provider
consumption can be lower. Other account activity may stop generation earlier.
There is no paid fallback, new plan or attempt to bypass the provider quota.
Consequently, a large catalog is processed gradually, not all at once.

Only one automatic color job holds a 12-minute lease. Attempts are bounded to
three. Confirmed image output and its plan survive interruption; a postponed
review reuses them. Unknown provider outcomes wait until the next UTC day instead
of being immediately replayed. Failed semantic/geometry checks and provider
content rejections remain `review_needed` and are never automatically published.
Investigate these source-specific cases before deliberately requeueing them.

Staging has discovery disabled and only explicit test jobs run. Production uses
scheduled discovery. Deploy catalog migrations 0013 and 0014 after a verified
private database backup, then the compatible free gateway, jobs and web versions.
CI does not apply database migrations or deploy the separate free gateway.

To pause new automatic work, disable `COLOR_REFERENCES_SCAN` on the jobs Worker;
to stop consumers too, disable `COLOR_REFERENCES_ENABLED`. Keep stored references
and evidence intact. Track job states/error codes and the shared daily ledger;
do not expose private request payloads, plans or credentials in public logs.

## Local preparation

The optional Apple Silicon preparation environment uses MFLUX 0.24.0 and the
Apache-2.0 FLUX.2 Klein 4B checkpoint, pinned to
`mflux-community/flux2-klein-4b-mflux-q4` revision
`794cd159538149ad9830848508c31f0ea7088e58`. Model weights stay outside the repository.
No provider API or paid inference is used. Website visitors download a reviewed
WebP only; the large model never enters the browser or Worker bundle.

Install the separately pinned `scripts/color/requirements.txt` in a dedicated
virtual environment. Supply a bounded JSON array of 1–100 jobs to:

```
python scripts/color/color_reference.py --jobs JOBS.json --model MODEL_DIRECTORY --executable MFLUX_EDIT_EXECUTABLE --output NEW_OUTPUT_DIRECTORY
```

Each job requires `id`, `input`, the exact input `source_sha256`, the catalog
printable image's `catalog_source_sha256`, a source-reviewed `observation`, optional
reviewed `colors`, `brand_footer`, and primary-source `references` when identity
requires them. The model receives the actual image. It produces candidates with
`pending_visual_review`; text metadata or a model response is not visual approval.

The source is uniformly scaled and padded for inference. Generated colors are
transferred into regions from the original image. Model ink is removed without
erasing dark brown materials. Sparse-paper detection closes small outline gaps
before separating the surrounding sheet. Original dark pixels and the brand band
are retained byte for byte in lossless WebP output. These guarantees concern the
protected original pixels, not perfect semantic recognition.

A reviewed `region_colors` list can correct a known object's enclosed region using
normalized `x`, `y` coordinates (relative to artwork above the brand band) and a
hex `color`. Corrections touching open paper, ink or an excessively large region
are rejected. Such corrections are source-specific editorial work, not evidence
that the model recognized every detail automatically.

## Review and publication

Inspect the source and final candidate twice: identity, object colors, empty paper,
missing fills, model artifacts and geometry. Generic natural-color suggestions
are creative choices, not factual claims about extinct animals or fictional worlds.
Reject candidates with material errors. Neither inference completion nor passing
pixel checks approves an image.

Create a bounded reviewed-batch JSON file containing `record`, `file`, `sourceFile`
and `report` for each accepted candidate. `record` follows
`src/coloring/reference-record.ts`; it binds the printable source, preview and
reference SHA-256 values, dimensions, byte size and dated visual-review notes.

```
node --import tsx scripts/ops/publish-color-references.ts --environment production --reviewed-batch REVIEWED.json
node --import tsx scripts/ops/publish-color-references.ts --environment production --reviewed-batch REVIEWED.json --apply
```

Use the existing separate `JOT_WRANGLER_AUTH_FILE`. The publisher checks current
published source and preview identities before and after storage work, compares
actual decoded source/output ink and footer pixels, writes verified private
originals/backup copies, verifies the public image, and writes its manifest last.
It refuses nonidentical overwrites. Originals, blank downloads, IDs, URLs and
catalog revisions are not modified. A receipt says
`published_pending_http_verification` until the operator verifies actual public
bytes, the API and the rendered page.

R2 keys are `published/color-ideas/v1/SOURCE_SHA/REFERENCE_SHA.webp` and
`published/color-ideas/v1/SOURCE_SHA/reference.json`. New approved references become
available to all six moods without an application deployment. New or replaced
artwork requires its own source-bound preparation; no arbitrary fill is a fallback.
The lookup always verifies the current published revision and preview checksum.
Unpublished, archived, changed or unreviewed artwork cannot inherit an old approval.
Staging reads its own bucket, not production storage.

## Browser behavior

All six finishes preserve hue families: blue stays blue, foliage stays green.
They adjust saturation and brightness only. Swatches come from the actual image.
Black ink, white paper, transparency and the brand band are protected. Comparison
labels reflect the slider position, its handle remains within the frame, keyboard
arrows work, and workers are disposed on every pagehide/BFCache cycle.

## Validation and limits

Unit checks cover source/review mismatch, private paths, published-state lookup,
cache safety, byte checks, hue invariance, dark materials, paper and region bounds.
Run `tests/color_reference_test.py` with the optional model environment. Browser
checks must also exercise all moods, copy/download, slider endpoints, pending
references, repeated opening, and mobile/desktop Chromium and WebKit. WebKit
emulation is not a physical iPhone test.

The first model-assisted review set contains nine drawings across simple objects,
animals, characters, vehicles and a detailed unicorn scene. Local corrections were
needed for two character examples. Automatic catalog backfill remains subject to the free daily allowance and quality
gates; model quality and correctness on unseen drawings are not guaranteed.

Primary implementation references:
- https://huggingface.co/black-forest-labs/FLUX.2-klein-4B
- https://github.com/mflux-community/mflux
- https://huggingface.co/mflux-community/flux2-klein-4b-mflux-q4

Automatic service references:
- https://developers.cloudflare.com/workers-ai/models/qwen3.8-27b/
- https://developers.cloudflare.com/workers-ai/models/flux-2-klein-4b/
- https://developers.cloudflare.com/workers-ai/platform/pricing/
