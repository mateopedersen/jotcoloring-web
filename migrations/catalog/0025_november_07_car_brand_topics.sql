-- Exact brand topic pages for the owner-authorized November 7 vehicle intake.
-- All six topics stay under the existing Cars collection.
INSERT INTO category(id,name,parent_id,sort_order) VALUES('gmc','GMC','cars',410) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('ford','Ford','cars',411) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('kia','Kia','cars',412) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('chevrolet','Chevrolet','cars',413) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('bentley','Bentley','cars',414) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('buick','Buick','cars',415) ON CONFLICT(id) DO NOTHING;
PRAGMA foreign_keys = ON;
