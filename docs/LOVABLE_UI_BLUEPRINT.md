# PLUGG — Administrator Control Panel: Lovable UI Specification (Document B)

> **Document Type:** Document B — Lovable UI Blueprint  
> **Platform:** Standalone Administrator Back-Office Application  
> **Target Audience:** Lovable Prompt Engineer & Frontend Generator  
> **Design Language:** Modern Sleek Dark Mode (Plugg African Music Aesthetic), Charcoal (`#0D0E12`), Electric Orange/Amber Brand Highlights, High-Contrast Typography, Dense Functional Data Displays.  
> **Implementation Note:** This specification is self-contained. It relies **only on local mock data and client-side React state** with zero external database or API dependencies.

---

## 1. Application Layout & Navigation Architecture

### 1.1 Shell & Navigation Structure
- **Persistent Sidebar Navigation:**
  - **Brand Header:** Plugg Admin Logo with a subtle "Staff Back-Office" indicator.
  - **Environment Pill:** "Production System · Africa/Kampala (UTC+03:00)".
  - **Main Navigation Items:**
    1. **Overview** (Icon: `LayoutDashboard`) — Platform KPIs, SLA breach radar, and transcoding health.
    2. **Review Queue** (Icon: `ShieldAlert`) — Primary moderation desk for pending artist submissions (with red badge showing count of pending items).
    3. **Music Catalog** (Icon: `Disc3`) — Global searchable database of all releases and tracks with emergency takedown controls.
    4. **Artist Directory** (Icon: `Users`) — Artist accounts, verification badges, featured toggles, and KYC records.
    5. **Genre Taxonomy** (Icon: `Tags`) — Platform music categories and artwork cards.
    6. **Streaming & Anti-Fraud** (Icon: `Activity`) — Real-time stream telemetry and bot-farm detection.
    7. **Staff & Access** (Icon: `ShieldCheck`) — Internal staff roles and audit logs.
  - **User Profile Footer:** Current staff identity (e.g. "Zuri Admin · Super Admin") with quick dark-mode toggle and Sign Out action.

---

## 2. Screen Specifications & Module Requirements

### Screen 1: Dashboard Overview (`/`)
*Executive summary of platform activity, moderation velocity, and system health.*

1. **Top Metric Summary Cards (4 Cards):**
   - **Pending Review Queue:** Count (e.g. `12`), subtext: `3 approaching 24h SLA, 1 breached`. Color: Amber/Red alert glow.
   - **Midnight Scheduled Releases:** Count (e.g. `8`), subtext: `Go-live at 00:00 Kampala time`.
   - **Total Verified Artists:** Count (e.g. `142 / 620`), subtext: `+12 requests pending`.
   - **Today's Qualified Streams ($\ge 30\text{s}$):** Count (e.g. `248.5K`), subtext: `98.2% bot filter pass rate`.
2. **Review SLA Urgency Widget:**
   - Visual progress bar showing queue health ($<18\text{h}$ green, $18\text{--}24\text{h}$ amber, $>24\text{h}$ red alert).
3. **Audio Transcoder Status Card:**
   - Real-time status pills: `48 Transcoded Today`, `2 Processing in Background`, `0 Failed Jobs`.

---

### Screen 2: Track & Release Review Queue (`/review-queue`)
*The primary moderation workspace. Staff listen to lossless audio masters, verify metadata, inspect technical specs, and approve or request revisions under a strict 24-hour SLA.*

1. **Header & Filter Toolbar:**
   - Search bar: Filter by Release Title, Artist Name, or Plugg Track ID.
   - Segmented Filter Tabs:
     - `All Pending (12)`
     - `Critical SLA (>18h) (4)`
     - `Audio Processing (2)`
     - `Changes Requested (6)`
   - Sort Dropdown: `Oldest Submission First` (Default), `Newest Submission First`.

