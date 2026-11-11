-- Existing Parties and Hanukkah identities are retained; only new subjects are inserted.
INSERT INTO category(id,parent_id,name,sort_order) VALUES('police-car','vehicles','Police Car',610) ON CONFLICT(id) DO NOTHING;
INSERT INTO category(id,parent_id,name,sort_order) VALUES('christmas-eve','christmas','Christmas Eve',611) ON CONFLICT(id) DO NOTHING;
