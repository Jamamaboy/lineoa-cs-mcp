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

## 2026-11-06 03:50 ICT · History split into reviewable commits
- What: the 4 code commits were rebuilt from the same base as 15 small commits: scaffold 3, mock 3, read core 6,
  try-it 3. Each is about 150 lines of code or less, apart from the package lock. Each feature is still merged
  `--no-ff`. The final tree is identical to the old `dev`: `git diff` is empty. Every commit passed typecheck and
  tests on its own, checked one by one in a temporary worktree. The old history is kept as the local branch
  `backup/dev-before-split`; it was never pushed.
- Why: the user reviews each commit, and the read-core commit (703 lines) was too big to review.
- Commits: this commit.
- For other lanes: from now on, dev stops after each feature for review (CLAUDE.md).

## 2026-11-06 03:40 ICT · Login and real-console default (feat/login)
- What:
  - `playwright-core` drives the installed Google Chrome, so no browser download.
  - `src/auth/login.ts` (`npm run login`) opens chat.line.biz, waits until `/api/v1/me` answers, then saves only the
    *.line.biz cookies to `~/.config/lineoa-mcp/session.json`. The file is mode 0600 in a 0700 folder.
  - `LINEOA_BASE_URL` defaults to https://chat.line.biz. The mock runs only with `LINEOA_MOCK=1`.
  - `.mcp.json` now has `lineoa-cs` (real, `LINEOA_ALLOW_SEND=false`) and `lineoa-cs-mock`.
  - `npm run try -- --real` forces sending off and only opens a chat that is already read.
- Why: the user asked to connect to their real OA now, read-only by default, with sending switchable later.
- Commits: `chore(deps): add playwright-core…`, `feat(auth): npm run login…`, `feat(config): talk to the real
  console by default…`, `feat(dx): npm run try -- --real…`.
- For other lanes: the real endpoints get their first live check here (GET only).

## 2026-11-06 03:50 ICT · First live read of chat.line.biz
- What: the user ran the login (Chrome window) once. The session file was written with mode 600, and the account
  reaches 4 OAs. `npm run try -- --real` then called the real console over GET only. `auth_status`, `list_chats`
  (10 chats) and `read_chat` (one already-read chat) all returned correct data. The `webUrl` matches the console's
  own chat URL.
- Confirmed live: `GET /api/v1/me`, `/api/v1/bots?noFilter=true&limit=1000`, `/api/v2/bots/{botId}/chats?folderType=ALL`,
  `/api/v1/bots/{botId}/chats/{chatId}`, `/api/v3/bots/{botId}/chats/{chatId}/messages`. Cookie auth with
  `x-oa-chat-client-version` works, and the response shapes match the research fixtures. Bot-sent template
  messages arrive as `messageSent` and show as staff.
- Why: the user wanted the real OA connected, not only the mock.
- Commits: this commit. No real names, ids or messages were written to the repo.
- For other lanes: research fixtures for these 5 GET endpoints are now confirmed against the live console.

## 2026-11-06 03:36 ICT · get_user_profile
- What: mock serves notes/tags/owners; client getProfile joins chat detail, tag names, notes and the assignee; tool get_user_profile (read-only) + e2e test. Checked live on the real OA (GET only, an already-read chat): all three endpoints answer JSON.
- Why: Required action 5 of the assignment (see a user's profile).
- Commits: feat(mock): serve chat notes, tags and owners; feat(client): read a profile…; feat(tools): add get_user_profile
- For other lanes: none.

## 2026-11-06 03:37 ICT · needs_reply filter
- What: list_chats gains filter needs_reply (ongoing + customer spoke last); non-message latest events get a preview such as [follow] instead of empty or [-].
- Why: The user wants the MCP to find chats that went silent without an answer.
- Commits: fix(domain): give non-message events a preview; feat(tools): list_chats filter needs_reply…
- For other lanes: none.

## 2026-11-06 03:39 ICT · search_messages
- What: Node built-in SQLite store (no native modules; substring LIKE works for Thai), incremental sync of recent chats (caps: LINEOA_SYNC_MAX_CHATS=50, LINEOA_SYNC_MAX_MESSAGES=200), tool search_messages with chat/sender/date filters, before/after context and webUrl; mock mode uses an in-memory index. Live check (GET only, temp index deleted after): 10 chats synced in ~5 s, Thai and English queries hit, second sync updated 0 chats. FTS5 is not compiled into Node 22's SQLite, so LIKE is used.
- Why: Required action 3 (search across chats); no search endpoint exists on chat.line.biz.
- Commits: feat(index): add a local message store…; feat(index): sync recent chats…; feat(tools): add search_messages…
- For other lanes: none.

## 2026-11-06 03:42 ICT · get_attachment
- What: sharp (prebuilt, no install script); file helpers (MIME from magic bytes, atomic 0600 cache by content hash, shrink to 1568 px JPEG) + unit tests; mock serves attachment bytes behind the cookie; client getAttachment (finds the message in the last 250, refuses expired, cookie only to *.line.biz, 32 MB cap); tool get_attachment returns MCP image content (<=1 MB) or the saved path. Live check: a real image downloaded from chat-content.line.biz with the session cookie (85 KB JPEG).
- Why: The attachment requirement of the assignment; the live check confirms the content host accepts the saved session.
- Commits: chore(deps): add sharp…; feat(mock): serve attachment bytes…; feat(attachments): sniff types…; feat(client): download a message's image or file; feat(tools): add get_attachment
- For other lanes: none.

## 2026-11-06 03:44 ICT · send_message (off by default)
- What: mock: CSRF token + send endpoint that echoes the message with its sendId; client sendText (CSRF, textV2 body, unique sendId, one retry on 403, never resends an unknown result: looks up the sendId and returns SEND_UNCERTAIN); audit log (JSON lines, text stored as length + hash only); tool send_message registered only when LINEOA_ALLOW_SEND=true, with chat allowlist, daily cap (50), dryRun, destructiveHint. 3 e2e tests. NOT tried on the real console yet: LiveOA is read-only; a test OA from the user's account (e.g. TestOA) is needed for one live send.
- Why: Required action 4 (send a message), made safe for an agent.
- Commits: feat(mock): add the CSRF token and the send endpoint; feat(client): send a text message…; feat(audit): log every send attempt…; feat(tools): add send_message…
- For other lanes: none.

## 2026-11-06 03:47 ICT · CLI, browser choice and one-step setup
- What: login works with Chrome, Edge, Brave, Chromium, Firefox or WebKit (auto picks the first installed Chromium-family browser; Firefox/WebKit need a one-time playwright-core install; real Safari cannot be automated); lineoa CLI (status, chats with --needs-reply/--unread/--all, read, search, --oa) with colored output that switches off when piped; lineoa setup (npm run setup) writes Claude Desktop config (backup .bak) and runs claude mcp add, absolute paths, read-only unless --allow-send, --dry-run. Fixes from the live run: the real console rejects chat pages over 25 (client now pages; mock mirrors the 400); SQLite ExperimentalWarning hidden. Live: status, chats --needs-reply and search ran against the real OA.
- Why: The user wants an install a non-technical person can do, a pretty terminal view, and more than one browser.
- Commits: feat(auth): log in with Chrome, Edge…; fix(client): fetch chats 25 at a time; fix(mock): reject chat pages over 25…; feat(cli): add the lineoa terminal command…; feat(cli): lineoa setup adds the server…
- For other lanes: none.
