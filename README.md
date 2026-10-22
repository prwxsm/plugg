# Plugg

PLUGG — STATIC MUSIC PLATFORM PROTOTYPE

Build Plugg, a modern music discovery and artist distribution platform focused on independent artists and listeners, with a strong connection to the African and East African music ecosystem.

This is Phase 1 of the Plugg product.

The purpose of this phase is to establish a beautiful, coherent, highly interactive frontend product using local mock data only.

There must be NO backend, NO database, NO API, NO authentication service, and NO cloud storage.

The prototype should feel like a real, polished music application even though all data is currently simulated.

1. PRODUCT VISION

Plugg is a music platform built around two connected experiences:

LISTENERS

Listeners use Plugg to:

discover music

discover artists

search for songs

browse genres

play music

like songs

create/manage playlists

build their library

follow artists

share music

explore releases

ARTISTS

Artists use Plugg to:

create and manage their artist identity

upload music

create releases

manage tracks

schedule releases

publish music

view performance statistics

understand their listeners/fans

manage their artist profile

Plugg should therefore feel like both:

a music discovery platform for listeners

and

a simple artist platform for independent musicians.

Do not turn it into a generic SaaS dashboard.

Music must remain the center of the product.

2. IMPORTANT PRODUCT PRINCIPLE

This prototype is intentionally frontend-first.

Do not try to solve future infrastructure problems now.

The development progression will eventually be:

PHASE 1
Static Plugg prototype
        ↓
PHASE 2
Real database
        ↓
PHASE 3
Real authentication
        ↓
PHASE 4
Real artist/release management
        ↓
PHASE 5
Real media uploads/storage
        ↓
PHASE 6
Real audio delivery
        ↓
PHASE 7
Analytics
        ↓
PHASE 8
Monetization / distribution infrastructure


For this implementation, build ONLY PHASE 1.

3. STRICT TECHNICAL RESTRICTIONS

These restrictions are mandatory.

DO NOT IMPLEMENT

Supabase

Firebase

Neon

PostgreSQL

Prisma

MongoDB

MySQL

any server database

REST APIs

GraphQL

server actions

API routes

Cloudflare R2

AWS S3

cloud file storage

real authentication providers

OAuth

Better Auth

NextAuth

payment systems

subscription infrastructure

external backend services

Do not create fake backend endpoints simply to make the application appear more sophisticated.

Everything should run from the frontend.

4. FRONTEND ARCHITECTURE

Keep the architecture deliberately simple.

Use:

UI
 ↓
Reusable Components
 ↓
Local Mock Data
 ↓
Frontend State


Do not introduce unnecessary abstraction layers.

Mock data should be centralized and structured.

For example:

src/
  data/
    artists.ts
    tracks.ts
    releases.ts
    playlists.ts
    users.ts
    genres.ts
    analytics.ts

  components/
  pages/
  layouts/
  hooks/
  lib/


The exact folder structure may differ if the framework requires it, but maintain the principle of:

clean components + centralized mock data + predictable state.

5. DESIGN THE DATA AS IF IT WILL EVENTUALLY BECOME REAL

Although the data is static, don't hardcode it throughout components.

Components should consume structured objects.

For example:

Artist
Track
Release
Playlist
User
Genre
Analytics


Relationships should be represented through IDs.

Example:

Artist
  ↓ artistId
Track
  ↓ releaseId
Release


This will allow us later to replace:

mockArtists


with:

databaseArtists


without rebuilding the UI.

Do NOT build the database now.

6. MOCK DATA

Create enough mock data for the application to feel populated.

Do not use:

Artist 1

Artist 2

Song 1

Album 1

Test User

Lorem ipsum

Use believable music data.

The musical world should feel appropriate to Africa and particularly East Africa.

Use genres such as:

Afrobeats

Amapiano

Dancehall

Bongo Flava

Afro-pop

Hip-Hop

R&B

Trap

Gospel

Alternative

Afro-fusion

Use a mixture of:

fictional artists

fictional releases

fictional songs

Real artists may be used only where appropriate as generic reference/demo content.

Avoid implying that real artists have actually joined or uploaded to Plugg.

7. REQUIRED DATA MODELS

