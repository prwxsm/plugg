# Plugg UI refinement

## Build
- Rework the home featured release into a cinematic, borderless full-bleed section spanning from the desktop sidebar edge to the right viewport edge, with artwork fading into the dark page and the existing 10-second crossfade preserved.
- Replace enclosed song-list cards across Home, Discover, Library, artist, release, playlist, genre, and dashboard views with open rows and straight edge-to-edge divider lines.
- Keep genuine tool/form/stat surfaces where grouping is necessary, while removing decorative containers from music lists and dashboard content sections.
- Simplify mobile navigation for both account types to Home, Discover, Library, and Profile; remove the top search shortcut.
- Add Dashboard and Upload as artist-only tabs inside Profile, alongside Profile and Settings, with the selected tab rendering the existing artist tools in place.

## Technical details
- Reuse the shared track-row and navigation patterns so the visual changes remain consistent across every route.
- Make Profile tab state URL-driven for direct access, and redirect artist mobile Dashboard/Upload navigation into those profile tabs.
- Verify desktop and mobile layouts, listener and artist navigation states, interactions, and current build/runtime signals.
