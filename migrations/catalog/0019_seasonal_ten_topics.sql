-- Add only the ten separately reviewed November 3 topics. Preserve existing categories.
INSERT INTO category(id,name,parent_id,sort_order) VALUES('sugar-skull','Sugar Skull','holidays',300) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('veterans-day','Veterans Day','holidays',301) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('christmas-tree','Christmas Tree','holidays',302) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('january','January','seasons',303) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('december','December','seasons',304) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('all-souls-day','All Souls'' Day','holidays',305) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('cheetah','Cheetah','animals',306) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('excavator','Excavator','vehicles',307) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('gingerbread-house','Gingerbread House','holidays',308) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('fall-leaf','Fall Leaf','nature',309) ON CONFLICT(id) DO NOTHING;