2. **Submission Review Card (Repeatable for each pending item):**
   - **Header Bar:**
     - Release Artwork thumbnail ($80\times 80\text{px}$) with hover zoom.
     - Release Title, Release Type (`Single` / `EP` / `Album`), Genre tag.
     - Artist Name (with link to artist profile) and Label name ("Independent" or signed label).
     - **Live 24h SLA Badge:**
       - If $<18\text{h}$ pending: Indigo pill `11h pending (< 24h SLA)`.
       - If $18\text{--}24\text{h}$ pending: Amber pill with Clock icon `21h pending (Approaching SLA)`.
       - If $>24\text{h}$ pending: Red pulsing pill with Alert icon `27h pending (SLA Breached)`.
     - Target Release Date: Display date and Kampala Midnight note (`28 Oct 2026 · Midnight Kampala UTC+03:00`). If date has passed, show red warning tag `Original Date Elapsed`.
   - **Tracks in Submission Table:**
     - Play Button: Embedded HTML5 audio player allowing staff to preview the master file directly.
     - Track Index & Title, Featured Artists, Producers, and Duration.
     - **Technical Specification Badges:**
       - Format: `WAV` or `FLAC`
       - Sample Rate: `44.1 kHz` / `48.0 kHz` / `96.0 kHz`
       - Bit Depth: `24-bit Studio Master` (Highlight primary color) or `16-bit Lossless`
       - Channel: `Stereo` (or red warning if `Mono`)
     - **Audio Variants Transcoding Status:**
       - Green check: `4 streaming (Opus/AAC) + 3 download (AAC) ready`.
       - Amber spinner: `Transcoding variants in background…`.
       - Red alert: `Transcoding failed · [Retry Button]`.
   - **Review History Collapsible:**
     - Shows timestamped audit log if track was previously rejected and resubmitted by the artist with artist notes.
   - **Action Footer:**
     - **"Request Changes" Button (Outline / Amber):** Opens the Request Changes Modal.
     - **"Approve Release" Button (Solid / Emerald):**
       - If original date is in the future: Instantly approves and sets status to `Scheduled` with success toast.
       - If original date has elapsed: Opens the Date Rescheduling Modal before confirming approval.

3. **Modals & Dialogs on this screen:**
   - **Modal A: Request Changes Dialog:**
     - Text: "Provide constructive feedback to the artist explaining what corrections are required."
     - Common Reason Quick-Tags (Clickable checkboxes to prefill feedback):
       - `Audio master clipping/distorted`
       - `Artwork blurry or contains unauthorized logos`
       - `Featured artist miscredited`
       - `Explicit content tag missing`
     - Textarea: Mandatory detailed feedback field.
     - Action Buttons: `Cancel` and `Send Feedback to Artist`.
   - **Modal B: Date Rescheduling Dialog (For Expired Dates):**
     - Text: "The originally chosen release date has passed while under review. Please select a valid future date for midnight publication."
     - Date Picker input (restricted to today or future dates).
     - Action Buttons: `Cancel` and `Approve for Selected Date`.

---

### Screen 3: Music Catalog & Emergency Takedown Desk (`/catalog`)
*Searchable directory of every track and release in the platform database.*

1. **Table Columns:**
   - Artwork & Title
   - Plugg Track ID (`PLG-YYYY-XXXXXX`)
   - Artist Display Name
   - Genre
   - Release Date
   - Status (`Published`, `Scheduled`, `Under Review`, `Changes Required`, `Takedown / Inactive`)
   - Play Count & Download Count
   - Visibility Status (`Active / Streaming` vs `Hidden / Taken Down`)
2. **Row Action Menu (`...`):**
   - **Listen to Track**
   - **View Technical Specs Sheet**
   - **Re-trigger Audio Transcoder**
   - **Emergency DMCA Takedown / Unpublish:** Opens confirmation dialog requiring takedown reason (Copyright Infringement, Court Order, Artist Request) and sets visibility to hidden.

---

### Screen 4: Artist Directory & KYC Verification (`/artists`)
*Manage artist accounts, verify identity credentials, and curate platform highlights.*

