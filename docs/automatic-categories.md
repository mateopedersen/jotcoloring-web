# Automatic coloring-page categories

This release defines 114 stable category IDs: 22 top-level collections and 92 subtopics. The source of truth is `src/taxonomy/catalog.ts`. Existing IDs and detail-page URLs are preserved. Age recommendations and Easy / Medium / Hard / Very Hard are separate facets, not subject categories.

## New content

Run the normal `scripts/data/prepare-media.ts` preparation step with `--categories auto`. Its local CPU model receives actual decoded image pixels, not the filename, title, prompt, or alt text. No image is sent to a remote inference API. The existing pinned CLIP model downloads are reused; no paid inference is enabled.

The classifier reads a complete, letterboxed image and two center views. Two text templates compare the main subjects in each view. It then examines subtopics for the top three main candidates using the complete image. Engine `jot-category-hierarchy-2.3.0` also requires the winning category to lead at least one whole-image reading: a pair of center crops cannot replace an off-center subject with background decoration. Narrow subtopics require their own evidence; a recognizable parent can be accepted without inventing a specific child. Very simple round diagrams are held for review instead of automatically being called mandalas.

The scores are relative similarities, not calibrated probabilities. This remains an assistive classifier: decorations, unusual styles, ambiguous objects and unseen concepts can still confuse it. Low-confidence results stop automatic preparation and write `category-analysis.json` for review. Use `--categories parent,child --category-review 'Description of what is actually visible'` after inspecting the image. Overrides are recorded in the manifest; they do not overwrite the original model evidence. Categories not in the curated taxonomy are rejected.

The final manifest contains `category_selection`, tied to the printable image SHA-256, engine version and taxonomy version. A changed image or mismatched selection fails validation. Non-draft imports require this field. Previously accepted content is not silently recategorized. Historical 2.2.0 evidence remains verifiable under its recorded rules; new cache and queue keys use 2.3.0 and cannot reuse it as a fresh analysis.

The four difficulty levels come from the same verified image measurements used by preparation, publication, catalog filters and search projection. Enclosed-space width and area matter more than counting tiny fur marks. Missing or inconsistent measurements and incomplete model output are rejected before receiving a score. The level describes coloring detail, not a strict age restriction. Batch results include both `difficulty_score` and `difficulty_level`.

## Related pages and collections

Individual pages and collection discovery now share the foreground-subject resolver. A title or caption's background clause does not become evidence for the main subject. A tag must be supported by the foreground title/caption before it can create a subject match. Known synonyms use the search resolver; Christmas and winter remain distinct. An actual subject match outranks a broad collection/theme or similar difficulty. Example-only content, the current page and duplicate IDs are excluded. Empty related tabs stay empty instead of receiving unrelated padding.

This ranking uses bounded, indexed published candidates. It does not run image inference or scan millions of files on a visitor request. Accurate, image-specific title/description/tags are still required during import; lexical ranking cannot validate invented metadata.

## Large local batches

Create a UTF-8 JSONL file with one job per line:

```json
{"id":"stable-content-id","file":"/absolute/path/line-art.webp","sha256":"64-lowercase-hex-digits","branded":true}
```

Set `branded` only when the file has JotColoring’s documented footer. Then run:

```sh
pnpm categories:batch --input jobs.jsonl --output /absolute/path/category-run --max-items 100
```

The command streams the input and inserts jobs in transactions of up to 1,000. The disk-backed queue has indexed claims, engine-specific generations, leases, SHA checks, resumable results, and a three-attempt explicit failed-job retry (`--retry-failed`). Run it again to continue. Duplicate IDs/source/version combinations are not processed twice. Identical images can reuse the on-disk image-analysis cache. A worker that loses its lease cannot overwrite its replacement’s result.

`results.jsonl` records accepted suggestions and review cases. `summary.json` contains measured runtime and status counts. This command **does not publish, upload files, mutate the public catalog, or create Cloudflare resources**. Approved results go through normal media preparation and the existing import/outbox/search-projection pipeline. Browsing requests never run the neural model or scan all image files.

## Taxonomy and capacity

Adding a topic means adding a curated definition, a matching additive SQL seed and tests. Do not generate a new public category for every keyword. The source registry supplies routes, filter labels and related-collection identities; the browser’s search suggestions receive a small server-rendered option list rather than the visual classifier. Empty collections are marked as upcoming, use `noindex`, and are excluded from the sitemap until populated. Category counts use the existing materialized count table and membership indexes.

The offline PostgreSQL transfer now resolves parent records before children even when an alphabetical snapshot crosses transaction boundaries. Content rows remain streamed. The bounded category reference graph allows 10,000 nodes and rejects missing parents/cycles; it is not a new cloud database deployment.

Millions of pages remain a capacity target, **not a measured load-test result**. Existing D1 capacity gates still apply. This release adds no storage plan, GPU service or paid model call. At larger volumes, separately measure local inference throughput, job backlog, DB size and search latency before choosing additional workers or the existing documented database migration path.

## Research used

- [Transformers.js image classification](https://huggingface.co/docs/transformers.js/api/pipelines): image input, candidate labels and hypothesis templates.
- [CLIP research and limitations](https://openai.com/index/clip/): wording sensitivity and limitations of fine-grained classification.
- [Cloudflare delivery guarantees](https://developers.cloudflare.com/queues/reference/delivery-guarantees/): existing downstream queues deliver at least once, requiring idempotent consumers.

Test evidence and observed classification errors are recorded in the local `outputs/category-audit/` folder. Synthetic protocol tests are distinct from real-image evaluation; neither is a guarantee for all future artwork.
