-- New collectible and character topics; preserve all existing category IDs and relationships.
INSERT INTO category(id,name,parent_id,sort_order) VALUES('labubu','Labubu','dolls-toys',3) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('crybaby','CRYBABY','dolls-toys',4) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('pompompurin','Pompompurin','cartoons',10) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('cinnamoroll','Cinnamoroll','cartoons',11) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('kuromi','Kuromi','cartoons',12) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('monchhichi','Monchhichi','dolls-toys',5) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('mofusand','Mofusand','cartoons',13) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('chiikawa','Chiikawa','cartoons',14) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('smiski','Smiski','dolls-toys',6) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('sonny-angel','Sonny Angel','dolls-toys',7) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('zimomo','Zimomo','dolls-toys',8) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('pucky','Pucky','dolls-toys',9) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('hacipupu','Hacipupu','dolls-toys',10) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('twinkle-twinkle','Twinkle Twinkle','dolls-toys',11) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('hirono','Hirono','dolls-toys',12) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('skullpanda','SKULLPANDA','dolls-toys',13) ON CONFLICT(id) DO NOTHING;
