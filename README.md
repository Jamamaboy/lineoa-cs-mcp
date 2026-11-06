# lineoa-cs

[![release](https://img.shields.io/github/v/release/Jamamaboy/lineoa-cs-mcp?label=release)](https://github.com/Jamamaboy/lineoa-cs-mcp/releases)
[![ci](https://github.com/Jamamaboy/lineoa-cs-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Jamamaboy/lineoa-cs-mcp/actions/workflows/ci.yml)
![status](https://img.shields.io/badge/status-working%20MVP-2ea44f)
![sending](https://img.shields.io/badge/sending-off%20by%20default-2da44e)

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22.13%2B-339933?logo=nodedotjs&logoColor=white)
![MCP](https://img.shields.io/badge/MCP%20SDK-1.32-6b4fbb)
![Playwright](https://img.shields.io/badge/Playwright-login-2EAD33)
![SQLite](https://img.shields.io/badge/SQLite-built--in-003B57?logo=sqlite&logoColor=white)
![Hono](https://img.shields.io/badge/Hono-mock-E36002?logo=hono&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-31%20tests-6E9F18?logo=vitest&logoColor=white)
![Claude Code](https://img.shields.io/badge/built%20with-Claude%20Code-D97757?logo=claude&logoColor=white)

<!-- INTRO: the owner writes this paragraph. Until then, the text below describes the project. -->
An MCP server that lets an AI agent work a LINE Official Account the way a customer-support person does. It
can list ongoing chats, read a chat, search messages across chats, send a message, see a customer's profile,
and open the images and files customers send.

It works through the same web console a CS person uses (LINE OA Manager, `chat.line.biz`), with that person's
own login. LINE's Messaging API is built for bots: it can't see existing chats or history, and it can't search.

**Read-only by default.** Sending is off until you turn it on.

<!-- SHOWCASE: replace with the recorded Claude session GIF (docs/assets/demo.gif). -->
![lineoa in a terminal, against the built-in mock](docs/assets/demo-cli.gif)

<p align="center"><img src="docs/assets/supports.svg" alt="What it works with: AI apps, login browsers, platforms and the LINE side" width="880"></p>

## How it flows

<p align="center"><img src="docs/assets/flow.svg" alt="Left to right: the CS person asks the AI app, which calls lineoa-cs, which reads LINE OA Manager; the AI shows a summary and a draft; after the human says OK the reply goes the same way to the customer" width="100%"></p>

## Architecture

<p align="center"><img src="docs/assets/architecture.svg" alt="High-level architecture with data flow: clients, the MCP server (tools, safety gates, LineOAClient), LINE OA Manager, login, local data and the built-in mock" width="100%"></p>

## How it is used

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'Helvetica,Arial,sans-serif','actorBkg':'#6f4ef2','actorBorder':'#5b3fd1','actorTextColor':'#ffffff','actorLineColor':'#c9bdf7','signalColor':'#3d4450','signalTextColor':'#1f2328','sequenceNumberColor':'#ffffff','noteBkgColor':'#e8f8ee','noteBorderColor':'#06c755','noteTextColor':'#1f2328'}}}%%
sequenceDiagram
  autonumber
  box rgb(243,240,255) The CS person's computer
  participant CS as CS person
  participant AI as AI app
  participant M as lineoa-cs
  end
  box rgb(232,248,238) LINE
  participant L as LINE OA Manager
  end
  CS->>M: npm run setup (once)
  CS->>L: npm run login → logs in in a browser window
  L-->>M: session cookie saved (0600)
  CS->>AI: "Which chats are waiting for a reply?"
  AI->>M: list_chats(needs_reply)
  M-->>AI: CHOOSE_OA: you can reach "Shop A", "Shop B"
  AI->>CS: Which OA?
  CS->>AI: Shop A
  AI->>M: list_chats(oa: "Shop A", needs_reply)
  M->>L: GET chats
  M-->>AI: chats + webUrl
  AI->>M: read_chat · get_attachment
  AI->>CS: summary + draft reply
  rect rgb(232,248,238)
    CS->>AI: OK, send it
    AI->>M: send_message (only if sending is on)
    M->>L: POST message (CSRF, sendId)
    M-->>AI: sent · audit-logged
  end
```

## What it unblocks

| without it | with lineoa-cs |
|---|---|
| a CS person scrolls the chat list to find who is waiting | "which chats are waiting for a reply?" → `list_chats(needs_reply)` |
| "has anyone else reported this?" means opening chats one by one | `search_messages` finds Thai or English text across recent chats, with context |
| a payment slip or bug screenshot has to be opened by hand | `get_attachment` shows the image to the AI, which can read it |
| the AI drafts a reply in one window and someone pastes it in another | `send_message` sends it as the staff member, after a dry run and the human's OK |
| the AI can't hand a chat back | every result has a `webUrl` that opens that chat in LINE OA Manager |

## Setup

You need Node 22.13 or newer, Google Chrome or Microsoft Edge, and an account that can open LINE OA Manager.

```bash
git clone https://github.com/Jamamaboy/lineoa-cs-mcp.git
cd lineoa-cs-mcp
npm install
npm run setup      # adds the server to Claude Desktop and Claude Code (read-only)
npm run login      # a browser window opens; log in to LINE yourself
```

Restart Claude Desktop, or run `claude`, and ask: *"Which LINE chats are waiting for a reply?"*

**No LINE account?** Try everything against the built-in mock:

```bash
npm run try        # a 10-second tour in the terminal, no AI app needed
claude             # in this folder: approve "lineoa-cs-mock" from .mcp.json, then ask questions
npm run mock       # browse the mock's chats at http://127.0.0.1:8787
```

<details>
<summary>settings (environment variables)</summary>

| variable | default | meaning |
|---|---|---|
| `LINEOA_ALLOW_SEND` | `false` | `true` registers `send_message`. Off means the AI can't even see the tool. |
| `LINEOA_SEND_CHAT_ALLOWLIST` | empty | only these chat ids may receive messages |
| `LINEOA_SEND_DAILY_LIMIT` | `50` | sends per day before the tool refuses |
| `LINEOA_BOT_ALLOWLIST` | empty | only these OAs are reachable |
| `LINEOA_DEFAULT_OA` | empty | OA to use when a request names none (name, @id or botId). Without it, an account with several OAs makes the AI ask which one. |
| `LINEOA_MOCK` | unset | `1` runs the built-in mock instead of LINE |
| `LINEOA_SESSION_FILE` | `~/.config/lineoa-mcp/session.json` | written by `npm run login` |
| `LINEOA_INDEX_FILE` | `~/.local/share/lineoa-mcp/index.db` | local search index |
| `LINEOA_CACHE_DIR` | `~/.cache/lineoa-mcp/attachments` | downloaded files |
| `LINEOA_MAX_ATTACHMENT_MB` | `32` | bigger files are refused |
| `LINEOA_SYNC_MAX_CHATS` / `_MESSAGES` | `50` / `200` | how much search copies per refresh |

</details>

## Tools

| tool | does | changes anything? |
|---|---|---|
| `auth_status` | who is logged in, which OAs they can reach, whether sending is on | no |
| `list_chats` | chats, newest first; filters `ongoing`, `unread`, `needs_reply`, `all` | no |
| `read_chat` | a chat's messages, oldest to newest; attachments as metadata | no, never marks read |
| `search_messages` | substring search (works for Thai) across recent chats, with context | no |
| `get_user_profile` | name, friend status, staff tags, notes, assignee | no |
| `get_attachment` | an image shown to the AI, or a file saved locally | no |
| `send_message` | sends text as the staff member; `dryRun` previews | **yes**, only if `LINEOA_ALLOW_SEND=true` |

The same features are in a terminal command: `npm run lineoa -- status | chats --needs-reply | read <chatId> | search <text>`.

**Several OAs?** Every tool takes `oa` (a name like `"Shop A"`, an `@id` or a botId). If the account reaches more
than one OA and the request doesn't say which, the tool answers `CHOOSE_OA` with the list, and the AI asks you.

## How it works

The picture is in [Architecture](#architecture). In words:

- **One client for real and mock.** The mock copies the console's paths, cookie, error bodies and cursors,
  so `LineOAClient` is the same code for both, and the e2e tests drive a real MCP client against it.
- **Calls the console's JSON API instead of clicking the page.** The endpoints came from reading six
  open-source projects. They were then checked against a live OA: me, bots, chats, chat detail, messages,
  notes, tags, owners and attachment content.
- **Search** is local because the console has no message-search endpoint. Before each search, new messages
  from recent chats are copied into SQLite (Node's built-in one, so nothing native to install). A substring
  match works for Thai, which has no spaces between words.

## Authentication

- **A person logs in; the server only holds the session.** `npm run login` opens Chrome, Edge, Brave,
  Chromium, Firefox or WebKit. The CS person logs in there themselves, including email, QR or 2FA. The server
  never sees a password.
- When the console answers `/api/v1/me`, only the `*.line.biz` cookies are saved, to a file only that user can
  read (mode 0600, outside the repo).
- Every request sends the cookie and the console's client-version header. A 401, or a redirect to the login
  page, becomes `AUTH_EXPIRED: … run npm run login`. The server never logs in again by itself.
- Sending also fetches the console's CSRF token, and refreshes it once on a 403.
- **Extensible:** the cookie comes from a `SessionSource` (environment or file today). A web login page, a
  browser extension or a team vault would each be one new source ([CONTRIBUTING.md](CONTRIBUTING.md)).

## Attachments

- `read_chat` returns metadata only: kind, file name, size, expiry. A chat full of photos stays cheap for the
  model.
- `get_attachment` downloads on request, from `chat-content.line.biz` with the session cookie, or from the
  sender's public URL with no cookie at all.
  - Expired files and files over 32 MB are refused with typed errors.
  - The type is read from the file's first bytes, not its name.
  - Files are saved by content hash: written to a temp name, renamed when complete, mode 0600.
- **Images** are rotated, shrunk to at most 1568 px, and returned as MCP image content, so a vision model can
  read a slip or a screenshot. Larger results are only saved. **Other files** (PDF, Excel, video) return a
  local path and, for plain text, a preview.

## Safety

- **Sending has five layers.**
  - The tool doesn't exist unless `LINEOA_ALLOW_SEND=true`.
  - An optional chat allowlist limits who can receive messages.
  - A daily cap stops runaway sends.
  - `dryRun` previews a message without sending it.
  - `destructiveHint` makes AI apps ask the human first.
- A send whose result is unknown is never retried. The server looks its `sendId` up in the chat and returns
  `SEND_UNCERTAIN` if it isn't there.
- Every send attempt goes to an audit log. The log stores the text's length and hash, not the text.
- Customer messages and files are marked as untrusted input in every tool description.
- Reading never marks a chat as read, so customers don't see "read" when nobody has answered.

## Limitations and trade-offs

- **Unofficial API.** chat.line.biz's internal API is undocumented and can change. Endpoints live in one
  module, a changed response becomes `ENDPOINT_CHANGED` instead of a fake success, and the mock plus e2e
  tests show quickly what broke. Driving the page with a browser is the fallback, but it is slower and more
  brittle, so it isn't built.
- **Terms of service.** Automating a staff session is a grey area. This tool uses the person's own seat, a
  human login, low request volume and an audit log. A production rollout should be cleared with LINE or
  legal first.
- **Sessions expire**, usually within a day, so the CS person logs in again.
- **Search freshness.** Search only sees what was copied: the 50 most recent chats and 200 messages each by
  default.
- **Bot replies can be invisible.** If an OA also runs a bot through the Messaging API, the bot's replies may
  not appear in the console's history. `needs_reply` then lists chats that a bot already answered. On a live
  OA this showed up as customers who had typed a code that a bot handled.
- **Not built yet:** sending files, mark as read, a hosted multi-user server, and realtime updates (the
  console has an SSE stream).
- **Live checks.** All read paths were verified against a live OA, read-only. Sending was verified on the
  mock only. A live send needs a test OA and a test chat.

## What it could grow into

These ideas came out of the research and real support-OA chats. They are planned, not built:

- **Case layer.** One chat holds many support cases. Rich-menu buttons open a case; the AI suggests tags (type,
  area, severity) and a CS person confirms; status runs open → waiting → resolved, and only a human resolves.
- **Records and analytics.** Weekly counts by area and type, first-response time, and chats that went quiet
  after "resolved".
- **One customer across OAs.** Link a reporter in the support OA to the same person in the product OA by a verified email, so CS sees
  what the customer did right before reporting. Personal data stays in the server, and the AI only sees masked
  references.
- **Images as evidence.** Collect slips and screenshots per case, with an expiry so personal data isn't kept
  forever.
- **Reach the agent from chat apps**, for example a supervisor approving a send from Telegram through Claude
  Code Channels.

## How this was built

This was built with coding agents (Claude Code), working in three lanes: plan, research and dev. The process
is in the repo:

- The plan is in [`docs/PLAN.md`](docs/PLAN.md), with a Thai version with diagrams in
  [`docs/PLAN.html`](docs/PLAN.html).
- The research compared 34 similar projects:
  [`docs/research/refs-comparison.html`](docs/research/refs-comparison.html).
- Each lane keeps a log in `docs/<lane>/LOG.md`.
- Each feature is a branch of small commits, each one green on its own.

[`docs/README.md`](docs/README.md) maps every document. A Thai user guide is in [`docs/USAGE.th.md`](docs/USAGE.th.md).

## Versions

| version | date | highlights |
|---|---|---|
| [v0.1.1](https://github.com/Jamamaboy/lineoa-cs-mcp/releases/tag/v0.1.1) | 2026-11-06 | security and reliability fixes from a code review |
| [v0.1.0](https://github.com/Jamamaboy/lineoa-cs-mcp/releases/tag/v0.1.0) | 2026-11-06 | first release: 7 tools, login, CLI, setup, mock |

Details are in [CHANGELOG.md](CHANGELOG.md).

## Develop

```bash
npm run check      # lint + typecheck + tests (CI runs the same)
npm run try        # tour against the mock
```

To add a tool, another backend or a new way to log in, see [CONTRIBUTING.md](CONTRIBUTING.md).
