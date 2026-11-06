# plan status
Last updated: 2026-11-06 20:30 ICT · branch plan

## Now
- PLAN.md / PLAN_thai.md / PLAN.html no longer link the untracked assignment file.
- CLAUDE.md and docs/README.md are company- and deadline-neutral: no take-home/deadline line, no link to an untracked task file, "reviewers" instead of "graders" (review-fixes plan, task T2).
- `docs/plan/plan-summary.html`: Thai one-page summary (end result, use cases, tools, folder tree + file counts).
- Docs cleaned up: `docs/README.md` maps every document; the run plan is `docs/plan/run-plan.{md,html}`; the
  how-CS-uses-it page is `docs/plan/how-cs-uses-it.html`. The dev/research worktree folders in `~/orca` were removed
  (outside this session); all their commits are safe on the branches. New worktrees go to `~/.lineoa-lanes/`.
- Research lane (this session): a web search for more similar references is running; it becomes
  `docs/research/refs-comparison.html` + `docs/research/README.md` on the `research` branch.
- **Single-session mode:** the user runs every lane from this one session (CLAUDE.md). No separate dev/research
  sessions are needed; Requests below are now this session's own to-do list.
- PLAN v3 is written (`docs/PLAN.md`) and merged into `dev` and `research`. **Dev is unpaused.**
- Run plan (stages, no clock times): `docs/plan/run-plan.md` (Thai diagram `.html`).
- PLAN v3 is also in full Thai with diagrams: `docs/PLAN.html` (Thai text: `docs/PLAN_thai.md`).

## Next
- Answer questions from dev and research. Review dev's merges into `dev` (code-review on each).
- Checkpoint after dev stage 4: every lane green and STATUS current; demo on the mock.

## Blocked
- none

## Requests
- → dev: **Unpaused. Start now.** Follow the dev column (`docs/plan/run-plan.md`): scaffold → mock from
  `test/research/line-api-shapes` fixtures (support-OA-like seed: rich menu texts, bot template, flex card, screenshot,
  PDF; 2 OAs with one shared person) ‖ auth → 6 core tools + `webUrl` + send gating → e2e tests. Case layer (§5b) is
  stage 6, after the checkpoint.
- → research: when `~/lineoa-har/*.har` exists, build a redacted endpoint map and diff it against the fixtures
  (prompt in the run plan). Never commit HAR files or real ids.
- → user: create the test OA and capture the HARs (rules in PLAN §2 A11).

## Heads-up (affects other lanes)
- New fields and tools: `webUrl` on Chat/UserProfile/read_chat; `type: "flex"` messages with `altText`; masking of
  emails/phones in tool output with `reveal` (PLAN §6b); case tools in PLAN §5b.
- `read_chat` never calls markAsRead (PUT). `list_chats` filters `unread`/`ongoing` client-side.
