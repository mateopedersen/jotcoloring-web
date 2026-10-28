-- Local quota is additional protection. It does not measure other projects.
CREATE TABLE ai_free_reservation (
 job_id TEXT PRIMARY KEY REFERENCES creator_job(id),
 day TEXT NOT NULL,
 neurons INTEGER NOT NULL CHECK(neurons>0),
 daily_limit INTEGER NOT NULL CHECK(daily_limit BETWEEN 1 AND 10000),
 provider_receipt TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX ai_free_day ON ai_free_reservation(day);
CREATE TRIGGER ai_free_budget BEFORE INSERT ON ai_free_reservation BEGIN
 SELECT CASE WHEN (SELECT COALESCE(SUM(neurons),0) FROM ai_free_reservation WHERE day=NEW.day)+NEW.neurons>NEW.daily_limit THEN RAISE(ABORT,'FREE_NEURONS_EXHAUSTED') END;
END;
