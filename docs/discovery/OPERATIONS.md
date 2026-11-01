# JotColoring publication and search discovery

Canonical origin: `https://jotcoloring.com`. Primary sitemap: `/sitemap.xml`.
The Google Domain property is `sc-domain:jotcoloring.com`; it covers `assets.jotcoloring.com`. Bing uses the HTTPS root property. Keep their DNS verification records. No Analytics, GTM, Clarity, visitor beacon or tracking cookie is introduced.

## Publication

Canonical content transactions maintain `sitemap_entry` and durable `discovery_notice`/`discovery_dirty` rows through migration 0015. Drafts are excluded. Active publication, metadata revisions, archives, slug changes and category membership changes dirty only affected stable ordinal ranges and the static/category fragment. Original PDFs and image objects are not modified. Normal HTML category links continue to come from the current catalog.

The existing jobs Worker cron runs every ten minutes. It reconciles 100 ordinal rows using a persistent keyset cursor, prepares up to four dirty fragments and processes at most twenty due notifications. There is no full catalog or R2 bucket listing on sitemap requests. Each detail fragment has a stable range of 1,000 ordinal positions; archives leave holes rather than shifting boundaries. XML is checked against a 10,000 URL / 40 MB operating bound. With the application's bounded media keys these ranges remain comfortably below the protocol's 50,000 URL / 50 MB limits.

Fragments are immutable XML objects in the existing PUBLISHED R2 bucket. Read-back SHA-256 precedes a conditional manifest transaction. A concurrent publication increments the dirty generation, preventing stale prepared bytes from being activated. The sitemap index lists only prepared fragments. Initial bootstrap must finish before deploying the web reader. ETag, Last-Modified and a ten-minute edge TTL are used. The Workers cache key includes publication/projection epochs and, for XML, the prepared manifest epoch; activation invalidates that key without Purge Everything. Cloudflare's separate CDN cache is not assumed to be the Workers cache.

Detail URLs contain the original WebP preview and printable WebP as image sitemap records, never PDFs. Dates come from canonical content changes; unchanged static pages have no invented lastmod. Pagination keeps its existing self-canonical indexing policy and crawlable HTML links. Sitemap focuses on collection landing pages and all individual detail URLs rather than expanding mutable pagination variants; omission from a sitemap is not a noindex directive.

## IndexNow

Only production can send. The key is public verification material served as exact UTF-8 text at its root `.txt` URL; it is not an administrator credential. No public webhook is added. The privileged trigger is the existing authenticated publication/import transaction and private jobs infrastructure.

The sender verifies current content revision, canonical live 200 HTML/indexability, current sitemap membership, and the verified live preview/PDF before upserts. Old slug changes use the existing permanent redirect; archives require 404/410 or a permanent redirect. Superseded notices are marked obsolete. Batches contain one same-host URL, sent only to `https://api.indexnow.org/indexnow`.

`received` means HTTP 200 accepted. `key_pending` means HTTP 202 accepted pending key validation. Neither means indexed. HTTP 400/403/422 become failed; 429, 5xx and network failures retry with Retry-After, exponential delay and jitter, up to eight attempts. Leases recover interrupted work. Persistent URL/revision/event uniqueness suppresses duplicate messages. As with any network delivery, an interrupted response can cause an at-least-once retry; exactly-once external delivery is not claimed.

Crawler Hints is a separate Cloudflare-managed source based on cache signals. Its hints do not have the application's delivery receipts and are not cross-system deduplicated.

## Operator commands

Run from the repository with `JOT_WRANGLER_AUTH_FILE` pointing to the existing separate JotColoring session file. Never paste credentials into commands, logs or the public repository.

- `node --import tsx scripts/ops/discovery.ts production status`
- `node --import tsx scripts/ops/discovery.ts production rebuild --apply` (up to eight already dirty fragments; repeat if needed)
- `node --import tsx scripts/ops/discovery.ts production run --apply`
- After correcting a permanent error: `node --import tsx scripts/ops/discovery.ts production retry NOTICE_ID --apply`

Inspect `discovery_notice` state/status/error/attempts, `discovery_dirty`, `discovery_fragment`, and `discovery_state`. To rebuild a specific fragment, insert/upsert its name in `discovery_dirty` and increment generation, then run rebuild. Do not clear delivery receipts or resubmit unchanged archives. No staging URLs or test drafts are sent to engines.

## Rollback

Set `DISCOVERY_ENABLED=false` in the jobs configuration and deploy a reviewed rollback if notifications need to stop. Restore the previous jobs/web versions together through the existing release tool. Keep the additive tables and receipts; do not drop catalog data. The previous web reader can use the unchanged stable `sitemap_entry` data. R2 XML objects are immutable and can remain. Preserve Google/Bing verification DNS records even after successful verification. DNS and pre-change database backups are private task artifacts, not public source files.

## Primary references

- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps
- https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping
- https://www.indexnow.org/documentation
- https://www.indexnow.org/faq
- https://developers.cloudflare.com/cache/advanced-configuration/crawler-hints/
- https://developers.cloudflare.com/queues/reference/delivery-guarantees/

Sitemap acceptance, crawl eligibility and indexing are distinct. There is no indexing-time or ranking guarantee. Google Indexing API and the discontinued sitemap ping are not used.
