-- Stable ordinal ranges keep sitemap generation bounded as the catalog grows.
-- Entries are maintained in the SAME canonical transaction as publication.
CREATE TABLE sitemap_entry (
 ordinal INTEGER PRIMARY KEY AUTOINCREMENT,
 content_id TEXT NOT NULL UNIQUE REFERENCES content(id),
 slug TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 visibility TEXT NOT NULL
);
CREATE INDEX sitemap_visibility_ordinal ON sitemap_entry(visibility,ordinal);
INSERT INTO sitemap_entry(content_id,slug,updated_at,visibility)
 SELECT id,slug,updated_at,status FROM content WHERE status='published' ORDER BY id;
CREATE TRIGGER sitemap_content_insert AFTER INSERT ON content WHEN NEW.status='published' BEGIN
 INSERT INTO sitemap_entry(content_id,slug,updated_at,visibility) VALUES(NEW.id,NEW.slug,NEW.updated_at,NEW.status);
END;
CREATE TRIGGER sitemap_content_update AFTER UPDATE OF status,active_version,slug ON content
 WHEN NEW.status='published' OR OLD.status='published'
BEGIN
 INSERT INTO sitemap_entry(content_id,slug,updated_at,visibility) SELECT NEW.id,NEW.slug,NEW.updated_at,NEW.status WHERE NOT EXISTS(SELECT 1 FROM sitemap_entry WHERE content_id=NEW.id);
 UPDATE sitemap_entry SET slug=NEW.slug,updated_at=NEW.updated_at,visibility=NEW.status WHERE content_id=NEW.id;
END;
