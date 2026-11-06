---
version: 2026-10
approved: 2026-10-06 — kit default (plan kit 1.3.0); not yet re-tuned for this repo by /update-skill
next_review: 2026-11-01
read_by: write-plan, implement-plan
updated_by: update-skill (only after the owner approves a proposal page)
---

# Agent strategy — how many agents, which ones, for which job

Goal, in this order: **safe → fast (wall-clock) → cheap (total tokens across every agent)**.
There is **no fixed cap** on agent count. The count comes from the shape of the work, using the cases in §4.

`write-plan` and `implement-plan` read this file at their step 0. Nothing else may change it except `/update-skill`
after the owner approves. This file belongs to the repo — `install.sh --update` never overwrites it.

Repo-specific facts (which paths trigger which reviewer, high-risk files, how to capture screens) live in
`.claude/plan-kit-profile.md`, not here.

## 0. Staleness check (every run of write-plan / implement-plan)

Compare `version` above with today's month (`date +%Y-%m`). If today is a later month, print one line and keep going
with this version — never block on it:

> Agent strategy is version 2026-10, today is 2026-11 — run `/update-skill` to re-tune it for the current models.

## 1. Model snapshot (source: `claude-api` skill model table, cached 2026-09-25)

| Model | ID | Input $/MTok | Output $/MTok | Cache read $/MTok | Context | Role |
|---|---|---|---|---|---|---|
| Opus 5.5 | `claude-opus-5-5` | 4.00 | 20.00 | 0.20 | 1M | orchestrator only (the session the owner talks to) |
| Sonnet 5.5 | `claude-sonnet-5-5` | 2.00 | 10.00 | 0.20 | 1M | every spawned agent |
| Haiku 4.5 | `claude-haiku-4-5` | 1.00 | 5.00 | — | 200K | not used — candidate, see §8 |
| Fable 5.1 | `claude-fable-5-1` | 10.00 | 50.00 | 0.25 | 1M | not used — candidate, see §8 |

No speed figures are listed: the source has none for these models except Opus fast mode (up to 2.5× output speed at
$8 / $40). Measure wall-clock from `runs.md` instead of guessing.

## 2. What actually costs tokens — the reasoning behind every rule below

1. **Sonnet is only 2× cheaper than Opus per fresh token, and cache reads cost the same ($0.20).** Delegating saves money
   only when the work is clearly bigger than the brief + the agent's cold start + reading its report back.
   A 10-line edit is cheaper done by the orchestrator than briefed out.
2. **Every spawned agent pays its own cold start** — its agent file, the repo guide and rules, plus whatever files it
   re-reads. Parallel agents cut wall-clock, never tokens: N agents = N cold starts.
3. **A dependency chain belongs in one agent.** Splitting A→B→C across three agents costs three cold starts plus
   handoff text, and B waits for A anyway, so nothing runs faster.
4. **Continue, don't respawn.** A follow-up for an agent that already has the context (fix its own findings, answer a
   question) goes through `SendMessage` to that same agent — not a fresh agent that must re-read everything.
5. **Scope what each agent reads.** A reviewer gets only its slice of the diff; a coder gets only its task text, not the
   whole plan; every agent is asked for findings / changed files only — no restating, no file dumps.

## 3. Sizing rules

### Coders (implement-plan)

- Work ≤ ~20 lines across ≤ 2 files → **0 coders**, the orchestrator edits it (same threshold as `.claude/rules/model-policy.md`).
- Otherwise **one coder per independent group**: a group = tasks with no dependency between them **and** zero file
  overlap with every other group. A dependency chain stays inside one group.
- Merge groups that are too small to be worth a cold start (several ~15-line edits of the same pattern) into one coder
  with one shared brief.
- Split into more coders only when each piece is substantial (roughly 100+ changed lines of distinct work) — then the
  wall-clock gain beats the extra cold starts.
- Safety limits that no count may break: zero file overlap inside a wave · hub files (i18n dictionaries, global
  stylesheets, barrel exports, route manifests) belong to exactly one coder, or to a final task if two groups need them ·
  files on the profile's high-risk list are never split across coders.

### Reviewers (implement-plan) — fire only the lenses the diff triggers, all at once

The lenses and their trigger paths are in the profile's `## Reviewers` section.

| Reviewer | Lens | Skip when |
|---|---|---|
| `code-reviewer` | data crossing a boundary, wrong output from critical logic, permissions on queries, audit trail | the diff is purely presentational (layout, styling, copy, translation strings) |
| `security-reviewer` | guards on every entry point, id-from-client checks, privileged credentials, webhooks / tokens, secrets and personal data in logs or responses | none of its trigger paths appear |
| `uxui-reviewer` | shared components, small screens, colour tokens + contrast, translations, loading / error / empty states, number formatting | no screen, string or style changed |

- At least one reviewer always runs — the writer is never the only reader. The diff triggers none (e.g. docs or config
  only) → run the lens closest to the changed files and say so.
- Each reviewer gets **only its slice**: `git diff -- <its paths>` + the new files from `git status --short` that fall in
  its paths + the acceptance criteria that concern those files. Not the whole diff, not the whole plan.
- `uxui-reviewer` also gets the screenshots from implement-plan §4b — changed screens only, at the profile's viewports.
  Every image costs tokens for its reader, so never capture unchanged screens.
- One reviewer per lens. Split a lens in two only when its slice is too big to read well in one pass
  (starting value: > 1,500 changed lines — tune from `runs.md`).

### `/simplify`

