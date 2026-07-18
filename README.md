# Piano Quest — iPad app

A gamified piano course, installable on an iPad as a real app: its own icon,
full screen, no Safari chrome, works with no internet.

It is a **PWA** (Progressive Web App). That means no App Store review, no Mac,
no Xcode, and no $99/year Apple Developer account.

---

## Get it on the iPad — two steps

### 1. Put it online (once, on your computer)

The app must be served over **HTTPS**. Opening `index.html` from Files or a USB
stick will *not* work — iOS only offers "Add to Home Screen" on secure sites.

**Vercel (recommended — `vercel.json` is already set up):**

From inside the `piano-quest` folder:

```bash
npm install
npx vercel --prod
```

It will ask you to log in the first time, then ask a few setup questions —
**accept every default**. Vercel reads `vercel.json`, runs `node build.mjs`,
and serves `dist/`. You get a URL like `https://piano-quest.vercel.app`.

To push a change later, just run `npx vercel --prod` again. Or connect the
folder to a GitHub repo and Vercel will rebuild on every push, with no commands
at all.

**Netlify (no account, no terminal):** run `npm install && npm run build`, then
drag the resulting `dist` folder onto **https://app.netlify.com/drop**.

Either way you end up with an HTTPS link.

### 2. Install it on the iPad

