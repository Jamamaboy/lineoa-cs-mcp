# Changelog

## v0.1.1 · 2026-11-06

Fixes from a fresh-clone dry run and a code review.

### Security
- Chat and message ids must be plain LINE id characters. Before this, an id like `../../OTHER/chats/X` could
  reach an OA outside `LINEOA_BOT_ALLOWLIST`.
- Session cookies go only to `line.biz` and its subdomains. Before this, any host ending in "line.biz" could
  receive them.

### Fixes
- Invalid numeric settings (for example `LINEOA_SEND_DAILY_LIMIT=abc`) are now a `CONFIG_ERROR`. Before this,
  they silently turned the limit off.
- Sending:
  - A send whose result is unknown counts toward the daily cap.
  - The echo is looked up on the event and on its message, up to 3 times.
  - Only a failed POST is reported as `SEND_UNCERTAIN`.
  - An audit-log error can no longer turn a delivered message into a reported failure.
- `search_messages`: `since` and `until` are whole days (YYYY-MM-DD, local time), and only message text
  matches.
- `list_chats` with a filter reads up to 125 chats to fill the list, and returns `scanned`. The CLI uses the
  same filters.
- A response without its expected list is now `ENDPOINT_CHANGED`.
- Attachment downloads stop at the size cap while streaming.
- `npm run setup` and `.mcp.json` work on Windows.
- Lint warnings and test-output noise are cleared. The README notes that Messaging API bot replies can be
  invisible in the console.

## v0.1.0 · 2026-11-06

First release: an MCP server that lets an AI agent work LINE OA Manager (chat.line.biz) like a support person.

### Tools
- `auth_status`: who is logged in, which OAs they can reach, whether sending is on.
- `list_chats`: chats, newest first, with filters `ongoing`, `unread`, `needs_reply` and `all`.
- `read_chat`: messages oldest to newest, with attachments as metadata. It never marks a chat read.
- `search_messages`: substring search across recent chats (works for Thai) through a local SQLite index.
- `get_user_profile`: name, friend status, staff tags, notes and the assignee.
- `get_attachment`: images are shrunk and shown to the model; other files are saved locally.
- `send_message`: only registered with `LINEOA_ALLOW_SEND=true`. It has a chat allowlist, a daily cap, `dryRun`,
  sendId-based de-duplication and an audit log.
- Every tool takes `oa` by name, @id or botId. When the OA is unclear, tools answer `CHOOSE_OA` so the agent
  asks the person.

### Auth and setup
- `npm run login`: the person logs in in Chrome, Edge, Brave, Chromium, Firefox or WebKit. Only the
  `*.line.biz` cookies are saved (mode 0600).
- `npm run setup`: adds the server to Claude Desktop and Claude Code, read-only by default.
- `lineoa` terminal command with coloured output: `status`, `chats`, `read`, `search`.

### Development
- A mock chat.line.biz with the same paths, cookie, errors and cursors. `npm run try` runs a 10-second tour.
- e2e tests drive a real MCP client against the mock. CI runs lint, typecheck and tests.
- `SessionSource` interface for new ways to log in. `CONTRIBUTING.md` explains how to extend the server.

### Verified against a live OA (read-only)
- me, bots, chats (pages of at most 25), chat detail, messages, notes, tags, owners and attachment content.
- Sending was verified on the mock only.
