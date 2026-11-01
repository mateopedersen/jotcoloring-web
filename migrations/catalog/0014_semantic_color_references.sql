-- Preserve the v2 audit trail, but never activate its unreviewed colors.
UPDATE color_reference_job SET state='obsolete',lease_until=NULL WHERE engine='pixel-conditioned-v2';
UPDATE color_reference_scan SET after_id='' WHERE id=1;
DROP TRIGGER color_reference_new_revision;
CREATE TRIGGER color_reference_new_revision AFTER UPDATE OF status,active_version ON content
WHEN NEW.status='published' AND NEW.active_version IS NOT NULL BEGIN
 INSERT OR IGNORE INTO color_reference_job(job_key,content_id,source_sha256,preview_sha256,engine)
 SELECT lower(hex(randomblob(16))),NEW.id,a.sha256,p.sha256,'pixel-conditioned-v3' FROM asset a JOIN asset p
 ON p.content_id=a.content_id AND p.content_version=a.content_version
 WHERE a.content_id=NEW.id AND a.content_version=NEW.active_version
 AND a.role='printable_webp_bw' AND p.role='catalog_preview_bw' AND a.verified=1 AND p.verified=1;
END;

-- Bounded vision planning/review reserve 600 neurons each; image generation 300.
DROP TRIGGER color_ai_budget;
DROP TRIGGER ai_free_budget;
ALTER TABLE color_ai_reservation RENAME TO color_ai_reservation_v2;
DROP INDEX color_ai_day;
CREATE TABLE color_ai_reservation (
 request_id TEXT PRIMARY KEY,
 job_key TEXT NOT NULL REFERENCES color_reference_job(job_key),
 day TEXT NOT NULL,
 neurons INTEGER NOT NULL CHECK(neurons IN (300,600)),
 daily_limit INTEGER NOT NULL CHECK(daily_limit BETWEEN 300 AND 9000),
 provider_receipt TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT INTO color_ai_reservation SELECT * FROM color_ai_reservation_v2;
DROP TABLE color_ai_reservation_v2;
CREATE INDEX color_ai_day ON color_ai_reservation(day);
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
