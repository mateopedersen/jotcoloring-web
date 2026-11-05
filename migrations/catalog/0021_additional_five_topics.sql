-- Five packages are catalogued by their accurate specific subjects.
-- Jet and Jungle have dedicated subject rows in migration 0022, under Aircraft and Jungle Animals.
INSERT INTO category(id,name,parent_id,sort_order) VALUES('jurassic-park','Jurassic Park','dinosaurs',331) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('juneteenth','Juneteenth','holidays',333) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('john-deere','John Deere','vehicles',334) ON CONFLICT(id) DO NOTHING;
PRAGMA foreign_keys = ON;
