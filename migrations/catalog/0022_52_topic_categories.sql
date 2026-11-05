-- Exact topic pages for the authorized 52-package release.
-- Each package has its own subject category; parents connect it to the correct collection.
INSERT INTO category(id,name,parent_id,sort_order) VALUES('american-flag','American Flag','holidays',340) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('anpanman','Anpanman','cartoons',341) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('angry-birds','Angry Birds','video-games',342) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('among-us','Among Us','video-games',343) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('faith','Faith & Religion',NULL,22) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('religious','Religious','faith',344) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('rat','Rat','animals',345) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('my-little-pony','My Little Pony','cartoons',346) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('ramadan','Ramadan','holidays',347) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('rainbow-friends','Rainbow Friends','video-games',348) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('ant','Ant','insects',349) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('jet','Jet','aircraft',350) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('jungle','Jungle','jungle-animals',351) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('ankylosaurus','Ankylosaurus','dinosaurs',352) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('angel','Angel','fantasy',353) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('amy-rose','Amy Rose','sonic',354) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('rabbit','Rabbit','animals',355) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('reindeer','Reindeer','animals',356) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('red-panda','Red Panda','animals',357) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('rarity','Rarity','my-little-pony',358) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('rainbow-dash','Rainbow Dash','my-little-pony',359) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('rainbow','Rainbow','weather',360) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('rain','Rain','weather',361) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('raccoon','Raccoon','animals',362) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('race-car','Race Car','cars',363) ON CONFLICT(id) DO NOTHING;
PRAGMA foreign_keys = ON;
