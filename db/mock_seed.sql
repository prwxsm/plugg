-- ============================================================================
-- Plugg — Mock Seed Data
-- ============================================================================
-- Populates the schema from db/schema.sql with the same data found in
-- src/data/*.ts so the local Postgres DB mirrors the frontend prototype.
-- Run this AFTER schema.sql in DBeaver.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- ARTISTS
-- ---------------------------------------------------------------------------

INSERT INTO artists (id, username, display_name, bio, location, avatar_url, cover_url, verified, fans, monthly_listeners, total_plays, social_links) VALUES
('a1', 'zurimwangi',       'Zuri Mwangi',        'Afro-fusion singer and producer from Nairobi. Writing songs about lake towns, late buses and the people who wait.', 'Nairobi, Kenya',         'c2', 'b1', TRUE,  48210,  312480,  8420330,  '{"instagram":"zurimwangi","x":"zurimwangi","youtube":"zurimwangimusic"}'),
('a2', 'kitoblaze',        'Kito Blaze',         'Bongo Flava from Mikocheni. Melodies first, everything else after.',                                                'Dar es Salaam, Tanzania', 'c3', 'b2', TRUE,  91500,  640210,  21044190, '{"instagram":"kitoblaze","tiktok":"kitoblaze"}'),
('a3', 'niaachieng',       'Nia Achieng',        'Kisumu-raised vocalist blending R&B with Luo benga phrasing.',                                                      'Kisumu, Kenya',          'c4', 'b1', TRUE,  12840,  74310,   1284900,  '{"instagram":"niaachieng","youtube":"niaachieng"}'),
('a4', 'selassiekim',      'Selassie Kim',       'Amapiano producer in Kampala. Log drums, church keys, long nights.',                                                'Kampala, Uganda',        'c6', 'b2', TRUE,  63120,  402770,  10993410, '{"instagram":"selassiekim","x":"selassiekim"}'),
('a5', 'rastembo',         'Ras Tembo',          'Coastal dancehall out of Mombasa. Riddims built for the ferry queue.',                                               'Mombasa, Kenya',         'c5', 'b1', TRUE,  21050,  118600,  2740880,  '{"instagram":"rastembo","tiktok":"rastembo254"}'),
('a6', 'binaosei',         'Bina Osei',          'Afrobeats artist from Accra, recording between Osu and Nairobi.',                                                   'Accra, Ghana',           'c8', 'b2', TRUE,  138400, 902450,  34881020, '{"instagram":"binaosei","x":"binaosei","youtube":"binaosei"}'),
('a7', 'mizizicollective', 'Mizizi Collective',  'Six-piece alternative band from Nairobi. Guitars, taarab horns, field recordings.',                                 'Nairobi, Kenya',         'c7', 'b1', TRUE,  9420,   41200,   688740,   '{"instagram":"mizizicollective"}'),
('a8', 'papajengo',        'Papa Jengo',         'Swahili hip-hop from Arusha. Tape-warm drums, storytelling verses.',                                                'Arusha, Tanzania',       'c1', 'b2', TRUE,  30760,  164900,  4120560,  '{"instagram":"papajengo","tiktok":"papajengo"}');

-- ---------------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------------

INSERT INTO users (id, name, email, account_type, avatar_url, artist_id) VALUES
('u1', 'Amani Kariuki', 'amani@plugg.fm', 'listener', 'c3', NULL),
('u2', 'Zuri Mwangi',   'zuri@plugg.fm',  'artist',   'c2', 'a1');

-- ---------------------------------------------------------------------------
-- GENRES
-- ---------------------------------------------------------------------------

INSERT INTO genres (id, name, slug, image) VALUES
('g1', 'Afrobeats',    'afrobeats',    'c8'),
('g2', 'Amapiano',     'amapiano',     'c6'),
('g3', 'Bongo Flava',  'bongo-flava',  'c3'),
('g4', 'Afro-fusion',  'afro-fusion',  'c1'),
('g5', 'Dancehall',    'dancehall',    'c5'),
('g6', 'R&B',          'rnb',          'c2'),
('g7', 'Hip-Hop',      'hip-hop',      'c7'),
('g8', 'Alternative',  'alternative',  'c4');

-- ---------------------------------------------------------------------------
-- RELEASES
-- ---------------------------------------------------------------------------

INSERT INTO releases (id, artist_id, title, slug, type, cover_url, release_date, status) VALUES
('r1',  'a1', 'Lakeside Gold',          'lakeside-gold',          'EP',     'c1', '2026-07-18', 'published'),
('r2',  'a1', 'Nyota',                  'nyota',                  'single', 'c2', '2026-02-06', 'published'),
('r3',  'a2', 'Mikocheni Nights',       'mikocheni-nights',       'album',  'c3', '2026-05-22', 'published'),
('r4',  'a3', 'Soft Power',             'soft-power',             'EP',     'c4', '2026-06-30', 'published'),
('r5',  'a4', 'Log Drum Letters',       'log-drum-letters',       'EP',     'c6', '2026-08-14', 'published'),
('r6',  'a5', 'Coastline Riddim',       'coastline-riddim',       'single', 'c5', '2026-04-11', 'published'),
('r7',  'a6', 'Accra Motion',           'accra-motion',           'album',  'c8', '2026-03-27', 'published'),
('r8',  'a7', 'Roots in Concrete',      'roots-in-concrete',      'EP',     'c7', '2026-08-29', 'published'),
('r9',  'a8', 'Arusha Tape Vol. 1',     'arusha-tape-vol-1',      'album',  'c7', '2026-01-24', 'published'),
('r10', 'a1', 'Sunrise Over Naivasha',  'sunrise-over-naivasha',  'single', 'c5', '2026-10-02', 'scheduled'),
('r11', 'a1', 'Untitled Session',       'untitled-session',       'single', 'c4', '2026-11-20', 'draft');

-- ---------------------------------------------------------------------------
-- TRACKS
-- ---------------------------------------------------------------------------

INSERT INTO tracks (id, artist_id, release_id, title, slug, genre, cover_url, audio_url, duration_seconds, play_count, published, release_date) VALUES
('t1',  'a1', 'r1',  'Lakeside Gold',         'lakeside-gold',          'Afro-fusion',  'c1', NULL, 212, 1840220,  TRUE,  '2026-07-18'),
('t2',  'a1', 'r1',  'Kisumu Blue',            'kisumu-blue',            'Afro-fusion',  'c1', NULL, 236, 962110,   TRUE,  '2026-07-18'),
('t3',  'a1', 'r1',  'Matatu Hymn',            'matatu-hymn',            'Afro-fusion',  'c1', NULL, 198, 741905,   TRUE,  '2026-07-18'),
('t4',  'a1', 'r2',  'Nyota',                  'nyota',                  'Afro-pop',     'c2', NULL, 224, 2410770,  TRUE,  '2026-02-06'),
('t5',  'a2', 'r3',  'Mikocheni Nights',       'mikocheni-nights',       'Bongo Flava',  'c3', NULL, 241, 4120880,  TRUE,  '2026-05-22'),
('t6',  'a2', 'r3',  'Pole Pole',              'pole-pole',              'Bongo Flava',  'c3', NULL, 205, 3280140,  TRUE,  '2026-05-22'),
('t7',  'a2', 'r3',  'Bahari Yangu',           'bahari-yangu',           'Bongo Flava',  'c3', NULL, 258, 1980430,  TRUE,  '2026-05-22'),
('t8',  'a2', 'r3',  'Dala Dala',              'dala-dala',              'Bongo Flava',  'c3', NULL, 189, 1440960,  TRUE,  '2026-05-22'),
('t9',  'a3', 'r4',  'Soft Power',             'soft-power',             'R&B',          'c4', NULL, 227, 412300,   TRUE,  '2026-06-30'),
('t10', 'a3', 'r4',  'Benga Lullaby',          'benga-lullaby',          'R&B',          'c4', NULL, 251, 298440,   TRUE,  '2026-06-30'),
('t11', 'a3', 'r4',  'Kondele Rain',           'kondele-rain',           'Afro-soul',    'c4', NULL, 214, 187220,   TRUE,  '2026-06-30'),
('t12', 'a4', 'r5',  'Log Drum Letters',       'log-drum-letters',       'Amapiano',     'c6', NULL, 296, 2874100,  TRUE,  '2026-08-14'),
('t13', 'a4', 'r5',  'Kampala 3AM',            'kampala-3am',            'Amapiano',     'c6', NULL, 312, 1994520,  TRUE,  '2026-08-14'),
('t14', 'a4', 'r5',  'Church Keys',            'church-keys',            'Amapiano',     'c6', NULL, 274, 1120380,  TRUE,  '2026-08-14'),
('t15', 'a5', 'r6',  'Coastline Riddim',       'coastline-riddim',       'Dancehall',    'c5', NULL, 187, 884210,   TRUE,  '2026-04-11'),
('t16', 'a5', 'r6',  'Ferry Queue (Dub)',      'ferry-queue--dub-',      'Dancehall',    'c5', NULL, 203, 402180,   TRUE,  '2026-04-11'),
('t17', 'a6', 'r7',  'Accra Motion',           'accra-motion',           'Afrobeats',    'c8', NULL, 208, 6820440,  TRUE,  '2026-03-27'),
('t18', 'a6', 'r7',  'Osu Sunday',             'osu-sunday',             'Afrobeats',    'c8', NULL, 219, 4410990,  TRUE,  '2026-03-27'),
('t19', 'a6', 'r7',  'Two Phones',             'two-phones',             'Afrobeats',    'c8', NULL, 195, 3120670,  TRUE,  '2026-03-27'),
('t20', 'a6', 'r7',  'Highlife Interlude',     'highlife-interlude',     'Afro-fusion',  'c8', NULL, 142, 1210330,  TRUE,  '2026-03-27'),
('t21', 'a7', 'r8',  'Roots in Concrete',      'roots-in-concrete',      'Alternative',  'c7', NULL, 264, 214880,   TRUE,  '2026-08-29'),
('t22', 'a7', 'r8',  'Taarab Horns',           'taarab-horns',           'Alternative',  'c7', NULL, 289, 132440,   TRUE,  '2026-08-29'),
('t23', 'a7', 'r8',  'Ngong Road Tape',        'ngong-road-tape',        'Alternative',  'c7', NULL, 231, 98120,    TRUE,  '2026-08-29'),
('t24', 'a8', 'r9',  'Arusha Tape',            'arusha-tape',            'Hip-Hop',      'c7', NULL, 216, 1120450,  TRUE,  '2026-01-24'),
('t25', 'a8', 'r9',  'Mji Mdogo',              'mji-mdogo',              'Hip-Hop',      'c7', NULL, 232, 806210,   TRUE,  '2026-01-24'),
('t26', 'a8', 'r9',  'Nyumbani Freestyle',     'nyumbani-freestyle',     'Trap',         'c7', NULL, 178, 512900,   TRUE,  '2026-01-24'),
('t27', 'a1', 'r10', 'Sunrise Over Naivasha',  'sunrise-over-naivasha',  'Afro-fusion',  'c5', NULL, 244, 0,        FALSE, '2026-10-02'),
('t28', 'a1', 'r11', 'Untitled Session',       'untitled-session',       'Afro-fusion',  'c4', NULL, 201, 0,        FALSE, '2026-11-20');

-- ---------------------------------------------------------------------------
-- RELEASE_TRACKS (preserves ordering from the TS trackIds arrays)
-- ---------------------------------------------------------------------------

INSERT INTO release_tracks (release_id, track_id, position) VALUES
-- r1: Lakeside Gold EP
('r1',  't1',  1),
('r1',  't2',  2),
('r1',  't3',  3),
-- r2: Nyota single
('r2',  't4',  1),
-- r3: Mikocheni Nights album
('r3',  't5',  1),
('r3',  't6',  2),
('r3',  't7',  3),
('r3',  't8',  4),
-- r4: Soft Power EP
('r4',  't9',  1),
('r4',  't10', 2),
('r4',  't11', 3),
-- r5: Log Drum Letters EP
('r5',  't12', 1),
('r5',  't13', 2),
('r5',  't14', 3),
-- r6: Coastline Riddim single
('r6',  't15', 1),
('r6',  't16', 2),
-- r7: Accra Motion album
('r7',  't17', 1),
('r7',  't18', 2),
('r7',  't19', 3),
('r7',  't20', 4),
-- r8: Roots in Concrete EP
('r8',  't21', 1),
('r8',  't22', 2),
('r8',  't23', 3),
-- r9: Arusha Tape Vol. 1 album
('r9',  't24', 1),
('r9',  't25', 2),
('r9',  't26', 3),
-- r10: Sunrise Over Naivasha (scheduled)
('r10', 't27', 1),
-- r11: Untitled Session (draft)
('r11', 't28', 1);

-- ---------------------------------------------------------------------------
-- PLAYLISTS
-- ---------------------------------------------------------------------------

INSERT INTO playlists (id, user_id, name, description, cover_url) VALUES
('p1', 'u1', 'Nairobi Late Drive', 'Windows down on Waiyaki Way.',             'c3'),
('p2', 'u1', 'Coast Weekend',      'Dancehall and dub for the ferry queue.',    'c5'),
('p3', 'u1', 'Slow Sunday',        '',                                          'c4');

INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES
('p1', 't1',  1),
('p1', 't12', 2),
('p1', 't17', 3),
('p1', 't24', 4),
('p2', 't15', 1),
('p2', 't16', 2),
('p2', 't6',  3);
-- p3 (Slow Sunday) has no tracks

-- ---------------------------------------------------------------------------
-- ANALYTICS (for artist a1 — Zuri Mwangi)
-- ---------------------------------------------------------------------------

INSERT INTO artist_analytics (artist_id, total_plays, monthly_listeners, fans, growth_percent) VALUES
('a1', 8420330, 312480, 48210, 18.40);

INSERT INTO analytics_timeline (artist_id, label, plays, listeners) VALUES
('a1', 'Mar', 402100,  141200),
('a1', 'Apr', 468300,  158900),
('a1', 'May', 512400,  176400),
('a1', 'Jun', 603800,  214700),
('a1', 'Jul', 782900,  268300),
('a1', 'Aug', 864200,  296100),
('a1', 'Sep', 921700,  312480);

INSERT INTO analytics_recent_plays (artist_id, track_id, city, minutes_ago) VALUES
('a1', 't4', 'Nairobi',        2),
('a1', 't1', 'Kampala',        6),
('a1', 't2', 'Dar es Salaam', 11),
('a1', 't1', 'Kisumu',        17),
('a1', 't3', 'London',        24);

INSERT INTO analytics_release_performance (artist_id, release_id, plays, saves) VALUES
('a1', 'r1', 3544230, 41200),
('a1', 'r2', 2410770, 33800);

COMMIT;
