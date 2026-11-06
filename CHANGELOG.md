# Changelog

## v0.2.0 · 2026-11-06

Fixes from a four-persona review (non-technical CS user, maintainer, QA, tech lead), planned with `/write-plan`
and built with `/implement-plan` (plan: `docs/dev/plans/2026-11-06-review-fixes.html`).

### For CS staff
- `docs/START.th.md`: a Thai start page for non-developers (Terminal, Node, expected output per step, Claude
  Desktop vs Code, where data goes and what is safe) and `start-mac.command`, a double-click installer.
- `npm run setup -- --mock` adds the sample-data server to Claude Desktop or Code, so you can try it without LINE.
- The terminal command reads a chat by its exact customer name (`read "นก 🌸"`); a partial name only suggests.
  Dates print as `5 Nov 2026, 12:00`.

### Fixes
- Network failures and cut-off downloads are `UPSTREAM_ERROR` naming only the host, not `UNEXPECTED`.
- 404s no longer show internal API paths; an unknown chat says to use `list_chats`.
- `search_messages` rejects impossible dates and `until` before `since` (`BAD_INPUT`) and blank queries;
  `send_message` rejects whitespace-only text.
- A bad setting prints one line (`lineoa-cs: CONFIG_ERROR: …`) instead of a stack trace; so do bad CLI options.
- LINE's responses are checked: one odd chat is skipped with a warning; a renamed key field is `ENDPOINT_CHANGED`
  instead of silently wrong values. Checked read-only against a live OA.
- A corrupt session file means "not logged in"; the session is written atomically with 0600. A bad audit-log
  line counts as a send instead of blocking all sending.
- `setup` keeps settings already in the entry, never overwrites a backup, leaves a corrupt config alone, and quotes
  Windows paths. The cookie goes to LINE only over HTTPS. The mock never touches the real index or audit log.
- The built output (`dist/`) runs the mock; CI checks Linux, macOS and Windows plus the build.

### Repo
- MIT `LICENSE`; README opens with a plain pitch and the Thai links; no leftover placeholders.
- One version source (`package.json`); `tsx` is a runtime dependency because `setup` registers it.
- The plan kit (write-plan / implement-plan) is installed under `.claude/` with this repo's profile.
- Tests: 33 → 78.

## v0.1.5 · 2026-11-06

- Claude Code greets you when it starts in this folder: the next step (install, log in, or ready), example
  questions, and where to read more. A SessionStart hook in `.claude/settings.json` runs `scripts/welcome.mjs`,
  which reads local files only.
- `npm run features` opens `docs/features.html`: what each tool does, an example chat, the diagrams, and every
  feature branch with its commits, read from git.
- The README's step-by-step diagram is now an SVG (`docs/assets/sequence.svg`). The mermaid version lost
  labels in GitHub's dark theme.

## v0.1.4 · 2026-11-06

Fixes from walking through the README on a fresh clone.

- The terminal command's hints name npm scripts (`npm run login`, `npm run lineoa -- …`). Before this they said
  `lineoa login`, which a fresh clone does not have.
- `LINEOA_MOCK=1` now also switches the terminal command to the mock. Before this, the terminal command read the
  live OA even with the setting on. One helper, `src/mock-env.ts`, now starts the mock for both.
- The mock entry in `.mcp.json` has sending on, so `send_message` can be tried in Claude without a LINE
  account. The live entry stays read-only.

## v0.1.3 · 2026-11-06

Docs only. No code changes since v0.1.1.

- README: status and stack badges, a terminal demo GIF, a "what it works with" graphic, a left-to-right flow
  diagram, an architecture diagram and a themed sequence diagram, all in one style.
- README: a Versions table, and how to read the git history one level at a time (releases, features, commits).
- There is no v0.1.2 release: that tag was created by mistake on the v0.1.1 commit and is left in place so no
  published tag moves.

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
