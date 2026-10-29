CREATE TABLE age_recommendation(
 content_id TEXT PRIMARY KEY REFERENCES content(id),
 content_version INTEGER NOT NULL CHECK(content_version>0),
 source_sha256 TEXT NOT NULL CHECK(length(source_sha256)=64),
 band TEXT NOT NULL CHECK(band IN ('3-5','6-8','9-12','13-17','adults')),
 score REAL NOT NULL CHECK(score>=0 AND score<=100),
 method_version TEXT NOT NULL
);
CREATE INDEX age_recommendation_band ON age_recommendation(band,content_id);
