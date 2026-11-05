# PLAN: LINE OA CS MCP server

Status: **v3** (re-scoped around support-OA case handling), 2026-11-06. Deadline: **Fri 6 Nov 2026,
23:59 ICT**. Run plan: [`docs/plan/run-plan.md`](plan/run-plan.md).

What changed in v3 (the details are in the sections below):
- The product is framed as a CS assistant for a **support OA**. The graded core (5 tools + auth +
  attachments) still comes first; a **case layer** sits on top of it as a "should" (§1, §5b).
- Every chat and profile result carries **`webUrl`**, a deep link into chat.line.biz so a human can take over (§5).
- **PII rules** (§6b): personal data stays in the server, masked by default in tool output.
- A **live OA is available, read-only**, plus a new free test OA for sending (§2 A1, A11).
- Research requests applied to §6a: markAsRead is PUT, the pagination cursor is unconfirmed, and folder filters
  are client-side.
- §8 is now an ordered list of stages up to the deadline. §10 lists the support-OA flows.

Source of truth for the task: [`docs/ASSIGNMENT.md`](ASSIGNMENT.md).
Thai translation: [`docs/PLAN_thai.md`](PLAN_thai.md) · Thai version with diagrams: [`docs/PLAN.html`](PLAN.html).
This file wins when the Thai copies differ.

---

## 1. What we are building

An MCP server that lets an automation agent work inside **LINE OA Manager's chat** (chat.line.biz) the way a human
CS person does. It is not the Messaging API bot channel. The server needs 5 required tools:

| # | Required action | Tool |
|---|---|---|
| 1 | See the list of ongoing chats | `list_chats` |
| 2 | Read a specific chat | `read_chat` |
| 3 | Search messages across all chats | `search_messages` |
| 4 | Send a message to a chat | `send_message` |
| 5 | See a user's profile details | `get_user_profile` |

The extra tool `get_attachment` exists for the attachment requirement (section 7).

**Product framing (v3).** A business may run more than one OA, for example a product OA where customers use the
service through chat, and a support OA where they report problems. The support OA's rich
menu has 4 buttons (onboarding / feature request / report problem / how-to), and a bot template asks for email,
problem and screenshots. We build for the support OA's CS team:

| Level | What | Why |
|---|---|---|
| Must | 5 tools + `get_attachment` + `webUrl`, auth, attachments, on a mock that imitates a support OA | Graded directly |
| Should | Case layer: `list_cases`, `open_case`, `tag_case`, `set_case_status`, `get_person`, `case_stats` (§5b) | Shows real CS understanding; small, because the AI client does all the AI work |
| Could | Product-OA usage context for a person (§5b), link-candidate tool, unanswered-after-resolve alert, Telegram demo via Claude Code Channels | Nice for the interview story |
| README only | Real product-OA linking in production, a shared team server, realtime (SSE) | Limitations / with more time |