USER

id
name
email
accountType
avatarUrl
artistId


accountType:

listener
artist


ARTIST

id
username
displayName
bio
location
avatarUrl
coverUrl
verified
fans
monthlyListeners
totalPlays
socialLinks


TRACK

id
artistId
releaseId
title
slug
genre
coverUrl
audioUrl
durationSeconds
playCount
published
releaseDate


RELEASE

id
artistId
title
slug
type
coverUrl
releaseDate
status
trackIds


Release types may include:

single
EP
album


PLAYLIST

id
userId
name
description
coverUrl
trackIds


GENRE

id
name
slug
image


ANALYTICS

Use realistic simulated values for:

total plays

monthly listeners

fans

top tracks

recent plays

growth

release performance

8. VISUAL IDENTITY

The existing Plugg design direction should be interpreted as:

minimal + dark + premium + music-focused + modern.

The interface should feel closer to a premium music product than a conventional SaaS dashboard.

Use:

dark surfaces

strong white typography

subtle secondary text

restrained accent color

subtle borders

generous spacing

strong artwork

elegant typography

smooth transitions

carefully controlled blur

minimal visual noise

Do not force a particular accent color if it conflicts with the strongest Plugg visual identity.

The brand should feel distinctive without becoming visually loud.

9. DESIGN LANGUAGE

Typography

Use a modern sans-serif such as Inter or an equally polished alternative.

Create clear hierarchy between:

page titles

section titles

track titles

artist names

metadata

statistics

navigation labels

Cards

Music cards should prioritize:

artwork

title

artist

useful metadata

Do not overload cards with buttons.

Artwork

Music artwork should be visually important.

Use high-quality placeholder imagery that looks appropriate for actual music releases.

Artwork should not feel like random stock photography.

Borders

Use subtle borders and separation rather than heavy shadows.

Animation

Use restrained, purposeful motion:

hover

press

page transitions

player transitions

modal transitions

loading states

expanding/collapsing sections

Avoid excessive animation.

10. APPLICATION SHELL

Create a reusable AppShell.

DESKTOP

Use:

┌──────────────────────────────────────────────┐
│                 Header                       │
├──────────────┬────────────────┬──────────────┤
│              │                │              │
│ Navigation   │ Main Content   │ Optional     │
│              │                │ Queue /      │
│              │                │ Suggestions  │
│              │                │              │
├──────────────┴────────────────┴──────────────┤
│              Mini Player                     │
└──────────────────────────────────────────────┘


The right panel should be optional rather than forcing it into every screen.

11. MOBILE EXPERIENCE

Mobile is not simply a smaller desktop.

Create a deliberate mobile experience.

Use:

mobile-first spacing

touch-friendly controls

horizontal music rails

compact cards

bottom navigation

mobile player

full-screen player

mobile-friendly forms

collapsible sections

The mobile bottom navigation should provide access to the core listener areas such as:

Home
Discover
Library
Profile


Artist-specific navigation can be accessed through the artist dashboard/profile experience.

12. LISTENER ROUTES

Implement these routes.

/

Home

Create a personalized-feeling music home.

Sections may include:

Fresh Drops

Trending

New Releases

Featured Artists

Popular Near You

Recommended

Genres

Use horizontal rails where appropriate.

The page should immediately communicate:

"There is music here I want to listen to."

/discover

Discovery page containing:

search

genres

trending music

new releases

featured artists

discovery categories

Search must actually filter the mock dataset.

Searching should be able to find:

tracks

artists

releases

/artist/:username

Artist profile.

Include:

cover artwork

artist avatar

name

verification state

location

bio

fan count

monthly listeners

popular tracks

releases

play button

follow button

social links

Make the page feel like an actual artist destination.

/song/:slug

Track/release detail page.

Include:

artwork

title

artist

genre

release information

play button

like

add to playlist

share

related tracks

/library

Listener library.

Include:

liked music

saved tracks

playlists

recently played

artists

Allow mock interactions such as:

liking a track

removing a like

creating a playlist

adding a track to a playlist

13. ARTIST EXPERIENCE

Artist functionality is simulated entirely in frontend state.

There is no real account system.

