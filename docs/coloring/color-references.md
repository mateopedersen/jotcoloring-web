# Source-bound Color Ideas

The former `outline-colors-v1` region fill does not recognize objects. It must not
be used as a semantic color reference. The public Color Ideas component now
accepts the explicitly reviewed original showcase pairs, the 100 previously
reviewed original color references, or a reviewed source-bound R2 manifest.
Other pages show an honest unavailable state and retain their Studio link.
This rollout does **not** claim that the entire imported catalog has been recolored.

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
artwork requires its own preparation/review; no arbitrary fill is a fallback.
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
needed for two character examples. Full catalog backfill remains separate reviewed
work; model quality and correctness on unseen drawings are not guaranteed.

Primary implementation references:
- https://huggingface.co/black-forest-labs/FLUX.2-klein-4B
- https://github.com/mflux-community/mflux
- https://huggingface.co/mflux-community/flux2-klein-4b-mflux-q4
