/* Builds Piano Quest into dist/ — bundles the app, and downloads the
   Google Fonts locally so the installed app works with no internet. */
import * as esbuild from "esbuild";
import fs from "fs/promises";
import { createHash } from "crypto";
import path from "path";

const OUT = "dist";
const FONT_CSS = "https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito+Sans:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(path.join(OUT, "fonts"), { recursive: true });

/* --- 1. self-host the fonts (latin subsets only) --- */
let fontFiles = [];
try {
  const css = await (await fetch(FONT_CSS, { headers: { "User-Agent": UA } })).text();
  const blocks = [...css.matchAll(/\/\* ([\w-]+) \*\/\s*(@font-face \{[^}]*\})/g)]
    .filter(([, subset]) => subset === "latin" || subset === "latin-ext");
  const seen = new Map();
  const out = [];
  for (const [, , block] of blocks) {
    const url = block.match(/url\((https:\/\/[^)]+)\)/)[1];
    if (!seen.has(url)) {
      const name = createHash("md5").update(url).digest("hex").slice(0, 10) + ".woff2";
      const buf = Buffer.from(await (await fetch(url, { headers: { "User-Agent": UA } })).arrayBuffer());
      await fs.writeFile(path.join(OUT, "fonts", name), buf);
      seen.set(url, name);
      fontFiles.push("./fonts/" + name);
    }
    out.push(block.replace(url, "fonts/" + seen.get(url)));
  }
  await fs.writeFile(path.join(OUT, "fonts.css"), out.join("\n") + "\n");
  console.log(`fonts: ${fontFiles.length} files self-hosted`);
} catch (e) {
  // No network at build time? Fall back to the CDN. The app still works,
  // it just needs one online load before it can run offline.
  await fs.writeFile(path.join(OUT, "fonts.css"), `@import url('${FONT_CSS}');\n`);
  console.warn("fonts: could not self-host, falling back to the Google CDN");
}

/* --- 2. bundle the app --- */
const res = await esbuild.build({
  entryPoints: ["src/main.jsx"],
  bundle: true, minify: true, format: "esm", target: "es2020",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  outfile: path.join(OUT, "app.js"),
  metafile: true,
});
const size = Object.values(res.metafile.outputs)[0].bytes;
console.log(`app.js: ${(size / 1024).toFixed(0)} kB`);

/* --- 3. static shell + icons, and tell the service worker about the fonts --- */
for (const f of await fs.readdir("public")) {
  await fs.copyFile(path.join("public", f), path.join(OUT, f));
}
let sw = await fs.readFile(path.join(OUT, "sw.js"), "utf8");
// Version the cache by the app.js hash so every content change ships a new
// service worker. Without this the SW is byte-identical between builds, the
// browser never reinstalls it, and the iPad serves a stale app forever.
const buildId = createHash("md5")
  .update(await fs.readFile(path.join(OUT, "app.js")))
  .digest("hex").slice(0, 8);
sw = sw
  .replace("self.__FONTS__ || []", JSON.stringify(fontFiles))
  .replace("__BUILD_ID__", buildId);
await fs.writeFile(path.join(OUT, "sw.js"), sw);
console.log(`sw cache: piano-quest-${buildId}`);

console.log("build complete -> dist/");