Allow the prototype to switch between:

Listener
Artist


for demonstration purposes.

14. ARTIST DASHBOARD

/dashboard

Create a polished artist dashboard.

Include:

Overview statistics

Total Plays

Monthly Listeners

Fans

Releases

Music

Show:

published tracks

scheduled releases

drafts

Performance

Show simulated:

plays

listeners

top tracks

growth

Use simple, attractive charts where useful.

Do not turn the dashboard into an overloaded analytics product.

15. ARTIST UPLOAD FLOW

/upload

Create a simulated release/upload experience.

The form should allow the artist to enter:

title

artist

genre

release type

cover artwork

audio

description

release date

publish/schedule

However:

DO NOT ACTUALLY UPLOAD FILES TO A SERVER.

Simulate the interaction entirely in frontend state.

The user should be able to:

Create release
    ↓
Add track
    ↓
Enter metadata
    ↓
Choose publish/schedule
    ↓
Review
    ↓
Publish / Schedule


After submission, update the local mock state so the new release appears in the relevant UI.

This should feel functional without requiring a backend.

16. ARTIST PROFILE MANAGEMENT

/me

Allow the simulated artist to edit:

display name

username

bio

location

avatar

cover image

social links

Changes should update frontend state.

No server persistence is required.

17. AUTHENTICATION SIMULATION

/auth

Create polished login and signup screens.

However, this is only a frontend simulation.

Do not implement:

real passwords

OAuth

tokens

sessions

authentication APIs

Submitting the form simply changes local application state.

For example:

loggedOut
loggedInListener
loggedInArtist


This allows us to demonstrate the different product experiences.

18. SETTINGS

/settings

Include:

account information

notification preferences

playback preferences

appearance

privacy-style settings

These can all use frontend state.

19. MUSIC PLAYER

The music player is one of the most important parts of Plugg.

Treat it as a first-class system rather than a small footer component.

MINI PLAYER

When a track is playing:

fixed at bottom

artwork

title

artist

play/pause

next

progress indicator

The mini-player should persist while navigating.

20. FULL PLAYER

Create an expanded player.

Desktop

Include:

large artwork

track information

progress

play/pause

previous

next

shuffle

repeat

volume

like

share

playlist

Mobile

Create a dedicated immersive player.

Use:

large artwork

blurred artwork background

track information

controls

progress

like

share

The mobile player should feel immersive and intentional rather than simply being a resized desktop modal.

21. PLAYER STATE

Use a simple global frontend state solution such as React Context, Zustand, or another lightweight approach.

The state should manage:

currentTrack
isPlaying
progress
volume
queue
likedTracks
currentPlaylist
repeatMode
shuffleMode


Interactions should work across routes.

Example:

User plays a song on Home.

↓

Navigates to Discover.

↓

The same track remains in the mini-player.

↓

Opens Artist.

↓

The player is still available.

This persistence is important.

22. AUDIO

If reliable local/sample audio is available, use it.

Otherwise, simulate playback.

The important thing is that the interface behaves correctly.

The progress indicator should move.

Play/pause should change state.

Next/previous should change the current track.

Seeking should update progress.

Do not introduce external infrastructure simply to provide audio.

23. INTERACTION QUALITY

The prototype should not merely contain clickable-looking buttons.

Important interactions should actually work.

Examples:

Like

Click heart:

unliked → liked
liked → unliked


Play

Click track:

currentTrack = selectedTrack
isPlaying = true


Search

Search should filter the mock dataset.

Artist

Clicking an artist should open the artist profile.

Release

Clicking a release should open its detail page.

Playlist

Tracks can be added/removed from mock playlists.

Follow

Follow/unfollow should update frontend state.

Upload

Submitting the simulated upload should update local mock state.

24. EMPTY STATES

Create polished empty states.

Examples:

Empty Library

"No music here yet."

CTA:

"Discover music"

Empty Playlist

"Your playlist is empty."

CTA:

"Find something to play"

Artist With No Releases

"No releases yet."

CTA:

"Create your first release"

No Search Results

"No music matched your search."

Provide a useful way back to discovery.

25. LOADING STATES

Even though data is local, implement polished skeleton/loading states where appropriate.

