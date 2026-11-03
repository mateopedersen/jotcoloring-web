-- Public figure topic identities. Preserve all existing records and parents.
INSERT INTO category(id,name,parent_id,sort_order) VALUES('mrbeast','MrBeast','people',3) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('elon-musk','Elon Musk','people',4) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('donald-trump','Donald Trump','people',5) ON CONFLICT(id) DO NOTHING;
