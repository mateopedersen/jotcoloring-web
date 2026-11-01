# JotColoring package imports

Owner direction, 2026-10-31: supplied designs are drawn in-house by the JotColoring team. Apply this source statement to the current 24 ZIPs; do not invent third-party endorsement or exclusive rights. Future owner-supplied JotColoring drawing packages should use this same careful import workflow.

Use actual native pixels for identification and source-bound editorial notes. Supply specific American English title, description and alt for every design. Package titles, difficulty folders, README claims and `visual_review: passed` are inputs, not a fresh inspection. A changed source checksum invalidates its review. Keep the source ZIP, original PDF/WebP hashes, extracted native pixels and final derivative hashes linked.

Verify ZIP entries, actual MIME/bytes/SHA-256, one-page A4 PDFs, decodability, nonblank content and PDF/WebP composition. Renderer antialiasing must not be mistaken for a composition change; compare registered images at useful resolution and investigate exceptions visually. Do not call a healthy PDF broken just because its producer differs from the site's accepted export format.

Run the existing source-image age/detail and topic analysis. Review ambiguous category suggestions. The supplied EASY/MEDIUM/HARD/VERY_HARD labels are not authoritative; published difficulty is derived from the inspected image's bound score. Keep names, age guidance, topic membership, alt, search and social cover metadata consistent.

`prepare-media.ts` generates the current accepted A4 print PDF, native-resolution print WebP, responsive outlines, color ideas and social cover. Its output must pass `import-catalog.ts` dry-run byte/pixel/PDF validation. The importer must treat `home_half_color_small` and `home_half_color_medium` as color roles, matching the server's media policy; the prepared-media integration test covers this.

New publication uses the normal `createImport` / `processImport` / `publishContent` / `projectEvent` pipeline, not handwritten SQL to fake a published row. Preserve immutable native sources and derivatives in private ORIGINALS, verify BACKUPS, and verify PUBLISHED object readbacks before calling a batch successful. Keep exact content IDs/slugs and idempotency keys stable; refuse conflicting content and changed files. Use bounded, resumable batches, preserve existing records and concurrent work, and retain failure receipts.

Public media comes from the existing JotColoring R2 delivery host, `assets.jotcoloring.com`. After publication, verify detail pages and metadata, topic/search discovery, responsive images and actual PDF/WebP download MIME, size and SHA-256. An internal database status or R2 PUT response is not live verification.

Local vision model notes are preliminary evidence. Record the model/revision, actual pixel input and source checksum. They must not be silently marked as finished editorial approval. Paid inference is not authorized. Keep credentials/signatures private, and preserve the separate JotColoring auth profile instead of replacing a shared publisher login with narrower scopes.

The private import workspace holds the current receipts and review statuses. This document alone does not establish live publication.

## Full batch publication requirement

The owner subsequently required all 24 packages together. Finish the full 2400-artwork preparation and editorial/render review before production publication. `import-reviewed-batch.ts` must require a sealed full-release inventory for production. Three interrupted production imports are draft only with `OWNER_FULL_BATCH_HOLD`; preserve them and their immutable R2 uploads for an idempotent resume. They are not live pages. The separate staging proof is not a production release.

Latest addition: Huntrix100 is included in the same full24-package release. Its README reports generated raster artwork; record that source claim alongside owner publication authorization. Fresh file hashes were computed because this ZIP supplies a CSV without SHA-256 values.

## Reviewed queue transport

For large sealed releases, `import-reviewed-batch.ts --queue-bundle` transports one artwork per message through the existing ingest queue. It validates all 24 collection approvals before opening the cloud session. Each private bundle contains the original PDF/WebP, native source, 12 prepared derivatives, source-bound double editorial approval and matching media reviews. The complete bytes and target environment are authenticated with a separate HMAC domain using the existing media validator secret; transport expires three days after the release seal.

The existing jobs Worker verifies every transported checksum and approval before writing storage, then runs the normal import, backup, publication and search projection functions. It preserves immutable originals, rejects conflicting existing content, handles only the three exact owner-held drafts as revision 2, and verifies all published derivatives. A private recovery receipt records completion; a queued transport is never reported as published or public-verified. No resource, trigger, plan, public import endpoint or paid inference is added. Public HTTP verification remains a separate required step.

## Upstream concurrency bound

During the sealed 2400-artwork production release, unrestricted queue autoscaling created more than 100 simultaneous imports and transient D1 overload. The existing production ingest consumer is bounded to 8 concurrent invocations. Its queue, Worker, one-message batch, three retries, dead-letter queue and normal publication/backup checks remain unchanged. This is an operator setting on the existing consumer, recorded separately from version-only code deployments; CI intentionally does not change queue triggers. The source configuration records the same production bound. Do not silently remove the bound during future package imports. Confirm completion receipts and public bytes, and replay only exact source-verified incomplete transports after their active processing lease expires.
