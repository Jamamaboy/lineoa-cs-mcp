# Changelog

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
