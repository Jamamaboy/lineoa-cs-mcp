# research status
Last updated: 2026-11-06 04:17 ICT · branch research

## Now
- Round 5 done: web search for references similar to ours (EN/TH/JA/ZH). No new open-source MCP for LINE OA exists.
  11 new references profiled, the closest being kakao-channel-chat, facebook-lyr and the Help Scout MCP. Everything
  is merged into one page, `docs/research/refs-comparison.html`: purpose groups, an in-depth comparison of the 8
  closest of the 23, the new references, a 5-action coverage matrix, recurring patterns, and borrowings mapped to
  the plan.
- `docs/research/README.md` maps every research file.

## Next
- When `~/lineoa-har/*.har` exists: build a redacted endpoint map and diff it against `test/research/line-api-shapes/`
  (brief in `docs/plan/run-plan.md`).
- Optional: a 5-minute check of `line/line-openapi` for official endpoint names close to the internal ones.

## Blocked
- Waiting for the HAR files (user).

## Requests
- → plan: consider adding these round-5 borrowings to PLAN v3 (details are in refs-comparison.html §6):
  1. A daily send cap plus a cooldown on `send_message`, with the remaining quota shown by `auth_status` (facebook-lyr).
  2. A typed `ENDPOINT_CHANGED` error that never fakes success when LINE changes an internal endpoint (facebook-lyr).
  3. A redirect to account.line.biz counts as `AUTH_EXPIRED` (PicSee line-oa skill).
  4. `read_chat` drops stickers and system events by default, with an option to include them (zalo-agent-cli).
  5. Tool descriptions must say that read tools never mark a chat read (instagram-dms-mcp as the counter-example).

## Heads-up (affects other lanes)
- The test/research/_vendor clones were lost when the old worktree folder was removed. They are gitignored and can
  be re-cloned if needed. Nothing committed was lost.
