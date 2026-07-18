# Piano Quest — working notes for Claude

A gamified piano course for a 9-year-old beginner, installed on an iPad as a PWA.
Modelled on Playground Sessions. 41 lessons, 3 levels, 13 songs.

## Layout
- `src/PianoQuest.jsx` — the entire app: songs, curriculum, WebAudio synth, input,
  progress store, and eight lesson engines
  (guided / song / read / find / rhythm / improv / concept / ear).
- `src/main.jsx` — entry, service-worker registration, double-tap-zoom suppression.
- `public/` — shell, manifest, `sw.js`, icons. `build.mjs` — bundles and self-hosts fonts.
- `vercel.json` — build config + cache headers. `dist/` — build output, do not edit.

## Build / deploy
```bash
npm install && npm run build     # -> dist/
npx vercel --prod                # deploy
```
`build.mjs` stamps an md5 of app.js into the service-worker cache name. Do NOT
remove this. A service worker is only reinstalled when sw.js changes byte-wise;
without the stamp sw.js is identical between builds, installed clients keep
serving the old cached app permanently, and redeploying cannot fix it.
`main.jsx` also reloads once on `controllerchange` so an open app updates itself.

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

## The tutor (Wren) and guided lessons

`kind: "guided"` lessons are led by **Wren**, a scripted songbird tutor. She is
NOT an LLM — deliberately. A guided lesson is a `guide.steps` array; the engine
walks them, reacting to what the child actually plays.

Step shape: `{ tell, want, good, bad }`.
- `want.type`: `"none"` (talk, advances on Next) | `"any"` | `"count"` (n presses)
  | `"note"` (exact midi, optional `n` for repeats) | `"notes"` (ordered midis)
  | `"region"` (any key in lo..hi, n times).
- On a wrong note, `directionHint()` tells her which way to move ("That was D.
  We want C — a little to the left."). This is the heart of the tutor; keep it.
- Guided lessons always award 3 stars on completion — they are participation,
  never graded. She must never fail one.

`useSpeech()` reads each `tell`/`good` aloud via the Web Speech API (offline,
free, works on iPad). It is muted via a toggle in Wren's speech bubble and the
preference persists in `localStorage` under `pq:speech`. Speech is a bonus layer:
the text is ALWAYS shown, so a muted app loses nothing essential. Emoji/arrows
are stripped before speaking.

New-note targets in a guided step must be inside `[guide.lo, guide.hi]`.

## Microphone input (mic mode)

Lets her play a REAL piano while the app listens. This is the ONLY way to get
real-instrument input on an iPad, because Safari has no Web MIDI.

- `detectPitch()` is the McLeod Pitch Method (NSDF). Do not "simplify" it to
  plain autocorrelation: a piano's strong harmonics make lag*2 score nearly as
  high as lag, and naive detectors report notes an octave too low. The
  key-maximum picking plus the `maxVal * 0.85` shortest-lag rule is the guard.
- Audio is decimated 4x (44.1k -> ~11k, 1024-sample window) before analysis.
  Measured: same 100% accuracy at 8x less CPU. Do not raise this without
  re-measuring on an actual iPad.
- Verified accuracy C3-C6 (the beginner range): 100%, including with heavy room
  noise, very quiet playing, and notes sampled 200ms after the strike.
- **Monophonic only.** Chords fail — that is inherent, not a bug to fix. Even
  Yousician struggles here. Chord lessons show a "tap the keys on screen" note.
- Mic notes are pressed with `silent = true`. If the synth re-voiced them the
  mic would hear our own output and retrigger in a loop.
- `getUserMedia` requests echoCancellation / noiseSuppression / autoGainControl
  all FALSE. Those algorithms destroy pitch content.
- The noise gate self-calibrates from a rolling floor, so a noisy room adapts.
- Mic feeds the same `press()` pipeline as touch/keyboard/MIDI, so every lesson
  engine supports a real piano without knowing mic mode exists.

Test it with Chrome's fake mic: `--use-file-for-fake-audio-capture=notes.wav`
(see `mkwav.mjs` / `mictest.mjs`) rather than trusting the algorithm in isolation.

## Tempo + section looping (SongPlayer)

- `tempo` is a percentage of the song's written bpm; `spb` derives from it.
  `TEMPO_STEPS = [50,60,70,80,90,100]`.
- `seg` selects a chunk of bars to loop (2 bars for short songs, 4 for long).
  `region` = {from,to} in beats; `inPlay` filters notes to that region and is
  what the highway, scoring, targets and staff all read. Do not go back to
  using `song.notes` directly in the player — that breaks section mode.
- The clock is `(now - startRef)/spb - countRef + originRef`. `countRef` is the
  4-beat count-in and is set to 0 on loop repeats so the loop doesn't re-count
  every time. `originRef` is the beat the section starts at.
- On wrap, hits and `played` are cleared so the section can be re-scored.
- **3 stars require tempo >= 90% AND the whole song** (`capped` in the result).
  Slow or partial passes cap at 2 and the result card says why. Practice mode
  still clears the lesson at any tempo, so she can never get stuck.
- `autoUp`: a Perform pass at >=90% accuracy bumps to the next tempo step.

## Fingering

`song.fing = { R: {midi:finger}, L: {...} }`, 1 = thumb ... 5 = pinky.
Rendered inside the falling note and as a badge on the glowing target key,
toggleable per song.

**Only annotate a song when the fingering is unambiguous** — i.e. the hand stays
in one position throughout. Songs that shift position mid-phrase (Twinkle,
Saints, Jingle Bells, Frère Jacques, Für Elise) deliberately have NO fingering,
because a wrong finger number is worse than none: bad fingering habits are very
hard to unlearn later. Do not "helpfully" fill these in without a real
pedagogical source.

Validate after editing: every note in a fingered song must have a number, and
no two notes sounding on the same beat in the same hand may share a finger.

## Ear training (`kind: "ear"`)

`ear: { range, pool, len, rounds, reference?, labels? }`. The app plays a phrase
of `len` notes drawn from `pool`; she plays it back in order.

- **`deaf.current` must stay.** While the app is playing the phrase it ignores
  all input. Without it, mic mode hears our own speaker output and "answers"
  the question itself. There is a 300ms tail after the last note so the sound
  can die away before listening resumes.
- Difficulty ramps by removing scaffolding, not by adding speed:
  L1 single note + reference C + key labels -> L2 two notes + reference ->
  L3 three notes, no reference, no labels.
- "Show me" reveals the answer but marks the round as missed, so stars still
  mean something. Replay is unlimited and free — relistening is what real
  musicians do.
- Stars come from FIRST-TRY correct answers only.
- No target hints on the keyboard, ever. That would defeat the entire exercise.

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