It spawns agents of its own. Run it only when the profile's `Simplify pass:` is `on` **and** the diff adds a new file or
exceeds ~150 changed lines (starting value — tune from `runs.md`). Otherwise skip and say so in the summary.

### Explore (write-plan)

- Files already named in the issue, or found with 2–3 greps → **0 Explore**, the orchestrator reads them directly.
- One unknown area → 1 Explore (`model: "sonnet"`, breadth "medium").
- Several clearly separate areas (e.g. schema + API + UI + an integration) → one Explore per area, no fixed cap, never
  two on overlapping areas. Ask each for conclusions with `path:line`, not file contents.
- `plan-reviewer` + `plan-risk-auditor` always run, both, in one message — they are the plan's review gate.

## 4. Worked examples — version 2026-10

Pick the closest case, name it in the batching announcement ("Case D: 3 coders in 2 waves, 3 reviewers"), adjust only
with a stated reason. Counts are Sonnet agents; the orchestrator is not counted.

| Case | Shape of the work | Coders | Reviewers (parallel) | Total | Why |
|---|---|---|---|---|---|
| **A. Tiny fix** | guard / scoping filter / copy fix, ≤ 20 lines, ≤ 2 files | 0 — orchestrator edits | the 1 lens the files trigger | **1** | a brief costs more than the edit; a Sonnet reviewer still keeps writer ≠ reviewer |
| **B. Backend chain** | lib function → API route → its test, each step needs the previous (3–4 files) | 1 — the whole chain | `code-reviewer` + `security-reviewer` | **3** | a chain across agents = 3 cold starts and no speed gain |
| **C. UI only** | 1–2 screens + translation strings, no new query or route | 1 | `uxui-reviewer` (+ `code-reviewer` if a query or a computed number changed) | **2–3** | nothing for security to read; code-reviewer only if data logic moved |
| **D. Full-stack feature** | migration + lib + 1–2 API routes + 1–2 screens + translations | wave 1: 1 (migration + types + lib) · wave 2: 2 in parallel ([routes] / [screens + translations]) | all 3 | **6** | foundation first; routes and screens share no files so they run side by side |
| **E. Wide, same pattern** | the same small change across 8 independent pages (~15 lines each) | 2 — 4 pages each, one shared brief | the triggered lenses, 1 each | **3–5** | 8 coders would spend more on cold starts than on the edits |
| **E′. Wide, distinct work** | 8 independent pages, each 100+ lines of different work | 8 in parallel | the triggered lenses, 1 each (split a lens only past the size limit) | **9–11** | each piece is big enough that wall-clock wins |
| **F. High-risk file** | change inside a file on the profile's high-risk list | 1, alone in its wave — or 0 if ≤ 20 lines | `code-reviewer` always + `security-reviewer` if the file guards access | **1–3** | one writer per high-risk file; the orchestrator fixes findings itself |
| **G. Fix loop** | reviewers returned 7 findings across 4 files | dedupe first (one root cause seen by two lenses = one fix) · ≤ 20 lines total → orchestrator · rest → `SendMessage` to the coder that owns each file, in parallel | re-review: only the lenses that had findings, only on lines changed since the review | **0–2 new** | continuing an agent reuses its context; a full re-review repeats work already done |

write-plan examples:

| Case | Shape | Explore | Plan reviewers | Total |
|---|---|---|---|---|
| **W1** | issue names the 2 files to change | 0 | both | **2** |
| **W2** | one unknown area (e.g. "where is this value rounded?") | 1 | both | **3** |
| **W3** | cross-cutting, 4 separate areas: schema + API + screens + an integration | 4 (one per area) | both | **6** |

## 5. Fix-loop rules

- Round 1: findings rated severe / should-fix → the coder that owns the file, via `SendMessage`.
- Round 2 and anything found in the final check → the orchestrator fixes it. Never a third coder round.
- Re-run the verify commands after every edit round before re-reviewing.

## 6. Invariants — a strategy update may never relax these without saying so in red on the proposal page

writer ≠ reviewer · zero file overlap inside a parallel wave · the orchestrator walks the acceptance criteria itself ·
migrations are written to file and applied only after the owner confirms · order is apply → merge → deploy (a PR with an
unapplied migration stays a draft) · no visual check is claimed without a screenshot · the profile's hard rules hold ·
high-risk files have one writer at a time · the owner approves every strategy change.

## 7. Logging — the data `/update-skill` tunes from

At the end of every write-plan / implement-plan run, append one row to `.claude/agent-strategy/runs.md`.
Token and duration figures come from the usage line each Agent result reports; if a result shows none, write `n/a` —
never estimate.

## 8. Candidates — not adopted, for the next review to test

| Idea | Why it might help | What would prove it |
|---|---|---|
| Haiku 4.5 for Explore | half Sonnet's per-token price on read-only search | Explore reports on Haiku cite the same `path:line` facts as Sonnet on 2–3 real tasks |
| Offer Fable 5.1 for very hard / very important plans | strongest model, at 2.5× Opus per token | a task where the Opus plan missed something a stronger model would catch — owner decides per task |
| `isolation: "worktree"` for parallel coders that touch the same file | removes the zero-overlap limit | merge conflicts stay rare and cheap to resolve |
| Re-review only changed hunks via `git diff <sha>` | smaller re-review slices | same findings caught at lower tokens in `runs.md` |

## 9. Version history

| Version | Approved | Summary |
|---|---|---|
| 2026-10 | 2026-10-06 | Kit default shipped with plan kit 1.3.0: no fixed agent cap; reviewers fire by path; security-reviewer + uxui-reviewer; screenshots for UI review; apply-before-merge gate; cases A–G, W1–W3 |
