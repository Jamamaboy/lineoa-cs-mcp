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

## 2026-11-06 01:00 ICT · Live OA available; stack recap; extras
- What: the user showed a live chat.line.biz screen from an OA they run (real people's chats, free plan). Findings:
  chat deep link is `chat.line.biz/{botId}/chat/{chatId}` with a `U…`-style chatId; the console has Follow up and
  Resolve (chat status), Tags, Standard replies, Contact list and a search box; history holds bot flex cards.
  Proposed rules: that OA is read-only (HAR capture only, send disabled, no status buttons, avoid opening unread chats
  because opening marks them read); a new free test OA is used for send/upload tests. Also agreed in chat: add
  `webUrl` to chat/profile tool outputs (handoff to the console) as core; a Telegram demo through Claude Code Channels
  only after the core and README are done.
- Why: Phase 4 needs real endpoint evidence; real data carries PDPA risk, so reading and writing are split across OAs.
- Commits: this commit (status/log only).
- For other lanes: research gets the HAR when the user captures it. Real IDs and HAR files never enter the repo.

## 2026-11-06 00:55 ICT · Tonight's run plan (00:45 → 03:00)
- What: added `docs/plan/2026-11-06-tonight.md` (timeline per lane, done-at-03:00 checklist, cut rule, Friday
  schedule, prompts to start the dev and research sessions) and a Thai swimlane diagram `2026-11-06-tonight.html`.
- Why: the user asked for one picture of what happens until 03:00 so every lane works in parallel toward a green
  mock-based MVP, and the HAR capture runs at the same time.
- Commits: this commit.
- For other lanes: dev starts as soon as PLAN v3 is merged; research starts when the HAR lands in `~/lineoa-har/`.

## 2026-11-06 01:15 ICT · PLAN v3 written and merged; dev unpaused
- What: PLAN.md v3. Framing and must/should/could (§1); assumptions A8–A12 (main-OA link, many cases per chat,
  email + CS linking, live OA read-only, no LLM in the server); `webUrl` and flex messages (§5); case layer with the
  tag taxonomy (§5b); PII rules (§6b); research requests applied to §6a; new schedule (§8); Support flows F1–F11
  (§10); risks. Six rows were added to DECISIONS. The Thai copies got a v3 summary on top. Merged `plan` into `dev`
  and `research`.
- Why: the user accepted the proposed defaults for the 10 re-scope questions and asked to start tonight's run.
- Commits: `0794786 docs(plan): v3 — Acme Support scope, webUrl, case layer, PII rules, new schedule`, this
  commit, and the merge commits on `dev` and `research`.
- For other lanes: dev, start now (see Requests). Research waits for the HAR.

## 2026-11-06 01:30 ICT · PLAN v3 in full Thai HTML; stages instead of clock times
- What: `docs/PLAN.html` is now a full Thai v3, with new diagrams: what the CS person sees (Diagram 0), the case
  model (2b), a stage swimlane (4) and the post-checkpoint chain (4b). New sections cover the v3 scope, 5b and 6b,
  plus A8–A12, F1–F11 and the risks. `docs/PLAN_thai.md` was re-translated from v3 by a Sonnet agent, and its §8 was
  aligned to the same stages 0–10. PLAN.md §8, the run plan (md + html) and STATUS no longer use clock times, at
  the user's request; the only fixed time is the 23:59 deadline. Also fixed leftover v2 rows in PLAN.md §8 and §10:
  a `---` search had matched a table separator.
- Why: the user wants the plan readable as HTML, and does not want a 03:00 target in the timeline.
- Commits: this commit plus the merges into `dev` and `research`.
- For other lanes: PLAN.md §8 now uses stage numbers (0–10). Dev's work is unchanged.