1. Open that URL in **Safari** (it must be Safari — Chrome on iOS can't install apps).
2. Tap the **Share** button (the square with the arrow).
3. Tap **Add to Home Screen**.
4. Tap **Add**.

Piano Quest is now an icon on her home screen. Tapping it opens full screen,
with no address bar, and it works on a plane.

---

## Deploying an update

After any change, from inside the `piano-quest` folder:

```bash
npm install        # first time only
npx vercel --prod
```

That is the whole process. Vercel runs the build itself and serves `dist/`.

### It really does reach the iPad

The build stamps a fresh id into the service worker cache name every time
(`piano-quest-<hash>`). This matters more than it sounds: a service worker is
only reinstalled when `sw.js` *changes*, so without the stamp an installed iPad
would keep serving the old cached app **forever** and redeploying could not fix
it.

An open app also listens for the new version and reloads itself once, so she
gets the update on next launch rather than some later one. Verified by
simulating a redeploy against an already-installed client.

If it ever does look stale: swipe the app closed and reopen it.

## Rebuilding after a change

```bash
npm install
npm run build     # -> dist/
```

`npm run dev` builds and serves it locally so you can check it in a browser first.

---

## What's different from the browser version

| | Why |
|---|---|
| Progress saved to `localStorage` | Survives closing the app. Stars, XP, streak and trophies all persist. |
| Audio session set to `playback` | Without this, the iPad's **silent switch mutes the piano**. This was the single biggest gotcha. |
| Tap-to-start screen | iOS refuses to make any sound until audio is started inside a real touch. |
| Double-tap zoom and rubber-band scroll disabled | Otherwise the keyboard jumps around while she plays. |
| "Turn the iPad sideways" prompt | Two hands don't fit in portrait. |
| Bigger keys (180px tall) | Sized for fingers, not a mouse pointer. |
| Fonts bundled locally | So it opens offline, not just online. |
| MIDI banner hidden on iOS | See below. |

---

## Playing a real piano (mic mode)

Tap **"Use my piano"** and the app listens through the microphone, so she can
play an actual acoustic or digital piano and have her notes recognised. This
works on the iPad, which is the important part — it is the way around Safari's
missing MIDI support.

Accuracy in the beginner range (C3–C6) measured at 100%, including in a noisy
room and when playing quietly. **One note at a time, though** — chords are not
reliably detectable from a microphone by anyone, Yousician included, so chord
lessons prompt her to tap the on-screen keys instead.

Two practical notes: it needs HTTPS (so the deployed URL, not a local file), and
iOS will ask permission the first time — tap Allow.

## The one real limitation: MIDI

**Safari on iPadOS does not support Web MIDI.** Not "poorly" — not at all.
So on the iPad she cannot plug in a MIDI keyboard and have the app listen to it.
I've hidden the Connect button on iOS rather than leave a button that can never work.

Her three ways to play, in order of how good they are:

1. **A real MIDI keyboard on a laptop/desktop** — open the same URL in Chrome or
   Edge, hit "Connect MIDI keyboard". This is the best experience by a mile, and
   it's the one that actually builds finger technique.
2. **The iPad's on-screen keys** — multi-touch works, so chords work. Fine for
   reading, theory, rhythm and the drills. Not a substitute for real keys.
3. **iPad app beside a real piano** — use it as the lesson book and metronome,
   play the notes on the actual instrument.

If MIDI on the iPad genuinely matters, the app would need to be wrapped with
**Capacitor** plus a CoreMIDI plugin and installed via Xcode — that's a Mac,
a developer account, and a different piece of work. Say the word and I'll do it.

---

## Practice tools: speed and looping

Every song has a **speed** row (50–100% of the written tempo) and a **bars** row
for looping just the tricky section over and over. This is the single most
useful thing for actually learning a piece: slow it down, drill the four bars
that keep going wrong, then bring the speed back up.

"Speed up as she improves" is on by default — a clean pass automatically nudges
the tempo to the next notch, so she creeps toward full speed without having to
think about it.

Stars stay meaningful: three stars needs the whole song at 90% speed or above.
A slow or partial run still clears the lesson and still earns up to two stars,
and the result card explains exactly what's needed for the third.

## Ear training

Three lessons where the app plays a phrase and she plays it back — the skill
that separates a child who can only read music from one who can actually hear
it. It's also the only part of the app that works with her eyes shut.

The difficulty ramps by taking away help rather than adding speed: one note
with middle C played first as an anchor, then two notes, then three notes with
no anchor and no letters on the keys. She can replay a phrase as often as she
likes at no cost, because relistening is what real musicians do.

## Finger numbers

Songs that stay in one hand position show which finger to use — 1 is the thumb,
5 the pinky — both on the falling notes and as a badge on the key she should
press. There's a toggle to hide them once she knows the piece.

Songs where the hand has to move mid-phrase show no numbers at all. That's
deliberate: a wrong finger number is worse than none, because bad fingering is
genuinely hard to unlearn. Those songs need a teacher, or a proper edition.

## The virtual tutor

The first six lessons of Level 1 are led by **Wren**, a friendly songbird who
talks the child through her first notes one step at a time — find middle C, name
each finger, play a three-note tune. When the wrong key is pressed, Wren says
what it was and which way to move ("That was D. We want C — a little to the
left."), so a child can correct herself without an adult sitting beside her.

Wren also **speaks out loud** (Web Speech API), which matters for a young child
who reads slowly. There's a speaker button in her speech bubble to mute her; the
choice is remembered. Muting loses nothing — everything she says is also on screen.

Wren is a fixed script, not an AI chatbot: she works with no internet, costs
nothing per session, and can never say anything unplanned to a child. To add or
change her lessons, edit the `guided` entries in `LESSONS` (see CLAUDE.md).

## What's in here

```
src/PianoQuest.jsx   the whole app — 41 lessons, 13 songs, the synth, the engines
src/main.jsx         entry point, service worker registration, zoom suppression
public/index.html    the shell, with the iOS meta tags that make install work
public/sw.js         service worker — caches everything so it runs offline
public/manifest.*    app name, icon, landscape lock
build.mjs            bundles the app and downloads the fonts to serve locally
vercel.json          build config + cache headers (see below)
dist/                the built app. This is the folder you host.
```

### Why `vercel.json` matters

`sw.js` is served with `must-revalidate`. This is not a detail you can skip:
if the service worker gets cached by the CDN, the iPad will keep running an old
copy of the app **forever**, and no amount of redeploying will fix it. The font
files are content-hashed, so those are cached for a year.

All songs are public domain (Beethoven, folk tunes) or written for this app.
Nothing here needs a licence.