1. **Artist Table & Search:**
   - Filter by: `All Artists`, `Verified Only`, `Pending Verification`, `Featured Spotlights`.
   - Columns:
     - Artist Avatar & Name
     - Username handle (`@handle`)
     - Location (e.g. `Kampala, Uganda` or `Nairobi, Kenya`)
     - Monthly Listeners & Total Plays
     - Terms Accepted Timestamp (e.g. `Accepted 22 Oct 2026 · IP: 102.89.x.x`)
     - Phone Number
     - Verified Status (Toggle switch or badge button)
     - Featured Spotlight Status (Toggle switch for homepage carousel)
2. **Action Modals:**
   - **Verify Artist Modal:** Toggle verification badge on/off with confirmation.
   - **Edit Artist Metadata Dialog:** Adjust city, country, or primary genre taxonomy.

---

### Screen 5: Taxonomy & Genre Management (`/genres`)
*Curate and reorder music genres visible to listeners in discovery feeds.*

1. **Genre Grid Cards:**
   - Visual cards showing Genre Name, Slug, and background cover artwork image.
   - Track count and artist count associated with the genre.
2. **Actions:**
   - **"Add New Genre" Button:** Opens dialog to input Name, Slug, and Image URL.
   - **"Edit Genre" Action:** Modify title, slug, or update artwork.

---

### Screen 6: Streaming Telemetry & Fraud Inspector (`/telemetry`)
*Audit live streams and detect bot networks / streaming farms.*

1. **Live Stream Streamer (Real-time feed simulation):**
   - Columns: Timestamp, Track Title, Plugg Track ID, Duration Played (seconds), IP Address, Session ID, Qualified Status ($\ge 30\text{s} = \text{Qualified}$, $<30\text{s} = \text{Skipped}$).
2. **Bot-Farm Alert Panel:**
   - Highlights anomalous clusters (e.g. `Warning: 4,200 plays from single subnet 197.239.x.x on 'Accra Motion' within 45 minutes`).
   - Action: "Purge Detected Bot Plays" button.

---

### Screen 7: Staff Management & Audit Logs (`/staff`)
*Manage administrative permissions and review all sensitive staff actions.*

1. **Staff Table:**
   - Staff Name, Email, Role (`Super Admin`, `Content Moderator`, `Curator`), Last Login.
   - Privilege Toggle: Administrator Privileges (`Active` / `Revoked`).
2. **Activity Audit Log (Immutable History):**
   - Chronological log entries: `[2026-10-29 11:45] Zuri Admin approved release 'Mine' (PLG-2026-000042) for midnight launch`.

---

## 3. Mock Data Schemas for Lovable Prototyping

Lovable should initialize with this realistic East African music dataset:

