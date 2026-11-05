# Docs map

What every document in this repo is for, who keeps it up to date, and when to read it.
The task itself is in `docs/ASSIGNMENT.md`. It stays local and untracked.

## Start here

1. [`plan/plan-summary.html`](plan/plan-summary.html) is a 5-minute Thai summary: the end result, use cases, tools, folder layout and file counts.
2. [`PLAN.md`](PLAN.md) is the spec and the source of truth (v3).
3. [`PLAN.html`](PLAN.html) is the same plan in Thai, with diagrams. Open it in a browser.
4. [`plan/run-plan.md`](plan/run-plan.md) lists the current stages and who does what.
5. Each lane's `STATUS.md` (below) says where that lane stopped.

## The plan (lane: plan, branch `plan`)

| File | What it is | Read it when |
|---|---|---|
| [`PLAN.md`](PLAN.md) | The spec: scope, assumptions, stack, architecture, tool contracts, auth, attachments, PII rules, stages, user flows, risks | Before any design or code change |
| [`PLAN.html`](PLAN.html) | Thai version of PLAN.md with diagrams (what the CS person sees, architecture, auth sequence, data model, case model, stage swimlane) | You want the picture, in Thai |
| [`PLAN_thai.md`](PLAN_thai.md) | Thai text translation of PLAN.md | You want Thai in plain markdown |
| [`plan/run-plan.md`](plan/run-plan.md) · [`.html`](plan/run-plan.html) | The current run: stages per lane, the checkpoint checklist, the cut rule, prompts for agents | Deciding what to do next |
| [`plan/plan-summary.html`](plan/plan-summary.html) | Thai one-page summary of the plan: what the end result looks like (3 screens), 11 use cases, 13 tools, the final folder tree with file counts, stages, what graders get | You need the whole picture fast |
| [`plan/how-cs-uses-it.html`](plan/how-cs-uses-it.html) | How a CS person installs and uses the server day to day, and where Playwright, session, network and file handling sit | Explaining the UX (README, interview) |
| [`plan/DECISIONS.md`](plan/DECISIONS.md) | Cross-lane decisions with the reason for each | You need the "why" behind a rule |
| [`plan/STATUS.md`](plan/STATUS.md) · [`plan/LOG.md`](plan/LOG.md) | Where the plan lane is now; what it did and why (append-only) | Session start |

## Building (lane: dev, branches `dev` and `feat/*`)

| File | What it is |
|---|---|
| `dev/STATUS.md` · `dev/LOG.md` | Where the dev lane is now; what it did and why |
| `dev/plans/` | Per-stage implementation plans from the plan kit (created when dev starts) |
| `../README.md` | Setup, architecture, auth, attachments, limitations: the graders' entry point (written by dev) |

## Research (lane: research, branch `research`)

| File | What it is |
|---|---|
| `research/README.md` | Map of every research output (on the `research` branch) |
| [`research/2026-11-05-reading-list.md`](research/2026-11-05-reading-list.md) | First reading list: prior work on chat.line.biz, inbox products, chat MCP servers, the patterns we adopted |
| `research/refs-comparison.html` | How the reference projects differ from ours and what is good in each (on the `research` branch) |
| `research/STATUS.md` · `research/LOG.md` | Where the research lane is now; what it did and why |
| `../test/research/` | Hands-on study of 23 projects (`index.html`, `takeaways.html`, `data/`, `shots/`, `trials/`) and fake chat.line.biz API fixtures for the mock (`line-api-shapes/`) |

## Rules
- Lanes, branches and the context protocol are in [`../CLAUDE.md`](../CLAUDE.md).
- Real chat data, HAR files, cookies and tokens never go into the repo.
