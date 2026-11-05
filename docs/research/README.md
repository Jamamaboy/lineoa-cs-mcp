# Research: what is here and what each file is for

The research lane studies projects similar to ours and turns what it finds into evidence the plan and dev lanes
can use. Everything lives on the `research` branch. Nothing here was tested against a real LINE account unless a
file says so.

## Read in this order

1. [`refs-comparison.html`](refs-comparison.html) is the one-page answer to "how do the references differ from ours,
   and what is good in each". It groups all references by purpose, compares the closest ones in depth, shows which
   of the 5 required actions each AI-usable one covers, and maps the features we borrow to the plan.
2. [`../../test/research/index.html`](../../test/research/index.html) is the hands-on study of 23 projects: install
   logs, screenshots, scores and diagrams for each one.
3. [`../../test/research/takeaways.html`](../../test/research/takeaways.html) is the short list of what changed in the
   plan because of that study.

## Files

| File | What it is | Made by |
|---|---|---|
| `docs/research/refs-comparison.html` | Comparison of every reference against our design: purpose groups, deep comparison of the closest ones, the 5-action coverage matrix, new references from the web search of 6 Nov, and the features we borrow | Round 5 (Opus + a Sonnet web-search agent) |
| `docs/research/2026-11-05-reading-list.md` | The first reading list: prior work on chat.line.biz, inbox products, chat MCP servers, and the 11 patterns we adopted | Round 1 (two research agents) |
| `test/research/index.html` | Generated comparison page for 23 projects. Don't edit by hand; rebuild with `python3 -I test/research/tools/build.py test/research` | Rounds 2 and 4 |
| `test/research/takeaways.html` | What we reuse from rounds 2 and 4, and what nobody else does | Rounds 2 and 4 |
| `test/research/data/<slug>.json` | One profile per project: auth, attachments, features, strengths, weaknesses, scores, sources | Research agents (schema in `tools/AGENT_BRIEF.md`) |
| `test/research/trials/<slug>.md` | The exact commands each agent ran and their real output | Research agents |
| `test/research/shots/` | Screenshots (web pages and our own runs) | Research agents |
| `test/research/line-api-shapes/` | Fake chat.line.biz API fixtures, one JSON per endpoint, that the mock server returns as is. `README.md` maps each field to its source file:line; `_evidence/` holds the raw extracts | Round 3 |
| `test/research/tools/` | `AGENT_BRIEF.md` (shared brief, schema, scoring), `build.py` (builds `index.html`), `gen_line_api_shapes.py` (builds the fixtures) | Rounds 2–3 |
| `test/research/_vendor/` | Third-party repos cloned for trials. Gitignored, never committed, safe to delete | Rounds 2–4 |
| `docs/research/STATUS.md` · `LOG.md` | Where the research lane is now; what it did and why | Every round |

## Rules
- Only fake ids, names, cookies and tokens go into the repo. HAR files from a real OA stay in `~/lineoa-har/`.
- Every claim has a source. Anything we could not confirm is marked unverified.
