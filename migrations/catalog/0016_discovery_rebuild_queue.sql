-- Additive, backward-compatible coordination for the existing sitemap work.
ALTER TABLE discovery_state ADD COLUMN rebuild_state TEXT NOT NULL DEFAULT 'idle' CHECK(rebuild_state IN ('idle','queued','processing'));
ALTER TABLE discovery_state ADD COLUMN rebuild_token TEXT NOT NULL DEFAULT '';
ALTER TABLE discovery_state ADD COLUMN rebuild_lease_until TEXT NOT NULL DEFAULT '';
ALTER TABLE discovery_state ADD COLUMN rebuild_queued_at TEXT NOT NULL DEFAULT '';
ALTER TABLE discovery_state ADD COLUMN rebuild_completed_at TEXT NOT NULL DEFAULT '';
ALTER TABLE discovery_state ADD COLUMN rebuild_completed_by TEXT NOT NULL DEFAULT '';
ALTER TABLE discovery_state ADD COLUMN rebuild_last_error TEXT NOT NULL DEFAULT '';
