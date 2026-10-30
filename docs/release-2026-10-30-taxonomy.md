# Taxonomy, local layout and true-black text release

## Changes

- 114 stable coloring categories (22 roots, 92 children) and a common registry for routes, names, filters, related collections and navigation. No new image claims or invented product identities.
- A responsive subject directory on the homepage and collection pages; opening one topic expands its subtopics. All 114 canonical routes were checked locally. Empty categories say that pages are upcoming, are `noindex` and do not enter the sitemap.
- The existing local visual preparation pipeline now examines three views of the actual image, compares two caption templates and evaluates subtopics. Source-bound automatic/manual decisions are required for new non-draft imports. Unknown, conflicting and low-confidence cases wait for image review.
- A local disk-backed batch queue, bounded input batches, resumable model cache, per-engine job generations, source checksums and stale-lease protection. No new cloud resource, plan or paid inference.
- Snapshot restore resolves category parents before children without loading the content catalog in memory; the expanded taxonomy exposed and fixed a batch-boundary foreign-key bug.
- Responsive footer columns, Studio card/export sizing and library spacing from the local design pass. Existing painting behavior, saved artwork and source files are preserved.
- Neutral gray/brown-gray text now uses a shared `#000` token. Component text tokens are also black. Orange accents, colored difficulty cues, white text on filled controls and disabled states remain distinct. The font remains the accepted Avenir-first stack.
- Main-page search receives a compact list of category options from server HTML. The large classification taxonomy is excluded from the initial browser bundle; existing bundle budgets remain enforced.

## Verification

- 279 JavaScript/TypeScript tests passed in the release check; the seven Python operations checks include updated 114-category snapshot counts. Repeat the full suite after any subsequent edit.
- 18 existing, actual line-art images were fed into the model and visually reviewed as a contact sheet. The final decision accepted 16 automatically and held two for review (the flower-covered bookshop and the puppy). Existing published classifications were not silently overwritten.
- Six original synthetic outline fixtures separately exercised new subjects: house, robot, letter A and guitar were accepted into the expected main collections; a simple ball and a mountain sketch were held for review. These six examples are not a general-accuracy benchmark.
- A repeated 18-item batch completed zero new classifications, confirming the resume/deduplication path. Source changes and stale worker leases are covered by tests.
- 114 local category URLs returned valid pages. The layout/text audit covers the shared pages at measured desktop/tablet/mobile CSS widths, including 320 and 390 pixels. Neutral main headings and descriptions compute to `rgb(0, 0, 0)`. Responsive emulation is not a physical-device test.
- Type check: zero errors, zero warnings; one existing `beforeunload.returnValue` compatibility hint. Build and initial-JavaScript budget checks passed.

## Boundaries

Five million pages remain a capacity target, not a load test. Relative CLIP scores are not calibrated confidence percentages. The classifier can still miss a fine-grained subject; a review queue and explicit overrides are part of normal operation. No catalog image or user painting is uploaded to an external model by this feature.

Deployment follows the existing staging → production GitHub workflow. The additive category migration must be applied to the matching D1 catalog before promotion; it preserves existing memberships, assets and IDs. Production deployment and live checks are recorded separately from these local results.

See [automatic category operations](automatic-categories.md) for preparation, batch usage and research sources.
