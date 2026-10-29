-- Store hundredths as integers so SQLite/PostgreSQL backups preserve exact scores.
CREATE TABLE age_recommendation_precise(
 content_id TEXT PRIMARY KEY REFERENCES content(id),
 content_version INTEGER NOT NULL CHECK(content_version>0),
 source_sha256 TEXT NOT NULL CHECK(length(source_sha256)=64),
 band TEXT NOT NULL CHECK(band IN ('3-5','6-8','9-12','13-17','adults')),
 score_hundredths INTEGER NOT NULL CHECK(score_hundredths BETWEEN 0 AND 10000),
 method_version TEXT NOT NULL
);
INSERT INTO age_recommendation_precise SELECT content_id,content_version,source_sha256,band,CAST(round(score*100) AS INTEGER),method_version FROM age_recommendation;
DROP TABLE age_recommendation;
ALTER TABLE age_recommendation_precise RENAME TO age_recommendation;
CREATE INDEX age_recommendation_band ON age_recommendation(band,content_id);
