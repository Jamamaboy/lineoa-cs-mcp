---
name: write-plan
description: Plan a task into a reviewable HTML page — read the issue, explore the real code, draft a two-part plan, run 2 plan-review agents, close the gaps, save to the repo's plan directory. Use when the user types /write-plan or asks to plan/spec a task before implementation.
argument-hint: issue id (e.g. ABC-12) | free-text description of the task
---

Produce a plan as an HTML file a human can review and decide on — not a chat plan that dies with the session.

**Throughout this skill the only files you may write are your own plan page and, at the very end, one appended row in `.claude/agent-strategy/runs.md`.** No source files, no migrations, no git writes, no issue edits — publishing the plan page, attaching its link and one short comment (§7) are the only outward steps (see `.claude/rules/planning-read-only.md`).

---

## 0. Load the project profile

Read `.claude/plan-kit-profile.md`. It tells you: the plan directory · the issue tracker and id prefix · gate labels · verify commands · the read-only query tool · high-risk files · reusable pieces · hard rules · `Models and passes`.

**Everything below that says "the profile" means that file.** A field set to `none` turns that step off.

No profile? Fall back in this order, and say out loud which fallback you used:
1. the repo guide (`CLAUDE.md` at the repo root, or whatever the profile names)
2. detection — `package.json` scripts for verify commands, `git symbolic-ref refs/remotes/origin/HEAD` for the base branch, an existing `docs/plans/` for the plan directory
3. ask the user

Never invent a convention the repo does not have.

Then read `.claude/agent-strategy/STRATEGY.md` — it decides how many `Explore` agents to spawn (cases W1–W3). No fixed cap.
Its `version` month is older than today's (`date +%Y-%m`) → print the one-line notice from its §0 (suggest `/update-skill`) and continue with the current version. Never block on it. No strategy file → use one `Explore` per clearly separate area and say the file is missing (`install.sh --update` creates it).

## 1. Take the task

- Argument matches the profile's issue id prefix → read that issue through the profile's tracker: description + "Done when" + labels.
  - It carries a blocking gate label (profile's `Gate labels`, e.g. `needs-decision`) → stop; report which question is blocking. No plan yet.
- No argument, or free text → **reflect your understanding back in 3–5 lines first**, then ask the decisions needed. Never guess scope.
- Task touches a user-facing screen and the repo has a mockup gate → remind that the mockup must be approved before code. This plan is the spec gate, not the mockup gate.

## 2. Explore the real code

Size the exploration with `STRATEGY.md` §3 (Explore) and cases W1–W3: files already known → read them yourself, no agent · one unknown area → 1 `Explore` · several clearly separate areas (e.g. code to change / existing patterns to imitate / reusable pieces) → one `Explore` per area, all in one message, never two on overlapping areas. Ask each for conclusions with `path:line`, not file contents.

**Pass `model: "sonnet"` on every one of them** — `Explore` is a built-in type with no frontmatter, so it inherits the caller's model and would otherwise run on the orchestrator's expensive model. See `.claude/rules/model-policy.md`.

```
Agent(subagent_type: "Explore", model: "sonnet", prompt: …)
```

**Never write the plan from memory.** Every path, line, and number in the plan must come from grep / reading code / a real query.
Numbers from a database: use the profile's read-only query tool — **`SELECT` only**.

## 3. Draft the two-part plan

Full skeleton: `references/plan-template.html` · block recipes: `references/html-patterns.md`

**Part A — for the human reviewer (spend 90% of the effort here)**

| Section | Must contain |
|---|---|
| Goal | 2–4 lines: what the user gets when this ships — outcomes, not function names |
| Current problems | Symptom + `path/file.ts:line` + **one concrete breaking case** told as a story (who clicked what and hit what) |
| Current state | The real code/schema involved + a diagram of today's flow |
| Proposed | What changes and why + diagram of the new flow, **same layout as the current one** |
| Side-by-side | Two-column table Today / Proposed, one row per case, results tagged ok/crit |
| Impact | 3 cards: UX · data shape · risk |

**Part B — for `/implement-plan` (this is the contract)**

| Section | Must contain |
|---|---|
| Acceptance criteria | Each one checkable ("click X, get Y") — never "works correctly" |
| Scope / not doing | Fence off scope creep; state what is deliberately excluded |
| Edge cases | Odd cases already thought through, with a decision for each |
| File map | Table: pill `Create`/`Modify`/`Delete` · path · what happens in that file |
| Tasks | Per task: `Depends on` · files · tests to write first · rough code outline |
| Test strategy | The named test cases that must exist — not just "write tests" |
| Open questions | Anything a human must answer before implementation |

## 4. Fire both plan-review agents at once

Call the Agent tool **twice in one message** so they run in parallel — both have `tools: Read, Grep, Glob` and cannot edit anything.

Both already pin `model: sonnet` in their frontmatter — **pass no model override**, it would beat the frontmatter.

| agent | lens |
|---|---|
| `plan-reviewer` | Does the plan cite real things? Cover every Done-when? Is Part B executable by `coder` without guessing? Is it reinventing something that exists? |
| `plan-risk-auditor` | Can data cross a tenant boundary? Can a calculation produce wrong output? Permissions? Irreversible migration? Plus every item in the profile's "This repo tends to forget" |

Send both: **the full draft plan text** (paste it — don't make them hunt) + the issue content + the paths you explored + the profile.
Details of each lens: `references/review-lenses.md`

## 5. Close the gaps yourself

You fix the plan — never send findings back to another agent. That is the escalation rule in `.claude/rules/model-policy.md`.

- `CRITICAL` + `IMPORTANT` → **fix the plan, every one of them.**
- `NICE` → move to "Open questions" or "Not doing", with a reason.
- Disagree with a finding? Write down why you're not fixing it — never silently drop it.
- **Record everything in the "Review rounds" table at the bottom of the page**: who found it · severity · what · how resolved.
  That table is the proof the review gate actually ran. A page without it is not finished.

## 6. Render the HTML

Write to `<plan dir>/<ISSUE-ID>-<slug>.html` (no issue → `<YYYY-MM-DD>-<slug>.html`), where `<plan dir>` comes from the profile.

- Copy the CSS block from `references/plan-template.html` wholesale — light/dark complete, no CDN, opens from `file://`.
- **No decorative emoji** · code/paths/commands verbatim, never abbreviated.
- Diagrams are inline SVG or pure CSS grid.
- Wrap every table/`<pre>` in `.scroll` — the page itself must never scroll horizontally.
- Real screenshots and drawn illustrations labeled separately, so nobody mistakes a drawing for evidence.

## 7. Hand it over

1. `open <plan dir>/<file>.html`
2. If there is an issue → publish the page as an Artifact, then attach the URL to the issue as a **link attachment, not a comment** (comments get lost), titled `plan v<n>` (n = earlier `plan v` attachments on the issue + 1 — a re-plan after review becomes v2), + one short comment that the plan is ready for review. Tracker is `none` → skip; just give the user the path.
3. Append one row to `.claude/agent-strategy/runs.md`: strategy version · case (W1–W3) · agents spawned · findings per plan reviewer · agent tokens and wall-clock from the Agent results' usage lines (`n/a` when none shown — never estimate).
4. **Stop.** Summarize in 5 lines: what you did · how many findings, what changed · open questions · where to look on the page · next command is `/implement-plan <path>`.

**Never flow into writing code.** Wait for the user.
