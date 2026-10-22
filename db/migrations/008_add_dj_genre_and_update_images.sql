-- Migration 008: Add DJ genre and update genre images to asset identifiers
INSERT INTO genres (id, name, slug, image, is_mock)
VALUES ('g6', 'DJ', 'dj', 'genre_dj', false)
ON CONFLICT (slug) DO UPDATE SET name = 'DJ', image = 'genre_dj';

UPDATE genres SET image = 'genre_afrobeats' WHERE slug = 'afrobeats';
UPDATE genres SET image = 'genre_dancehall' WHERE slug = 'dancehall';
UPDATE genres SET image = 'genre_gospel' WHERE slug = 'gospel';
UPDATE genres SET image = 'genre_hiphop' WHERE slug = 'hip-hop';
UPDATE genres SET image = 'genre_rnb' WHERE slug = 'rnb';
UPDATE genres SET image = 'genre_dj' WHERE slug = 'dj';
