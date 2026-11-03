-- Durable discovery work is created atomically with canonical publication changes.
CREATE TABLE discovery_dirty(segment TEXT PRIMARY KEY,generation INTEGER NOT NULL DEFAULT 1);
CREATE TABLE discovery_fragment(segment TEXT PRIMARY KEY,object_key TEXT NOT NULL,etag TEXT NOT NULL,url_count INTEGER NOT NULL,bytes INTEGER NOT NULL,generated_at TEXT NOT NULL,generation INTEGER NOT NULL);
CREATE TABLE discovery_page(path_key TEXT PRIMARY KEY,lastmod TEXT NOT NULL);
CREATE TABLE discovery_state(id INTEGER PRIMARY KEY CHECK(id=1),epoch INTEGER NOT NULL DEFAULT 0,reconcile_after INTEGER NOT NULL DEFAULT 0);
INSERT INTO discovery_state(id) VALUES(1);
CREATE TABLE discovery_notice(id INTEGER PRIMARY KEY AUTOINCREMENT,path_key TEXT NOT NULL,content_id TEXT,revision TEXT NOT NULL,event_type TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,not_before TEXT NOT NULL DEFAULT '',lease_until TEXT,last_status INTEGER,last_error TEXT,received_at TEXT,created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),UNIQUE(path_key,revision,event_type));
CREATE INDEX discovery_notice_due ON discovery_notice(state,not_before,id);
INSERT INTO discovery_dirty(segment) VALUES('static');
INSERT OR IGNORE INTO discovery_dirty(segment) SELECT CAST((ordinal-1)/1000+1 AS TEXT) FROM sitemap_entry;
-- Metadata changes affect lastmod even if active_version is unchanged.
CREATE TRIGGER discovery_content AFTER UPDATE OF status,active_version,slug,title,description,alt_text ON content WHEN (OLD.status='published' OR NEW.status='published') AND (OLD.status IS NOT NEW.status OR OLD.active_version IS NOT NEW.active_version OR OLD.slug IS NOT NEW.slug OR OLD.title IS NOT NEW.title OR OLD.description IS NOT NEW.description OR OLD.alt_text IS NOT NEW.alt_text) BEGIN
 UPDATE sitemap_entry SET slug=NEW.slug,visibility=NEW.status,updated_at=NEW.updated_at WHERE content_id=NEW.id;
 INSERT INTO discovery_dirty(segment) SELECT CAST((ordinal-1)/1000+1 AS TEXT) FROM sitemap_entry WHERE content_id=NEW.id ON CONFLICT(segment) DO UPDATE SET generation=generation+1;
 INSERT INTO discovery_dirty(segment) VALUES('static') ON CONFLICT(segment) DO UPDATE SET generation=generation+1;
 INSERT INTO discovery_page VALUES('/',NEW.updated_at) ON CONFLICT(path_key) DO UPDATE SET lastmod=excluded.lastmod;
 INSERT INTO discovery_page VALUES('/coloring-pages/',NEW.updated_at) ON CONFLICT(path_key) DO UPDATE SET lastmod=excluded.lastmod;
 INSERT INTO discovery_page SELECT 'category:'||category_id,NEW.updated_at FROM content_category WHERE content_id=NEW.id ON CONFLICT(path_key) DO UPDATE SET lastmod=excluded.lastmod;
 INSERT OR IGNORE INTO discovery_notice(path_key,content_id,revision,event_type) VALUES('/coloring/'||NEW.slug||'/',NEW.id,CAST(NEW.latest_version AS TEXT)||':'||NEW.updated_at,CASE WHEN NEW.status='published' THEN 'upsert' ELSE 'remove' END);
 INSERT OR IGNORE INTO discovery_notice(path_key,content_id,revision,event_type) SELECT '/coloring/'||OLD.slug||'/',NEW.id,CAST(NEW.latest_version AS TEXT)||':'||NEW.updated_at,'redirect' WHERE OLD.status='published' AND OLD.slug<>NEW.slug;
 INSERT OR IGNORE INTO discovery_notice(path_key,revision,event_type) SELECT 'category:'||category_id,NEW.updated_at,'upsert' FROM content_category WHERE content_id=NEW.id;
 INSERT INTO outbox_event(event_id,content_id,version,event_type) SELECT lower(hex(randomblob(16))),NEW.id,NEW.latest_version,'discovery' WHERE OLD.active_version IS NEW.active_version AND OLD.status IS NEW.status;
