# Brief: extract chat.line.biz internal API shapes from one source repo

Goal: the dev team builds a mock of chat.line.biz tonight. The orchestrator (Opus) will write realistic JSON fixtures
for each endpoint and a README table saying where every field came from (file + line). You supply the evidence from
**your repo(s) only**. You do not write fixtures.

Worktree: /Users/psoongsu/orca/lineoa-cs-mcp-research (branch research). Repos are already cloned under
test/research/_vendor/<slug>/repo/. **Static reading only**: do not install, run, or hit the network. Do not git
add/commit. Write only your evidence file: test/research/line-api-shapes/_evidence/<slug>.md

## Endpoints we care about (base https://chat.line.biz unless noted)
1. GET /api/v1/me
2. GET /api/v1/bots (query: noFilter, limit, next...)
3. GET /api/v2/bots/{botId}/chats (folderType, limit, next, ...) and GET /api/v1/bots/{botId}/chats/{chatId} (single chat)
4. GET /api/v3/bots/{botId}/chats/{chatId}/messages — pagination params (backward? before/after? limit?) and EVERY
   message/event shape: text, image, file, video, audio, sticker, location, unsent/unsend, plus anything else you see
   (flex, imagemap, template, system events, chat read/assign events). Content URLs, contentHash, expired/expiredAt,
   fileName/fileSize, duration, sticker ids, lat/long, source/sender (user vs staff/bot, sendBy?), timestamps.
5. POST .../messages/send — request body and response
6. uploadFile → contentMessageToken (method, path, multipart field names, response) ; bulkSendFiles (request/response)
7. GET /api/v1/csrfToken (and how the token is sent: header name, cookie name)
8. error responses: 401 not_login and any other error body shape/codes (403, 404, 429)
9. contacts?query= ; notes ; tags ; owners ; markAsRead (PUT or POST?) ; GET /download/{botId}/{chatId}/messages.csv (columns!)
10. content download host (chat-content.line.biz/...), streamingApiToken/SSE, anything else related.

## What to write (markdown, English is fine, keep it dense)
For each endpoint your repo touches, a section:
```
## <METHOD> <path>
- Where: <relative path from repo root>:<line>  (the call site)
- Query/body: name — type — example — file:line
- Headers/cookies: ...
### Response fields
| field (dotted path) | type | example value seen | file:line | confidence (typed / used-in-code / guessed-by-repo) |
### Literal examples
(Paste any fixture / test / mock payload verbatim, max ~40 lines each, with file:line range.)
### Notes / disagreements
```
Rules:
- Every claim must cite file:line. If the repo only *reads* a field (e.g. `msg.contentHash`), say "used-in-code".
- If the repo's code is ambiguous or contradicts itself, write both readings.
- End with a short "## Not covered by this repo" list and a "## Surprises" list (anything the mock should know: odd
  casing, ms vs s timestamps, string vs number ids, nested `event` wrappers, etc.).
- Do not include any real-looking personal data copied from the repo beyond what is needed; ids/hashes are fine.
- Time box ~15 minutes. Reply with: file written, endpoints covered, top 5 surprises.
