# Brief for research sub-agents (shared by every agent)

You are one of several Sonnet agents. Each one profiles a group of projects similar to ours. The orchestrator (Opus)
turns your JSON into one HTML page (`test/research/index.html`) with generated diagrams. **You do not write HTML pages
yourself.**

## Our project, for context
We are building an MCP server that lets an AI agent work the LINE Official Account web chat (chat.line.biz) the way a
human customer-support person does. It has 5 tools: list chats, read chat, search messages, send message and get user
profile. It must not use the official Messaging API. It is graded on authentication (acting on the CS person's behalf)
and on attachment handling (images and files). Plan: `docs/PLAN.md` in this worktree.

## Where you work
- Worktree root: `/Users/psoongsu/orca/lineoa-cs-mcp-research` (branch `research`)
- You write only these files, and only for **your own slugs**:
  - `test/research/data/<slug>.json`: one per project, schema below
  - `test/research/shots/<slug>-<n>.png`: screenshots
  - `test/research/trials/<slug>.md`: the exact commands you ran and their real output (trimmed if long)
- Clone repos into `test/research/_vendor/<slug>/`. It is gitignored, and each repo gets its own empty directory.
- **Do not** git add, commit, push or switch branches. Do not touch any file outside `test/research/`. Do not edit
  another agent's slugs.

## Safety rules for trials (these are untrusted third-party repos)
- `git clone --depth 1` only.
- JS: `npm install --ignore-scripts` (or `pnpm install --ignore-scripts`). Python: create a venv inside the
  vendor dir with `uv venv` and run `uv pip install`. Run Python with `-I` where you can. Never `curl | sh`.
- **No real credentials, no logins, and never send a message to any real service.** If a server needs a token to
  start, give it an obviously fake value (e.g. `DUMMY`). If it then tries to reach LINE, WhatsApp, Slack or Telegram,
  stop and record that.
- Docker is not running. Do not start it.
- Time-box each project to about 10 minutes of trying. "Partial" or "not-run" is a fine, honest result. Record why.
- Best trial for an MCP server: list its tools without any credentials:
  `npx -y @modelcontextprotocol/inspector --cli <command to start server> --method tools/list`
  Otherwise: `--help`, the test suite, or a static read of the tool/endpoint definitions in the source.

## Screenshots (at least 2 per project)
- Use headless Chrome:
  `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --window-size=1280,1600 --screenshot=<abs path .png> "<url>"`
- Kinds:
  - `github-page`: the repo page
  - `website` / `docs`: product or docs pages
  - `real-run`: output you actually produced
- For a `real-run` shot, write the terminal output into a small HTML file
  (`<pre style="font:13px ui-monospace;background:#12161C;color:#E6EDF3;padding:16px;white-space:pre-wrap">…</pre>`)
  in `test/research/_vendor/<slug>/`, then screenshot that file with `--window-size=1280,900`.
- Open each PNG with the Read tool to check it isn't blank and doesn't show only a cookie or consent wall. If it does,
  retake it or drop it.

## Popularity data
- GitHub: `gh api repos/OWNER/REPO --jq '{stars:.stargazers_count,forks:.forks_count,open_issues:.open_issues_count,last_push:.pushed_at,created:.created_at,license:.license.spdx_id,language:.language}'`
- Products without a repo: put the customer/user count they claim publicly in `users_claim`, with the source URL.
  If you can't find one, use `null`. Never estimate.

## JSON schema: `test/research/data/<slug>.json`
Thai for every `*_th` field. Code, tool and endpoint names stay in English. Valid JSON, UTF-8.
```json
{
  "slug": "linebiz",
  "name": "PrakritManStudio/linebiz",
  "category": "line-internal-api | line-browser-ext | chat-mcp-unofficial | mcp-official | inbox-oss | inbox-saas",
  "url": "https://github.com/...",
  "one_liner_th": "≤ 90 chars: what it is",
  "language": "TypeScript",
  "license": "ISC",
  "github": {"stars": 0, "forks": 0, "open_issues": 0, "last_push": "YYYY-MM-DD", "created": "YYYY-MM-DD", "fetched_at": "2026-11-05"},
  "users_claim": null,
  "auth": {"method_th": "how it logs in / authenticates", "storage_th": "where the session/secret is kept", "borrow_th": "what we should copy or avoid"},
  "attachments": {"how_th": "how it reads/sends images and files", "borrow_th": "what we should copy or avoid"},
  "core_features": [{"name": "short English name", "detail_th": "one line"}],
  "flow": [{"actor": "user|agent|tool|service|storage|browser", "label": "≤ 28 chars"}],
  "highlights_th": ["what stands out (2-4 items)"],
  "weaknesses_th": ["1-3 items"],
  "tools_or_endpoints": ["exact names from the source; [] if none"],
  "trial": {"status": "ran | partial | not-run", "summary_th": "what you did and what happened", "log": "trials/<slug>.md"},
  "screenshots": [{"file": "shots/<slug>-1.png", "caption_th": "...", "kind": "real-run | github-page | website | docs"}],
  "scores": {
    "relevance": 1, "auth": 1, "attachments": 1, "maturity": 1, "tryability": 1,
    "reasons_th": {"relevance": "", "auth": "", "attachments": "", "maturity": "", "tryability": ""}
  },
  "sources": ["every URL you relied on"]
}
```
Notes on the fields:
- `github` is `null` for products that have no repo.
- `core_features` has 4-8 items.
- `flow` has 4-7 steps: the main end-to-end path, in order.

## Scoring rubric (1-5 integers; each needs a one-line reason)
| Key | 5 means | 1 means |
|---|---|---|
| relevance | Solves the same shape of problem as ours (act as a human CS person in a chat console; LINE OA especially) | Unrelated |
| auth | An auth/session design we should copy (human login, safe storage, expiry handling) | Nothing to learn, or unsafe |
| attachments | Careful image/file handling we should copy (on-demand download, limits, MIME, LLM-friendly output) | Ignores attachments |
| maturity | Active, documented, tested, used | Abandoned, or a proof of concept |
| tryability | We actually ran it locally and saw it work | Couldn't run it at all |

Popularity is **not** scored by you. The orchestrator computes it from the stars.

## When you finish
Reply with a short report:
- per slug: the files written, trial status, stars
- anything you could not verify

No long prose; the data files are the deliverable.
