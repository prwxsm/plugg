# Hyperframes Composition Brief: Plugg (Mobile View Ad Campaign)

## Objective
Create a high-energy, vertical mobile video ad campaign (9:16) for Plugg, highlighting its mobile web player experience and direct-to-fan artist distribution platform for East Africa.

## Output
- Composition directory: `brag-output-2026-11-07-090451/composition/`
- Rendered video: `brag-output-2026-11-07-090451/brag.mp4`
- Format: vertical — 1080x1920
- Duration: 19.0 seconds
- FPS: 30

## Source Material
- Project root: `/home/prwxsm/Projects/plugg`
- Primary files read: `README.md`, `src/styles.css`, `src/components/plugg/player.tsx`, `src/components/plugg/app-shell.tsx`, `src/routes/index.tsx`, `src/data/artists.ts`
- Product name: Plugg
- Tagline / strongest claim: "The modern player for independent African sound." / "Direct artist distribution. Zero middlemen."
- Key UI or visual moments to recreate:
  - Vertical smartphone viewport with notch, status bar, and ambient back-glow
  - Mobile Discovery Feed with Sonet — *Forever* (Nebbi, Westnile, Uganda)
  - Floating Mobile Player Bar with cover art, progress line, and play button
  - Expanded Full Mobile Player with full-bleed artwork, animated equalizer bars, and scrubber
  - Creator telemetry cards (8,420,330 Streams, 312,480 Listeners, Verified Artist badge)
  - Bottom mobile navigation bar (Home, Discover, Library, Profile)
- Copy that must appear verbatim:
  - "Plugg"
  - "Forever"
  - "Sonet"
  - "Nebbi, Westnile, Uganda"
  - "8,420,330"
  - "312,480"
  - "Stream. Publish. Amplify."
  - "plugg.site"

## Creative Direction
- Tone preset: `app-store` / `cinematic`
- Creative direction: "high-energy mobile launch ad campaign for independent African sound"
- Interpretation: Fast-paced vertical mobile pacing, void-black obsidian ground, glassmorphic card borders, glowing audio-reactive accents, large readable mobile typography, and trailer-scale punch.
- Angle: Independent African music gets the world-class mobile technology platform it deserves. From Nebbi, Westnile, Uganda to the world, direct creator-to-listener streaming in your pocket.
- Hook: "YOUR SOUND. YOUR STREAM. YOUR POCKET."
- Outro / punchline: "PLUGG. Stream. Publish. Amplify. plugg.site"
- Avoid:
  - Generic SaaS language
  - Abstract filler graphics
  - Small unreadable text (respect 28px type floor for 1080px width)

## Visual Identity
- Background: `#0d0e14` (oklch 0.155 0.006 260)
- Surface: `#161822` (oklch 0.198 0.007 262)
- Text Primary: `#fafafa` (crisp white)
- Text Muted: `#a0a5b5` (cool slate)
- Accent: `#ffffff` with subtle electric cyan/ice-blue glow (`rgba(255, 255, 255, 0.15)`)
- Border: `rgba(255, 255, 255, 0.12)`
- Display font: `Space Grotesk`, `Inter`, sans-serif
- Body font: `Inter`, sans-serif
- Visual references from the project:
  - Sonet portrait / cover art (`assets/images/sonet.png`, `sonet-clean.png`)
  - Plugg logo mark (`assets/images/logo.png`)
  - Verified badge (`assets/images/badge.png`)
  - Animated audio equalizer bars and floating mobile player bar

## Storyboard
Use the storyboard in `brag-output-2026-11-07-090451/brag-plan.md` as the creative contract.

Scene summary:
1. **Scene 1: The Mobile Hook** (0.0s – 4.2s) — Vertical smartphone silhouette with glowing rim in void space. Kinetic headline: "YOUR SOUND. YOUR STREAM. YOUR POCKET." Pill: "EAST AFRICA • NEBBI • UGANDA".
2. **Scene 2: The Plugg Mobile Player** (4.2s – 9.2s) — Full mobile screen with Sonet — *Forever*. Simulated tap at 5.4s expands into full mobile player with animated equalizer bars, scrubber, and "STREAM DIRECT FROM CREATORS".
3. **Scene 3: Direct Artist Telemetry** (9.2s – 14.5s) — Creator Hub on mobile: "DIRECT TO FANS. ZERO MIDDLEMEN." 3 glowing metric cards land on beat grid: 8,420,330 Streams (10.2s), 312,480 Listeners (11.2s), Verified Artist (12.2s).
4. **Scene 4: Mobile Ad Outro & CTA** (14.5s – 19.0s) — Bold "PLUGG." brand lock, "STREAM. PUBLISH. AMPLIFY.", CTA button "OPEN WEB PLAYER • plugg.site", and regional tag "Nebbi • Westnile • Uganda".

## Audio
- Audio role: Driving afrobeat / modern trailer bed with crisp mobile UI feedback.
- Music: `assets/music/forever-by-sonet.mp3`
- Music treatment: Starts at 0.0s, volume 0.45, smooth fade-out over final 1.5s.
- Music cue guidance:
  - Strong cues at 4.2s (scene cut to player), 9.2s (telemetry entrance), 15.6s (brand lock).
  - Beat-grid windows at 10.2s, 11.2s, 12.2s for sequential card reveals.
- Audio-reactive treatment: Subtle ambient radial glow behind phone mockup that gently breathes with music RMS.
- SFX:
  - `impact/impactSoft_medium_001.ogg` at 0.4s (hook impact)
  - `ui/mouseclick1.ogg` at 5.4s (play tap click)
  - `interface/drop_001.ogg` at 10.2s, 11.2s, 12.2s (card drops)
  - `impact/impactBell_heavy_000.ogg` at 15.6s (brand bell hit)

## Hyperframes Instructions
- Implement in `brag-output-2026-11-07-090451/composition/` following standard Hyperframes multi-scene composition architecture (`index.html` mounting sub-compositions from `compositions/`).
- Dimension: 1080x1920 (vertical).
- Ensure all timed elements have `class="clip"`, `data-start`, and `data-duration`.
- Register timelines properly on `window.__timelines`.
- Use GSAP `fromTo` for deterministic seeking.
- Keep all reading text at or above 28px floor (with `data-layout-ignore` on decorative badge labels).
- Run `hyperframes check` and resolve all lint and contrast issues.
- Render local MP4 to `../brag.mp4`.

