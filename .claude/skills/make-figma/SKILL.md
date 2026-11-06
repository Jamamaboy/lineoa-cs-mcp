---
name: make-figma
description: Push HTML mockups, PNGs, and short "what we decided and why" notes into the project's linked Figma file, with version control — one push = one new labeled block, never a new file, so old versions stay for comparison. Works offline via a bundled local Figma development plugin (default route, no MCP quota spent); the Figma MCP is opt-in only. First run asks for the Figma file URL and remembers it; later runs never ask again unless told to relink. Use when the user types /make-figma or asks to push a design, mockup, or design decision into Figma.
argument-hint: none (push using what's linked) | "relink" (change the linked Figma file)
---

Push what was designed or decided into the linked Figma file — as the next version, not a new file.

**This skill never touches EasyHR/project source code.** It only writes: its own link record
(`.claude/make-figma.json`), a local plugin copy (`.claude/make-figma/plugin/`), and a per-push
output folder of PNGs + a manifest. Screenshotting reads project files (HTML mockups) but never
edits them.

## 0. Load the link record

Read `.claude/make-figma.json` in the project root.

- Missing, or the argument is `relink` → go to **1. Link the Figma file**.
- Present → skip to **2. Gather sources for this push**, using its `fileUrl` / `fileKey` /
  `pagesPrefix`.

## 1. Link the Figma file (first run, or on relink)

Ask with **AskUserQuestion**, in Thai, e.g.:

> "จะเชื่อมกับไฟล์ Figma ไหน" — ตัวเลือก: the known default (state the URL you were given for
> this project, if any) · "อื่น ๆ — ใส่ลิงก์เอง"

Extract the file key from whatever URL comes back: `figma.com/(design|file)/<fileKey>`. If the
regex doesn't match, ask again — never guess a key.

Write `.claude/make-figma.json`:

```json
{
  "fileUrl": "https://www.figma.com/design/<key>/<slug>",
  "fileKey": "<key>",
  "pagesPrefix": "",
  "versions": []
}
```

`pagesPrefix` is optional context for naming pages consistently (e.g. a product name); leave it
`""` if the owner doesn't offer one. Confirm the link in one short line, then continue to step 2
if the owner already gave you something to push this turn, otherwise stop here — linking alone
is a valid, complete run.

## 2. Gather sources for this push

Sources it can push, in any combination:

| Source | How |
|---|---|
| HTML mockup(s) | Screenshot with `scripts/shot.mjs` (bundled, no npm deps — see below). Pass `steps` for interactive states (hover, opened modal, filled form) as plain JS strings; fixed-position overlays are hidden by default before capture so they don't smear across split parts. |
| Existing PNGs | Use as-is; just rename to the naming convention below if they aren't already. |
| Decisions | A short paragraph — what the owner picked and why. Pull it from the conversation; never invent it. |

Screenshot a job list with:

```
node scripts/shot.mjs jobs.json <output-dir>
```

`jobs.json` is `[{ file, out, width?, steps?: [js, ...], hideFixed?: false }]` — `file` is an
absolute path to the HTML mockup, `out` becomes the `<screen>` part of the final filename. Tall
pages come back split as `out__p1.png`, `out__p2.png`, ... automatically.

Rename/organize every image (screenshotted or existing) into one output folder as
`<section>__<screen>__pN.png` (`__pN` only needed when split). `section` is the row grouping
(e.g. `before`/`after`, or a topic name); `screen` is the column label.

Full manifest schema and the plugin's own logic: `references/plugin-and-manifest.md`.

## 3. Prepare / refresh the reusable plugin

Compare `scripts/plugin/{manifest.json,code.js,ui.html}` (bundled with this skill) against
`.claude/make-figma/plugin/` in the project.

- Missing → copy all three files there. Tell the owner, in Thai, the exact one-time steps:
  open the Figma desktop app on the linked file → **Plugins → Development → Import plugin from
  manifest…** → select `.claude/make-figma/plugin/manifest.json`.
- Present but different (this skill shipped a newer plugin) → overwrite, and tell the owner to
  **re-import** using the same steps — Figma doesn't hot-reload an imported dev plugin.
- Present and identical → say nothing about this step.

## 4. Assemble this push's manifest + folder

Compute `version = len(versions) + 1` from the link record. Pick a `pageName` — one Figma page
per topic; reuse the same `pageName` across pushes about the same topic so they land on one
page (e.g. `"<pagesPrefix> — LIFF mockups"` or just the topic if `pagesPrefix` is empty).

Write `manifest.json` (see the schema in `references/plugin-and-manifest.md`) into a fresh
output folder together with the renamed PNGs from step 2. Use today's real date, never a
placeholder.

## 5. Hand off to the owner

Tell the owner, in Thai, the exact click steps to run this push:

> เปิด Figma → **Plugins → Development → Design push** → กดเลือกไฟล์ → เปิดโฟลเดอร์ `<path>` →
> Cmd+A เลือกทุกไฟล์ → Open → กด **Push version**

State what will happen before they click: page `<pageName>` is created only if it doesn't
exist yet; this becomes block `v<N> · <date> · <label>` appended below whatever is already
there — nothing existing gets edited or removed.

## 6. Record the version

Once the push is done (or immediately, if the owner won't confirm synchronously — say it's
recorded as pushed), append to `.claude/make-figma.json`:

```json
{ "n": 3, "date": "2026-09-27", "label": "picked layout C", "sources": ["<section>__<screen>...", "..."] }
```

If the project keeps a changelog for this kind of work (check its own doc conventions — e.g.
this project's `CLAUDE.md` §3 table), add one short line there too: what got pushed, which
version, and the Figma page name. Never touch anything else in the project's docs or code for
this.

## 7. Optional: Figma MCP route

Only use `use_figma` / `generate_figma_design` when the owner explicitly says this month's
quota is free — never assume it. State the call budget before spending it, since **reads count
too**. This route skips steps 3–5 (no local plugin needed) but still goes through steps 1, 2,
and 6 the same way — the link record and version history are shared between both routes.

## Rules

- Never spend an MCP call without the owner saying quota is available first.
- Never overwrite or delete an existing version block — always append.
- Never create a second page for a topic that already has one — reuse `pageName`.
- No decorative emoji in anything written into a Figma text layer.
- `/make-figma` never means "make a new file" — after the first link, every run updates the
  same Figma file and the same link record.
