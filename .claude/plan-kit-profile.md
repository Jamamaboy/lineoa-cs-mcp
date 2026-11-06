# Plan kit profile

Everything project-specific that `/write-plan`, `/implement-plan`, `/report`, `/review`, `/update-skill`, and the six agents need.
This file is yours — the kit never overwrites it on update.

A field set to `none` turns that behaviour off. A line left as `TODO` means nobody has filled it in yet;
the skills will ask rather than guess.

## Where things live

```
Plan pages:     docs/dev/plans/
Changelog:      CHANGELOG.md
PR base branch: dev             # feat/* merges into dev with --no-ff locally (no PRs); dev → main only as a tagged release
Repo guide:     CLAUDE.md
Page language:  th              # pages people read — report pages, review briefs (e.g. th)
```

## Issue tracker

```
Tool:        none              # e.g. Linear MCP | GitHub Issues | Jira | none
Id prefix:   none
Gate labels: none
Team:        none
Project:     none
```

## Reports

Used by `/report` (raw note → tracker report + tasks) and `/review` (the senior's brief and decision), and by the
tracker updates inside `/write-plan` and `/implement-plan`. Section missing → `/report` writes a local file only,
`/review` reviews on GitHub, and no tracker statuses are moved.

```
Report codes:     none   # e.g. ABC-B (bug) · ABC-I (idea) — numbered -001, -002 … in the report title
Report container: parent-issue   # parent-issue (tasks are sub-issues; done column stays live) | document (static table, re-synced)
Inbox:            none   # folder where raw notes are written (e.g. an Obsidian vault's _inbox/) — or: none (chat only)
Attachments:      crop   # images showing personal data: as-is | crop (cut to the relevant area) | blur
Senior:           none   # tracker user(s) who review and decide — /implement-plan pings them at PR time
Devs:             none   # tracker users who take tasks — /review offers them when reassigning
Review in:        github # github (PR review) | tracker (the tracker's own code review, if it has one)
Versions:         none   # milestone (one project milestone per version — the project page shows % done) | none
Version names:    semver      # semver (v0.2, v1.0) | date (YYYY.MM.DD)
Releases:         changelog   # changelog (entry + git tag) | tracker (its release feature — Linear needs a release pipeline set up first)
```

## Models and passes

Who runs on what, and which optional passes are on. Defaults live in `.claude/rules/model-policy.md`;
this section wins over them.

```
Orchestrator:  opus     # the session you talk to — plans, decides, checks last, fixes small things itself
Sub-agents:    sonnet   # everything the skills spawn, built-in Explore included
Escalate:      self     # self = orchestrator fixes it | coder = another coder round
Simplify pass: on       # off = skip /simplify in /implement-plan §5
```

## Reviewers

Which review lenses `/implement-plan` may fire, and the paths that trigger each one. A lens fires only when the diff
touches one of its triggers; `off` turns it off for this repo. Keep at least one on.
Section missing (profile older than kit 1.3.0) → all three on, with the example triggers below.

```
code-reviewer:     on   # triggers: src/client/**, src/tools/**, src/index/**, src/attachments/**, src/audit/**, src/domain/**, src/config.ts, mock-server/**
security-reviewer: on   # triggers: src/auth/**, src/client/http.ts, src/client/line-client.ts, src/tools/send-message.ts, src/cli/setup.ts, scripts/**, .claude/settings.json, .mcp.json
uxui-reviewer:     on   # triggers: README.md, docs/**/*.md, docs/*.html, src/cli.ts, src/cli/ui.ts, scripts/welcome.mjs (text a person reads)
```

## Verify commands

Everything that must be green before any work is reported as done. One per line.

```
npm run check          # lint + typecheck + test
npm run build
```

## Visual check

How `/implement-plan` §4b captures changed screens for the UI review. `Dev server: none` turns screenshots off.
Section missing → screenshots only if `package.json` has a `dev` script; otherwise off.

```
Dev server:    none    # no web UI; the mock console is a dev aid only
Base URL:      none    # e.g. http://localhost:3000
Login:         none    # how to get past auth for screenshots: test account (and where its credentials live) | an already-logged-in browser | not needed
Viewports:     1280x800, 390x844
Can't capture: none    # surfaces that only render inside another app (e.g. a page embedded in a chat app) — checked by reading code
```

## Database / migrations

```
Migrations dir:   none
File naming:      none
Apply:            only after the user confirms
Read-only query:  none         # the tool used for SELECT-only checks
```

## Deploy

Used by `/implement-plan` §7–§10: the apply → merge → deploy order, and where to look after a deploy.
Section missing → assume merging the PR base branch deploys production, and ask where the logs are.

```
Deploys on merge:  none   # releases are tags on main (vX.Y.Z) with a CHANGELOG entry   # branch whose merge ships to production (e.g. main) — or: none (manual deploys)
After-deploy logs: none   # where errors show up after a deploy, e.g. Supabase MCP query_logs + Vercel MCP get_runtime_errors — or: none
```

## High-risk files

Files where a mistake is expensive. Touch them carefully; ask instead of guessing.
One per line, `path — why it is risky`.

```
src/tools/send-message.ts — the only tool that changes anything; gates, audit and never-resend live here
src/client/line-client.ts — sendText (CSRF, sendId lookup, SEND_UNCERTAIN) and SAFE_ID checks before any URL
src/client/http.ts — cookies may only go to *.line.biz; redirect to login = AUTH_EXPIRED
src/auth/** — the staff session file (0600); never print or commit it
src/cli/setup.ts — writes the user's Claude Desktop config and runs claude mcp add
.mcp.json — the live entry must stay LINEOA_ALLOW_SEND=false
```

## Reusable pieces

Check these before writing anything new. `path — what it does`.

```
src/tools/shared.ts — run()/fail() error wrapping, resolveBotId, oaInput, idInput
src/domain/errors.ts — LineOAError with typed codes
src/client/choose-oa.ts — OA name/@id/botId resolution and CHOOSE_OA
src/config.ts — loadConfig, positiveInt validation
src/mock-env.ts — LINEOA_MOCK=1 start-up for server and CLI
src/cli/ui.ts — coloured CLI output (ui.ok/warn/fail/title, cut, when)
tests/e2e/helpers.ts — in-memory MCP client against the mock on a random port
test/research/line-api-shapes/ — recorded real response shapes (fixtures)
```

## Hard rules

Things that must never happen in this repo. Each one should be here because it went wrong at least once.

```
- Never send, resolve, follow up or open unread chats on the live OA; live checks are read-only.
- Never commit sessions, cookies, tokens, .env*, HAR files, real customer names or ids, or a company name.
- One concern per commit, about 150 hand-written lines at most, each commit green on its own (npm run check).
- The lane LOG/STATUS update ships in the same commit as the work (docs/dev/LOG.md, docs/dev/STATUS.md).
- A commit touches one lane's paths only (see CLAUDE.md lanes).
- Never push, tag or release without the user's OK; stop after each feature and wait.
```

## This repo tends to forget

The checklist `plan-risk-auditor` walks item by item — the things that are easy to miss here
(translations, audit logging, a preview file that must be regenerated, a scheduled job that gets affected).

```
- README.md and docs/USAGE.th.md (Thai guide) must say the same thing.
- The mock (mock-server/app.ts) must mirror any new real endpoint or error shape.
- docs/features.html is generated: rerun npm run features before a release.
- Release: CHANGELOG entry, README Versions row, package.json version, SERVER_VERSION.
- README badges with numbers (test count) go stale.
- Windows: paths, claude.cmd, file modes do nothing on NTFS.
- Send-path changes must keep the audit log and SEND_UNCERTAIN behaviour.
```
