-- Register canonical animal subjects in their reviewed parent categories.
INSERT INTO category(id,parent_id,name,sort_order) VALUES('fennec-fox','animals','Fennec Fox',693) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,parent_id,name,sort_order) VALUES('gharial','reptiles','Gharial',694) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,parent_id,name,sort_order) VALUES('musk-ox','polar-animals','Musk Ox',695) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,parent_id,name,sort_order) VALUES('cuttlefish','ocean','Cuttlefish',696) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,parent_id,name,sort_order) VALUES('dugong','ocean','Dugong',697) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,parent_id,name,sort_order) VALUES('secretary-bird','birds','Secretary Bird',698) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,parent_id,name,sort_order) VALUES('shoebill','birds','Shoebill',699) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,parent_id,name,sort_order) VALUES('binturong','jungle-animals','Binturong',700) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,parent_id,name,sort_order) VALUES('tarsier','jungle-animals','Tarsier',701) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,parent_id,name,sort_order) VALUES('aardvark','safari-animals','Aardvark',702) ON CONFLICT(id) DO NOTHING;
