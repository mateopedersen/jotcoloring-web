-- Four detail levels reuse the source-bound image analysis; no duplicate labels.
CREATE INDEX age_recommendation_detail ON age_recommendation(score_hundredths,content_id,content_version);
