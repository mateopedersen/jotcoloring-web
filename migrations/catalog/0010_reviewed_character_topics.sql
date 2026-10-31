-- Explicit editorial topics; no existing accepted category is renamed or deleted.
INSERT INTO category(id,name,parent_id,sort_order) VALUES('cartoons','Characters & Cartoons',NULL,23) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('dolls-toys','Dolls & Toys',NULL,24) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('video-games','Video Games',NULL,25) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('sonic','Sonic','video-games',1) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('hello-kitty','Hello Kitty','cartoons',1) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('barbie','Barbie','dolls-toys',1) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('bluey','Bluey','cartoons',2) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('minecraft','Minecraft','video-games',2) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('princesses','Princesses','fantasy',6) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('huntrix','HUNTR/X','cartoons',7) ON CONFLICT(id) DO NOTHING;
