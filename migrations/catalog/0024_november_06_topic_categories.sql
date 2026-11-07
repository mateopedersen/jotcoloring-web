-- Exact topic pages for the owner-authorized November 6 intake.
-- Reuse established subject roots; add one public navigation home for social media.
INSERT INTO category(id,name,parent_id,sort_order) VALUES('social-media','Social Media',NULL,391) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('instagram','Instagram','social-media',392) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('stained-glass','Stained Glass','art-patterns',393) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('squishmallow','Squishmallow','dolls-toys',394) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('pennywise','Pennywise','horror',395) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('penguin','Penguin','polar-animals',396) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('pegasus','Pegasus','fantasy',397) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('kangaroo','Kangaroo','animals',398) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('snapchat','Snapchat','social-media',399) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('tiktok','TikTok','social-media',400) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('facebook','Facebook','social-media',401) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('x','X','social-media',402) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('bugatti','Bugatti','cars',403) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('mercedes-benz','Mercedes-Benz','cars',404) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('audi','Audi','cars',405) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('chery','Chery','cars',406) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('byd','BYD','cars',407) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('volvo','Volvo','cars',408) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('tesla','Tesla','cars',409) ON CONFLICT(id) DO NOTHING;
PRAGMA foreign_keys = ON;
