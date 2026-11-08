-- Add the source-reviewed Scooby-Doo leaf under the existing Cartoons collection.
INSERT INTO category(id,name,parent_id,sort_order) VALUES('scooby-doo','Scooby-Doo','cartoons',483) ON CONFLICT(id) DO NOTHING;
