INSERT INTO category(id,name,parent_id,sort_order)
VALUES('gta-6','GTA 6','video-games',600)
ON CONFLICT(id) DO NOTHING;
