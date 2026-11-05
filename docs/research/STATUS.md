# research status
Last updated: 2026-11-05 23:15 ICT · branch research @ 4cb1a3b (+ this commit)

## Now
- Round 3 done: `test/research/line-api-shapes/` has fake chat.line.biz fixtures (one JSON per endpoint, every message
  type, Thai text) and a README mapping each field to repo file:line, the conflicts between repos, and a HAR checklist.

## Next
- Round 4 (when free): profile Intercom MCP, Zendesk, Trengo, Freshchat, ChatCone, Oho Chat per
  `test/research/tools/AGENT_BRIEF.md`, then rebuild `test/research/index.html`.

## Blocked
- none

## Requests
- → plan: PLAN §6a/A7 says markAsRead is "PUT/POST". Only PUT on `/api/v2/...` is evidenced (LINELib). Messages
  pagination: `backward` (linebiz, omnichat, downloader) vs `before`/`after` (LINELib). Please reflect in §6a.
- → plan: `folderType` values other than `ALL` are unknown, so `list_chats(filter=unread|ongoing)` must filter on
  `read`/`done` client-side until the HAR says otherwise.
- → dev: fixtures are ready for the mock. Read `test/research/line-api-shapes/README.md` first.

## Heads-up (affects other lanes)
- Fixture format: `{_meta, request?, response:{status, body}}`. The mock can return `response.body` as is.
- Messages are **events** (`message` = customer, `messageSent` = OA/staff with `bizId`), newest first, cursor
  `backward`. 1:1 chatId == customer userId. All ids are strings, all times epoch ms.
- uploadFile path is `/api/v1/bots/{botId}/messages/{chatId}/uploadFile` (messages before chatId).
- Send/bulkSendFiles success bodies are unknown (`{}` in fixtures); confirm a sent message by its `sendId` in history.
- CSV column names beyond `Sender type` are guesses.
