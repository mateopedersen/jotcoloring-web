-- One queue delivery owns post-processing. Expired leases are recoverable.
ALTER TABLE creator_job ADD COLUMN processing_token TEXT;
ALTER TABLE creator_job ADD COLUMN processing_lease_until TEXT;
