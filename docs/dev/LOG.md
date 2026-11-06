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

## 2026-11-06 03:50 ICT · extension points, README and guides
- What: SessionSource interface (env + file today; web login, extension or vault later) with no behaviour change; CONTRIBUTING.md (map, 6 safety rules, recipes for a tool, a backend, a login method, an HTTP transport); README in the reviewer's style (what it unblocks, setup, tools, how it works, auth, attachments, safety, limitations, what it could grow into, how it was built); Thai user guide docs/USAGE.th.md.
- Why: The user wants the project easy to build on with a clear guideline, a README graders understand, and a Thai guide on how to use it.
- Commits: refactor(auth): pluggable session sources; docs: add a guide for building on the server; docs: write the README; docs: add a Thai user guide
- For other lanes: none.

## 2026-11-06 04:19 ICT · choose an OA, or ask
- What: chooseOa (name, @id, botId or a unique part of the name; the only OA or LINEOA_DEFAULT_OA when none is named; otherwise CHOOSE_OA with the list so the agent asks); every tool's botId input became oa; CLI --oa uses the same rule with a short hint; docs updated. Checked: unit + e2e (question, name, @id), the CLI against the live account with 4 OAs.
- Why: The user wants the AI to ask which OA when it is not clear, and to name OAs instead of ids.
- Commits: feat(client): choose an OA by name…; feat(tools): every tool takes oa…; fix(cli): show a short --oa hint…; docs: explain choosing an OA
- For other lanes: none.

## 2026-11-06 04:21 ICT · v0.1.0 released to a new public repo
- What: History rewritten with git filter-repo before going public (company name, real OA names and a real amount replaced in every commit; commit counts unchanged; full backup bundle kept outside the repo); plan docs and fixtures made company-neutral; CHANGELOG + version 0.1.0; dev merged to main and tagged v0.1.0; new public repo github.com/Jamamaboy/lineoa-cs-mcp with main, dev, plan, research and the tag; GitHub release v0.1.0; CI on main green. The old private repo is the git remote private-old and was not changed.
- Why: The assignment needs a public repo, and the owner wants it to describe only what the MCP server does.
- Commits: chore(release): v0.1.0; release: v0.1.0 (main)
- For other lanes: none.

## 2026-11-06 07:16 ICT · Grader dry-run and review fixes (feat/polish)
- What: a fresh clone of the public repo was installed, checked and toured per the README (all passed; build and
  npm audit clean). A code-review agent then reported 11 defects, and all were fixed in small commits:
  - ids that could rewrite request paths (bypassing the OA allowlist) are refused;
  - cookies go only to line.biz and its subdomains;
  - bad numeric settings are a CONFIG_ERROR instead of switching limits off;
  - uncertain sends count toward the cap, the echo is checked on the event and its message, only a failed POST
    is uncertain, and audit errors can't flip a delivered send to a failure;
  - search dates cover whole days and only message text matches;
  - filtered lists read more pages;
  - a missing list in a response is ENDPOINT_CHANGED;
  - downloads stop at the cap while streaming;
  - setup and .mcp.json work on Windows.
  Lint warnings and test-output noise were also cleared, and the README now notes invisible bot replies.
- Why: the user asked to keep checking and propose improvements before review.
- Commits: chore: clear lint warnings…; docs: note that Messaging API bot replies…; fix(security) ×2; fix(config);
  fix(send); fix(search); fix(list); fix(client); fix(attachments); fix(setup).
- For other lanes: none. Not pushed.

## 2026-11-06 09:43 ICT · README showcase
- What: badges, demo GIF slot (terminal GIF recorded with vhs against the mock), supports.svg (tested / untested / not supported), Mermaid feature map and usage sequence (render-checked), Versions table; intro marked for the owner. A Claude-session recording was made in /tmp only; the owner will record the final GIF.
- Why: The user asked for a GIF, a what-it-works-with graphic, feature and flow diagrams, and versions in the README.
- Commits: docs: add a terminal demo GIF…; docs: README badges, showcase…
- For other lanes: none.

## 2026-11-06 09:51 ICT · README diagrams and badges
- What: docs/assets/flow.svg (illustrated support-chat flow with numbered steps) and docs/assets/architecture.svg (high-level architecture with data flow), both render-checked; README gets status and stack badge rows (all shields verified to return logos) and the two pictures; 2x PNG + SVG copies exported to ~/Downloads/lineoa-diagrams for Canva.
- Why: The user wants LINE-docs-style flow pictures, an architecture diagram, and badge rows like the reference repo.
- Commits: docs: add an illustrated flow and an architecture diagram; docs: README tech badges and the new diagrams
- For other lanes: none.

## 2026-11-06 10:07 ICT · diagram restyle
- What: supports.svg became icon cards with tested/untested/unsupported badges; architecture.svg and the README mermaid sequence now use flow.svg's palette (blue, purple, dark, LINE green).
- Why: The user asked for icons and one visual style across all diagrams.
- Commits: 0cea395, deffad9, 9e9f7ee
- For other lanes: none.

