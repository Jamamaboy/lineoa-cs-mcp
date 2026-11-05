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

## 2026-11-05 23:25 ICT · Round 4: six more similar systems
- What: 2 Sonnet agents (medium) profiled Intercom MCP, Zendesk, Freshchat (agent A) and Trengo, ChatCone, OHO Chat
  (agent B) per AGENT_BRIEF. Opus checked JSON/schema and the doubtful screenshots, added a round-4 table to
  `takeaways.html`, updated README and the agent count in build.py, and rebuilt `index.html` (23 projects, 54 shots).
- Why: user's round 4 list; mostly confirms the plan (LINE inboxes all use the Messaging API webhook, so no history).
- Commits: `0b3328f research: profile 6 more systems (...)`, plus this rebuild commit.
- For other lanes: LINE file sending may be receive-only on the Messaging API side (Freshchat); verify the web
  console can send PDFs (F6). Intercom's official MCP is read-mostly with one safe write (internal note).

## 2026-11-06 02:15 ICT · Round 5: references compared on one page
- What: a Sonnet agent searched the web (read-only) for new references. Opus merged its findings with the 23
  projects from rounds 2–4 into `docs/research/refs-comparison.html`, and added `docs/research/README.md` as a map
  of every research file. Findings:
  - No open-source MCP exists for LINE OA as a CS person.
  - The closest new analogue is kakao-channel-chat: cookie session, and the send tool is registered only behind a
    flag.
  - Help Scout's MCP has the best write tiers.
  - Nobody handles attachments well, and nobody has a case layer or a takeover link.
- Why: the user wanted to see how the references differ from ours, what is good in each, as an HTML page in the
  research folder, plus a markdown file that explains the documents.
- Commits: this commit (research branch, worktree now at ~/.lineoa-lanes/research).
- For other lanes: 5 proposed plan additions are under Requests → plan.