END;
CREATE TRIGGER discovery_insert AFTER INSERT ON content WHEN NEW.status='published' BEGIN
 INSERT INTO discovery_dirty(segment) VALUES('static') ON CONFLICT(segment) DO UPDATE SET generation=generation+1;
 INSERT INTO discovery_dirty(segment) SELECT CAST((ordinal-1)/1000+1 AS TEXT) FROM sitemap_entry WHERE content_id=NEW.id ON CONFLICT(segment) DO UPDATE SET generation=generation+1;
 INSERT OR IGNORE INTO discovery_notice(path_key,content_id,revision,event_type) VALUES('/coloring/'||NEW.slug||'/',NEW.id,CAST(NEW.latest_version AS TEXT)||':'||NEW.updated_at,'upsert');
END;
CREATE TRIGGER discovery_sitemap_insert AFTER INSERT ON sitemap_entry BEGIN
 INSERT INTO discovery_dirty(segment) VALUES(CAST((NEW.ordinal-1)/1000+1 AS TEXT)) ON CONFLICT(segment) DO UPDATE SET generation=generation+1;
END;
CREATE TRIGGER discovery_category AFTER UPDATE OF name,parent_id ON category WHEN NEW.name IS NOT OLD.name OR NEW.parent_id IS NOT OLD.parent_id BEGIN
 INSERT INTO discovery_dirty(segment) VALUES('static') ON CONFLICT(segment) DO UPDATE SET generation=generation+1;
 INSERT INTO discovery_page VALUES('category:'||NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(path_key) DO UPDATE SET lastmod=excluded.lastmod;
 INSERT OR IGNORE INTO discovery_notice(path_key,revision,event_type) VALUES('category:'||NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now'),'upsert');
END;
CREATE TRIGGER discovery_category_insert AFTER INSERT ON category BEGIN
 INSERT INTO discovery_dirty(segment) VALUES('static') ON CONFLICT(segment) DO UPDATE SET generation=generation+1;
END;
CREATE TRIGGER discovery_membership_add AFTER INSERT ON content_category WHEN EXISTS(SELECT 1 FROM content WHERE id=NEW.content_id AND status='published') BEGIN
 INSERT INTO discovery_dirty(segment) VALUES('static') ON CONFLICT(segment) DO UPDATE SET generation=generation+1;
 INSERT INTO discovery_page VALUES('category:'||NEW.category_id,strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(path_key) DO UPDATE SET lastmod=excluded.lastmod;
 INSERT OR IGNORE INTO discovery_notice(path_key,revision,event_type) VALUES('category:'||NEW.category_id,strftime('%Y-%m-%dT%H:%M:%fZ','now'),'upsert');
END;
CREATE TRIGGER discovery_membership_remove AFTER DELETE ON content_category WHEN EXISTS(SELECT 1 FROM content WHERE id=OLD.content_id AND status='published') BEGIN
 INSERT INTO discovery_dirty(segment) VALUES('static') ON CONFLICT(segment) DO UPDATE SET generation=generation+1;
 INSERT INTO discovery_page VALUES('category:'||OLD.category_id,strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(path_key) DO UPDATE SET lastmod=excluded.lastmod;
 INSERT OR IGNORE INTO discovery_notice(path_key,revision,event_type) VALUES('category:'||OLD.category_id,strftime('%Y-%m-%dT%H:%M:%fZ','now'),'upsert');
END;
