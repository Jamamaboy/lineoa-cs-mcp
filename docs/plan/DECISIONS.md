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