## 2026-11-06 10:11 ICT · linear flow diagram
- What: flow.svg redrawn to read left to right in the style of the LINE docs diagrams the user shared.
- Why: The user asked for a linear, left-to-right flow.
- Commits: a99ca13
- For other lanes: none.

## 2026-11-06 18:35 ICT · history guide in README
- What: README 'How this was built' now shows three git log commands: releases, features, commits inside a feature. From here on the dev LOG/STATUS update ships in the same commit as the work (as CLAUDE.md says), not as a separate docs(dev) commit.
- Why: 164 commits looked like a lot; read by first-parent they are about 40 features, each split into small reviewable commits.
- Commits: `docs: show how to read the git history one level at a time` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 18:38 ICT · release v0.1.3
- What: Version 0.1.3 in package.json and SERVER_VERSION, a CHANGELOG entry and a Versions row. Then dev to main with --no-ff, tag v0.1.3, push dev, main and the tag.
- Why: The user asked to push and release the README and diagram work. v0.1.2 was already taken by a stray tag on the v0.1.1 commit.
- Commits: `chore(release): v0.1.3` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 19:02 ICT · CLI hints use npm scripts
- What: Every CLI hint (not logged in, usage, help, unknown command, setup) now names an npm script.
- Why: A fresh-clone test showed 'Run: lineoa login', which a new user cannot run.
- Commits: `fix(cli): point hints at npm scripts a fresh clone can run` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 19:03 ICT · LINEOA_MOCK for the CLI
- What: New src/mock-env.ts (withMockIfAsked) used by index.ts and cli.ts; the CLI stops the mock when done. Test: tests/unit/mock-env.test.ts. README shows the CLI on the mock.
- Why: A fresh-clone test found that LINEOA_MOCK=1 had no effect on the CLI, which then read the live OA.
- Commits: `fix(cli): LINEOA_MOCK=1 also switches the terminal command to the mock` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 19:03 ICT · send on the mock
- What: .mcp.json: lineoa-cs-mock gets LINEOA_ALLOW_SEND=true; README says so. lineoa-cs (live) is unchanged: read-only.
- Why: Without it a fresh clone could not try the send tool anywhere.
- Commits: `feat(dx): turn sending on for the mock entry in .mcp.json` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 19:04 ICT · release v0.1.4
- What: version 0.1.4 (package.json, SERVER_VERSION), CHANGELOG entry, Versions row, STATUS rewritten to match the current state. Then dev to main with --no-ff, tag v0.1.4, push, GitHub release.
- Why: the user asked to finish the fresh-clone fixes and release them before testing from a git clone.
- Commits: `chore(release): v0.1.4` (this commit)
- For other lanes: none.

## 2026-11-06 19:11 ICT · welcome on session start
- What: New .claude/settings.json (SessionStart, matcher startup) and scripts/welcome.mjs.
- Why: A fresh Claude session in the clone opened blank; the user wanted it to say what the system can do.
- Commits: `feat(dx): welcome message when Claude Code starts in this folder` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 19:11 ICT · features page
- What: New scripts/features-page.ts, npm run features, generated docs/features.html, README link.
- Why: The user wanted one page that says what the system does and what each feature contains in git.
- Commits: `docs: features page built from git (npm run features)` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 19:19 ICT · readable sequence diagram
- What: New docs/assets/sequence.svg replaces the README's mermaid sequence diagram.
- Why: The user found the mermaid diagram hard to read and cut off on GitHub in dark mode.
- Commits: `docs: draw the step-by-step diagram as an SVG that reads in dark mode` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 19:20 ICT · features page pictures
- What: scripts/features-page.ts gains a See it section; docs/features.html regenerated.
- Why: The user asked for example pictures on the features page.
- Commits: `docs: example chat and pictures on the features page` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 19:20 ICT · release v0.1.5
- What: version 0.1.5, CHANGELOG, Versions row, features page regenerated, STATUS updated; dev to main with --no-ff, tag v0.1.5, push, GitHub release.
- Why: the user approved pushing and releasing the welcome message, features page and readable diagram.
- Commits: `chore(release): v0.1.5` (this commit)
- For other lanes: none.