Use them sparingly.

The purpose is to establish patterns that can later be reused when real network/database loading is introduced.

26. ERROR STATES

Create graceful frontend error states for situations such as:

invalid route

missing artist

missing track

missing release

unavailable content

Do not allow the interface to simply crash.

27. ACCESSIBILITY

Use:

semantic HTML

keyboard navigation

accessible buttons

appropriate labels

sufficient contrast

visible focus states

meaningful alt text

Do not sacrifice accessibility for visual design.

28. RESPONSIVE BREAKPOINTS

Test the application at:

large desktop

standard laptop

tablet

modern mobile

small mobile

Pay particular attention to:

music rails

player

navigation

artist headers

dashboard

upload forms

modals

typography

Nothing should overflow horizontally unless the interaction intentionally uses horizontal scrolling.

29. WHAT NOT TO DO

Do NOT:

create backend infrastructure

create database schemas

connect external services

create fake API layers

create unnecessary abstractions

over-engineer authentication

build payment functionality

implement real cloud uploads

build complicated recommendation algorithms

build production analytics infrastructure

turn every page into a dashboard

use excessive gradients

use excessive glassmorphism

overload the interface with cards

make every element rounded

create unnecessary animations

copy Spotify or Apple Music directly

Plugg should have its own identity.

Use modern music products as quality references, not as templates to copy.

30. PRODUCT FEEL

When someone opens the prototype, the immediate impression should be:

This is a real music platform.

Not:

This is a demo generated from mock data.

The distinction should come from:

realistic data

polished interactions

strong typography

meaningful hierarchy

consistent navigation

excellent artwork presentation

persistent player

thoughtful empty states

responsive behavior

coherent listener/artist experiences

31. CODE QUALITY

Keep the implementation clean.

Avoid:

huge components

duplicated UI

hardcoded repeated data

data embedded directly inside JSX

unnecessary dependencies

unnecessary state complexity

Prefer:

reusable components

centralized mock data

reusable hooks

clear route structure

predictable state

descriptive names

The prototype should be easy for another engineer to understand.

32. FUTURE BACKEND COMPATIBILITY

Do not implement the future backend.

But structure the frontend so that later we can replace mock data with real data progressively.

For example:

Current:

getArtist(id)
      ↓
mock artists


Future:

getArtist(id)
      ↓
database


The UI should not need to know where the data comes from.

However, keep this abstraction lightweight.

Do not create an elaborate API architecture now.

33. FINAL ACCEPTANCE CRITERIA

The prototype is successful if:

PRODUCT

Plugg clearly feels like a music platform.

Listener and artist experiences are both represented.

Music discovery is intuitive.

Artist distribution workflows are represented.

DESIGN

Dark, minimal and premium.

Strong visual hierarchy.

High-quality music artwork.

Consistent components.

Responsive across desktop and mobile.

Smooth but restrained animation.

FUNCTIONALITY

Navigation works.

Search works.

Music playback simulation works.

Mini-player persists across navigation.

Full player works.

Like/unlike works.

Follow/unfollow works.

Playlists work locally.

Artist dashboard works.

Upload flow works locally.

Profile editing works locally.

Auth simulation works locally.

ARCHITECTURE

Frontend only.

Mock data only.

No backend.

No database.

No authentication provider.

No API.

No cloud storage.

No unnecessary infrastructure.

FUTURE

The resulting frontend should provide a clean foundation from which the engineering team can later replace mock data with real infrastructure without redesigning the entire product.

34. FINAL INSTRUCTION

Build the complete Plugg prototype as a cohesive product, not as a collection of isolated pages.

Prioritize the overall experience.

The Home page, Discover, Artist Profile, Release pages, Library, Player and Artist Dashboard should feel like parts of the same application.

If a design decision is necessary and not explicitly specified above, choose the option that best supports:

simplicity, premium quality, music discovery, independent artists, African music culture, usability, and future scalability.

Do not add complexity merely because it is technically possible.

Build the simplest version that feels exceptionally good.

The goal of this phase is not to prove that Plugg has a sophisticated backend.

The goal is to prove that Plugg is a great product.

## Development

You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
