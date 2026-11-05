# Decisions

Cross-lane decisions with their reason. Recorded by the plan lane; the details live in docs/PLAN.md.

| Date | Decision | Why | Where |
|---|---|---|---|
| 2026-11-05 | TypeScript / Node 22, official MCP SDK (major pinned), stdio | TS-first SDK and Playwright; one language for server, mock and tests | PLAN §3 |
| 2026-11-05 | The mock LINE OA is the graded path; WebClient is experimental | No real OA access is confirmed | PLAN §2 A1 |
| 2026-11-05 | A human logs in through Playwright; the server holds only the session (0600, lock file) | No password storage, works with captcha/2FA | PLAN §6 |
| 2026-11-05 | Search uses a local SQLite FTS5 trigram index | No message-search endpoint found; Thai has no word breaks | PLAN §2 A4 |
| 2026-11-05 | send_message is opt-in (`LINEOA_ALLOW_SEND`) and idempotent by sendId | slack-mcp-server, omnichat-bridge patterns | PLAN §5 |
| 2026-11-05 | Branch flow feat/* → dev → (CI) → main + tag; no squash | Keep the project growing as a SaaS; graders want history | CLAUDE.md |
| 2026-11-05 | Docs split by lane; each lane writes only its own folder | Parallel sessions without merge conflicts | CLAUDE.md |
| 2026-11-06 | Scope v3: support-OA CS assistant; must = 5 tools + auth + attachments + webUrl, should = case layer, could = product-OA usage / Telegram | Build what the CS team needs without risking the graded core | PLAN §1, §5b |
| 2026-11-06 | Every chat/profile result carries `webUrl` (`chat.line.biz/{botId}/chat/{chatId}`) | Lets a human take over in the console; pattern confirmed on a live screen | PLAN §5, §6a |
| 2026-11-06 | One chat = many cases; rich-menu messages open cases, the AI may open more; `resolved` needs `confirmedByStaff` | Matches a real support chat; CS stays accountable | PLAN §2 A9, §5b |
| 2026-11-06 | Personal data stays in the server, masked by default; `reveal` is audit-logged; no LLM calls in the server | PDPA; the AI client does the AI work | PLAN §6b, A12 |
| 2026-11-06 | The live OA is read-only (HAR only); send/upload are tested on a new test OA; HAR files never enter the repo | It holds real people's chats | PLAN §2 A11 |
| 2026-11-06 | Cross-OA linking by email matched in the server + CS confirmation | userId equality across OAs needs one provider, which is unchecked | PLAN §2 A10 |
