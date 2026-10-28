CREATE TABLE search_document(id TEXT PRIMARY KEY,source_version INTEGER NOT NULL,visibility TEXT NOT NULL,locale TEXT NOT NULL,title TEXT NOT NULL,tags TEXT NOT NULL,categories TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE VIRTUAL TABLE search_fts USING fts5(id UNINDEXED,title,tags,categories,content='search_document',content_rowid='rowid',tokenize='unicode61 remove_diacritics 2');
CREATE TRIGGER search_ai AFTER INSERT ON search_document BEGIN INSERT INTO search_fts(rowid,id,title,tags,categories) VALUES(new.rowid,new.id,new.title,new.tags,new.categories); END;
CREATE TRIGGER search_ad AFTER DELETE ON search_document BEGIN INSERT INTO search_fts(search_fts,rowid,id,title,tags,categories) VALUES('delete',old.rowid,old.id,old.title,old.tags,old.categories); END;
CREATE TRIGGER search_au AFTER UPDATE ON search_document BEGIN INSERT INTO search_fts(search_fts,rowid,id,title,tags,categories) VALUES('delete',old.rowid,old.id,old.title,old.tags,old.categories); INSERT INTO search_fts(rowid,id,title,tags,categories) VALUES(new.rowid,new.id,new.title,new.tags,new.categories); END;
CREATE INDEX search_visibility ON search_document(visibility,source_version);
