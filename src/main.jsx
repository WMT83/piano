import React from "react";
import { createRoot } from "react-dom/client";
import PianoQuest from "./PianoQuest.jsx";

createRoot(document.getElementById("root")).render(<PianoQuest />);

// Register the service worker so the app opens with no internet at all.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then((reg) => {
      // A new build has taken over: reload once so she gets it immediately
      // instead of on some later launch.
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (sw) sw.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) sw.postMessage("skipWaiting");
        });
      });
    }).catch(() => {});
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
