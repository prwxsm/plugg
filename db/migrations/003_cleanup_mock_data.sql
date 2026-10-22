-- 003_cleanup_mock_data.sql
-- Safe cleanup script for deleting all records where is_mock = true in proper FK dependency order.
-- Can be executed whenever the platform should be wiped of seed demo data.

BEGIN;

DELETE FROM likes WHERE track_id IN (SELECT id FROM tracks WHERE is_mock);
DELETE FROM follows WHERE artist_id IN (SELECT id FROM artists WHERE is_mock);
DELETE FROM playlist_tracks WHERE playlist_id IN (SELECT id FROM playlists WHERE is_mock) 
                               OR track_id IN (SELECT id FROM tracks WHERE is_mock);
DELETE FROM release_tracks WHERE release_id IN (SELECT id FROM releases WHERE is_mock) 
                              OR track_id IN (SELECT id FROM tracks WHERE is_mock);

DELETE FROM analytics_recent_plays WHERE artist_id IN (SELECT id FROM artists WHERE is_mock);
DELETE FROM analytics_release_performance WHERE artist_id IN (SELECT id FROM artists WHERE is_mock);
DELETE FROM analytics_timeline WHERE artist_id IN (SELECT id FROM artists WHERE is_mock);
DELETE FROM artist_analytics WHERE artist_id IN (SELECT id FROM artists WHERE is_mock);

DELETE FROM files WHERE track_id IN (SELECT id FROM tracks WHERE is_mock);
DELETE FROM tracks WHERE is_mock;
DELETE FROM releases WHERE is_mock;
DELETE FROM playlists WHERE is_mock;
DELETE FROM users WHERE is_mock;
DELETE FROM artists WHERE is_mock;
-- Optionally leave genres or clean them:
-- DELETE FROM genres WHERE is_mock;

COMMIT;
