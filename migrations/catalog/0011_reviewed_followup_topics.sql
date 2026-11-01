-- Add only the three owner-authorized follow-up topics; preserve every accepted category.
INSERT INTO category(id,name,parent_id,sort_order) VALUES('descendants','Descendants','cartoons',8) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('k-pop-demon-hunters','KPop Demon Hunters','cartoons',9) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('squishy','Squishy','dolls-toys',2) ON CONFLICT(id) DO NOTHING;
