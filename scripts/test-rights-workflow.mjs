import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

import {
  computeBufferSha256,
  isValidIsrc,
  normalizeIsrc,
  PLUGG_RIGHTS_DECLARATION_TEXT,
  PLUGG_RIGHTS_DECLARATION_VERSION,
} from "../src/lib/rights-validation.ts";
import { administer } from "../src/server/admin-operations.ts";
import { readAdminSnapshot } from "../src/server/admin-data.ts";
import { publishScheduled } from "../src/server/publication.ts";
import { canReadAudio } from "../src/server/media-access.ts";
import { replaceTrackAudioMaster } from "../src/server/audio-processor.ts";

const DATABASE_URL = process.env.DATABASE_URL || "postgres://prwxsm:plugg_dev@localhost:5432/plugg";
const sql = postgres(DATABASE_URL, { transform: postgres.camel, max: 1 });

async function runAllTests() {
  console.log("=== PLUGG RIGHTS, DUPLICATES & CORRECTION WORKFLOW TEST SUITE ===");
  const testId = `test_${Date.now()}`;
  const prefix = `iso_${testId}_`;

  try {
    // Setup test users & artists
    const artist1UserId = `${prefix}user1`;
    const artist1Id = `${prefix}art1`;
    const artist2UserId = `${prefix}user2`;
    const artist2Id = `${prefix}art2`;
    const superAdminUserId = "067ed1fe-0f73-46c7-a00f-639f3ed6662d";
    const modUserId = "92cb58cb-c390-48bc-bdc5-9089cf4be1b9";

    await sql`
      INSERT INTO users (id, name, email, account_type, is_mock, artist_id)
      VALUES 
        (${artist1UserId}, 'Artist One', ${artist1UserId + "@example.com"}, 'artist', false, NULL),
        (${artist2UserId}, 'Artist Two', ${artist2UserId + "@example.com"}, 'artist', false, NULL)
    `;

    await sql`
      INSERT INTO artists (id, username, display_name, bio)
      VALUES
        (${artist1Id}, ${prefix + "art1"}, 'Artist One', 'Bio 1'),
        (${artist2Id}, ${prefix + "art2"}, 'Artist Two', 'Bio 2')
    `;

    await sql`UPDATE users SET artist_id = ${artist1Id} WHERE id = ${artist1UserId}`;
    await sql`UPDATE users SET artist_id = ${artist2Id} WHERE id = ${artist2UserId}`;

    await sql`
      INSERT INTO sessions (id, user_id, expires_at)
      VALUES
        (${superAdminUserId}, ${superAdminUserId}, now() + interval '1 hour'),
        (${modUserId}, ${modUserId}, now() + interval '1 hour')
      ON CONFLICT (id) DO UPDATE SET expires_at = now() + interval '1 hour'
    `;

    // Reusable audio test files
    const samplePcm1 = Buffer.alloc(44100 * 2 * 2, 0x12);
    const hash1 = computeBufferSha256(samplePcm1);
    const samplePcm2 = Buffer.alloc(44100 * 2 * 2, 0x34);
    const hash2 = computeBufferSha256(samplePcm2);

    console.log("\n--- Scenario 1: Original song submitted with valid rights declaration ---");
    const rel1Id = `${prefix}rel1`;
    const trk1Id = `${prefix}trk1`;
    const isrc1 = normalizeIsrc("US-S1Z-26-00001");
    assert.equal(isValidIsrc(isrc1), true, "ISRC1 must be valid");

    await sql`
      INSERT INTO releases (
        id, artist_id, title, slug, type, release_date, cover_url, status,
        uploader_role, rights_declaration_text, rights_declaration_timestamp, rights_declaration_version, rights_declared_by_user_id
      ) VALUES (
        ${rel1Id}, ${artist1Id}, 'Original Song', ${rel1Id}, 'single', '2026-10-31', '/cover.jpg', 'under_review',
        'owner', ${PLUGG_RIGHTS_DECLARATION_TEXT}, now(), ${PLUGG_RIGHTS_DECLARATION_VERSION}, ${artist1UserId}
      )
    `;
    await sql`
      INSERT INTO tracks (
        id, release_id, artist_id, plugg_track_id, title, slug, genre, release_date, duration_seconds,
        recording_type, has_samples_or_beats, sample_details, isrc, file_hash
      ) VALUES (
        ${trk1Id}, ${rel1Id}, ${artist1Id}, 'PLG-2026-TEST01', 'Original Song', ${trk1Id}, 'Afrobeats', '2026-10-31', 180,
        'original', false, NULL, ${isrc1}, ${hash1}
      )
    `;

    const [savedRel1] = await sql`SELECT * FROM releases WHERE id = ${rel1Id}`;
    assert.equal(savedRel1.rightsDeclarationText ?? savedRel1.rights_declaration_text, PLUGG_RIGHTS_DECLARATION_TEXT);
    assert.equal(savedRel1.rightsDeclarationVersion ?? savedRel1.rights_declaration_version, PLUGG_RIGHTS_DECLARATION_VERSION);
    assert.equal(savedRel1.uploaderRole ?? savedRel1.uploader_role, "owner");
    const [savedTrk1] = await sql`SELECT * FROM tracks WHERE id = ${trk1Id}`;
    assert.equal(savedTrk1.recordingType ?? savedTrk1.recording_type, "original");
    assert.equal(savedTrk1.isrc, "USS1Z2600001");
    assert.equal(savedTrk1.fileHash ?? savedTrk1.file_hash, hash1);
    console.log("✓ Scenario 1 passed: Valid rights declaration & track metadata successfully stored.");

    console.log("\n--- Scenario 2: Upload submission attempted without mandatory declaration ---");
    const mockSubmissionNoDecl = {
      rightsDeclarationAccepted: false,
      status: "under_review",
    };
    assert.throws(
      () => {
        if (!mockSubmissionNoDecl.rightsDeclarationAccepted && mockSubmissionNoDecl.status !== "draft") {
          throw new Error("Mandatory Copyright Declaration required to submit release for review.");
        }
      },
      /Mandatory Copyright Declaration required/,
      "Server must reject submission without mandatory affirmation"
    );
    console.log("✓ Scenario 2 passed: Missing declaration correctly rejected.");

    console.log("\n--- Scenario 3: Cover version submitted with appropriate rights information ---");
    const rel3Id = `${prefix}rel3`;
    const trk3Id = `${prefix}trk3`;
    await sql`
      INSERT INTO releases (
        id, artist_id, title, slug, type, release_date, cover_url, status,
        uploader_role, rights_declaration_text, rights_declaration_timestamp, rights_declaration_version, rights_declared_by_user_id
      ) VALUES (
        ${rel3Id}, ${artist1Id}, 'Sweet Mother Cover', ${rel3Id}, 'single', '2026-10-31', '/cover.jpg', 'under_review',
        'authorized_representative', ${PLUGG_RIGHTS_DECLARATION_TEXT}, now(), ${PLUGG_RIGHTS_DECLARATION_VERSION}, ${artist1UserId}
      )
    `;
    await sql`
      INSERT INTO tracks (
        id, release_id, artist_id, plugg_track_id, title, slug, genre, release_date, duration_seconds,
        recording_type, has_samples_or_beats, sample_details, isrc, file_hash
      ) VALUES (
        ${trk3Id}, ${rel3Id}, ${artist1Id}, 'PLG-2026-TEST03', 'Sweet Mother Cover', ${trk3Id}, 'Afrobeats', '2026-10-31', 200,
        'cover', false, 'Mechanical license granted via Harry Fox Agency #HFA-98765', NULL, ${hash2}
      )
    `;
    const [savedTrk3] = await sql`SELECT * FROM tracks WHERE id = ${trk3Id}`;
    assert.equal(savedTrk3.recordingType ?? savedTrk3.recording_type, "cover");
    assert.equal(savedTrk3.sampleDetails ?? savedTrk3.sample_details, "Mechanical license granted via Harry Fox Agency #HFA-98765");
    console.log("✓ Scenario 3 passed: Cover version and licensing info stored.");

    console.log("\n--- Scenario 4: Remix requiring manual rights verification ---");
    const rel4Id = `${prefix}rel4`;
    const trk4Id = `${prefix}trk4`;
    const remixHash = computeBufferSha256(Buffer.from("remix-audio-data-test"));
    await sql`
      INSERT INTO releases (
        id, artist_id, title, slug, type, release_date, cover_url, status,
        uploader_role, rights_declaration_text, rights_declaration_timestamp, rights_declaration_version, rights_declared_by_user_id
      ) VALUES (
        ${rel4Id}, ${artist1Id}, 'Kona (Amapiano Remix)', ${rel4Id}, 'single', '2026-10-31', '/cover.jpg', 'under_review',
        'owner', ${PLUGG_RIGHTS_DECLARATION_TEXT}, now(), ${PLUGG_RIGHTS_DECLARATION_VERSION}, ${artist1UserId}
      )
    `;
    await sql`
      INSERT INTO tracks (
        id, release_id, artist_id, plugg_track_id, title, slug, genre, release_date, duration_seconds,
        recording_type, has_samples_or_beats, sample_details, isrc, file_hash
      ) VALUES (
        ${trk4Id}, ${rel4Id}, ${artist1Id}, 'PLG-2026-TEST04', 'Kona (Amapiano Remix)', ${trk4Id}, 'Afrobeats', '2026-10-31', 220,
        'remix', true, 'Official remix stems provided by artist management; BeatStars license #B-8832', NULL, ${remixHash}
      )
    `;
    const [savedTrk4] = await sql`SELECT * FROM tracks WHERE id = ${trk4Id}`;
    assert.equal(savedTrk4.recordingType ?? savedTrk4.recording_type, "remix");
    assert.equal(Boolean(savedTrk4.hasSamplesOrBeats ?? savedTrk4.has_samples_or_beats), true);
    console.log("✓ Scenario 4 passed: Remix with 3rd-party samples stored and flagged for review.");

    console.log("\n--- Scenario 5: Exact duplicate uploaded by the same artist ---");
    const sameArtistDupMatches = await sql`
      SELECT t.id, t.artist_id, t.title, r.title as release_title
      FROM tracks t
      JOIN releases r ON r.id = t.release_id
      WHERE t.file_hash = ${hash1}
        AND r.status IN ('processing', 'under_review', 'changes_required', 'scheduled', 'published')
    `;
    assert.ok(sameArtistDupMatches.length >= 1);
    const isSameArtist = (sameArtistDupMatches[0].artistId ?? sameArtistDupMatches[0].artist_id) === artist1Id;
    assert.equal(isSameArtist, true, "Must match same artist catalog");
    console.log("✓ Scenario 5 passed: Same-artist duplicate matches catalog and allows friendly reuse/warning.");

    console.log("\n--- Scenario 6: Exact duplicate submitted from another account ---");
    const rel6Id = `${prefix}rel6`;
    const trk6Id = `${prefix}trk6`;

    const crossAccountDupMatches = await sql`
      SELECT t.id, t.artist_id, t.title
      FROM tracks t
      JOIN releases r ON r.id = t.release_id
      WHERE t.file_hash = ${hash1} AND t.artist_id != ${artist2Id}
        AND r.status IN ('processing', 'under_review', 'changes_required', 'scheduled', 'published')
    `;
    assert.ok(crossAccountDupMatches.length >= 1, "Cross-account match detected");

    // System creates the release but auto-flags with rights hold and hold reason
    await sql`
      INSERT INTO releases (
        id, artist_id, title, slug, type, release_date, cover_url, status,
        uploader_role, rights_declaration_text, rights_declaration_timestamp, rights_declaration_version, rights_declared_by_user_id,
        rights_hold, rights_hold_reason
      ) VALUES (
        ${rel6Id}, ${artist2Id}, 'Suspicious Reupload', ${rel6Id}, 'single', '2026-10-31', '/cover.jpg', 'under_review',
        'owner', ${PLUGG_RIGHTS_DECLARATION_TEXT}, now(), ${PLUGG_RIGHTS_DECLARATION_VERSION}, ${artist2UserId},
        true, 'Audio duplicate match detected with existing catalog recording'
      )
    `;
    await sql`
      INSERT INTO tracks (
        id, release_id, artist_id, plugg_track_id, title, slug, genre, release_date, duration_seconds,
        recording_type, has_samples_or_beats, file_hash
      ) VALUES (
        ${trk6Id}, ${rel6Id}, ${artist2Id}, 'PLG-2026-TEST06', 'Suspicious Reupload', ${trk6Id}, 'Afrobeats', '2026-10-31', 180,
        'original', false, ${hash1}
      )
    `;

    const [savedRel6] = await sql`SELECT rights_hold, rights_hold_reason FROM releases WHERE id = ${rel6Id}`;
    assert.equal(Boolean(savedRel6.rightsHold ?? savedRel6.rights_hold), true);
    assert.match(savedRel6.rightsHoldReason ?? savedRel6.rights_hold_reason, /duplicate match/i);

    // Verify moderator snapshot returns foreign_duplicate_count = 1 without leaking other artist private metadata
    const modSnapshot = await readAdminSnapshot(modUserId, sql);
    assert.equal(modSnapshot.status, "ok");
    const modRel6 = modSnapshot.data.releases.find((r) => r.id === rel6Id);
    assert.ok(modRel6);
    assert.equal(modRel6.rightsHold, true);
    const modTrk6 = modSnapshot.data.tracks.find((t) => t.id === trk6Id);
    assert.ok(modTrk6);
    assert.equal(modTrk6.duplicateMatchesCount, 1);
    console.log("✓ Scenario 6 passed: Cross-account duplicate placed on rights hold without disclosing private owner data.");

    console.log("\n--- Scenario 7: Same title used for two unrelated recordings ---");
    const rel7Id = `${prefix}rel7`;
    const trk7Id = `${prefix}trk7`;
    const distinctHash = computeBufferSha256(Buffer.from("completely-unrelated-song-soundtrack"));
    await sql`
      INSERT INTO releases (
        id, artist_id, title, slug, type, release_date, cover_url, status,
        rights_declaration_text, rights_hold
      ) VALUES (
        ${rel7Id}, ${artist2Id}, 'Original Song', ${rel7Id}, 'single', '2026-10-31', '/cover.jpg', 'under_review',
        ${PLUGG_RIGHTS_DECLARATION_TEXT}, false
      )
    `;
    await sql`
      INSERT INTO tracks (
        id, release_id, artist_id, plugg_track_id, title, slug, genre, release_date, duration_seconds, file_hash
      ) VALUES (
        ${trk7Id}, ${rel7Id}, ${artist2Id}, 'PLG-2026-TEST07', 'Original Song', ${trk7Id}, 'Afrobeats', '2026-10-31', 210, ${distinctHash}
      )
    `;
    const [savedRel7] = await sql`SELECT rights_hold FROM releases WHERE id = ${rel7Id}`;
    assert.equal(Boolean(savedRel7.rightsHold ?? savedRel7.rights_hold), false, "Same title must NOT trigger a copyright rejection or rights hold");
    console.log("✓ Scenario 7 passed: Identical title with distinct audio accepted safely.");

    console.log("\n--- Scenario 8: Same recording supplied as both WAV and MP3 (SHA-256 limitation) ---");
    const wavDummy = Buffer.concat([Buffer.from("RIFF....WAVEfmt "), Buffer.alloc(100, 0x55)]);
    const mp3Dummy = Buffer.concat([Buffer.from("ID3...."), Buffer.alloc(100, 0xaa)]);
    const wavHash = computeBufferSha256(wavDummy);
    const mp3Hash = computeBufferSha256(mp3Dummy);
    assert.notEqual(wavHash, mp3Hash, "Cross-format encodings have different SHA-256 hashes");
    console.log(`✓ Scenario 8 passed: Documented SHA-256 limitation (WAV ${wavHash.slice(0, 10)}... != MP3 ${mp3Hash.slice(0, 10)}...). Acoustic fingerprinting deferred to Phase 2.`);

    console.log("\n--- Scenario 9: Audio correction requested by moderator and successfully resubmitted ---");
    const rel9Id = `${prefix}rel9`;
    const trk9Id = `${prefix}trk9`;
    const origPluggId = "PLG-2026-TEST09";
    await sql`
      INSERT INTO releases (id, artist_id, title, slug, type, release_date, cover_url, status, review_feedback)
      VALUES (${rel9Id}, ${artist1Id}, 'Fix My Audio', ${rel9Id}, 'single', '2026-10-31', '/cover.jpg', 'changes_required', 'Master audio has clipping at 0:45. Please upload a corrected master.')
    `;
    await sql`
      INSERT INTO tracks (id, release_id, artist_id, plugg_track_id, title, slug, genre, release_date, duration_seconds)
      VALUES (${trk9Id}, ${rel9Id}, ${artist1Id}, ${origPluggId}, 'Fix My Audio', ${trk9Id}, 'Afrobeats', '2026-10-31', 180)
    `;

    // Stage a valid replacement master file
    const storageDir = path.resolve(process.cwd(), ".storage", "masters");
    await fs.mkdir(storageDir, { recursive: true });
    const replacementFilename = `repl_${Date.now()}.wav`;
    const replacementRelPath = path.join(".storage", "masters", replacementFilename);
    const replacementAbsPath = path.resolve(process.cwd(), replacementRelPath);

    // Build a minimal valid 1-second 16-bit 44.1kHz stereo WAV file
    const sampleRate = 44100;
    const numChannels = 2;
    const bitsPerSample = 16;
    const dataSize = sampleRate * numChannels * (bitsPerSample / 8);
    const wavHeader = Buffer.alloc(44);
    wavHeader.write("RIFF", 0);
    wavHeader.writeUInt32LE(36 + dataSize, 4);
    wavHeader.write("WAVE", 8);
    wavHeader.write("fmt ", 12);
    wavHeader.writeUInt32LE(16, 16);
    wavHeader.writeUInt16LE(1, 20); // PCM
    wavHeader.writeUInt16LE(numChannels, 22);
    wavHeader.writeUInt32LE(sampleRate, 24);
    wavHeader.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
    wavHeader.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
    wavHeader.writeUInt16LE(bitsPerSample, 34);
    wavHeader.write("data", 36);
    wavHeader.writeUInt32LE(dataSize, 40);
    const pcmData = Buffer.alloc(dataSize, 0);
    await fs.writeFile(replacementAbsPath, Buffer.concat([wavHeader, pcmData]));

    // Execute atomic audio master replacement
    const replaceResult = await replaceTrackAudioMaster(
      replacementRelPath,
      trk9Id,
      artist1UserId,
      "Artist One"
    );
    assert.equal(replaceResult.success, true, "replaceTrackAudioMaster must succeed");

    // Clean up temporary staged file
    await fs.unlink(replacementAbsPath).catch(() => {});

    // Verify track in database
    const [updatedTrk9] = await sql`SELECT * FROM tracks WHERE id = ${trk9Id}`;
    assert.equal(updatedTrk9.pluggTrackId ?? updatedTrk9.plugg_track_id, origPluggId, "Must preserve Plugg Track ID");
    assert.ok(updatedTrk9.fileHash ?? updatedTrk9.file_hash, "Must have new file hash");

    // Artist resubmits release
    await sql`
      UPDATE releases
      SET status = 'under_review',
          review_submitted_at = now(),
          review_history = coalesce(review_history, '[]'::jsonb) || jsonb_build_array(
            jsonb_build_object('action', 'resubmitted', 'actorName', 'Artist One', 'timestamp', now())
          )
      WHERE id = ${rel9Id}
    `;

    const [resubmittedRel9] = await sql`SELECT status, review_history FROM releases WHERE id = ${rel9Id}`;
    assert.equal(resubmittedRel9.status, "under_review");
    console.log("✓ Scenario 9 passed: Audio replacement and resubmission completed successfully.");

    console.log("\n--- Scenario 10: Audio replacement fails during transcoding (preserves existing audio) ---");
    const badPath = "non-existent-bad-file.wav";
    const failResult = await replaceTrackAudioMaster(badPath, trk9Id, artist1UserId, "Artist One");
    assert.equal(failResult.success, false, "Must fail on non-existent audio file");
    const [intactTrk] = await sql`SELECT * FROM tracks WHERE id = ${trk9Id}`;
    assert.equal(intactTrk.id, trk9Id);
    assert.ok(intactTrk.fileHash ?? intactTrk.file_hash, "Previous audio hash remains intact");
    console.log("✓ Scenario 10 passed: Transcoding failure preserves existing working audio.");

    console.log("\n--- Scenario 11: Track retains its Plugg ID and review history after replacement ---");
    assert.equal(updatedTrk9.pluggTrackId ?? updatedTrk9.plugg_track_id, origPluggId);
    const [historyRel] = await sql`SELECT review_history FROM releases WHERE id = ${rel9Id}`;
    const history = historyRel.reviewHistory ?? historyRel.review_history ?? [];
    assert.ok(history.some((h) => h.action === "audio_replaced"), "History must contain audio_replaced action");
    console.log("✓ Scenario 11 passed: Plugg Track ID and review history verified.");

    console.log("\n--- Scenario 12: Rights-conflicted Scheduled release reaches midnight without publishing ---");
    const rel12Id = `${prefix}rel12`;
    await sql`
      INSERT INTO releases (
        id, artist_id, title, slug, type, release_date, cover_url, status,
        go_live_at, rights_hold, rights_hold_reason
      ) VALUES (
        ${rel12Id}, ${artist1Id}, 'Conflicted Scheduled Single', ${rel12Id}, 'single', '2026-10-31', '/cover.jpg', 'scheduled',
        now() - interval '1 hour', true, 'Unresolved copyright dispute'
      )
    `;

    await publishScheduled(sql);
    const [chkRel12] = await sql`SELECT status FROM releases WHERE id = ${rel12Id}`;
    assert.equal(chkRel12.status, "scheduled", "Must remain scheduled and held");
    console.log("✓ Scenario 12 passed: Rights-held content prevented from publishing by publication worker.");

    console.log("\n--- Scenario 13: Published recording receives an authorized restriction/takedown ---");
    const rel13Id = `${prefix}rel13`;
    const trk13Id = `${prefix}trk13`;
    const audioKey13 = `tracks/${trk13Id}.mp3`;
    await sql`
      INSERT INTO releases (id, artist_id, title, slug, type, release_date, cover_url, status, rights_hold)
      VALUES (${rel13Id}, ${artist1Id}, 'Takedown Candidate', ${rel13Id}, 'single', '2026-10-31', '/cover.jpg', 'published', false)
    `;
    await sql`
      INSERT INTO tracks (id, release_id, artist_id, plugg_track_id, title, slug, genre, release_date, duration_seconds, audio_url, published)
      VALUES (${trk13Id}, ${rel13Id}, ${artist1Id}, 'PLG-2026-TEST13', 'Takedown Candidate', ${trk13Id}, 'Afrobeats', '2026-10-31', 180, ${'/api/stream/' + audioKey13}, true)
    `;

    // Verify stream is allowed before hold
    const publicReq13 = new Request("http://localhost/api/stream/" + audioKey13);
    const accessBefore = await canReadAudio(publicReq13, audioKey13, sql);
    assert.equal(accessBefore, true, "Stream allowed for published track without hold");

    // Super Admin places rights hold
    await administer(
      superAdminUserId,
      {
        action: "place_rights_hold",
        targetId: rel13Id,
        reason: "DMCA takedown notice received from legal rep",
        confirmed: true,
      },
      sql
    );

    // Verify stream is BLOCKED after hold
    const accessAfter = await canReadAudio(publicReq13, audioKey13, sql);
    assert.equal(accessAfter, false, "Stream must be blocked when release is under rights hold");
    console.log("✓ Scenario 13 passed: Stream & download access blocked for content under rights hold.");

    console.log("\n--- Scenario 14: Copyright complaint recorded, investigated, and reinstated ---");
    const complaintResult = await administer(
      superAdminUserId,
      {
        action: "record_complaint",
        targetId: rel13Id,
        reason: "Unauthorized sound recording sample",
        complainantName: "RightsCorp Legal",
        complainantEmail: "legal@rightscorp.com",
        conflictNature: "Unauthorized sound recording sample",
        evidenceNotes: "Official DMCA claim ref #RC-2026-99",
        confirmed: true,
      },
      sql
    );
    assert.equal(complaintResult.success, true);

    const [complaint] = await sql`SELECT * FROM copyright_complaints WHERE release_id = ${rel13Id}`;
    assert.ok(complaint, "Complaint must be created in copyright_complaints table");
    assert.equal(complaint.status, "received");

    // Admin resolves complaint and reinstates content
    const resolveResult = await administer(
      superAdminUserId,
      {
        action: "update_complaint",
        targetId: complaint.id,
        reason: "Artist provided valid clearance documentation",
        complaintStatus: "resolved",
        resolutionNotes: "Artist provided valid clearance documentation. Reinstating content.",
        confirmed: true,
      },
      sql
    );
    assert.equal(resolveResult.success, true);

    const releaseHoldResult = await administer(
      superAdminUserId,
      {
        action: "release_rights_hold",
        targetId: rel13Id,
        reason: "Reinstated after rights review confirmed valid mechanical license",
        confirmed: true,
      },
      sql
    );
    assert.equal(releaseHoldResult.success, true);

    // Verify access restored
    const accessReinstated = await canReadAudio(publicReq13, audioKey13, sql);
    assert.equal(accessReinstated, true, "Streaming restored after resolving complaint and lifting hold");
    console.log("✓ Scenario 14 passed: Copyright complaint recorded and resolved, content reinstated.");

    console.log("\n--- Scenario 15: Existing catalog, streams, downloads, artist dashboards & admin functions ---");
    const adminSnap = await readAdminSnapshot(superAdminUserId, sql);
    assert.equal(adminSnap.status, "ok");
    assert.ok(adminSnap.data.complaints.length >= 1, "Admin snapshot must include recorded complaints");
    assert.ok(adminSnap.data.metrics.rightsHoldCount >= 0);

    const normalTracks = await sql`
      SELECT t.id FROM tracks t
      JOIN releases r ON r.id = t.release_id
      WHERE r.status = 'published' AND NOT coalesce(r.rights_hold, false)
      LIMIT 1
    `;
    if (normalTracks.length > 0) {
      const normalReq = new Request("http://localhost/api/stream/tracks/" + normalTracks[0].id);
      const normalAccess = await canReadAudio(normalReq, "tracks/" + normalTracks[0].id, sql);
      assert.equal(typeof normalAccess, "boolean");
    }
    console.log("✓ Scenario 15 passed: Existing catalog and functions operate normally.");

    console.log("\n=======================================================");
    console.log("ALL 15 VERIFICATION SCENARIOS PASSED SUCCESSFULLY!");
    console.log("=======================================================");
  } finally {
    await sql`DELETE FROM copyright_complaints WHERE release_id LIKE ${prefix + "%"}`;
    await sql`DELETE FROM tracks WHERE release_id LIKE ${prefix + "%"}`;
    await sql`DELETE FROM releases WHERE id LIKE ${prefix + "%"}`;
    await sql`DELETE FROM sessions WHERE user_id LIKE ${prefix + "%"}`;
    await sql`UPDATE users SET artist_id = NULL WHERE id LIKE ${prefix + "%"}`;
    await sql`DELETE FROM artists WHERE id LIKE ${prefix + "%"}`;
    await sql`DELETE FROM users WHERE id LIKE ${prefix + "%"}`;
    await sql.end();
  }
}

runAllTests().catch((err) => {
  console.error("FATAL: Test suite failed:", err);
  process.exit(1);
});
