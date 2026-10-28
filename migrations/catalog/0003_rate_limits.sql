CREATE TABLE request_limit(scope TEXT NOT NULL,key_hash TEXT NOT NULL,window_start INTEGER NOT NULL,count INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(scope,key_hash,window_start));
CREATE INDEX request_limit_expiry ON request_limit(window_start);
