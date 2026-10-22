# Player and mobile navigation refinement

## What will change

- Rebuild the mobile bottom navigation as a compact floating dock with four destinations and a central player slot.
- When music is active, show its artwork in the center with a thin circular progress ring. Tapping it opens the full player.
- Let touch users dismiss the compact player by dragging it upward; desktop users get a hover-revealed close control.
- Replace the desktop mini player with a Spotify-like bottom bar containing artwork, song details, playback controls, progress, volume, and utility actions.
- Restyle the full player to match the references: centered artwork, dark atmospheric background, persistent controls, and responsive information panels.
- Add a top-right options menu with Lyrics, Save, Add to playlist, and About the artist. Each option will work with the existing local mock state.
- Add a notification bell to the top-right area with a dropdown for new releases and relevant account activity.
- Standardize navigation and player controls on the same thin outlined icon family already used by the app.

## Interaction details

- Mobile dock remains usable with or without a currently selected song.
- Dismissing the compact player clears it from view rather than merely pausing it.
- The full player remains available by tapping/clicking the artwork player icon.
- Lyrics, queue, artist information, and credits appear as responsive panels without nested decorative cards.
- Reduced-motion preferences will disable or simplify transitions.

## Technical details

- Extend local player state with a clear-player action and keep all behavior frontend-only.
- Use pointer events for the upward drag gesture so touch and mouse behavior remain accessible.
- Use existing tracks, artists, releases, and playlists for player details and notification content.
- Update the shell, player, and semantic design tokens only; no backend or data-service changes.
- Verify desktop and mobile layouts, player opening/dismissal, menus, navigation, and console/build health.
