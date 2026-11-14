-- Register the complete, source-reviewed Golden State Valkyries subject. Existing categories and content remain intact.
INSERT INTO category(id,parent_id,name,sort_order) VALUES('golden-state-valkyries','basketball','Golden State Valkyries',662) ON CONFLICT(id) DO NOTHING;
