-- Four new reviewed subject pages; puppy artwork joins the existing Dogs & Puppies topic.
INSERT INTO category(id,name,parent_id,sort_order) VALUES('rhino','Rhino','animals',420) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('gymnastics','Gymnastics','sports',421) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('rescue-bots','Transformers Rescue Bots','robots',422) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('pusheen','Pusheen','cartoons',423) ON CONFLICT(id) DO NOTHING;
PRAGMA foreign_keys = ON;
