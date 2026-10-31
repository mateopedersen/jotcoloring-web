# Automatic color inspiration

Supply one clean, black-and-white source. The normal `scripts/data/prepare-media.ts`
command now creates the color inspiration and all three responsive homepage color
images automatically. A separately drawn or AI-generated colored example is not
required. An existing approved `--color` reference remains an optional override.

The source is still required to pass rights, image-specific metadata, pixel,
category, age, branding, and PDF checks. The color feature does not weaken those
publication requirements. Blank catalog previews and original downloads stay
black and white; only inspiration/comparison derivatives contain color.

## Generation and preservation

`src/coloring/automatic.ts` labels actual enclosed image regions, closes tiny gaps
in a segmentation mask, and applies coordinated subject palettes beneath the
existing ink. It leaves the exterior, transparency, dark contours and reserved
brand band intact. It never redraws the source or invokes a paid model. Colors
are suggestions, not semantic part labels or recovered original colors. Open
outlines can remain white; drawings without enclosed areas need outline repair
to yield a useful color preview. Local preparation writes `color-generation.json`
with coverage, region count, method, and dimensions so these can be reviewed.

Accepted existing color assets are preserved. The default inspiration is limited
to 900 × 1400 pixels without upscaling; cards use 240/320/400 px widths. Prepared
cards are at most 250 KB and inspiration at most 900 KB. The original PDF limit
remains 1,000,000 bytes. Real dimensions, MIME, hashes and source linkage are used.

## Import, publication, and storage

The background import generates missing color roles once for non-draft content.
Publishing an older draft also fills missing roles before public activation.
Only verified, checksum-matching inputs are decoded. The bounded Worker fallback
uses a preview of at most 2 MP and validates encoded output, branding and size. For unusually dense drawings it can reduce only the color-preview dimensions by up to 40%, with actual dimensions recorded and the aspect ratio checked. It chooses genuine WebP or PNG bytes; the original printable file is unchanged.
It can complete missing responsive roles from an accepted color reference.

Incoming and published files use the existing private/published R2 bindings.
Published URLs include file checksums, have immutable cache headers and use the
existing assets.jotcoloring.com CDN. Generated metadata and files travel through
the same revision, backup, outbox and search projection as the blank files.
Retries preserve import idempotency; an interrupted backup cannot activate a
half-published revision. No per-visitor generation, bucket listing, full-catalog
scan, database migration, new plan or external inference is introduced.

The homepage reserves four gallery positions for the newest published pages
with verified color assets, then fills the rest from featured pages. This is a
bounded query and removes duplicates. Publication/search projection and existing
page cache expiration determine when visitors see the update. A fixed-size
homepage cannot show every historic page; older items remain in the catalog.