**What the user sees.** There is no web app. The CS person (or the business's own automation agent) talks to an AI client
such as Claude Desktop or Claude Code. The client calls our tools, and the client's own permission prompt appears
before `send_message`. The CS person logs in once per shift with `npm run login`. The only web page is the mock's
small console, which shows what the agent did.

What we're graded on, and where this plan covers it:
- Functionality: all 5 tools must work. Stages 2–4 do this against a mock, stage 5 against the real console.
- Repo organization and code quality: sections 4 and 9.
- High-level understanding: sections 4, 6 and 7. The README reuses them.
- Authentication: section 6.
- Attachments: section 7.
- Process: commit as we go (section 8), and keep `.claude/`, `CLAUDE.md` and `AGENTS.md` in the repo (section 9).

---

## 2. Assumptions (each one goes into the README)

| id | Assumption | Why / what changes if wrong |
|---|---|---|
| A1 | The **mock LINE OA** is the graded path: graders can run it without a LINE account. We now also have a live OA (read-only, see A11) for HAR evidence and a free test OA for sending, so the `WebClient` can be verified for real. | If the WebClient isn't finished, the README says so and the mock path still works. |
| A2 | One MCP server process = one CS staff member's session. That session may reach several OAs (LINE calls them "bots"), and the allowed OAs are set in config. | Multi-staff support would need a session per staff member and an HTTP transport. |
| A3 | "Ongoing chat" = a chat that is not marked done/resolved, sorted by last message time, newest first. Filters: `unread`, `all`. | This changes the filter only, not the architecture. |
| A4 | Search is a keyword/substring match on message text, customer display name and attachment file name. It must work for **Thai**, which has no spaces between words. The open-source clients we found have **no message-text search endpoint** (only `/api/v2/bots/{botId}/contacts?query=`), so search runs on a **local index** that we fill from chat history. | If a HAR capture shows a console search call, `WebClient.search` uses it and the index becomes a cache. |
| A5 | The agent runs locally next to the CS person (stdio transport). | A remote deployment would need Streamable HTTP plus real auth on the MCP side. |
| A6 | Messages the agent sends show up as sent by the logged-in staff member, so the CS person is accountable for them. Every send is audit-logged. | n/a |
| A7 | In the real console, marking a chat as read is a **separate call** (`PUT /api/v2/bots/{botId}/chats/{chatId}/markAsRead`; only PUT is evidenced). Fetching messages does not mark anything as read. `read_chat` never marks read. A separate `markRead` flag stays off by default. | If the CS team wants read state to follow what the agent has read, we turn it on. |
| A8 | We link a support-OA reporter to the **product OA** because CS needs usage context: account status, connected integrations, recent activity, recent error replies. | Without the link, CS has to ask the customer for what the product already knows. |
| A9 | One chat holds **many cases**. A rich-menu button message opens a new case, typed by the button. The AI may also open a case when the customer starts a new topic without a button. | If CS prefers one case per chat, `open_case` is simply not used. |
| A10 | Linking a person across OAs uses the email the customer typed, matched inside the server, **and a CS confirmation**. An event in the product OA that confirms the email counts as a verified email. Automatic linking by LINE userId needs both OAs under one provider, which we haven't checked. | If the provider is shared, userId linking can be added later. |
| A11 | The live OA holds real people's chats. It is **read-only**: no sends, no Follow up or Resolve, and no opening of unread chats (opening one marks it read). HAR files stay in `~/lineoa-har/`, outside the repo. Send and upload are tested on the test OA only. | n/a |
| A12 | The AI client does the AI work (tag suggestions, summaries, drafts). The server holds no LLM key and makes no LLM calls. | A server-side LLM would need a DPA and a key in config. |

---

## 3. Stack and the reason for each choice

| Layer | Choice | Why |
|---|---|---|
| Language/runtime | **TypeScript on Node 22 LTS** | The official MCP SDK is TS-first, Playwright is native to it, and one language covers the server, the mock and the tests. Strict types document the data model. |
| MCP | `@modelcontextprotocol/sdk` + `zod`, **major version pinned** | Official SDK. Pinned because whatsapp-mcp broke when `mcp` 2.x dropped `fastmcp` (research round 2). Zod schemas become the tool input schemas and also validate the data. Tools carry `readOnlyHint` / `openWorldHint` annotations. |
| Transport | stdio (default) | Works with Claude Code, Claude Desktop and MCP Inspector without any network auth. Streamable HTTP is in "with more time". |
| Mock LINE OA | **Hono** + `@hono/node-server` | A small, fast HTTP server. It copies the **real internal API paths and field names** of chat.line.biz (section 6a): the `__Host-chat-ses` cookie, `X-XSRF-TOKEN`, `next`/`backward` cursors, and `chat-content`-style URLs that need the cookie plus a tiny HTML console, so a human can watch what the agent sends. It **binds to `127.0.0.1` only**: whatsapp-mcp's bridge exposes an unauthenticated REST API on every interface, and that's a mistake to avoid. |
| Real-console access | `fetch` (undici) with the captured session cookies; **Playwright** only for login and endpoint discovery | Replaying HTTP calls is fast and deterministic. Driving the browser for every action is slow and brittle, so we keep it as a fallback only. |
| Local index (search fallback, attachment cache) | `better-sqlite3`, FTS5 with the **`trigram` tokenizer** | Thai has no word boundaries. `unicode61` would treat a whole Thai sentence as one token, while `trigram` handles substring search in any script. Needed for search, because no message-search endpoint is known (A4). It is filled by syncing `list_chats` + history (polling; the SSE stream is in "with more time"). The first fill of a chat uses `GET /download/{botId}/{chatId}/messages.csv` (found in propertyos-line-importer): one request instead of paging. |
| Images | `sharp` | Shrinks images before they go back to the LLM as image content: smaller, cheaper and within block limits. |
| Tests | **vitest** + the SDK's `InMemoryTransport` | Full end-to-end runs: a real MCP client calls the real server, which hits the mock server. No network and no LINE account needed. |
| Lint/format | **Biome** | One fast tool, little config. |
| Package manager | npm | No extra install step for graders. |

Rejected: Python/FastMCP (fine too, but it splits the stack from Playwright tooling), Puppeteer (Playwright's
storageState and codegen/HAR are better for this job), and the official Messaging API / `line-bot-mcp-server`
(different purpose: it can't list or read old chats or search, and it is for bot channels).

---

## 4. Architecture

```
 Agent (Claude Code / Desktop / any MCP client)
        │ stdio (JSON-RPC)
        ▼
 ┌───────────────────────── lineoa-mcp ─────────────────────────┐
 │ server.ts      registers tools, maps errors to MCP errors     │
 │ tools/*        one file per tool: zod schema → client call →  │
 │                normalized output                              │
 │ domain/        Chat · Message · Attachment · UserProfile ·    │
 │                Cursor · typed errors (AUTH_EXPIRED, ...)      │
 │ client/        LineOAClient interface  ◄── the seam           │
 │   ├─ mock/     MockClient   → HTTP → mock-server (Hono)       │
 │   └─ web/      WebClient    → HTTP → chat.line.biz internal   │
 │                API (cookies + CSRF)                           │
 │ auth/          SessionStore (0600 file) · login CLI           │
 │                (Playwright, human logs in) · CSRF refresh     │
 │ attachments/   download → size cap → magic-byte MIME → cache  │
 │                → image downscale; outbox allowlist for upload │
 │ audit/         append-only JSONL of every send                │
 └───────────────────────────────────────────────────────────────┘
```

The key design decision is the single `LineOAClient` interface. The tools never know which backend they're talking
to. The mock and the real console share one contract test suite, so "works on mock" is close to "works on real".

### Repo layout (target)

```
src/
  server.ts            index.ts (bin)      config.ts
  domain/              types.ts  errors.ts  cursor.ts
  client/              LineOAClient.ts  mock/  web/
  tools/               list-chats.ts read-chat.ts search-messages.ts
                       send-message.ts get-user-profile.ts get-attachment.ts
  auth/                session-store.ts  login-cli.ts  csrf.ts
  attachments/         fetch.ts  mime.ts  image.ts  outbox.ts
  cases/               store.ts  case-opener.ts  tools (v3 "should")
  audit/               audit-log.ts
mock-server/           app.ts  seed/ (support-OA-like: rich menu, bot templates, flex cards, screenshots, PDF;
                       2 OAs with one shared person, anonymized)  public/ (mini console, webUrl target)
test/                  e2e/ (InMemoryTransport)  contract/ (runs on any LineOAClient)  unit/
docs/                  ASSIGNMENT.md  PLAN*.md/html (shared spec)  plan/  dev/ (+ dev/plans)  research/  ← one folder per lane
.claude/               plan-kit skills, agents, rules, profile, agent-strategy/
CLAUDE.md  AGENTS.md  README.md
```

### Domain model (inspired by Chatwoot's conversation/message/attachment/contact model)

- `Chat { id, botId, user: {id, displayName, pictureUrl}, status: ongoing|done, unreadCount, lastMessage: {preview, at, from}, assignee?, tags[] }`
- `Message { id, chatId, from: customer|staff|bot|system, senderName, sentAt, type: text|image|file|video|audio|sticker|location|unknown, text?, attachments: AttachmentRef[] }`
- `AttachmentRef { id, kind, mime?, sizeBytes?, fileName?, width?, height?, expiresAt? }`. Metadata only, never bytes.
- `UserProfile { id, displayName, pictureUrl, statusMessage?, language?, followedAt?, tags[], note?, chatId }`
- Every `Chat` and `UserProfile` carries `webUrl`: `https://chat.line.biz/{botId}/chat/{chatId}` on the real
  console (pattern seen in the live console and in the researched repos), or the mock console's URL.
- Case layer (v3, local store): `Person { personRef, maskedEmail?, identities: [{oa, chatId, userId}] }` ·
  `Case { caseId, chatId, personRef, type, status: open|waiting|resolve_suggested|resolved, openedAt,
  openedBy: rich_menu|ai|cs, fromMessageId, summary?, tags: CaseTag[] }` ·
  `CaseTag { name, group: type|area|severity, source: ai|cs, confirmed }`.
- Cursors are opaque (base64 JSON) so that each backend can use its own pagination.
- From Chatwoot: `AttachmentRef.kind` uses Chatwoot's `file_type` names (`image | audio | video | file | location | fallback`).
  A message can be `system`/activity (assignment, notes) as well as chat text. Message types the agent can't use become
  explicit placeholders, never dropped (respond.io and SleekFlow do the same).

---

## 5. Tool contracts (v3)

| Tool | Input | Output | Notes |
|---|---|---|---|
| `list_chats` | `filter?: ongoing\|unread\|all` (default `ongoing`), `limit≤50`, `cursor?`, `botId?` | `chats[]` (each with `webUrl`), `nextCursor?` | read-only. The console's folder filters other than `ALL` are unknown, so `unread`/`ongoing` filter on `read`/`done` client-side until the HAR says otherwise. |
| `read_chat` | `chatId`, `limit≤100`, `before?` cursor | `messages[]` oldest→newest, `prevCursor?`, `user` summary, `webUrl` | read-only. Attachments come back as refs. Customer text is labelled as untrusted content. |
| `search_messages` | `query`, `chatId?`, `from?`, `since?`, `until?`, `limit≤50`, `cursor?` | `hits[] {chatId, messageId, snippet, sentAt, senderName, contextBefore[], contextAfter[]}`, `indexedAt` | read-only. Works with Thai substrings. |
| `send_message` | `chatId`, `text?`, `attachmentPaths?[]` (must be inside the outbox dir), `dryRun?` | `{messageId, sentAt}` or a preview when `dryRun` is set | the only tool that writes. `destructiveHint`. Only registered when `LINEOA_ALLOW_SEND=true`. Checked against the optional chat allowlist. Audit-logged. Rejects empty sends and unknown chats. **Idempotent:** every call carries a `sendId`. If the result is uncertain (timeout or network error), the server never resends automatically; it looks the `sendId` up in the chat history and returns `SEND_UNCERTAIN` if it isn't there (pattern from omnichat-bridge). |
| `get_user_profile` | `userId` or `chatId` | `UserProfile` (+ `notes`, `tags`, assignee from `owners`, `webUrl`) | read-only. Emails and phone numbers are masked (§6b). |
| `get_attachment` | `chatId`, `messageId`, `attachmentId?`, `mode?: inline\|save` | image → MCP `image` content (downscaled) + local path; other files → saved path + metadata (+ text preview for txt/csv) | read-only |
| (extra) `auth_status` | none | logged-in staff, reachable OAs, session age | lets the agent check auth before a long run |

Bot flex cards (for example the support bot's templates) come back as `type: "flex"` with their `altText` and a
flattened text, never dropped.

Errors are typed and actionable: `AUTH_EXPIRED` ("ask the CS person to run `npm run login`"), `NOT_FOUND`,
`RATE_LIMITED` (with `retryAfter`), `ATTACHMENT_TOO_LARGE`, `ATTACHMENT_EXPIRED`, `PATH_NOT_ALLOWED`, `SEND_UNCERTAIN`.

### 5b. Case layer (v3, "should"; built after the core is green)

Stored in the same local SQLite file as the search index (`~/.local/share/lineoa-mcp/store.db`). It only reads the
LINE side; nothing here writes to LINE.

| Tool | Input | Output | Notes |
|---|---|---|---|
| `list_cases` | `status?`, `type?`, `tag?`, `since?`, `personRef?`, `limit≤50`, `cursor?` | `cases[]` (with `webUrl`) | read-only. Syncs new messages first; rich-menu messages open cases automatically (A9). |
| `open_case` | `chatId`, `fromMessageId`, `type` | `Case` | The AI splits a new topic that came without a button. Idempotent on `fromMessageId`. |
| `tag_case` | `caseId`, `add?[]`, `remove?[]` | `Case` | AI tags are stored as `source: ai, confirmed: false`. They become confirmed when CS asks for the tag. |
| `set_case_status` | `caseId`, `status`, `summary?`, `confirmedByStaff?` | `Case` | `resolved` needs `confirmedByStaff: true`, which the agent may pass only after the human says so. Without it, the case goes to `resolve_suggested`. Audit-logged. |
| `get_person` | `personRef` or `chatId` | `Person` + `cases[]` + `linkCandidates[]` (+ product-OA `usage[]` if linked, a "could") | Masked email. A link needs CS confirmation (A10). |
| `case_stats` | `from`, `to`, `groupBy: type\|area\|severity\|status` | counts, median first-response time, open count | SQL only. Period summaries come from the stored case `summary` fields; the AI client writes the prose. |

First tag taxonomy:
- type: `onboarding`, `feature-request`, `report-problem`, `how-to`
- area: `billing`, `account`, `integration`, `login`, `line-bot`, `other`
- severity: `low`, `medium`, `high`

Product-OA usage events ("could"): a rule-based parser turns the product OA's bot templates into events (`account_status`,
`integration_connected`, `sync_run`, `usage_left`, `recurring_notice`, `bot_error`). It runs only for
linked persons, over about 14 days before a case opened. Amounts are hidden unless CS asks to reveal them. Daily
repeated `recurring_notice` events are a proactive alert candidate.

---

## 6. Authentication: how the server acts as the CS person

**The rule: a human logs in, and the server only ever holds a session, never a password.**

1. **`npm run login`** (Playwright, headed browser). Opens a real Chromium window at the LINE OA Manager login page.
   The CS person logs in themselves: LINE Business ID, email or QR, plus any 2FA or captcha. This keeps us out of
   captcha and bot-detection trouble, and means we never store credentials.
2. When chat.line.biz has loaded, the CLI captures the **session cookies** (Playwright `storageState`:
   `__Host-chat-ses`, `chat-device-group` and `XSRF-TOKEN` on chat.line.biz, plus `session` on account.line.biz)
   and checks the session with `GET /api/v1/me`. It lists the OAs (bot ids) and role this staff member can reach
   (`GET /api/v1/bots`). The server refuses to start if `me` doesn't match `LINEOA_EXPECTED_ACCOUNT` (the identity
   guard, borrowed from telegram-mcp).
3. **SessionStore** writes the session to `~/.config/lineoa-mcp/session.json` with mode `0600`. The file lives
   outside the repo and is gitignored. Secrets never go to logs or tool output. With more time: the macOS Keychain or
   libsecret.
4. **WebClient** sends the cookies on each request, refreshes the CSRF header, and limits its own rate. A
   401 with `not_login` → `AUTH_EXPIRED`. A 403 → refresh the CSRF token once, then `FORBIDDEN` (role). linebiz notes that
   sessions **usually last less than a day** and are not renewed automatically, so the README tells the CS person to
   log in once per shift. We keep any `Set-Cookie` the server rotates. **No silent auto re-login**: the agent is told to ask the human.
   Cookies are only ever attached to an allowlist of hosts (`chat.line.biz`, `chat-content.line.biz`), and secret headers are
   redacted in every log line (both from linebiz). A **lock file** next to `session.json` stops two server processes
   from using the same session (from telegram-mcp and LINELib). Login is never prompted over stdio.
5. **Scoping**: only the bot ids in config are reachable, even if the staff member has access to more. The staff
   member's own role (Admin / Operator / chat-only) still applies on LINE's side.
6. **The mock implements the same flow**: a login form, an httpOnly session cookie, a CSRF header, session expiry and
   auth-protected attachment URLs. The whole auth path can be demoed and tested without a LINE account.

Alternatives we considered (README "trade-offs"):

| Option | Verdict |
|---|---|
| Store email/password and log in headless automatically (`POST account.line.biz/api/login/email` + email code, the way LINELib does it) | Rejected: we'd have to hold a password, reCAPTCHA and the email code break it, and it is the riskiest option for bot detection and ToS. |
| Pasting the cookie by hand from DevTools | Kept as a documented fallback (`npm run login -- --import-cookie`). |
| Driving the browser UI for every action | Rejected as the main path (slow, brittle selectors). Possible fallback for a single endpoint. |
| Official Messaging API | Rejected: wrong purpose. It can't read existing chat history or search, and turning on webhooks changes how the OA behaves. |

---

## 6a. Known chat.line.biz internal endpoints

This map comes from two open-source clients: [PrakritManStudio/linebiz](https://github.com/PrakritManStudio/linebiz)
(TypeScript, read-only, well typed) and [Madoa5561/LINELib](https://github.com/Madoa5561/LINELib) (Python, the most
complete: send, upload and SSE). It is **unverified until our own HAR capture** (live OA read-only + test OA).

| Tool | Endpoint (base `https://chat.line.biz`) |
|---|---|
| auth check / `auth_status` | `GET /api/v1/me`, `GET /api/v1/bots?noFilter=true&limit=1000` |
| CSRF | `GET /api/v1/csrfToken` → `{token}`. Sent as `X-XSRF-TOKEN`. On a 403, refresh the token and retry once. |
| `list_chats` | `GET /api/v2/bots/{botId}/chats?folderType=ALL&limit=25&next=` → `chatId, profile{userId,name,iconHash}, read, done, assignedBizId, tagIds, latestEvent, lastReceivedAt` |
| `read_chat` | `GET /api/v3/bots/{botId}/chats/{chatId}/messages?backward=<cursor>`. Three repos (linebiz, omnichat-bridge, the downloader) use `backward`; LINELib uses `before`/`after`. **Confirm in the HAR.** |
| `search_messages` | No known endpoint. Local FTS5 index. Contacts search is `GET /api/v2/bots/{botId}/contacts?query=`. |
| `send_message` | `POST /api/v1/bots/{botId}/chats/{chatId}/messages/send` with `{type:"text", text, sendId:"{chatId}_{ms}_{rand}"}` |
| send files | `POST /api/v1/bots/{botId}/messages/{chatId}/uploadFile` (multipart `file`) → `contentMessageToken` → `POST .../chats/{chatId}/messages/bulkSendFiles` `{items:[{sendId, contentMessageToken}]}` |
| `get_user_profile` | `GET /api/v1/bots/{botId}/chats/{chatId}` + the chat's `profile` + `/notes` + `/tags` |
| `get_attachment` | `GET https://chat-content.line.biz/bot/{botId}/{contentHash}` (`/preview` = thumbnail). Uses the **session cookie, not a signed URL**. The message carries `expired` and `expiredAt`. |
| mark read (not used by `read_chat`) | `PUT /api/v2/bots/{botId}/chats/{chatId}/markAsRead`. Only PUT is evidenced (LINELib). |
| deep link (`webUrl`) | `https://chat.line.biz/{botId}/chat/{chatId}`. Confirmed in the live console; the chatId looks like a `U…` userId. |
| realtime (later) | `POST /api/v1/bots/{botId}/streamingApiToken` → SSE `https://chat-streaming-api.line.biz/api/v2/sse?token=…` |

Notes:
- Chat/user IDs here are **not** Messaging API userIds. This is one more reason the Messaging API can't be used.
- linebiz sends `x-oa-chat-client-version`.
- Fixtures for every endpoint above are in `test/research/line-api-shapes/` (branch `research`). The mock returns their
  `response.body` as is.
- HAR checklist adds: search box call, Tags, Standard replies, Contact list, Follow up / Resolve (read the request
  shape only; never press them on the live OA), and whether `bulkSendFiles` accepts a PDF (test OA).
- No rate limits are documented, so honour 429 + `Retry-After`.

### 6b. Personal data (PDPA) rules (v3)

- Personal data stays in the server. Tool output uses `personRef` and masked values: emails (`s***@gmail.com`) and
  phone numbers are masked in message text and profiles by default. A `reveal: true` argument shows them, and every
  reveal is audit-logged.
- Email matching for linking happens inside the server; the real email never goes to the LLM.
- Images are never sent to the model unless `get_attachment` is called. Screenshots can contain other people's data.
- Amounts from the product OA are hidden by default (§5b).
- Retention: a config value (default 180 days, matching LINE's free-plan history), plus `npm run forget -- <personRef>`
  to delete one person everywhere. Both go in the README with the legal basis (contract / legitimate interest) and
  the note that an LLM provider is a processor that needs a DPA.

---

## 7. Attachments

Principle: **metadata in the chat, bytes only on request, and always size-capped and type-checked.**

Reading:
- `read_chat` returns `AttachmentRef`s only, which keeps the agent's context small. A chat full of photos stays cheap.
- `get_attachment` downloads from `chat-content.line.biz/bot/{botId}/{contentHash}` with the session cookie (not a signed URL) and streams to
  `~/.cache/lineoa-mcp/attachments/<sha256>`. Each download goes to a temp file and is renamed into place only when
  it is complete, so a partial file is never visible (atomic, from telegram-mcp). Download cap: 32 MiB by default.
- **MIME from magic bytes**, not from the extension or what the server says. File names are cleaned (path traversal,
  control characters).
- **Images** (receipts, product photos): resized to at most 1568 px on the long edge. If the result is under
  about 1 MB it is returned inline as MCP `image` content so a vision model can read it (the threshold is
  respond.io's); otherwise it is saved and returned as a `resource_link`. The local path is returned in both cases.
- **Other files** (PDF, docx, xlsx, zip): saved locally. The tool returns the path + metadata (+ a text preview for
  plain text and CSV). Exploring PDF text extraction is in "with more time".
- Video, audio, sticker and location messages come back as typed placeholders with metadata. Video and audio are
  downloadable but never inlined.
- Expired content: the message already carries `expired` / `expiredAt`. We check it **before** downloading → `ATTACHMENT_EXPIRED`, never a crash.
- Stickers come from the public CDN `stickershop.line-scdn.net/...`, so they need no auth.

Sending:
- `send_message.attachmentPaths` must resolve **inside an allowlisted outbox directory** (`~/lineoa-outbox` by
  default). This stops a prompt-injected agent from sending `~/.ssh/id_rsa` to a customer.
- Type and size limits are checked before upload: images up to 20 MiB, video and files up to 32 MiB (omnichat-bridge's limits,
  to confirm in the HAR). Uploads send the **real MIME type**: LINELib always sends `application/octet-stream`, which
  we don't copy. There is an extension allowlist per tool. The flow is `uploadFile` → `contentMessageToken` → `bulkSendFiles`.

Safety: customer messages and file contents are untrusted input. Tool output labels them as such, and the README
covers prompt injection.

---

## 8. Phases, order and commits

Commit after every meaningful step (one concern per commit, conventional prefixes). Never squash.
The run plan with prompts for each lane: [`docs/plan/run-plan.md`](plan/run-plan.md).
The only fixed time is the deadline, **Fri 6 Nov 2026 23:59 ICT**. Stages run in this order; lanes work in parallel.

| Stage | Work | Lane |
|---|---|---|
| 0 | PLAN v3, merged into `dev` and `research`; dev unpaused (done) | plan |
| 0 | Create the test OA; capture HAR on the live OA (read-only) and on the test OA (with sends) | user |
| 1 | Scaffold TS + Biome + vitest + CI; install the plan kit | dev |
| 2 | Domain types + `LineOAClient` → mock server from fixtures (support-OA-like seed, 2 OAs, one shared person) ‖ auth (SessionStore, login CLI against the mock) | dev |
| 2 | HAR → redacted endpoint map, diff vs fixtures | research |
| 3 | The 6 core tools + `webUrl` + send gating | dev |
| 4 | e2e tests (MCP client → server → mock) + fixes from the HAR diff | dev |
| ✓ | **Checkpoint:** merge to `dev`, CI green, demo on the mock | all |
| 5 | `WebClient` on the real console (test OA first) + contract tests | dev |
| 6 | Case layer (§5b) | dev |
| 7 | README (setup, architecture, auth, attachments, PII, limitations) + demo GIF | dev |
| 8 | Could: Telegram demo through Claude Code Channels, product-OA usage events | dev |
| 9 | Release `dev` → `main`, tag `v0.1.0`, CHANGELOG | dev |
| 10 | Optional bonus video (separate public repo) | — |
| — | Push to a public repo and reply to the email before the deadline | user |

Cut order if time runs out: bonus → Telegram → product-OA usage → case layer → WebClient. The mock path must always stay
green. Whatever is cut is listed in the README with the reason.

---

## 9. How work is split across agents (plan kit: github.com/Jamamaboy/claude-skill)

- **Orchestrator** (main session, Opus): owns this plan, writes the **domain types + `LineOAClient` interface**
  itself, because every slice depends on them. It also integrates, makes small fixes and does the final acceptance
  walkthrough.
- `/write-plan` → one HTML plan page per phase in `docs/dev/plans/`, each checked by `plan-reviewer` and
  `plan-risk-auditor`. Because of the deadline, **one review round only**.
- `/implement-plan` batches `coder` agents (Sonnet) **with no file overlap**:
  - Wave 1 (after the contract exists): `mock-server/**` ‖ `src/tools/** + src/client/mock/**` ‖ `src/auth/**`
  - Wave 2: `src/attachments/**` ‖ `src/client/web/**` (after the HAR capture)
  - Wave 3: `src/cases/**` (store, rich-menu case opener, case tools) ‖ README
- Reviewers: `code-reviewer` on every diff. `security-reviewer` is triggered by `src/auth/**`,
  `src/attachments/**`, `src/client/web/**` and `src/audit/**`. `uxui-reviewer` is off (the mock console is
  not graded UI).
- Every run is logged in `.claude/agent-strategy/runs.md`. That log shows how we worked with coding agents.
- Profile values to fill in: plan dir `docs/dev/plans`, base branch `main`, verify = `npm run lint && npm run typecheck && npm test`,
  high-risk = `src/auth/**`, `src/attachments/outbox.ts`, `src/tools/send-message.ts`; hard rules: never commit
  sessions or cookies, never log message bodies at info level.

---

## 10. User flows (v3, support OA)

| id | Flow | Tools | Rule |
|---|---|---|---|
| F1 | Morning triage: "which chats are waiting?" | `list_chats(ongoing)` → `read_chat` ×N | `read_chat` never marks read (A7). The answer lists `webUrl` for each chat. |
| F2 | Reply to a reporter | `read_chat` → `get_user_profile` → draft → `send_message` | The AI drafts; the human approves in the client's permission prompt. `dryRun` is available. |
| F3 | A bug screenshot arrives | `read_chat` → `get_attachment(inline)` | Images reach the model only on request (§6b). |
| F4 | "Has anyone else reported the same bug?" | `search_messages` → `read_chat` | Thai substring search; results carry context and `webUrl`. |
| F5 | Session expires mid-run | any → `AUTH_EXPIRED` → the human runs `npm run login` | No silent re-login. |
| F6 | Send a how-to PDF | put the file in the outbox → `send_message(attachmentPaths)` | Outbox only; PDF send needs HAR confirmation. |
| F7 | Case triage | `list_cases(open)` → `tag_case` (AI suggests) → `set_case_status(waiting)` | AI tags stay unconfirmed until CS agrees. |
| F8 | Close a case | the human says "done" → `set_case_status(resolved, confirmedByStaff)` | A message after resolve reopens the case as `open` and flags it. |
| F9 | Weekly summary | `case_stats(groupBy=area)` + `list_cases(since)` | The AI client writes the prose from the stored summaries. |
| F10 | Who is this reporter? | `get_person` → link candidate → CS confirms | Masked email; product-OA usage only after the link (could). |
| F11 | Take over by hand | any result → open `webUrl` | The human continues in chat.line.biz. |

---

## 11. Research: similar systems to read

Full notes with sources: [`docs/research/2026-11-05-reading-list.md`](research/2026-11-05-reading-list.md). Main points:

- **No product that uses the Messaging API can import chat history from before it was connected**
  ([no8.io](https://help.no8.io/en/articles/4161502-can-i-import-history-messages-before-connecting-to-line-official-account)).
  So Thai inboxes (SleekFlow, Zaapi, Zwiz.ai, Page365) only see what arrives after they connect. Working through the
  console session is the only way to get what a CS person actually sees.
- Prior work on the internal API: [linebiz](https://github.com/PrakritManStudio/linebiz) (TS types) and
  [LINELib](https://github.com/Madoa5561/LINELib) (send/upload/SSE). These are our endpoint references (section 6a).
- MCP servers that log in as a real user and that we model the design on:
  [whatsapp-mcp](https://github.com/lharries/whatsapp-mcp) (local index, media on request),
  [slack-mcp-server](https://github.com/korotovsky/slack-mcp-server) (sending off by default plus an allowlist),
  [telegram-mcp](https://github.com/chigwell/telegram-mcp) (expected-identity guard, read-only mode, sandboxed file roots).
- The domain model follows Chatwoot. The 1 MB inline-vs-link threshold comes from respond.io. Prefixed IDs come from
  Front. Draft-before-send comes from Jib OS and OHO.

Changes to this plan that came from the research (already applied above):
1. `LINEOA_ALLOW_SEND=false` puts the server in read-only mode, and the optional `LINEOA_SEND_CHAT_ALLOWLIST`
   limits which chats can be sent to.
2. **Expected-identity guard**: `LINEOA_EXPECTED_ACCOUNT`. The server refuses to start if `/api/v1/me` doesn't match it.
3. `search_messages` returns `contextBefore` / `contextAfter` messages around each hit.
4. IDs are prefixed in tool output (`chat_…`, `user_…`, `msg_…`, `att_…`) so the model can't mix them up.

---

### Research round 2: hands-on comparison (branch `research`)

17 projects were installed or tried by 5 parallel Sonnet agents. Each was given a weighted score, and they are
compared on one page: `test/research/index.html` (branch `research`). The top scores were telegram-mcp 81,
slack-mcp-server 74, LINELib 71, Chatwoot 66 and omnichat-bridge 66. omnichat-bridge is the closest to our task (a Thai
extension that reads, sends and attaches files through chat.line.biz internals, with 995 tests). The changes above that
cite a project name came from this round.

What none of them do, and where this project differs:
- an MCP server for LINE OA acting as the CS person
- a mock backend with contract tests
- Thai search
- a sandboxed outbox for sending files

---

## 12. Risks and open questions

| Risk / question | Mitigation |
|---|---|
| Real endpoints unconfirmed | HAR from the live OA (read-only) and the test OA (stage 0); the mock stays the graded path. |
| Touching real people's chats on the live OA | A11: read-only rules, `LINEOA_ALLOW_SEND=false`, bot allowlist, HAR kept outside the repo. |
| Scope creep from the case layer and extras | Must/should/could in §1, cut order in §8. The core ships first. |
| The internal API changes or is undocumented | Endpoints live in one module plus the contract tests, so breakage shows up fast. |
| ToS / account-safety concerns with unofficial automation | Human login, low rate limits, no auto re-login, scoped OAs, audit log. Stated plainly in the README. |
| No message-search endpoint → the index is only as fresh as the last sync | `search_messages` returns `indexedAt` and syncs the recently changed chats before it searches. |
| Thai search quality | FTS5 trigram. Queries shorter than 3 characters fall back to `LIKE`. |
| Prompt injection from customer messages or files | Untrusted-content labels, outbox allowlist, `dryRun` send. |
| Deadline (Fri 23:59) | Cut order in §8. The mock path is always shippable. |
