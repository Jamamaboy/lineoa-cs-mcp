# Run plan: from PLAN v3 to a green MVP on the mock

Goal of this run: **the MCP server works end to end on the mock.** That means 5 tools + `get_attachment` + `webUrl`,
with e2e tests green. We also want real endpoint evidence from a HAR capture. The only fixed time is the deadline,
Fri 6 Nov 2026 23:59 ICT.

The Thai diagram of this run is in [`run-plan.html`](run-plan.html).

## Stages (lanes run in parallel; arrows are waits)

| Stage | plan lane | dev lane | research lane | user |
|---|---|---|---|---|
| 0 | PLAN v3 + DECISIONS, merged into `dev` and `research`, dev unpaused (**done**) | waits for v3 | waits for HAR | Create a free test OA. Capture HAR: the live OA read-only, the test OA with sends. |
| 1 | answer questions | scaffold TS + Biome + vitest + CI | start the HAR map when it lands | hand the HAR path to research |
| 2 | review | domain types → mock server from `line-api-shapes` fixtures ‖ auth (SessionStore, login CLI against the mock) | redacted endpoint map from the HAR, diff vs the fixtures | send test messages to the test OA from a phone |
| 3 | review | tools: `list_chats`, `read_chat`, `search_messages` (FTS5 trigram), `send_message` (gated), `get_user_profile`, `get_attachment`, + `webUrl` | → dev: fixture fixes and open answers | — |
| 4 | review | e2e tests (MCP client → server → mock) + fixes from the research diff | done | — |
| ✓ | **Checkpoint:** merge `feat/*` → `dev`, CI green, demo on the mock in Claude Code, every lane rewrites STATUS | | | watch the demo |

## Rules for the live OA (real people's chats)
- It is read-only: no sending, no Follow up or Resolve, and no opening unread chats (opening one marks it read).
- HAR files hold cookies and personal data. They live in `~/lineoa-har/`, outside the repo, and are never committed.
- The server runs against it with `LINEOA_ALLOW_SEND=false` and a bot-id allowlist. `read_chat` never calls markAsRead.
- Send and upload are tested only on the new test OA.

## Done at the checkpoint (checklist)
- [ ] PLAN v3 merged into `dev` and `research`; dev unpaused
- [ ] `npm test` green: e2e covers all 5 actions + `get_attachment` on the mock
- [ ] `send_message` is gated (off by default, allowlist, `dryRun`, audit log, `sendId`)
- [ ] Every chat and profile result carries `webUrl` (`chat.line.biz/{botId}/chat/{chatId}`, or the mock console URL)
- [ ] HAR captured (live OA read-only + test OA with sends) and a redacted endpoint map in `test/research/`
- [ ] Every lane's STATUS says exactly where it stopped

## Cut rule
If a stage drags, stop where things are green. The mock path must stay green, and the rest moves to the next stages.

## After the checkpoint (for reference)

| Stage | Work |
|---|---|
| 5 | `WebClient` against the real console (test OA first), contract tests |
| 6 | Case layer: `list_cases`, `open_case`, `tag_case`, `set_case_status`, `get_person`, `case_stats` |
| 7 | README (setup, architecture, auth, attachments, PII, limitations) + demo GIF |
| 8 | Optional: Telegram demo through Claude Code Channels |
| 9 | Release: `dev` → `main`, tag `v0.1.0`, CHANGELOG |
| 10 | Optional bonus video (separate repo) |
| — | Push to a public repo and reply to the email before 23:59 |

## Briefs (single-session mode)

One session runs every lane (see `CLAUDE.md`). These briefs are what the session gives the subagents for each lane.

**dev** (worktree `~/.lineoa-lanes/dev`, branches `feat/*` → `dev`):
```
Read CLAUDE.md, docs/plan/run-plan.md, docs/PLAN.md (v3) and test/research/line-api-shapes/README.md.
Run the dev column up to the checkpoint: scaffold → mock from fixtures ‖ auth → 6 tools + webUrl → e2e tests.
One concern per commit. Keep docs/dev/STATUS.md and LOG.md current.
```

**research** (worktree `~/.lineoa-lanes/research`, branch `research`), once the HAR exists:
```
The HAR files are in ~/lineoa-har/ and must never be committed. Turn them into a redacted endpoint map under
test/research/line-api-shapes/ (no real ids, names, cookies or tokens) and diff it against the existing fixtures.
Answer: pagination cursor, markAsRead method, search endpoint, flex message shape, profile/tags/notes endpoints,
bulkSendFiles with a PDF. List the fixes dev needs.
```
