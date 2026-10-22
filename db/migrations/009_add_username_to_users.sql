-- 009_add_username_to_users.sql
-- Add username column to users table for listener handles

ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
