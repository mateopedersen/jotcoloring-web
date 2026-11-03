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

## PDF document identity after editorial edits

A reviewed title change must refresh the PDF document title as well as the HTML metadata and rendered social cover. `rebind-reviewed-metadata.ts` writes a fresh PDF only when its internal title differs, without re-encoding the accepted drawing or footer image streams. The new PDF hash invalidates its earlier derivative review and receives a fresh inspection record. Import dry-runs and media audits require the PDF title to match the reviewed manifest. Never overwrite a previously accepted prepared bundle or immutable public object. If already published, use a normal revision update, verify its private recovery copy and all published assets, and recheck the actual public PDF bytes and document title.

## Authorized 300-drawing follow-up

The owner separately requested the Descendants / Squishy / KPop Demon Hunters package on 2026-11-01. Scope `descendants-squishy-kpop-20261101` requires exactly those three complete 100-drawing topics, its fixed original ZIP checksum, all 300 source-bound double reviews and final-render approvals, and an unchanged sealed source inventory. The original legacy 24/2400 gate is unchanged. Unknown release identifiers or smaller counts are rejected. Worker transports authenticate the explicit scope and all fifteen files through the same HMAC and normal import/backup/publication/search pipeline. This adds no resource, queue, public import endpoint, or paid inference.


## Searchable topic identity — owner clarification, 2026-11-01

Name the accurate reviewed topic or franchise naturally in each title or scene-specific description. Character names alone may not communicate a franchise: include KPop Demon Hunters for its characters and distinguish the HUNTR/X group. Apply the same rule to Descendants, Squishy, Minecraft, Bluey and other identified subjects. Preserve useful individual observations; do not add unrelated keywords, download boilerplate or package age/difficulty labels. Audit earlier topics when requested, repair confirmed metadata/search inconsistencies through normal source-bound revision updates, refresh affected social covers and double editorial approvals, preserve IDs/URLs/artwork/originals, and verify real topic/alias searches and public files. Future authoring and metadata rebind preparation must reject missing known franchise identities; already sealed historical transports remain valid and receive explicit reviewed corrections rather than silent edits.


## Seven-topic follow-up, 2026-11-01
The owner authorized Turtle, Sharks, Trick or Treat, Bible, Five Nights at Freddy’s, Happy Birthday and Panda ZIPs as a distinct 7-topic / 700-drawing release. Scope `seven-topics-20261101` requires the exact seven archive checksums and complete source-bound double reviews. The reattached Descendants/Squishy/KPop archive is the already published package; do not duplicate it. Preserve existing Sharks, Sea Turtles and Birthdays categories. Retain outlined heading typography supplied outside a raster artwork; preserve original PDF/WebP and native raster separately, and bind reviews to the actual composed source. Package QA claims do not establish a fresh review, AI generation, identity or species. Record owner source claims truthfully.


## Bounded file stages and failed retries
Independent original-copy, derivative-copy, public-copy and final public-readback operations run in pairs. Each stage waits for both in-flight operations before propagating a failure; later stages and publication completion remain blocked on every checksum and backup gate. The ingest consumer stays at eight invocations with one message per batch. A claimed import retry, including an existing draft revision, records a publication failure as failed so an exact idempotent retry can resume immediately; it must not remain processing until its lease expires.


## Reviewed transport waiting on an active import
A duplicate reviewed-bundle delivery can arrive while the same canonical import still holds its 15-minute processing lease, including recovery after an interrupted invocation. If publication readback is incomplete and the same job remains processing, defer that transport until just after the current lease expires instead of consuming short generic retries. Do not acknowledge it or emit a failure/completion receipt for that waiting state. An expired lease remains eligible for the normal idempotent import claim. Exact source/revision, backup and full published-byte checks still gate the eventual completion receipt; unrelated failures keep their normal error handling. The eight-consumer queue bound and retry-count setting are unchanged.

## Supplied branded PDF/WebP pages — November 3, 2026

The owner authorized the exact 17 collectible-character packages as scope
`collectible-characters-20261103`. Preserve the supplied JotColoring logo and both
printable containers verbatim. Hello Kitty appends 100 new stable artwork IDs to
its existing topic; never replace the accepted 100 pages. Native PNG containers
are absent from these ZIPs and must not be claimed as backed up.

`prepare-supplied-pages.ts` validates source checksums, one-page A4 PDFs, source
logo presence, blank artwork tolerance, whole-page responsive image pixels and
actual image-derived age/category analysis. It creates five lossless resized
previews and a source-bound social cover. No color assets are generated. The
signed transport requires exactly those eight roles and rejects any replacement
of the supplied printable PDF or WebP. Original source and backup readbacks,
double editorial approval, exact release inventory, media signatures, normal
imports, search projection and public verification remain mandatory. This source
layout is intentionally preserved under the owner's explicit logo instruction;
the generated-page footer compositor must not be applied to it.

### Public-figure addition and explicit 83-page exception

The owner subsequently added MrBeast, Elon Musk and Donald Trump. Scope
`public-figures-20261103` requires exactly 83 MrBeast, 100 Elon Musk and 100 Donald
Trump drawings, 283 total. The supplied MrBeast ZIP is truncated during WebP 084;
83 complete PDF/WebP pairs were recovered with original member checksums. The
owner explicitly accepted publication of those 83, with the incomplete count
reported. Preserve the original truncated ZIP, recovery receipt and extra PDF 084
privately. The recovered container has a separate immutable checksum. No missing
native or original file may be claimed as supplied or backed up. All other scopes
retain their original exact counts.

Use neutral, image-specific public-figure copy. Invented roles and scenes are
illustrations, not evidence of real events, products, achievements or endorsements.
Preserve source logo and printable containers under the same eight-role media
policy. Actual person/topic identities belong naturally in titles or descriptions.

The supplied-original manifests explicitly use `color_preview_policy: none`.
Both import and republish honor this policy before the automatic color fallback.
Existing manifests keep the default automatic behavior. This policy changes no
media signatures, source checksums, backups or final publication gates.

The same omitted-preview policy reaches catalog responses and hides See Color
Ideas on these pages. Anonymous reference requests reject omitted previews before
reading stored colors or adding a job. Scheduled color discovery skips them;
an older queued job becomes obsolete before inference when the active revision
omits previews. Existing pages without this policy retain their current behavior.


## Specific facets in seasonal artwork
Whole-topic aliases and tags must describe every member. Cheetah cub/cubs and mini excavator are age/size facets, not aliases for all cheetahs or excavators. Keep those details in each actually reviewed drawing's title or description; preserve broad cheetah/cheetahs and excavator/excavators/digger/diggers discovery. Historical sealed transports remain immutable and receive explicit checksum-bound normal metadata revisions when needed.


## Normal imports with an active processing lease
A duplicate normal import delivery that loses the existing processing claim is deferred until just after that claim's15-minute lease expires. It is never acknowledged as finished while the job remains processing. If the competing invocation has already completed, the duplicate is acknowledged normally. Invalid lease timestamps retain the message for the bounded retry path. Normal publication, backup, source checks, retry-count settings, cron recovery and the eight-consumer bound remain unchanged.
