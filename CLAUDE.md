# Piano Quest — working notes for Claude

A gamified piano course for a 9-year-old beginner, installed on an iPad as a PWA.
Modelled on Playground Sessions. 33 lessons, 3 levels, 13 songs.

## Layout
- `src/PianoQuest.jsx` — the entire app: songs, curriculum, WebAudio synth, input,
  progress store, and six lesson engines (song / read / find / rhythm / improv / concept).
- `src/main.jsx` — entry, service-worker registration, double-tap-zoom suppression.
- `public/` — shell, manifest, `sw.js`, icons. `build.mjs` — bundles and self-hosts fonts.
- `vercel.json` — build config + cache headers. `dist/` — build output, do not edit.

## Build / deploy
```bash
npm install && npm run build     # -> dist/
npx vercel --prod                # deploy
```

## Non-obvious constraints — DO NOT REGRESS THESE

1. **`navigator.audioSession.type = "playback"`** in `useAudio`. Without it the
   iPad's physical silent switch mutes the entire app. It looks like a total failure.
2. **Audio must be started inside a real user gesture.** The tap-to-start overlay
   exists for this reason. Do not remove it.
3. **`sw.js` must be served `must-revalidate`** (see `vercel.json`). If a CDN caches
   the service worker, the iPad runs a stale app forever and redeploying cannot fix it.
4. **Web MIDI does not exist in Safari on iPadOS.** Not partial — absent. The Connect
   MIDI button is deliberately hidden when `IS_IOS`. Do not "fix" this; it cannot work.
5. **Progress uses `localStorage`**, not `window.storage` (that only exists inside the
   Claude artifact sandbox).
6. **Touch: `touch-action: none`** on piano keys, pointer events, `setPointerCapture`.
   Multi-touch chords depend on this.

## Song data invariants
Notes are `n(beat, midi, duration, hand)`; `hand` is `"R"` or `"L"`.
- Every note's midi **must** fall inside the song's declared `range: [lo, hi]`, or it
  is invisible on the note highway.
- No two notes may share the same `(beat, midi)` — that pair is the key of the hit map,
  and a duplicate silently breaks scoring.
- `hands: "B"` requires at least one `"L"` note; `hands: "R"` requires none.
- **Only public-domain music.** No chart pop, no licensed material.

Validate after touching song data — check ranges, duplicate (beat,midi) pairs, and that
every lesson has the config its `kind` requires.

## Product rules
- Practice mode waits for every note and always clears the lesson (1 star). Stars 2–3
  come only from Perform mode. **She must never be able to get stuck.**
- Lessons unlock sequentially.
- Difficulty ramps: concept -> drill -> song. Don't add a song without the concept before it.
