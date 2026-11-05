# plan status
Last updated: 2026-11-06 01:15 ICT · branch plan

## Now
- PLAN v3 is written (`docs/PLAN.md`) and merged into `dev` and `research`. **Dev is unpaused.**
- Tonight's run until 03:00: `docs/plan/2026-11-06-tonight.md` (Thai diagram `.html`).

## Next
- Answer questions from dev and research. Review dev's merges into `dev` (code-review on each).
- 02:45 checkpoint: every lane green and STATUS current; demo on the mock.
- Later: sync the Thai copies (`PLAN_thai.md`, `PLAN.html`) to v3 in full (only a v3 summary is at the top now).

## Blocked
- none

## Requests
- → dev: **Unpaused. Start now.** Follow tonight's dev column (`docs/plan/2026-11-06-tonight.md`): scaffold → mock from
  `test/research/line-api-shapes` fixtures (Support-like seed: rich menu texts, bot template, flex card, screenshot,
  PDF; 2 OAs with one shared person) ‖ auth → 6 core tools + `webUrl` + send gating → e2e tests. Case layer (§5b) is
  Friday 12:00, not tonight.
- → research: when `~/lineoa-har/*.har` exists, build a redacted endpoint map and diff it against the fixtures
  (prompt in tonight.md). Never commit HAR files or real ids.
- → user: create the test OA and capture the HARs (rules in PLAN §2 A11).

## Heads-up (affects other lanes)
- New fields and tools: `webUrl` on Chat/UserProfile/read_chat; `type: "flex"` messages with `altText`; masking of
  emails/phones in tool output with `reveal` (PLAN §6b); case tools in PLAN §5b.
- `read_chat` never calls markAsRead (PUT). `list_chats` filters `unread`/`ongoing` client-side.
