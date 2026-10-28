ALTER TABLE search_document ADD COLUMN age_groups TEXT NOT NULL DEFAULT '[]';
ALTER TABLE search_document ADD COLUMN difficulty TEXT;
ALTER TABLE search_document ADD COLUMN published_at TEXT NOT NULL DEFAULT '';
ALTER TABLE search_document ADD COLUMN sort_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE search_document ADD COLUMN category_ids TEXT NOT NULL DEFAULT '[]';
CREATE INDEX search_date ON search_document(visibility,published_at DESC,id DESC);
CREATE INDEX search_popular ON search_document(visibility,sort_score DESC,id DESC);
CREATE INDEX search_title ON search_document(visibility,title COLLATE NOCASE,id);
