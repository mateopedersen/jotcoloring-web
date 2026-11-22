-- Register the new subject collections. Number 67 uses the existing numbers category.
INSERT INTO category(id,parent_id,name,sort_order) VALUES('christmas-stocking','christmas','Christmas Stocking',710) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,parent_id,name,sort_order) VALUES('capybara','animals','Capybara',711) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,parent_id,name,sort_order) VALUES('dirt-bike','vehicles','Dirt Bike',712) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,parent_id,name,sort_order) VALUES('mothers-day','holidays','Mother’s Day',713) ON CONFLICT(id) DO NOTHING;
