# test/research: studying similar systems

Open **`index.html`** in a browser to see the comparison page: diagrams, scores, screenshots and trial results, one
project at a time.

| Path | What it is |
|---|---|
| `index.html` | Generated page. Don't edit it by hand. |
| `data/<slug>.json` | Data for each project, written by a research agent (schema in `tools/AGENT_BRIEF.md`) |
| `shots/` | Screenshots. `real-run` = output we ran ourselves; the others are web pages |
| `trials/<slug>.md` | The exact commands each agent ran and their real output |
| `takeaways.html` | Orchestrator's summary of what we will reuse (embedded at the top of the page) |
| `tools/AGENT_BRIEF.md` | Shared brief for every research agent: safety rules, JSON schema, scoring rubric |
| `tools/build.py` | Turns the JSON into `index.html` and draws every diagram/chart |
| `line-api-shapes/` | Fake chat.line.biz API fixtures for the mock server, with field sources (round 3) |
| `tools/gen_line_api_shapes.py` | Generates `line-api-shapes/*.json` |
| `_vendor/` | Third-party repos cloned for trials. Gitignored, never committed |

Rebuild after changing any JSON:

```bash
python3 -I test/research/tools/build.py test/research
```

How it was made: the plan session (Opus) split the work into 5 groups and launched one Sonnet agent at medium effort
per group, in parallel. Every agent installed with `--ignore-scripts`, used only fake credentials, and sent nothing to
any real chat service. Scores 1-5 per criterion come from the agents, each with a reason. Popularity is computed from
GitHub stars. The total is a weighted 0-100.

Round 4 (2026-11-05) added 6 more (Intercom MCP, Zendesk, Freshchat, Trengo, ChatCone, OHO Chat) with 2 more Sonnet
agents under the same brief, for 23 projects in total. Round 3's API fixtures for the mock are in `line-api-shapes/`.

Note: the MVP's own tests will live elsewhere (e.g. `tests/` or `src/**/*.test.ts`), so this folder stays separate
from the test runner.
