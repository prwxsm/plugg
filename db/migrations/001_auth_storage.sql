-- 001_auth_storage.sql
-- Add category, storage_provider, and upload_status to files table if not exists

ALTER TABLE files ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'audio';
ALTER TABLE files ADD COLUMN IF NOT EXISTS storage_provider TEXT NOT NULL DEFAULT 'local';
ALTER TABLE files ADD COLUMN IF NOT EXISTS upload_status TEXT NOT NULL DEFAULT 'ready';

CREATE INDEX IF NOT EXISTS idx_files_category ON files(category);
CREATE INDEX IF NOT EXISTS idx_files_storage_key ON files(storage_key);