## 2026-11-06 19:38 ICT · plan kit installed
- What: install.sh copied the kit under .claude/; the profile is filled in for this repo.
- Why: The user wants the review fixes planned with /write-plan and built with /implement-plan from their own kit.
- Commits: `chore(dx): install the plan kit (write-plan / implement-plan) with this repo's profile` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 19:48 ICT · diagram palette
- What: flow, architecture, sequence and supports SVGs recoloured; layout and text unchanged.
- Why: The user asked for light blue, green and orange in every diagram.
- Commits: `docs: diagrams in light blue, green and orange` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 19:53 ICT · repo polish (T1)
- What: LICENSE, src/tools/get-user-profile.ts, docs/dev/STATUS.md
- Why: Tech-lead review: no license file, lint warning, internal note in a public file.
- Commits: `chore: MIT license, unused import, no internal notes in STATUS` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 19:53 ICT · error + input validation (T3)
- What: src/client/http.ts, src/tools/search-messages.ts, src/tools/send-message.ts, src/domain/errors.ts
- Why: QA review: UNEXPECTED fetch failed, impossible dates accepted, blank text accepted, API path in errors.
- Commits: `fix: network failures and 404s give actionable errors; search dates must be real` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 19:53 ICT · tests for T3
- What: tests/unit/http-errors.test.ts, tests/e2e/input-validation.test.ts
- Why: Cover the T3 behaviour.
- Commits: `test: http error mapping and tool input validation` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 19:54 ICT · server start-up errors (T4a)
- What: src/index.ts
- Why: QA review: LINEOA_SEND_DAILY_LIMIT=abc showed only Connection closed.
- Commits: `fix(server): a bad setting is one stderr line, not a stack trace` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 19:54 ICT · CLI dates + matcher (T4b)
- What: src/cli/ui.ts
- Why: CS/QA review: 5/11/69 was confusing; read by name needs a safe matcher.
- Commits: `fix(cli): Gregorian dates and a pure chat-name matcher` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 19:54 ICT · CLI read by name (T4c)
- What: src/cli.ts
- Why: CS review: chat ids are long; QA: unknown options printed Node stack traces.
- Commits: `feat(cli): read a chat by name; option errors are one line` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 19:54 ICT · tests for T4
- What: tests/unit/cli-errors.test.ts
- Why: Cover the T4 behaviour.
- Commits: `test: CLI and server start-up errors, read by name` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 19:54 ICT · robust local files (T5a)
- What: src/auth/session-source.ts, src/auth/session-file.ts, src/audit/audit-log.ts
- Why: Dev review: one bad audit line stopped all sending; a half-written session caused UNEXPECTED.
- Commits: `fix: corrupt local files no longer break login or sending` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 19:54 ICT · setup (T5b)
- What: src/cli/setup.ts
- Why: CS review: no way to try the mock from Desktop, alarming not-installed line; risk review: re-runs dropped settings.
- Commits: `feat(setup): --mock, merged env, timestamped backups, clear messages` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 19:54 ICT · version + deps (T5c)
- What: src/version.ts, src/server.ts, package.json, package-lock.json, .mcp.json
- Why: Dev review: duplicated version, setup relied on a devDependency.
- Commits: `chore: one version source, tsx at runtime, mock on a free port` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 19:54 ICT · tests for T5
- What: tests/unit/local-files.test.ts
- Why: Cover the T5 behaviour.
- Commits: `test: local files, setup and version` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 19:54 ICT · response shapes (T6)
- What: src/domain/raw-schemas.ts, src/client/line-client.ts
- Why: Dev review: a renamed field would give silently wrong values.
- Commits: `fix(client): check LINE's response shapes; clear not-found for chats` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 19:54 ICT · tests for T6
- What: tests/unit/raw-schemas.test.ts, tests/unit/normalize.test.ts, tests/e2e/not-found.test.ts
- Why: Cover the T6 behaviour.
- Commits: `test: response-shape checks, normalize, not-found wording` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 19:58 ICT · dist + CI (T7a)
- What: mock-server/fixtures.ts, scripts/smoke-dist.mjs, .github/workflows/ci.yml, tests/unit/files.test.ts
- Why: Dev review: LINEOA_MOCK=1 node dist/src/index.js crashed; CI only ran Linux and never the build.
- Commits: `fix(build): the built server finds its mock data; CI checks 3 OSes and the build` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 19:58 ICT · setup --mock flag (T7b)
- What: src/cli.ts
- Why: CS review: Claude Desktop users had no way to try the mock.
- Commits: `feat(cli): npm run setup -- --mock` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 19:58 ICT · CS start page (T8a)
- What: docs/START.th.md, start-mac.command
- Why: CS persona review scored setup 3/10: no Terminal/Node steps, no safety explanation.
- Commits: `docs: Thai start page and a double-click installer for CS staff` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 19:58 ICT · README + guides (T8b)
- What: README.md, docs/USAGE.th.md, scripts/welcome.mjs
- Why: Tech-lead review: placeholders and process before setup; CS review: Thai guide hard to find.
- Commits: `docs: README opens with a plain pitch and the Thai links; guides in sync` (this commit; the LOG entry ships with the work)
- For other lanes: none.

## 2026-11-06 20:03 ICT · review fix round (code + security)
- What: src/client/http.ts, src/client/line-client.ts, src/audit/audit-log.ts, src/mock-env.ts, src/cli/setup.ts, start-mac.command, tests/unit/review-fixes.test.ts
- Why: code-reviewer 2 should-fix, security-reviewer 3 should-fix + suggestions; all small, fixed by the orchestrator.
- Commits: `fix: review follow-ups in the client, setup and mock` (this commit; the LOG entry ships with the work)
- For other lanes: none.