```json
{
  "pendingReviews": [
    {
      "id": "rel_001",
      "title": "Mine",
      "slug": "mine",
      "type": "single",
      "coverUrl": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
      "artistId": "art_popii",
      "artistName": "King Popii",
      "label": "Independent",
      "genre": "Afrobeats",
      "releaseDate": "2026-10-28",
      "goLiveAt": "2026-10-27T21:00:00.000Z",
      "reviewSubmittedAt": "2026-10-28T22:20:00.000Z",
      "status": "under_review",
      "audioProcessingStatus": "completed",
      "tracks": [
        {
          "id": "tr_001",
          "pluggTrackId": "PLG-2026-000042",
          "title": "Mine",
          "durationSeconds": 193,
          "features": "",
          "producers": "Atedo Beats",
          "audioUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
          "technicalValidation": {
            "format": "WAV",
            "sampleRate": 48000,
            "bitDepth": 24,
            "channels": 2,
            "isLossless": true,
            "isStereo": true,
            "is24Bit": true,
            "valid": true
          },
          "audioVariantsReady": true
        }
      ],
      "reviewHistory": []
    },
    {
      "id": "rel_002",
      "title": "Kigali Nights",
      "slug": "kigali-nights",
      "type": "single",
      "coverUrl": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
      "artistId": "art_selassie",
      "artistName": "Selassie Kim",
      "label": "Swangz Avenue",
      "genre": "Amapiano",
      "releaseDate": "2026-11-05",
      "goLiveAt": "2026-11-04T21:00:00.000Z",
      "reviewSubmittedAt": "2026-10-27T10:15:00.000Z",
      "status": "under_review",
      "audioProcessingStatus": "completed",
      "tracks": [
        {
          "id": "tr_002",
          "pluggTrackId": "PLG-2026-000043",
          "title": "Kigali Nights",
          "durationSeconds": 245,
          "features": "Bina Osei",
          "producers": "Producer X",
          "audioUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
          "technicalValidation": {
            "format": "FLAC",
            "sampleRate": 96000,
            "bitDepth": 24,
            "channels": 2,
            "isLossless": true,
            "isStereo": true,
            "is24Bit": true,
            "valid": true
          },
          "audioVariantsReady": true
        }
      ],
      "reviewHistory": [
        {
          "date": "2026-10-26T14:30:00.000Z",
          "action": "changes_requested",
          "actorName": "Zuri Admin",
          "feedback": "The master audio contained loud digital clipping between 1:15 and 1:30. Please upload an unclipped mix."
        },
        {
          "date": "2026-10-27T10:15:00.000Z",
          "action": "resubmitted",
          "actorName": "Selassie Kim",
          "notes": "Remixed and lowered ceiling by -1dB. Clipping issue is resolved."
        }
      ]
    }
  ],
  "artists": [
    {
      "id": "art_popii",
      "displayName": "King Popii",
      "username": "popii",
      "avatarUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
      "location": "Kampala, Uganda",
      "country": "Uganda",
      "city": "Kampala",
      "primaryGenre": "Afrobeats",
      "verified": true,
      "featured": true,
      "monthlyListeners": 902400,
      "totalPlays": 4820100,
      "phoneNumber": "+256 701 234 567",
      "termsAcceptedAt": "2026-09-15T08:12:00.000Z"
    },
    {
      "id": "art_kito",
      "displayName": "Kito Blaze",
      "username": "kitoblaze",
      "avatarUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
      "location": "Jinja, Uganda",
      "country": "Uganda",
      "city": "Jinja",
      "primaryGenre": "Dancehall",
      "verified": false,
      "featured": false,
      "monthlyListeners": 640100,
      "totalPlays": 2190000,
      "phoneNumber": "+256 772 987 654",
      "termsAcceptedAt": "2026-10-02T14:45:00.000Z"
    }
  ],
  "genres": [
    { "id": "afrobeats", "name": "Afrobeats", "slug": "afrobeats", "image": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80", "trackCount": 420 },
    { "id": "dancehall", "name": "Dancehall", "slug": "dancehall", "image": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80", "trackCount": 284 },
    { "id": "lugaflow", "name": "Lugaflow", "slug": "lugaflow", "image": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80", "trackCount": 195 },
    { "id": "bax-ragga", "name": "Bax Ragga", "slug": "bax-ragga", "image": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80", "trackCount": 112 },
    { "id": "kadongo-kamu", "name": "Kadongo Kamu", "slug": "kadongo-kamu", "image": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&auto=format&fit=crop&q=80", "trackCount": 89 }
  ]
}
```

---

## 4. UI Polish & Component Directives for Lovable

1. **Aesthetic Consistency:**
   - Backgrounds: Dark neutral surface (`#0D0E12` base, `#16181F` elevated cards, `#21242E` hover states).
   - Brand Accent: Neon/Warm Amber (`#F59E0B` / `#D97706`) and Vibrant Emerald (`#10B981`) for positive actions.
   - Typography: Clean sans-serif (`Inter` or `Plus Jakarta Sans`), tabular figures for numerical counts and durations.
2. **Interactive States:**
   - Audio playing state must show an animated waveform icon.
   - SLA badges must dynamically recalculate pending hours from `reviewSubmittedAt` relative to the current mock time.
   - Approving an item should move it into a client-side "Scheduled" state with a dismissible toast notification.
   - Requesting changes should prompt the feedback modal and move the item into "Changes Requested".
