# Agent run log

Append-only. One row per `/write-plan` or `/implement-plan` run, written at the end of that run.
`/update-skill` reads this to re-tune `STRATEGY.md` — so every figure must come from the Agent results
(their usage line) or a real command. No usage shown → `n/a`. Never estimate.

Columns:
- **strategy** — the `version` of `STRATEGY.md` that was in force
- **case** — the worked-example letter picked (A–G, W1–W3), or `other: <why>`
- **agents** — what was spawned, e.g. `coder×3 (2 waves) · code-rev · sec-rev · ux-rev`
- **findings** — per reviewer: severe / should-fix / suggestion, e.g. `code 0/1/2 · sec 0/0/0 · ux 0/2/1`
- **fix rounds** — coder rounds used (0–1) + whether the orchestrator fixed things itself
- **agent tokens** — sum of the usage figures the Agent results reported
- **wall-clock** — first agent spawned → last agent finished

| date | skill | plan / issue | strategy | case | agents | findings | fix rounds | agent tokens | wall-clock | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 2026-11-06 | write-plan | docs/dev/plans/2026-11-06-review-fixes.html | 2026-10 (stale: 2026-11) | W1 | plan-reviewer · plan-risk-auditor (run as general-purpose, kit agents installed mid-session) | plan-rev 0/8/6 · risk 1/5/3 | 0 · orchestrator closed all findings | 211934 | ~1m45s (parallel) | Explore 0: files named by the 4 persona review reports |
