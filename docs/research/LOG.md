# research log

## 2026-11-05 22:00 ICT · Lane created (bootstrapped by the plan lane)
- What: empty STATUS/LOG created as part of the lane rules in CLAUDE.md. From now on, only the research lane writes here.
- For other lanes: none.

## 2026-11-05 23:15 ICT · Round 3: chat.line.biz API shape fixtures
- What: 3 Sonnet agents (medium) extracted evidence from LINELib, omnichat-bridge and the three small extensions;
  Opus read linebiz types itself, spot-checked the agents' key file:line cites, then generated 20 JSON fixtures + a CSV
  with `test/research/tools/gen_line_api_shapes.py` and wrote `line-api-shapes/README.md`.
- Why: the dev lane builds the mock server tonight and needs the real field names and shapes.
- Commits: `85217ba research(line-api): extract chat.line.biz API evidence from 6 source repos`,
  `3719c1a research(line-api): add fake chat.line.biz fixtures for the mock`,
  `4cb1a3b docs(research): explain line-api-shapes fields, conflicts and HAR checklist`
- For other lanes: pagination `backward` vs `before/after`; markAsRead is PUT v2 (not POST); send response body
  unknown; folderType filters unknown; CSV columns mostly guessed. All ids/tokens are fake; nothing was sent to LINE.
