# dev status
Last updated: 2026-11-06 03:00 ICT · branch feat/mock-server

## Now
- `feat/mock-server` done: `npm run mock` serves a fake chat.line.biz on 127.0.0.1:8787 from the research
  fixtures (me, bots, chats with `next`, chat detail, messages with `backward`), session cookie `__Host-chat-ses`,
  401 `not_login` without it, and a mock login form. 4 tests.
- Stage 1 done: TypeScript (Node 22, strict) + Biome + Vitest + GitHub Actions CI. `npm run check` is green.

## Next
- MVP core (feature by feature, each verified before the next):
  1. ~~`feat/mock-server`~~ done.
  2. `feat/read-core`: domain types + `LineOAClient` (one HTTP client for the mock and the real console) +
     MCP server with `auth_status`, `list_chats`, `read_chat` + e2e test. Check it in Claude Code.
  3. `feat/login`: Playwright login CLI + session store → read the live OA (read-only) to prove real pulling works.
- Then one tool per feature: `get_user_profile` + `webUrl`, `search_messages`, `get_attachment`, `send_message`.

## Blocked
- none

## Requests
- → user: for `feat/login`, a one-time browser login to the live OA (read-only rules, PLAN A11).

## Heads-up (affects other lanes)
- `npm run check` = lint + typecheck + test. CI runs the same on push.
