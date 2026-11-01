-- Add only five new categories. Reuse accepted Sharks, Sea Turtles and Birthdays categories.
INSERT INTO category(id,name,parent_id,sort_order) VALUES('turtles','Turtles','animals',35) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('pandas','Pandas','animals',36) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('trick-or-treat','Trick or Treat','holidays',55) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('fnaf','Five Nights at Freddy''s','video-games',3) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,name,parent_id,sort_order) VALUES('bible','Bible',NULL,26) ON CONFLICT(id) DO NOTHING;
