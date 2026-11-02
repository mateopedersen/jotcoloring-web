# Automatic sitemap publication

Normal publication and archival already mark affected sitemap segments dirty in
the canonical transaction. After a projection succeeds, its existing outbox
handler now schedules a coalesced `discovery_rebuild` wake-up on the existing
ingest queue. A known, already processed event can retry a failed wake-up. The
production and staging `DISCOVERY_ENABLED` setting remains enabled.

The singleton `discovery_state` owns a five-minute queued/processing lease.
Duplicate wake-ups may handle current work; an old wake-up cannot invalidate a
new lease. Queue and scheduled recovery use the same claim. Interrupted claims
become eligible after expiry, and ordinary failures release ownership for normal
retry. No content, original artwork, source approval, URL or revision is edited
by this job. No resource, paid inference, queue trigger, concurrency bound or
retry-count setting is added or changed.

Each invocation prepares at most eight segments, with the static topic directory
first. Remaining work schedules another wake-up. Each XML object keeps its
content-addressed key, full byte readback and generation fence. A publication
racing generation or lease release leaves dirty work and a follow-up; it cannot
activate stale XML or create a false completion receipt. The prior valid
fragment remains available on failure. Public requests continue reading prepared
fragments, without a catalog or bucket scan.

Sitemap responses require browser revalidation. The existing Workers cache still
stores immutable prepared responses and changes its key when the discovery
epoch advances. An old browser ETag therefore cannot hide an activated revision.

## Deployment and operation

Apply only `0016_discovery_rebuild_queue.sql` before activating this code. The
operator helper `scripts/ops/upgrade-discovery.ts ENVIRONMENT --apply` first
creates and verifies a private BACKUPS copy of the old table schema and row,
then applies only missing additive fields and the existing migration ledger
entry. A completed upgrade is idempotent. Existing publisher rollback code can
ignore these additional fields; do not drop or rebuild canonical tables.

`scripts/ops/discovery.ts ENVIRONMENT status` shows the rebuild state, completion
time and worker kind. `refresh --apply` marks existing prepared fragments for
renewal and sends a real restricted queue wake-up; it does not run the builder
inline or send IndexNow notices. `rebuild --apply` is a coordinated operator
rebuild. The scheduled path remains recovery for missed delivery, category-only
changes and expired claims. Background completion depends on queue and provider latency; scheduled recovery
also handles missed delivery.

Do not call a new release verified from an upload or job acknowledgement alone.
Verify every supplied topic's actual search/page count, the public sitemap index
and referenced XML containing all new canonical URLs, source-bound metadata and
actual media bytes. A dirty segment or an incomplete rebuild remains pending.

The scoped operator adapter sends only this sitemap job to the real existing
queue, while preserving its intentional inline import/projection suppression.
A local no-op queue must never be used as evidence of sitemap delivery.

Canonical transfer snapshots with all seven coordination fields use format 5.
Existing format 4 snapshots retain their original checksums and restore using
only the seven reviewed idle/empty target defaults. Other target-column changes,
unsafe defaults, partial migrations and version/column mismatches are rejected.
Historical format 1–3 snapshots keep their existing supported table scopes.
