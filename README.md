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

## What's in here

```
src/PianoQuest.jsx   the whole app — 28 lessons, 10 songs, the synth, the engines
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

All ten songs are public domain (Beethoven, folk tunes) or written for this app.
Nothing here needs a licence.
