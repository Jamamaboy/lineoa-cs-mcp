# The bundled plugin, and the manifest it reads

`scripts/plugin/` is the whole Figma development plugin: `manifest.json`, `code.js`, `ui.html`.
It ships inside this skill and gets copied into the target project at `.claude/make-figma/plugin/`
the first time `/make-figma` runs there (and refreshed later if the bundled copy changes —
see "Refreshing" below). It never talks to the network (`networkAccess.allowedDomains: ["none"]`)
and never calls the Figma MCP — it is the offline route.

## What it does

One page per topic (`pageName`). The first push to a page creates it and a `Versions` root
frame inside it. Every push after that appends one more block to the bottom of that frame —
it never edits or removes an earlier block, so `v1`, `v2`, `v3 · date · label` sit side by
side for comparison, exactly like `docs/plans/*.html` keeps every plan instead of overwriting it.

Each block:
- a heading `vN · YYYY-MM-DD · label`
- an optional "decisions" note box — the short paragraph on what was picked and why
- one row per section, one column per screen inside it, images stacked top-to-bottom when a
  screenshot was split into parts (tall pages) — same layout the EasyHR mockup-import plugin
  already used for its "Version 1" page, generalized to run on every push instead of once.

## The manifest the UI sends to the plugin

The UI (`ui.html`) expects the owner to select **every file in one version's output folder**
(Cmd+A) — a `manifest.json` plus the PNGs it describes. It reads `manifest.json`, matches each
PNG against `<section>__<screen>__p<N>.png` (the `__pN` part is optional, for single-image
screens), and posts one message to `code.js`:

```json
{
  "type": "push-version",
  "pageName": "LIFF mockups",
  "version": 3,
  "date": "2026-09-27",
  "label": "picked layout C",
  "decisions": "Picked C — keeps the header short, matches the rich-menu icon set.",
  "sectionTitles": { "before": "Before", "after": "After" },
  "imageWidth": 360
}
```

`/make-figma` writes this object (minus `files`, which the UI fills in from the PNGs it reads)
as the version's `manifest.json`, alongside the screenshots, in one output folder per push.
Only `pageName`, `version`, `date` are required — `label`, `decisions`, `sectionTitles`,
`imageWidth` are optional.

## File naming the skill must produce

```
<section>__<screen>.png          # single image
<section>__<screen>__p1.png      # first part of a tall page the screenshot script split
<section>__<screen>__p2.png
```

`section` groups screens into a row (e.g. `before` / `after`, or a screen name like `list` /
`detail`). `screen` is the column label. Keep both slug-like (no spaces) — the plugin uses the
raw key as a fallback title when `sectionTitles` doesn't cover it.

## One-time install (the owner does this, not the skill)

1. Open the **Figma desktop app** (the web app cannot import development plugins) with the
   linked file open.
2. **Plugins → Development → Import plugin from manifest…** → pick
   `.claude/make-figma/plugin/manifest.json` in the project.
3. Re-import whenever `/make-figma` says the plugin folder was refreshed — Figma does not
   pick up changed `code.js`/`ui.html` on its own for an already-imported dev plugin.

## Running a push (the owner does this after the skill prepares a folder)

**Plugins → Development → Design push** → in the small window, click the file picker, open
the push's output folder, select every file in it (Cmd+A), then **Push version**. The status
line reports the page name and how many images landed; errors are echoed there instead of a
silent failure.

## Refreshing

`/make-figma` compares the bundled plugin's files against what's in
`.claude/make-figma/plugin/` in the project. If they differ (a newer version of this skill
ships a fixed/extended plugin), it overwrites that folder and tells the owner to re-import —
same click steps as the first install. It never overwrites anything else under
`.claude/make-figma/`.

## Sanity-checking a change to `code.js`

`scripts/dry-run-plugin.mjs` stubs just enough of the global `figma` object (pages, frames,
rectangles, text, fonts, `createImage`/`getSizeAsync`) to run `code.js` in plain Node, push two
versions, and assert: exactly one page got created, the root frame is reused (not duplicated),
and both version blocks exist afterwards with the older one untouched.

```
node scripts/dry-run-plugin.mjs scripts/plugin/code.js
```

Run this after any edit to `scripts/plugin/code.js` before shipping it — it does not touch a
real Figma file, and it is not a substitute for actually running the plugin once in Figma.

## Troubleshooting (hand this to the owner verbatim if they hit it)

- **"no usable font found"** — the plugin needs a Thai-capable font with Regular+Bold locally
  cached (it tries IBM Plex Sans Thai → Noto Sans Thai → Sarabun → Prompt → Kanit → Inter →
  Roboto). Open Figma once while online, then retry.
- **"no manifest.json in the selected files"** — the folder select missed `manifest.json`;
  re-open the output folder and select all files again.
- **"no PNGs matched `<section>__<screen>__pN.png`"** — a screenshot was renamed or the script
  produced a different pattern; check the output folder against the naming rule above.
