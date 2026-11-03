# Hyperframes Composition Brief: Plugg

## Objective
Create a short, cinematic launch-style brag video for Plugg, highlighting its dual identity as an ultra-modern music web player and an independent artist distribution platform for East Africa.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20 seconds
- FPS: 30

## Source Material
- Project root: `/home/prwxsm/Projects/plugg`
- Primary files read: `README.md`, `src/styles.css`, `src/routes/index.tsx`, `src/data/artists.ts`, `src/data/releases.ts`, `src/data/covers.ts`
- Product name: Plugg
- Tagline / strongest claim: "The web player for independent African sound" / "Direct artist distribution. Zero middlemen."
- Key UI or visual moments to recreate:
  - Plugg Web Player Hero with *Lakeside Gold* by Zuri Mwangi (Nairobi, Kenya)
  - Interactive playback bar with active illuminated waveform
  - Creator telemetry cards (8,420,330 Total Plays, 312,480 Monthly Listeners, Verified Artist badge)
- Copy that must appear verbatim:
  - "Plugg"
  - "Lakeside Gold"
  - "Zuri Mwangi"
  - "Nairobi, Kenya"
  - "8,420,330"
  - "312,480"
  - "Stream. Publish. Amplify."

## Creative Direction
- Tone preset: `cinematic`
- Creative direction: "modern, cinematic technology startup launch"
- Interpretation: Ultra-high contrast, void-black surfaces, razor-sharp typography, glassmorphism borders, glowing audio-reactive accents, and dramatic trailer-scale reveals.
- Angle: Independent African sound finally gets the world-class technology platform it deserves. From Nairobi to Dar es Salaam to Kampala, direct artist-to-listener connection without corporate bottlenecks.
- Hook: "THE SOUND WAS ALWAYS HERE. NOW IT HAS A HOME."
- Outro / punchline: "PLUGG. Stream. Publish. Amplify. The web player for independent African sound."
- Avoid:
  - Generic SaaS language ("streamline your workflow", "all-in-one platform")
  - Abstract filler shapes or cheesy 3D spheres
  - Generic stock images — use Plugg's actual release art and branding

## Visual Identity
- Background: `#0d0e14` (derived from `oklch(0.155 0.006 260)`)
- Surface: `#161822` (derived from `oklch(0.198 0.007 262)`)
- Text Primary: `#fafafa` (crisp white)
- Text Muted: `#9da4b4` (slate grey)
- Accent: `#ffffff` with subtle electric cyan/ice-blue glow (`rgba(255, 255, 255, 0.15)`)
- Border: `rgba(255, 255, 255, 0.09)`
- Display font: `Space Grotesk`, `Inter`, sans-serif
- Body font: `Inter`, sans-serif
- Visual references from the project:
  - `src/assets/cover-1.jpg` (*Lakeside Gold*)
  - `src/assets/cover-3.jpg` (*Mikocheni Nights*)
  - `src/assets/badge.png`
  - Floating player bar with scrub slider and animated equalizer bars

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. **Scene 1: The Genesis Hook** (0.0s – 4.5s) — Dramatic void frame with horizontal beam. "THE SOUND WAS ALWAYS HERE." settles at 0.5s, "NOW IT HAS A HOME." at 2.2s.
2. **Scene 2: The Web Player Showcase** (4.5s – 9.5s) — Recreating the Plugg Web Player. Cover art of *Lakeside Gold* by Zuri Mwangi. Interactive play click at 6.0s, active waveform visualization, track telemetry. Strong beat lock at 8.74s.
3. **Scene 3: Direct Artist Distribution & Telemetry** (9.5s – 15.0s) — "DIRECT ARTIST DISTRIBUTION. ZERO MIDDLEMEN." 3 glowing telemetry cards land sequentially on the beat grid: 8,420,330 Streams (10.93s), 312,480 Monthly Listeners (12.02s), Verified Creator (13.11s).
4. **Scene 4: Climax & Outro** (15.0s – 20.0s) — Monumental "PLUGG" mark. "STREAM. PUBLISH. AMPLIFY." Tagline and URL. Strong cues at 17.47s and 18.56s.

## Audio
- Audio role: Cinematic technology trailer support.
- Audio arc: Deep atmospheric opening building into driving rhythms, accented by crisp UI interactions and beat-synced telemetry, resolving in a resonant outro hit.
- Music: `assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3`
- Music treatment: Plays from 0.0s to 20.0s at volume 0.35, gentle fade-out over final 1.5s.
- Music cue guidance:
  - Tempo: ~109.96 BPM
  - Strong cues: 8.74s (player highlight), 13.11s (telemetry completion), 17.47s & 18.56s (brand climax).
  - Beat-grid windows: 10.93s, 12.02s, 13.11s for sequential metric cards.
- Audio-reactive treatment: Subtle ambient radial glow behind hero cards that gently breathes with the music.
- SFX selection guidance:
  - `impact/impactSoft_medium_001.ogg` for Scene 1 reveal
  - `ui/mouseclick1.ogg` for Scene 2 play button press at 6.0s
  - `interface/drop_001.ogg` for Scene 3 card arrivals
  - `impact/impactBell_heavy_000.ogg` for Scene 4 logo payoff
- Exact SFX choice: Copied to `brag-output/composition/assets/sfx/` and wired relative to composition root.

## Hyperframes Instructions
- Implement in `brag-output/composition/` following standard Hyperframes multi-scene composition architecture (`index.html` mounting sub-compositions from `compositions/`).
- Ensure all timed elements have `class="clip"`, `data-start`, and `data-duration`.
- Register timelines properly on `window.__timelines`.
- Use GSAP `fromTo` for deterministic seeking.
- Run `npx hyperframes check` and resolve all lint issues.
- Maintain WCAG contrast compliance for all text.
- Deliver 1920x1080 at 30 fps.
