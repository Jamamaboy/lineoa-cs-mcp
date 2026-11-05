# dev log

## 2026-11-05 22:00 ICT · Lane created (bootstrapped by the plan lane)
- What: empty STATUS/LOG created as part of the lane rules in CLAUDE.md. From now on, only the dev lane writes here.
- For other lanes: none.

## 2026-11-06 02:50 ICT · Stage 1: scaffold
- What: package.json (ESM, scripts: build/dev/mock/test/typecheck/lint/check), tsconfig (strict, NodeNext),
  biome.json, vitest.config.ts, .gitignore (env, HAR, ASSIGNMENT), .env.example, CI workflow, a smoke test.
  Deps: @modelcontextprotocol/sdk ~1.32.2 (pinned minor; whatsapp-mcp broke on an unpinned major), zod 4, hono +
  @hono/node-server (mock). Dev: typescript ~5.9, vitest 5, biome 2.6, tsx. Installed with --ignore-scripts.
- Why: PLAN §3 and §8 stage 1. The user wants feature-by-feature commits with a check after each.
- Commits: `chore: scaffold TypeScript project with Biome, Vitest and CI`.
- For other lanes: none.

## 2026-11-06 03:00 ICT · Mock chat.line.biz
- What: `mock-server/` (Hono). `fixtures.ts` builds in-memory state from `test/research/line-api-shapes`. `app.ts`
  copies the real paths (`/api/v1/me`, `/api/v1/bots`, `/api/v2/bots/{botId}/chats`, `/api/v1/bots/{botId}/chats/{chatId}`,
  `/api/v3/.../messages`), the `__Host-chat-ses` cookie, the 401 `{code:"not_login"}` body, and the cursors (`next` for
  chats, `backward` for history, both opaque). A mock login form issues a session. `main.ts` binds 127.0.0.1 only.
  Checked by hand with curl: 401 without a cookie, the bot list with one.
- Why: stage 2. The real client can point at this mock unchanged, so "works on mock" stays close to "works on real".
- Commits: `feat(mock): serve a fake chat.line.biz from the research fixtures`.
- For other lanes: the cookie is Secure (Hono enforces the `__Host-` rule); browsers accept it on 127.0.0.1.

## 2026-11-06 03:20 ICT · MVP read core (auth_status, list_chats, read_chat)
- What:
  - `src/domain/` holds types (Chat, Message, AttachmentRef), typed errors, and normalizers from raw chat.line.biz
    JSON. Unknown message types become placeholders, never dropped. Flex cards become `[card] altText`.
  - `src/client/http.ts` does a GET with the session cookie and the `x-oa-chat-client-version` header, using
    `redirect: manual`. A redirect or 401 maps to AUTH_EXPIRED. A non-JSON body maps to ENDPOINT_CHANGED instead of
    a fake success.
  - `src/client/line-client.ts` is the `LineOAClient` seam, one implementation for mock and real, with a bot
    allowlist.
  - `src/config.ts` reads the cookie from `LINEOA_COOKIE` or a Playwright `storageState` file on every request.
  - Tools: `auth_status`, `list_chats` (ongoing/unread/all filtered client-side, `webUrl`, cursor) and `read_chat`
    (oldest→newest, attachment metadata only, system events hidden unless `includeSystem`, `prevCursor`, never marks
    read). All are annotated read-only.
  - e2e: a real MCP client goes over InMemoryTransport → server → mock on a random port (5 tests).
- Why: stage 2–3 MVP. The user wants a small core verified before adding tools.
- Deviation from PLAN: tool output uses LINE's raw ids (no `chat_` prefixes) so `webUrl` and ids match the console;
  revisit if the model mixes ids up.
- Commits: `feat(core): MCP server with auth_status, list_chats and read_chat`.
- For other lanes: research proposals 3 (redirect = AUTH_EXPIRED), 4 (system events hidden by default), 5 (reads
  never mark read, stated in descriptions) and the ENDPOINT_CHANGED error are already in.

## 2026-11-06 03:35 ICT · One-command try-out
- What: `mock-server/start.ts` (start on 127.0.0.1, fall back to a free port); `LINEOA_MOCK=1` in `src/index.ts`
  runs the mock in-process with the dev session; `scripts/try.ts` (`npm run try`) launches the real server over
  stdio, as Claude does, and prints auth_status, list_chats and read_chat; `.mcp.json` lets Claude Code in this
  folder offer the server (`lineoa-cs-mock`, pending the user's approval); the mock serves an HTML chat list and
  chat page so `webUrl` links open something. Checked: `npm run try` output, both pages return 200, a screenshot of
  the chat page, `claude mcp get lineoa-cs-mock` sees the project server.
- Why: the user asked where they can test it themselves. Graders get the same one-command path.
- Commits: `feat(dx): try the server in one command with a built-in mock`.
- For other lanes: none.
