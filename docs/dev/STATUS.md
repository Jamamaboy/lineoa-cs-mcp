# dev status
Last updated: 2026-11-06 03:37 ICT · branch dev

## Now
- Done: needs_reply filter
- Done: get_user_profile
- `feat/login`: `npm run login` (Chrome window, the person logs in, only *.line.biz cookies saved 0600);
  the server now defaults to the real console, read-only; `.mcp.json` offers `lineoa-cs` (real) and
  `lineoa-cs-mock`; `npm run try -- --real` reads the live OA without opening unread chats. **Verified against the live OA**
  (read-only): the user logged in once; auth_status, list_chats and read_chat returned real data.
- **Try it in one command** (`feat/try-it`): `npm run try` (no AI client needed); `.mcp.json` registers
  `lineoa-cs-mock` for Claude Code in this folder; `LINEOA_MOCK=1` starts the mock inside the server; the mock now
  serves a small web console (`/` and the `webUrl` page `/{botId}/chat/{chatId}`).
- **MVP core works on the mock** (`feat/read-core`): MCP server over stdio with `auth_status`, `list_chats`,
  `read_chat`. One HTTP client (`LineOAClient`) for mock and real. Typed errors (AUTH_EXPIRED incl. login
  redirects, FORBIDDEN, NOT_FOUND, RATE_LIMITED, ENDPOINT_CHANGED). `webUrl` on every chat. 10 tests; stdio smoke
  test by hand against `npm run mock` showed the chat list and a chat with file metadata.
- `feat/mock-server` done: `npm run mock` serves a fake chat.line.biz on 127.0.0.1:8787 from the research
  fixtures (me, bots, chats with `next`, chat detail, messages with `backward`), session cookie `__Host-chat-ses`,
  401 `not_login` without it, and a mock login form. 4 tests.
- Stage 1 done: TypeScript (Node 22, strict) + Biome + Vitest + GitHub Actions CI. `npm run check` is green.

## Next
- MVP core (feature by feature, each verified before the next):
  1. ~~`feat/mock-server`~~ done.
  2. ~~`feat/read-core`~~ done.
  3. `feat/login`: Playwright login CLI + session store → read the live OA (read-only) to prove real pulling works.
- Then one tool per feature: `get_user_profile` + `webUrl`, `search_messages`, `get_attachment`, `send_message`.

## Blocked
- none (waiting for the user's review of feat/login before the next feature)

## Requests
- → user: for `feat/login`, a one-time browser login to the live OA (read-only rules, PLAN A11).

## Heads-up (affects other lanes)
- `npm run check` = lint + typecheck + test. CI runs the same on push.
