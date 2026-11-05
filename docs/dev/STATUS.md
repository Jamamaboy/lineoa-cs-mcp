# dev status
Last updated: 2026-11-06 02:50 ICT · branch feat/scaffold

## Now
- Stage 1 done: TypeScript (Node 22, strict) + Biome + Vitest + GitHub Actions CI. `npm run check` is green.

## Next
- MVP core (feature by feature, each verified before the next):
  1. `feat/mock-server`: mock chat.line.biz from `test/research/line-api-shapes` fixtures (cookie auth, 127.0.0.1).
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
