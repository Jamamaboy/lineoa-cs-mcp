# plan log

## 2026-11-05 ~16:00 ICT · Plan v1 + research round 1
- What: wrote docs/PLAN.md (stack, architecture, auth, attachments, phases, agent split) and a reading list from 2 research agents.
- Why: the assignment wants a reasoned design for auth and attachments, and a visible process.
- Commits: `1d00fb4` plan, `f5b0a93` reading list, `e5b98cb` apply research, `0921c79` wording.
- For other lanes: the endpoint map is in PLAN §6a (from linebiz / LINELib, still unverified).

## 2026-11-05 ~18:30 ICT · Thai plan + HTML with diagrams
- What: docs/PLAN_thai.md and docs/PLAN.html (5 inline SVG diagrams).
- Commits: `001ad97`, `4725959`.
- For other lanes: none.

## 2026-11-05 ~21:30 ICT · Branches, plan v2, lanes
- What: created branches plan/research/dev with worktrees and reset local main to `b640fc7`. Applied research round 2
  to the plan (v2), merged plan + research into dev. Set up the lane rules and context protocol.
- Why: three parallel sessions need one shared, always-current picture of the work.
- Commits: `4b1cd7c` plan v2, `2704d78` merge into dev, plus this commit.
- For other lanes: read CLAUDE.md, especially the context protocol.

## 2026-11-05 23:55 ICT · Re-scope around Acme Support cases
- What: the user paused dev (expectations did not match) and described the real use case: two OAs (transactional +
  Support). They want case handling built on the Support OA: reporter identity linked by email to the Acme account
  and the main OA, AI/CS tags, stats, period summaries and a resolved tick. I analysed the user's real Support chat
  export (one chat = several cases + a broadcast; the rich menu sets the case type; the bot template gives structured
  email/problem/evidence; an unanswered follow-up came after the case was closed). A Sonnet agent researched LINE OA
  terms, permissions and PDPA. A recap artifact with diagrams and 6 decision questions is in the plan chat.
- Why: build what the CS team actually needs, while the graded core (5 tools + auth + attachments) stays first.
- Commits: this commit (status/log only; PLAN v3 waits for the user's answers).
- For other lanes: dev paused; see Requests and Heads-up in docs/plan/STATUS.md.

## 2026-11-06 00:20 ICT · Main Acme OA analysed alongside Support
- What: analysed the user's export of the main Acme OA chat (99 messages; 83 from the bot/OA, 16 from the user).
  The main OA is the product used through chat: templated bot replies, account state and broadcasts, not a CS
  conversation.
  - Its templates parse into usage events without an LLM.
  - "Google connected (email)" is an OAuth-verified identity link to the Support case.
  - A Sheets sync at 14:24 came 4 minutes before the Support report about Google Sheet currency.
  - 9 daily "payment ฿X,XXX" notices are a proactive alert candidate.
  A second artifact with a swimlane timeline and 4 more questions (7–10) is in the plan chat.
- Why: defines what context CS needs from the main OA, and how to pull it cheaply (only persons with cases, a time
  window, a rule-based parser, amounts hidden).
- Commits: this commit (log/status only).
- For other lanes: none yet. The mock will likely need 2 OAs with one shared person (pending the user's answer to Q10).

## 2026-11-06 00:45 ICT · UX target + research comparison
- What: recovered the closed plan tab's context (nothing was lost; last commit `de08a56`). Built a Thai artifact for
  the user: (1) the assignment needs no web UI; the "face" of the work is an AI client (Claude Desktop/Code) calling
  our tools, shown as a mock Acme Support conversation; (2) the 23 researched projects in 5 purpose groups
  (A: chat MCPs acting as a person, B: helpdesk MCPs, C: LINE's bot MCP, D: chat.line.biz internal-API tools,
  E: human inboxes); (3) a 5-action coverage matrix for the AI-usable ones; (4) features to reuse, with priority.
- Why: the user asked what the assignment expects to look like and how the research applies before PLAN v3.
- Commits: this commit (status/log only).
- For other lanes: none yet. PLAN v3 is next; it will add notes/tags from chat.line.biz to get_user_profile and an
  internal-note idea (from Intercom/Chatwoot) as a "should".
