# plan status
Last updated: 2026-11-06 01:00 ICT · branch plan

## Now
- Re-scoping with the user around the **Acme Support** OA (bug-report OA) instead of a generic CS agent.
  A recap artifact (Thai) is in the plan chat. Its summary:
  - Person-centric data model: Person → chats in both OAs, emails, Acme account
  - Cases: one chat holds many cases. Rich-menu buttons set the case type.
  - Tags from AI or CS (suggested / confirmed), case status, SQL stats, period summaries built from case summaries
  - Local SQLite store; PII stays in the server, and the LLM sees masked references
- Policy research is done (LINE OA roles are per OA; userId is the same only within one provider; an official weekly
  chat-history CSV exists; chat history is kept 6 months on the free plan; PDPA calls for masking, a DPA and retention).

## Next
- Real-console access: the user has a live OA (an HR app OA, real employee chats). Proposed: use it **read-only**
  for HAR capture (no send, no Follow up/Resolve, don't open unread chats), and create a free test OA for send/upload.
  Waiting on the user's OK.
- The user said "โอเคแล้ว" about the 10 questions; read as accepting the proposed defaults (to confirm in chat).
- A UX + research comparison artifact (Thai) is in the plan chat: the graded UX is an AI-client conversation that
  calls our tools, not a web page. It maps the 23 researched projects into 5 purpose groups and lists features to reuse.
- Get the user's answers to 10 questions (artifacts: re-scope + main-OA context): scope must/should/could, the case-opening trigger, the tag taxonomy,
  who may mark a case done, OA linking by email + CS confirmation, local storage.
- Then rewrite PLAN.md (v3): user flows around Support cases, the new case tools, assumptions A8+ (why link the main
  OA), the PII rules. After that, unpause dev.

## Blocked
- Waiting on the user's decisions above.

## Requests
- → dev: **PAUSED.** Don't start Phase 1/2 until plan v3 lands. Scope is changing toward Acme Support case handling.
- → research: when the user's HAR file arrives (kept outside the repo), turn it into a redacted endpoint map. A live
  screenshot already shows the chat URL `chat.line.biz/{botId}/chat/{chatId}` with a `U…` chatId (fits chatId == userId),
  Follow up / Resolve buttons (chat status), Tags, Standard replies, and bot flex cards in history.

## Heads-up (affects other lanes)
- Likely new MCP tools on top of the 5 required ones: list_cases, tag_case, set_case_status, get_person, case_stats.
  The AI client does the tagging and summarizing; the server holds no LLM key.
- The mock should imitate Acme Support: a 4-button rich menu (onboarding / feature request / report problem / how-to),
  a bot template that asks for email + problem + screenshots, and broadcasts mixed into chats.
