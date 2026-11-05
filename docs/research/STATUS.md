# research status
Last updated: 2026-11-05 23:25 ICT · branch research @ 0b3328f (+ this commit)

## Now
- Round 4 done: 6 more profiles (Intercom MCP, Zendesk, Freshchat, Trengo, ChatCone, OHO Chat); `test/research/index.html`
  rebuilt (23 projects) with a round-4 section in `takeaways.html`.
- Round 3 done: `test/research/line-api-shapes/` has fake chat.line.biz fixtures (one JSON per endpoint, every message
  type, Thai text) and a README mapping each field to repo file:line, the conflicts between repos, and a HAR checklist.

## Next
- Idle. Possible next rounds (on request): HAR capture checklist / script for Phase 4 (what to click, what to save,
  how to redact), or contract-test cases derived from `line-api-shapes/`.

## Blocked
- none

## Requests
- → plan: PLAN §6a/A7 says markAsRead is "PUT/POST". Only PUT on `/api/v2/...` is evidenced (LINELib). Messages
  pagination: `backward` (linebiz, omnichat, downloader) vs `before`/`after` (LINELib). Please reflect in §6a.
- → plan: `folderType` values other than `ALL` are unknown, so `list_chats(filter=unread|ongoing)` must filter on
  `read`/`done` client-side until the HAR says otherwise.
- → dev: fixtures are ready for the mock. Read `test/research/line-api-shapes/README.md` first.
- → plan (round 4): Freshchat says LINE files are receive-only (images/video both ways). Add "can chat.line.biz send a
  PDF via bulkSendFiles?" to the Phase 4 HAR checklist (F6 depends on it).

## Heads-up (affects other lanes)
- Fixture format: `{_meta, request?, response:{status, body}}`. The mock can return `response.body` as is.
- Messages are **events** (`message` = customer, `messageSent` = OA/staff with `bizId`), newest first, cursor
  `backward`. 1:1 chatId == customer userId. All ids are strings, all times epoch ms.
- uploadFile path is `/api/v1/bots/{botId}/messages/{chatId}/uploadFile` (messages before chatId).
- Send/bulkSendFiles success bodies are unknown (`{}` in fixtures); confirm a sent message by its `sendId` in history.
- CSV column names beyond `Sender type` are guesses.
