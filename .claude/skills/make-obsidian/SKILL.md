---
name: make-obsidian
description: Create and maintain the project's Obsidian notes — an index note, a STATUS note (NEXT + log), per-topic สรุป (Thai) and context-AI (English) note pairs, round-folder notes, worklog entries, a decision log, and a design-links note. First run asks which vault and which of these to maintain; every run after that updates the same notes in place — it never creates a duplicate. Use when the user types /make-obsidian or asks to write up, log, or update project notes in Obsidian.
argument-hint: none (update what's linked) | "relink" (change vault path or the set of notes)
---

Keep the project's Obsidian vault in sync with what actually happened — updating the same
handful of notes every time, never spawning a new file per run.

**Not the same thing as the `worklog` skill** (`~/.claude/skills/worklog/SKILL.md`, if present
on this machine). `worklog` manages a separate cross-project vault (`planClaude`) for "where did
I leave off" resume across many projects. `make-obsidian` manages *this project's own* vault —
the richer per-topic structure (สรุป + context-AI pairs, round folders, design links) that one
project keeps for itself. Never write into the `planClaude` vault from this skill, and never
read `make-obsidian.json` from `worklog`.

## 0. Load the link record

Read `.claude/make-obsidian.json` in the project root.

- Missing, or the argument is `relink` → go to **1. First run**.
- Present → go to **2. Later runs**, using its `vaultPath` and `selections`.

## 1. First run (or relink)

Ask with **AskUserQuestion**, in Thai, two questions:

1. Vault path — options: the detected default for this project if you found one (state the
   path), plus "อื่น ๆ — พิมพ์ path เอง". Never assume a path you haven't confirmed exists.
2. What to create/maintain — multi-select, offer exactly these (Thai labels, translate freely
   but keep the meaning):
   - Index note (00 เริ่มที่นี่)
   - STATUS (NEXT + log)
   - Per-topic สรุป note (Thai)
   - Per-topic context-AI note (English)
   - Round folder note (`10 รอบงาน/<date>/`)
   - Worklog entry
   - Decision log
   - Design links (Figma versions / artifact links)

Write `.claude/make-obsidian.json`:

```json
{
  "vaultPath": "/absolute/path/to/vault",
  "selections": ["index", "status", "topic-summary-th", "topic-context-ai-en", "round-folder", "worklog", "decision-log", "design-links"],
  "topics": [],
  "updated": "2026-09-27"
}
```

`selections` holds only what the owner ticked — an item left unticked means this skill never
touches that note type for this project. `topics` fills in as topic note pairs get created
(step 3); it's how later runs know what already exists without re-scanning the whole vault
every time.

Before writing anything, **read the vault's own conventions if it already has notes** —
an existing index note, `STATUS.md`, or any `<topic> — สรุป.md` / `<topic> — context AI.md`
pair. Copy their frontmatter fields and section headings exactly rather than inventing your
own; see §4 for the fields seen in practice, but a vault that already exists always wins over
that list.

Then continue into step 3 if the owner already has something to log this run, otherwise stop —
linking + an empty index/STATUS pair is a complete first run.

## 2. Later runs

Read the link record. Only touch the note types in `selections`. For each one, **search for
the existing note first** (by the naming pattern in §3) before writing — append to logs, refresh
the NEXT line, add a table row or a link. Never create a second copy of a note that already
exists.

Re-ask (AskUserQuestion, Thai) only when:
- the argument is `relink`, or
- the owner explicitly says they want to change the vault path or the set of notes.

Otherwise, just do the update silently against what's already linked.

## 3. What "update" means, per note type

| Note type | Path pattern | What changes on each run |
|---|---|---|
| Index | `00 เริ่มที่นี่.md` (or the vault's existing index filename) | Add a table row only when a **new** topic note pair was just created this run; never rewrite an existing row's links or description. |
| STATUS | `STATUS.md` | Move a finished checkbox to a "done" section with today's date · add/replace the dated **NEXT** line so the next session knows exactly what to do without guessing · append one line to the Log section · put anything blocked/awaiting a decision in the "ติดปัญหา / รอตัดสินใจ" section · update the `updated:` frontmatter field to today's real date. |
| Per-topic สรุป (Thai) | `<topic folder>/<Topic> — สรุป.md` | Update the relevant section in place — human-readable, no code paths, plain "what is this and why" language. Creating a new topic **always** creates the สรุป and context-AI files together, never one alone, and registers the pair in the index. |
| Per-topic context-AI (English) | `<topic folder>/<Topic> — context AI.md` | Terse, factual briefing for an AI picking up the topic cold: real file paths, line numbers where useful, gotchas, what NOT to do. Update in place when the underlying code/design changes; don't let it drift from the สรุป note's topic scope. |
| Round folder | `10 รอบงาน/<YYYY-MM-DD>/<slug>.md` | One note per work round: what happened, links to the plan/PR/artifact, decisions still pending. New file per round (rounds are inherently dated and one-shot) — but never touch another round's folder. |
| Worklog entry | `20 Worklog/worklog-<YYYY-MM-DD>.md` | Append to today's entry if it already exists; otherwise create one from `references/templates/worklog-entry-template.md`. Before/after + the reasoning for the change, matching whatever earlier worklog entries in this vault already do. |
| Decision log | wherever the vault keeps it, or `30 คุยงาน/decision-log.md` if none exists yet | Append-only: one row per decision (date · decision · reasoning · status). Only ever change a past row to flip its status (e.g. pending → decided) — never rewrite its reasoning. |
| Design links | wherever the vault keeps it, or a `design-links.md` next to the topic it belongs to | Append one row per version pushed. If `.claude/make-figma.json` exists in the project, this is the natural bridge: mirror any `versions[]` entries not yet reflected here — same append-only rule. |

Filenames above assume this vault's naming style (Thai section numbers, em dash before the
note kind). If the actual vault differs, follow what's already there instead of this table.

## 4. Conventions to always follow

Read them from the vault itself when it already has notes (see step 1); when starting a vault
from nothing, these are reasonable defaults seen in practice:

- Frontmatter: index notes carry `type: index`, `project`, `updated`. STATUS carries `type:
  status`, `project`, `status` (active/paused), `created`, `updated`, plus whatever identifies
  the project (`code`, `repo`, `deploy`, `tags`). Topic notes carry `type: สรุป` or `type:
  context-ai`, `project`, `topic`, `updated`, `source`.
- Language: สรุป / index / STATUS / worklog / decision-log content is Thai, written for a human
  who forgot everything to read cold. context-AI content is English, written for an AI to load
  before touching the topic. Never mix the two inside one note.
- No decorative emoji anywhere in note bodies (a small set of meaning-carrying emoji already
  used as section markers in an existing vault, like 🎯 or 🔜, are fine to keep — don't add new
  ones of your own invention).
- Obsidian style: `[[wikilink]]` between notes, `#tag` where the vault already tags things,
  checkboxes for open items, real dates — check the actual current date, never estimate it.
- Never duplicate. If unsure whether a note already exists, search the vault before writing.

Templates for a from-scratch vault: `references/templates/`.

## 5. Stop and report

Short summary: which notes got created vs. updated (with paths) · what's still open per
STATUS's NEXT line, if touched · nothing more. Do not flow into another task afterward.
