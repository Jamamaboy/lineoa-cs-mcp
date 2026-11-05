# PLAN: LINE OA CS MCP server

Status: draft v1, 2026-11-05. Deadline: **Fri 6 Nov 2026, 23:59 ICT**, about 1.5 working days from now.
Source of truth for the task: [`docs/ASSIGNMENT.md`](ASSIGNMENT.md).

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

What we're graded on, and where this plan covers it:
- Functionality: all 5 tools must work. Phase 2 does this against a mock, Phase 4 against the real console.
- Repo organization and code quality: sections 4 and 9.
- High-level understanding: sections 4, 6 and 7. The README reuses them.
- Authentication: section 6.
- Attachments: section 7.
- Process: commit as we go (section 8), and keep `.claude/`, `CLAUDE.md` and `AGENTS.md` in the repo (section 9).

---

## 2. Assumptions (each one goes into the README)

| id | Assumption | Why / what changes if wrong |
|---|---|---|
| A1 | We may not have a real LINE OA with chat history. The **mock LINE OA** is the primary target that we test against and grade on. The real adapter sits behind the same interface and is marked experimental. | If we do get a real OA, Phase 4 becomes the main demo. |
| A2 | One MCP server process = one CS staff member's session. That session may reach several OAs (LINE calls them "bots"), and the allowed OAs are set in config. | Multi-staff support would need a session per staff member and an HTTP transport. |
| A3 | "Ongoing chat" = a chat that is not marked done/resolved, sorted by last message time, newest first. Filters: `unread`, `all`. | This changes the filter only, not the architecture. |
| A4 | Search is a keyword/substring match on message text, customer display name and attachment file name. It must work for **Thai**, which has no spaces between words. | Thai rules out word tokenizers. See the SQLite FTS5 `trigram` tokenizer in section 3. |
| A5 | The agent runs locally next to the CS person (stdio transport). | A remote deployment would need Streamable HTTP plus real auth on the MCP side. |
| A6 | Messages the agent sends show up as sent by the logged-in staff member, so the CS person is accountable for them. Every send is audit-logged. | n/a |
| A7 | In the real console, opening a chat may mark it as read. That is a side effect the agent has to know about. | `read_chat` documents this. We avoid the mark-read call wherever we can tell it apart. |

---

## 3. Stack and the reason for each choice

| Layer | Choice | Why |
|---|---|---|
| Language/runtime | **TypeScript on Node 22 LTS** | The official MCP SDK is TS-first, Playwright is native to it, and one language covers the server, the mock and the tests. Strict types document the data model. |
| MCP | `@modelcontextprotocol/sdk` + `zod` | Official SDK. Zod schemas become the tool input schemas and also validate the data. Tools carry `readOnlyHint` / `openWorldHint` annotations. |
| Transport | stdio (default) | Works with Claude Code, Claude Desktop and MCP Inspector without any network auth. Streamable HTTP is in "with more time". |
| Mock LINE OA | **Hono** + `@hono/node-server` | A small, fast HTTP server. It copies the internal API *shape* of chat.line.biz (cookie session, CSRF header, cursor pagination, attachment URLs that need auth) plus a tiny HTML console, so a human can watch what the agent sends. |
| Real-console access | `fetch` (undici) with the captured session cookies; **Playwright** only for login and endpoint discovery | Replaying HTTP calls is fast and deterministic. Driving the browser for every action is slow and brittle, so we keep it as a fallback only. |
| Local index (search fallback, attachment cache) | `better-sqlite3`, FTS5 with the **`trigram` tokenizer** | Thai has no word boundaries. `unicode61` would treat a whole Thai sentence as one token, while `trigram` handles substring search in any script. Only used if the real console has no usable search endpoint. |
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
  audit/               audit-log.ts
