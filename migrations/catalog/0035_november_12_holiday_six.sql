-- Add six source-reviewed holiday subjects without replacing existing categories.
INSERT INTO category(id,parent_id,name,sort_order) VALUES('elf-on-the-shelf','christmas','Elf on the Shelf',612) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,parent_id,name,sort_order) VALUES('nutcracker','christmas','Nutcracker',613) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,parent_id,name,sort_order) VALUES('the-nightmare-before-christmas','christmas','The Nightmare Before Christmas',614) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,parent_id,name,sort_order) VALUES('nativity','christmas','Nativity',615) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,parent_id,name,sort_order) VALUES('gingerbread-man','christmas','Gingerbread Man',616) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,parent_id,name,sort_order) VALUES('grinch','christmas','Grinch',617) ON CONFLICT(id) DO NOTHING;
