# CLAUDE.md

MCP server that lets an AI agent work LINE OA Manager's chat (chat.line.biz) the way a human CS person does. It is a
take-home for Acme, due **Fri 6 Nov 2026 23:59 ICT**. The task is in `docs/ASSIGNMENT.md` (kept untracked) and
the spec is in `docs/PLAN.md` (Thai copies: `docs/PLAN_thai.md`, `docs/PLAN.html`).

Reply to the user in **Thai**. Code, commit messages and docs that graders read are in English.

## Lanes: three branches, three worktrees, three sessions

Work happens in three parallel **lanes**. Your lane is your current branch (`git branch --show-current`).
`feat/*` branches belong to the `dev` lane.

| Lane | Branch | Worktree | You may write | Your docs folder |
|---|---|---|---|---|
| plan | `plan` | `<repo>` | `docs/PLAN*.{md,html}`, `docs/plan/**`, `CLAUDE.md`, `AGENTS.md` | `docs/plan/` |
| dev | `dev`, `feat/*` | `<repo>-dev` | `src/`, `mock-server/`, `tests/`, package/config files, `.claude/`, `README.md`, `docs/dev/**` | `docs/dev/` |
| research | `research` | `<repo>-research` | `test/research/**`, `docs/research/**` | `docs/research/` |

- **Write only inside your own lane's paths.** Never edit another lane's folder, and never write into another
  worktree. Because of this, merging lanes never conflicts.
- Need something from another lane (a change to the plan, data, a decision)? Add it under "Requests" in **your own**
  `STATUS.md`. The other lane picks it up at its next session start.
- Only the plan lane edits `CLAUDE.md` / `AGENTS.md` and the shared spec (`docs/PLAN*`). Other lanes ask through Requests.

### Single-session mode (current, from 2026-11-06)
The user drives all three lanes from **one session** (started in the plan worktree). The branches, worktrees and
folders above stay as they are, so the history still shows each lane. In this mode:
- The one session may write in all three worktrees. It uses absolute paths and works inside the worktree that
  owns the file. Each change is committed on that lane's branch (code on `feat/*` in the dev worktree, then merged
  `--no-ff` into `dev`).
- Each lane's path rules still hold per commit: a commit touches one lane's paths only. That lane's STATUS and
  LOG are updated in the same commit.
- Subagents get one lane and a non-overlapping set of files each. They never commit or merge; the main session
  does that.
- Cross-lane requests become direct work, but they are still written in the LOG so the history explains them.

## Context protocol (mandatory, every session)

**At session start**, before doing anything else:
1. Read your own `docs/<lane>/STATUS.md` and the last ~10 entries of `docs/<lane>/LOG.md`.
2. Read the **live** STATUS of the other two lanes **from their worktrees**, not from the copy merged into your
   branch, which can be stale:
   - `<repo>/docs/plan/STATUS.md`
   - `<repo>-dev/docs/dev/STATUS.md`
   - `<repo>-research/docs/research/STATUS.md`
3. Act on any Request addressed to your lane. Read `docs/plan/DECISIONS.md` when you need the reason behind a rule.

**After every unit of work, in the same commit as the work:**
- Rewrite `docs/<lane>/STATUS.md`: Now / Next / Blocked / Requests / last-updated time.
- Append one entry to `docs/<lane>/LOG.md` covering what changed, why, the commit subjects, and anything found
  that other lanes should know.
- If the work changes something other lanes rely on (a tool contract, a file location, a fixture format), say so in
  STATUS under "Heads-up". The plan lane then records the decision in `docs/plan/DECISIONS.md`.

**Before you stop:** STATUS must describe exactly where you left off, so a fresh session can continue from it alone.

### `STATUS.md` format
```markdown
# <lane> status
Last updated: 2026-11-05 21:30 ICT · branch <branch> @ <short sha>

## Now
## Next
## Blocked
## Requests
- → plan: ...
- → dev: ...
- → research: ...
## Heads-up (affects other lanes)
```

### `LOG.md` format (append-only, newest at the bottom)
```markdown
## 2026-11-05 21:30 ICT · <short title>
- What: ...
- Why: ...
- Commits: `<sha> <subject>`, ...
- For other lanes: ... (or "none")
```

## Git rules
- Commit as you go, one concern per commit. Never squash. Merge with `--no-ff`.
- Flow: `feat/*` → `dev`; `plan` → `dev` and `research` → `dev` when a round finishes; `dev` → `main` only as a
  release, tagged `vX.Y.Z` with a CHANGELOG entry. "Check" is CI (lint/typecheck/test), not a branch.
- Never commit or push to `main`, and never push anything, unless the user asks.
- Never commit sessions, cookies, tokens or `.env*`. `docs/ASSIGNMENT.md` stays untracked.
