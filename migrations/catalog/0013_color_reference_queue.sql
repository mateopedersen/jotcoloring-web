-- Color inspiration is an optional derivative, never a change to accepted artwork.
CREATE TABLE color_reference_job (
 job_key TEXT PRIMARY KEY,
 content_id TEXT NOT NULL REFERENCES content(id),
 source_sha256 TEXT NOT NULL,
 preview_sha256 TEXT NOT NULL,
 engine TEXT NOT NULL DEFAULT 'pixel-conditioned-v2',
 state TEXT NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','running','processing','ready','retry','review_needed','obsolete')),
 attempts INTEGER NOT NULL DEFAULT 0,
 request_id TEXT,
 lease_until TEXT,
 not_before TEXT NOT NULL DEFAULT '',
 error_code TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 UNIQUE(content_id,source_sha256,preview_sha256,engine)
);
CREATE INDEX color_reference_work ON color_reference_job(state,not_before,created_at);
CREATE TABLE color_reference_scan (id INTEGER PRIMARY KEY CHECK(id=1), after_id TEXT NOT NULL DEFAULT '');
INSERT INTO color_reference_scan(id) VALUES(1);
CREATE TRIGGER color_reference_new_revision AFTER UPDATE OF status,active_version ON content
WHEN NEW.status='published' AND NEW.active_version IS NOT NULL BEGIN
 INSERT OR IGNORE INTO color_reference_job(job_key,content_id,source_sha256,preview_sha256)
 SELECT lower(hex(randomblob(16))),NEW.id,a.sha256,p.sha256 FROM asset a JOIN asset p
 ON p.content_id=a.content_id AND p.content_version=a.content_version
 WHERE a.content_id=NEW.id AND a.content_version=NEW.active_version
 AND a.role='printable_webp_bw' AND p.role='catalog_preview_bw' AND a.verified=1 AND p.verified=1;
END;
CREATE TABLE color_ai_reservation (
 request_id TEXT PRIMARY KEY,
 job_key TEXT NOT NULL REFERENCES color_reference_job(job_key),
 day TEXT NOT NULL,
 neurons INTEGER NOT NULL CHECK(neurons=300),
 daily_limit INTEGER NOT NULL CHECK(daily_limit BETWEEN 300 AND 9000),
 provider_receipt TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX color_ai_day ON color_ai_reservation(day);
-- Both pipelines share a conservative ledger. Free-account enforcement remains
-- the final account-wide stop, including usage from other environments.
DROP TRIGGER ai_free_budget;
CREATE TRIGGER ai_free_budget BEFORE INSERT ON ai_free_reservation BEGIN
 SELECT CASE WHEN (SELECT COALESCE(SUM(neurons),0) FROM ai_free_reservation WHERE day=NEW.day)
 +(SELECT COALESCE(SUM(neurons),0) FROM color_ai_reservation WHERE day=NEW.day)+NEW.neurons>NEW.daily_limit
 THEN RAISE(ABORT,'FREE_NEURONS_EXHAUSTED') END;
END;
CREATE TRIGGER color_ai_budget BEFORE INSERT ON color_ai_reservation BEGIN
 SELECT CASE WHEN (SELECT COALESCE(SUM(neurons),0) FROM ai_free_reservation WHERE day=NEW.day)
 +(SELECT COALESCE(SUM(neurons),0) FROM color_ai_reservation WHERE day=NEW.day)+NEW.neurons>NEW.daily_limit
 THEN RAISE(ABORT,'FREE_NEURONS_EXHAUSTED') END;
END;
