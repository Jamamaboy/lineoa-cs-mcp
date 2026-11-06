# Batching rules — parallel work + fix loop

## How to form batches

From the plan's Tasks (each has `Depends on` + a file list):

1. Draw the dependency graph first — tasks with `Depends on: none` are the first eligible batch.
2. Within one batch, **zero file overlap, not even one file** — two agents editing the same file concurrently means the later one silently clobbers the first.
3. Hub files that many tasks touch (i18n dictionaries, global stylesheets, barrel exports, route manifests) → pull them out into one final task, run after all batches finish.
4. No fixed agent cap — size each batch with `.claude/agent-strategy/STRATEGY.md` §3–§4: one coder per independent group, a dependency chain stays in one coder, tiny groups merge into one coder. More agents buy wall-clock, never tokens (each pays its own cold start).
5. Tasks with a migration go first whenever other tasks need types regenerated from the schema.

## Example

A plan with 5 tasks:
- T1 migration + types (no dep)
- T2 new lib function (dep: T1)
- T3 API route (dep: T2)
- T4 screen component (dep: T2)
- T5 i18n strings (touches the shared dictionary, which T4 also touches)

→ Batch 1: [T1] · Batch 2: [T2] · Batch 3: [T3, T4] in parallel (no shared files) · Batch 4: [T5]

Cheaper layout with the same result (`STRATEGY.md` Case D): T1 → T2 is a chain, so one coder does both (one cold start, not two). T5 is translation strings only for T4's screen, so fold it into T4's coder — the hub rule only bites when two parallel coders touch the same hub file.
→ Wave 1: [T1 + T2] · Wave 2: [T3] ‖ [T4 + T5] — 3 coder runs instead of 5, and 2 waves instead of 4.

Always announce this layout before firing, so the user sees the reasoning.

## What each coder gets

- The full task text from the plan (Depends on / files / tests-first / code outline) — pasted directly, not "go open the plan".
- The plan file path, in case it needs Part A context.
- The profile's hard rules and verify commands.
- Outputs from prior tasks it depends on (new function names / types that just came into existence).
- A file boundary: **only the files in its own task.** Problems found outside → report, don't fix.

## Fix loop without losing the thread

- Round 1: findings from every reviewer that ran (code / security / uxui) are deduped, grouped by file, and go back to **the coder that owns the file** via `SendMessage` to that same agent — batch ownership decides who fixes; continuing the agent reuses its context instead of paying a new cold start.
- Rerun the verify commands before re-reviewing — don't spend a review round on code that's still red. Re-review only the lenses that had findings, only on what changed since.
- Round 2 onward is yours: a finding that survived one coder round, or a small localized fix, you make yourself. **Never a third coder round for a few lines** (`.claude/rules/model-policy.md`).
- Findings still open after that → stop, report what's left and why, let the user decide.
- `/simplify` runs only after all coders are completely done (it edits real code and can collide with them), only once, only if the profile's `Simplify pass:` is `on`, and only when `STRATEGY.md` §3 says the diff is big enough.