mock-server/           app.ts  seed/ (Thai + English chats, images, PDF)  public/ (mini console)
test/                  e2e/ (InMemoryTransport)  contract/ (runs on any LineOAClient)  unit/
docs/                  ASSIGNMENT.md  PLAN.md  DESIGN.md  research/  plans/ (plan-kit HTML pages)
.claude/               plan-kit skills, agents, rules, profile, agent-strategy/
CLAUDE.md  AGENTS.md  README.md
```

### Domain model (inspired by Chatwoot's conversation/message/attachment/contact model)

- `Chat { id, botId, user: {id, displayName, pictureUrl}, status: ongoing|done, unreadCount, lastMessage: {preview, at, from}, assignee?, tags[] }`
- `Message { id, chatId, from: customer|staff|bot|system, senderName, sentAt, type: text|image|file|video|audio|sticker|location|unknown, text?, attachments: AttachmentRef[] }`
- `AttachmentRef { id, kind, mime?, sizeBytes?, fileName?, width?, height?, expiresAt? }`. Metadata only, never bytes.
- `UserProfile { id, displayName, pictureUrl, statusMessage?, language?, followedAt?, tags[], note?, chatId }`
- Cursors are opaque (base64 JSON) so that each backend can use its own pagination.

---

## 5. Tool contracts (draft, to be finalized in the user-flow session)

| Tool | Input | Output | Notes |
|---|---|---|---|
| `list_chats` | `filter?: ongoing\|unread\|all` (default `ongoing`), `limit≤50`, `cursor?`, `botId?` | `chats[]`, `nextCursor?` | read-only |
| `read_chat` | `chatId`, `limit≤100`, `before?` cursor | `messages[]` oldest→newest, `prevCursor?`, `user` summary | read-only. Attachments come back as refs. Customer text is labelled as untrusted content. |
| `search_messages` | `query`, `chatId?`, `since?`, `until?`, `limit≤50`, `cursor?` | `hits[] {chatId, messageId, snippet, sentAt, senderName}` | read-only. Works with Thai substrings. |
| `send_message` | `chatId`, `text?`, `attachmentPaths?[]` (must be inside the outbox dir), `dryRun?` | `{messageId, sentAt}` or a preview when `dryRun` is set | the only tool that writes. Audit-logged. Rejects empty sends and unknown chats. |
| `get_user_profile` | `userId` or `chatId` | `UserProfile` | read-only |
| `get_attachment` | `chatId`, `messageId`, `attachmentId?`, `mode?: inline\|save` | image → MCP `image` content (downscaled) + local path; other files → saved path + metadata (+ text preview for txt/csv) | read-only |
| (extra) `auth_status` | none | logged-in staff, reachable OAs, session age | lets the agent check auth before a long run |

Errors are typed and actionable: `AUTH_EXPIRED` ("ask the CS person to run `npm run login`"), `NOT_FOUND`,
`RATE_LIMITED` (with `retryAfter`), `ATTACHMENT_TOO_LARGE`, `ATTACHMENT_EXPIRED`, `PATH_NOT_ALLOWED`.

---

## 6. Authentication: how the server acts as the CS person

**The rule: a human logs in, and the server only ever holds a session, never a password.**

1. **`npm run login`** (Playwright, headed browser). Opens a real Chromium window at the LINE OA Manager login page.
   The CS person logs in themselves: LINE Business ID, email or QR, plus any 2FA or captcha. This keeps us out of
   captcha and bot-detection trouble, and means we never store credentials.
2. When chat.line.biz has loaded, the CLI captures the **session cookies** (Playwright `storageState`) and the CSRF
   token source, and lists the OAs (bot ids) and role this staff member can reach.
3. **SessionStore** writes the session to `~/.config/lineoa-mcp/session.json` with mode `0600`. The file lives
   outside the repo and is gitignored. Secrets never go to logs or tool output. With more time: the macOS Keychain or
   libsecret.
4. **WebClient** sends the cookies on each request, refreshes the CSRF header, and limits its own rate. A
   401/403 or a redirect to login → `AUTH_EXPIRED`. **No silent auto re-login**: the agent is told to ask the human.
5. **Scoping**: only the bot ids in config are reachable, even if the staff member has access to more. The staff
   member's own role (Admin / Operator / chat-only) still applies on LINE's side.
6. **The mock implements the same flow**: a login form, an httpOnly session cookie, a CSRF header, session expiry and
   auth-protected attachment URLs. The whole auth path can be demoed and tested without a LINE account.

Alternatives we considered (README "trade-offs"):

| Option | Verdict |
|---|---|
| Store email/password and log in headless automatically | Rejected: we'd hold a password, 2FA and captcha break it, and it is the riskiest for bot detection and ToS. |
| Pasting the cookie by hand from DevTools | Kept as a documented fallback (`npm run login -- --import-cookie`). |
| Driving the browser UI for every action | Rejected as the main path (slow, brittle selectors). Possible fallback for a single endpoint. |
| Official Messaging API | Rejected: wrong purpose. It can't read existing chat history or search, and turning on webhooks changes how the OA behaves. |

---

## 7. Attachments

Principle: **metadata in the chat, bytes only on request, and always size-capped and type-checked.**

Reading:
- `read_chat` returns `AttachmentRef`s only, which keeps the agent's context small. A chat full of photos stays cheap.
- `get_attachment` downloads with the session (content URLs need auth) and streams to
  `~/.cache/lineoa-mcp/attachments/<sha256>`. Cap: 20 MB by default.
- **MIME from magic bytes**, not from the extension or what the server says. File names are cleaned (path traversal,
  control characters).
- **Images** (payment slips, product photos): resized to at most 1568 px on the long edge and returned as MCP `image`
  content, so a vision model can read them, plus the local path.
- **Other files** (PDF, docx, xlsx, zip): saved locally. The tool returns the path + metadata (+ a text preview for
  plain text and CSV). Exploring PDF text extraction is in "with more time".
- Video, audio, sticker and location messages come back as typed placeholders with metadata. Video and audio are
  downloadable but never inlined.
- Expired content (LINE only keeps media for a limited time) → `ATTACHMENT_EXPIRED`, never a crash.

Sending:
- `send_message.attachmentPaths` must resolve **inside an allowlisted outbox directory** (`~/lineoa-outbox` by
  default). This stops a prompt-injected agent from sending `~/.ssh/id_rsa` to a customer.
- Type and size limits are checked before upload. The flow is upload → send referencing the uploaded file.

Safety: customer messages and file contents are untrusted input. Tool output labels them as such, and the README
covers prompt injection.

---

## 8. Phases, timebox and commits

Commit after every meaningful step (one concern per commit, conventional prefixes). Never squash.

| Phase | When | Work | Commits (planned) |
|---|---|---|---|
| 0 Plan + research | Thu 5 Nov (now) | This plan, research notes | `docs: add plan`, `docs: add research reading list` |
| 1 Setup | Thu evening | Install plan kit (`~/claude-skill/install.sh`), fill in `.claude/plan-kit-profile.md`, add CLAUDE.md + AGENTS.md (pointer), scaffold TS + Biome + vitest | `chore: install plan kit`, `chore: scaffold ts project` |
| 2 MVP on mock | Thu night → Fri morning | Domain types + `LineOAClient` (orchestrator) → mock server + seed ‖ tools + MockClient ‖ auth module → e2e tests | `feat(domain)…`, `feat(mock)…`, `feat(tools)…`, `feat(auth)…`, `test(e2e)…` |
| 3 User-flow alignment | Fri morning | Walk through flows F1–F6 (below), adjust the contracts | `docs: user flows` |
| 4 Real console adapter | Fri midday | Playwright login, HAR capture → endpoint map → `WebClient` → contract tests (mock in CI, real by hand) | `feat(web-client)…`, `docs: endpoint map` |
| 5 Attachments hardening + README | Fri afternoon | Image path, outbox allowlist, README sections the assignment asks for | `feat(attachments)…`, `docs: readme` |
| 6 Bonus video (optional) | Only if Phase 5 is done by Fri 18:00 | 15-second "cute" teaser, built in a **separate public repo** (e.g. Remotion) | in the other repo |

Cut order if time runs out: bonus → Streamable HTTP → PDF text → WebClient. If the WebClient is unfinished, the
README documents what's missing and the auth design. The mock path must always stay green.

---

## 9. How work is split across agents (plan kit: github.com/Jamamaboy/claude-skill)

- **Orchestrator** (main session, Opus): owns this plan, writes the **domain types + `LineOAClient` interface**
  itself, because every slice depends on them. It also integrates, makes small fixes and does the final acceptance
  walkthrough.
- `/write-plan` → one HTML plan page per phase in `docs/plans/`, each checked by `plan-reviewer` and
  `plan-risk-auditor`. Because of the deadline, **one review round only**.
- `/implement-plan` batches `coder` agents (Sonnet) **with no file overlap**:
  - Wave 1 (after the contract exists): `mock-server/**` ‖ `src/tools/** + src/client/mock/**` ‖ `src/auth/**`
  - Wave 2: `src/attachments/**` ‖ `src/client/web/**` (after the HAR capture)
- Reviewers: `code-reviewer` on every diff. `security-reviewer` is triggered by `src/auth/**`,
  `src/attachments/**`, `src/client/web/**` and `src/audit/**`. `uxui-reviewer` is off (the mock console is
  not graded UI).
- Every run is logged in `.claude/agent-strategy/runs.md`. That log shows how we worked with coding agents.
- Profile values to fill in: plan dir `docs/plans`, base branch `main`, verify = `npm run lint && npm run typecheck && npm test`,
  high-risk = `src/auth/**`, `src/attachments/outbox.ts`, `src/tools/send-message.ts`; hard rules: never commit
  sessions or cookies, never log message bodies at info level.

---

## 10. User flows to agree on (Phase 3 agenda)

Acme is a payments product, so the main CS cases are likely slips, refunds and order status.

| id | Flow | Tools | Decision needed |
|---|---|---|---|
| F1 | Morning triage: "summarize unread chats" | `list_chats(unread)` → `read_chat` ×N | Is marking chats as read on open acceptable? |
| F2 | Reply to a customer | `read_chat` → `get_user_profile` → draft → `send_message` | Confirm before every send (`dryRun` first), or auto-send? |
| F3 | Customer sends a payment slip image | `read_chat` → `get_attachment(inline)` → check amount/ref → reply | Inline images by default, or only on request? |
| F4 | "Find everyone asking about order #1234 / คืนเงิน" | `search_messages` → `read_chat` | Is search scoped to one OA or to all? |
| F5 | Session expires mid-run | any → `AUTH_EXPIRED` → human runs `npm run login` | Is this acceptable UX? |
| F6 | Send a receipt PDF | put the file in the outbox → `send_message(attachmentPaths)` | Outbox location |

---

## 11. Research: similar systems to read

To fill in from the research agents (LINE OA Manager internals; omnichannel inboxes in TH and abroad; MCP servers
that log in as a real user). Starting list:

- MCP servers that log in through an unofficial user session: `lharries/whatsapp-mcp`, `korotovsky/slack-mcp-server`,
  Telegram MTProto MCPs (e.g. `chigwell/telegram-mcp`)
- Official but a different purpose: `line/line-bot-mcp-server` (Messaging API)
- Inbox data models: Chatwoot (open source), Intercom, Zendesk, Front, respond.io, Trengo
- Thai market: SleekFlow, Zwiz.ai, ChatCone, Oho Chat, Page365

---

## 12. Risks and open questions

| Risk / question | Mitigation |
|---|---|
| No real LINE OA access → can't confirm the real endpoints | The mock is the graded path. WebClient is experimental, with an endpoint map from the HAR capture. Ask Acme whether they can give us a test OA. |
| The internal API changes or is undocumented | Endpoints live in one module plus the contract tests, so breakage shows up fast. |
| ToS / account-safety concerns with unofficial automation | Human login, low rate limits, no auto re-login, scoped OAs, audit log. Stated plainly in the README. |
| Thai search quality | FTS5 trigram. Queries shorter than 3 characters fall back to `LIKE`. |
| Prompt injection from customer messages or files | Untrusted-content labels, outbox allowlist, `dryRun` send. |
| Deadline (~1.5 days) | Cut order in section 8. The mock path is always shippable. |
