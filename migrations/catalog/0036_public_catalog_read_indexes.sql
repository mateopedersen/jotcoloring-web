-- Cover source/revision eligibility without loading the full content or asset
-- rows for every member of an exact age/detail count. Artwork is not modified.
CREATE INDEX content_public_revision ON content(id,active_version,status,example_only);
CREATE INDEX asset_current_source ON asset(content_id,content_version,role,sha256,verified);
