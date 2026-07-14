import React from "react";
import { createRoot } from "react-dom/client";
import PianoQuest from "./PianoQuest.jsx";

createRoot(document.getElementById("root")).render(<PianoQuest />);

// Register the service worker so the app opens with no internet at all.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

// Safari fires this on double-tap-to-zoom. Block it: she is tapping keys,
// not trying to zoom the page.
document.addEventListener("gesturestart", (e) => e.preventDefault());
let lastTouch = 0;
document.addEventListener("touchend", (e) => {
  const now = Date.now();
  if (now - lastTouch <= 320) e.preventDefault();
  lastTouch = now;
}, { passive: false });
