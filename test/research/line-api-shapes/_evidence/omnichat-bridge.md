# Evidence: omnichat-bridge (JS Chrome extension, page-context bridge)

Repo root: test/research/_vendor/omnichat-bridge/repo/  (all paths below relative to it).
Main sources: `extension/line-oa-realtime.js` (RT), `extension/lib/line-oa.js` (LO, message normalizer), tests `test/line-oa-realtime.test.js` (T), `test/provider-adapters.test.js` (PA), `docs/line-oa-attachments.md` (DOC).
Overall: the repo reads only a SMALL subset of fields. It never types any response; fixtures are minimal mocks (not real captures). All requests use `credentials:"include"` (cookies), no csrf handling in repo. Confidence labels: typed / used-in-code / guessed-by-repo.

## GET /api/v1/bots?noFilter=true&limit=1000   (account list)
- Where: RT:195 (`json(`${apiBase}/v1/bots?noFilter=true&limit=1000`)`); apiBase = `https://chat.line.biz/api` RT:39
- Query: noFilter=true, limit=1000 (literal) RT:195
- Headers: `accept: application/json`, `credentials: include` (RT:~236-240 inside `json()`). No csrf header.
### Response fields
| field | type | example | file:line | conf |
|---|---|---|---|---|
| list | array (required, else error "account list was invalid") | - | RT:197 | used-in-code |
| list[].basicSearchId (fallback basicId) | string, with "@" (repo normalizes by stripping/adding "@") | "@exampleoa" | RT:198-200, T:~84 | used-in-code |
| list[].botId (fallback id) | string | "bot-1" | RT:199 | used-in-code |
| list[].name (fallback displayName) | string | "Example Store" | RT:200, T:~84 | used-in-code |
### Literal examples
T:~84-87 (mock): `{ list: [{ botId: "bot-1", basicSearchId: basicId, name: "Example Store" }] }`  (basicId default "@exampleoa", T:48)
### Notes
- No pagination read (no `next` on bots list); asks limit=1000 in one shot.

## GET /api/v2/bots/{botId}/chats   (chat list)
- Where: RT:`chatUrl()` ~296-305
- Query: folderType=ALL; tagIds="" (empty); autoTagIds="" (empty); limit=25 (CHAT_PAGE_LIMIT RT:6); prioritizePinnedChat=false; next=<cursor string> (only when continuing)
### Response fields (all read-only usage)
| field | type | example | file:line | conf |
|---|---|---|---|---|
| list | array | - | RT:686 (`Array.isArray(body?.list)`), LO:`chatItems` | used-in-code |
| next | string cursor, absent on last page | "chat-page-2" (mock) | RT:~707 `cursor(body.next)`; T:108 | used-in-code |
| total / totalCount / total_count | number (optional, any of 3 names tried) | - | RT:`numberFrom(body,["total","totalCount","total_count"])` ~745 | guessed-by-repo |
| list[].chatId | string | "chat-1" | RT:`captureChatProfile` ~370, value(chat?.chatId) | used-in-code |
| list[].profile.userId / profile.groupId | string | "buyer-1" | RT:~366, T:1634 | used-in-code |
| list[].profile.displayName (fallback name) | string | "Fresh name" | RT:~392, T:1634 | used-in-code |
| list[].profile.pictureUrl (fallback imageUrl, avatarUrl) | https URL string | "https://image.test/avatar" | RT:~395, T:1634 | used-in-code |
| list[].updatedAt | ms epoch number (timeMs also accepts ISO string) | 4000 (mock) | RT:`chatActivityTimeMs` ~246-250 | used-in-code |
| list[].latestEvent.timestamp, .type | ms epoch; type e.g. "message","messageSent" | `{type:"message",timestamp:1000}` | RT:~246, T:105, T:1907 | used-in-code |
| list[].lastReceivedAt, lastSentAt | ms epoch | 3000 / 3500 | RT:~246, T:1885 | used-in-code |
| list[].lastTalkedAt, lastReadAt | ms epoch (deliberately NOT used as message activity) | 99000 | RT comment ~240-245, T:1885 | used-in-code |
### Literal examples
T:1885-1886 (mock): `{ chatId: "chat-1", updatedAt: 4000, lastReceivedAt: 3000, lastSentAt: 3500, lastTalkedAt: 99000, lastReadAt: 99000, profile: { userId: "customer", displayName: "Customer" } }`
T:1783-1786: `{ chatId: `chat-${id}`, updatedAt, latestEvent: { type: eventType, timestamp: latestAt } }`
### Notes
- RT comment (~236-246): "Live LINE lists can omit latestEvent on older chats while retaining sent and received timestamps (53 of 89 summaries observed on 2026-10-27)". So latestEvent is OPTIONAL in real data. Unpinned list order follows updatedAt (desc); "a LINE UI send advances updatedAt; a (bridge) send advances latestEvent/lastSentAt but can leave updatedAt unchanged" (RT comment ~625-632). Useful real-behavior hint for the mock.
- Timestamps in chat objects: treated as ms epoch (timeMs: numeric > 0 else Date.parse).

## GET /api/v3/bots/{botId}/chats/{chatId}/messages   (history / polling)
- Where: RT:`messagesUrl()` ~308-318; used in `recoverChat` (RT:~478) and `waitForSentMessage` (RT:~335-345)
- Query: limit — int, 1..100 (PAGE_LIMIT=100 RT:7, clamped) ; backward — opaque cursor string, taken from previous response `body.backward`, only set on continuation (RT:315). NO before/after/next params used. First page has no cursor.
- Pagination: response `backward` (string|absent) = cursor to OLDER page. Newest messages come first in the first page (RT comment ~335: "a newly sent message appears at the front"). Repo breaks if `backward` absent. Repeated cursor => error.
### Response fields
| field | type | example | file:line | conf |
|---|---|---|---|---|
| list | array of EVENT objects (required) | - | RT:~480, LO:eventItems | used-in-code |
| backward | string cursor or absent | "message-page-2" (mock) | RT:~502,521; T:141 | used-in-code |
| list[].type | event type: "message" = incoming from customer; anything else (e.g. "messageSent") = outgoing | "message" / "messageSent" | LO:`incoming = item.type === "message"` ~line 47; PA:303 | used-in-code |
| list[].timestamp | number ms epoch (LO does `Number(item.timestamp)`, skip if non-finite; converted `new Date(ts).toISOString()`) | 1000 (mock) | LO:43, RT:`messageTimeMs` ~254 | used-in-code |
| list[].source.chatId | string | "chat-1" | LO:40, RT:`messageConversationId` ~326 | used-in-code |
| list[].source.userId (or .groupId) | string; customer id; falls back to chatId | "user-1" | LO:48 | used-in-code |
| list[].sendId | string at EVENT level (alt location) | "file-send" | LO:44 `message?.sendId ?? item?.sendId`; PA:303 | used-in-code |
| list[].message.id | string (also accepted number) | "msg-1" | LO:40 | used-in-code |
| list[].message.sendId | string; client idempotency id echoed back | "admin-client-message-1" | LO:44, RT:`messageSendId` ~324, PA:294 | used-in-code |
| list[].message.type | "text","image","video","file","sticker" handled; else -> "unsupported" | "sticker" | LO:50-51 | used-in-code |
| list[].message.originalType | string; PREFERRED over `type` when present (LO:50 `originalType ?? type`) - implies LINE may rewrite `type` (e.g. unsupported/unsent) and keep original | - | LO:50 | used-in-code |
| list[].message.text | string (text msgs); truncated to 20000 chars | - | LO:65 | used-in-code |
| list[].message.fileName | string (file type); used as text, trunc 255 | "report.pdf" | LO:66, PA:304 | used-in-code |
| list[].message.contentProvider.originalContentUrl | URL string for media -> becomes `media_url` | - (no literal) | LO:67 | used-in-code |
| list[].message.stickerId | string/number | "10445608" | LO:69-71, PA:294 | used-in-code |
| list[].message.packageId | string/number | "123" | LO:~70, PA:294 | used-in-code |
Sticker image URL is NOT from LINE chat API: repo builds `https://stickershop.line-scdn.net/stickershop/v1/sticker/{stickerId}/ANDROID/sticker.png` (LO:71).
### Literal examples (only two message-event literals exist in repo; both mock)
PA:294:
`{ type: "message", timestamp: 1000, source: { chatId: "chat-1", userId: "user-1" }, message: { id: "msg-1", sendId: "admin-client-message-1", type: "sticker", packageId: "123", stickerId: "10445608" } }`
PA:302-305:
`{ type: "messageSent", timestamp: 1000, sendId: "file-send", source: { chatId: "chat-1", userId: "user-1" }, message: { id: "file-1", type: "file", fileName: "report.pdf" } }`
T:122-125 (send confirmation mock): `{ list: [{ source: { chatId: "chat-1" }, message: { id: "sent-1", sendId: <sendId> } }] }`
T:139-141 (history pages mock): `{ list: [{ id: "message-1", timestamp: 1000 }], backward: "message-page-2" }` -- NOTE this mock puts id/timestamp at top level; RT:`messageId` accepts `event.message.id ?? event.id`, but LO (the real normalizer) needs `message.id`; the mock only works because RT's tests count posts, not normalize.
### Notes / disagreements
- NOT covered by repo: image/video/audio/location/unsend/flex/imagemap/template shapes (no literals, no field reads except `contentProvider.originalContentUrl` generic). No contentHash, expired/expiredAt, duration, fileSize, lat/long, sendBy, staff/bot sender fields anywhere. Audio/location/unsend all collapse to type "unsupported" with `provider_type` = original type string (LO:68 `provider_type`).
- Direction decided ONLY by `event.type === "message"` (incoming) vs other (outgoing) (LO:48). Outgoing sender_id = account basic id.
- Mixed: event-level `timestamp`, `sendId`, `source`, `type` + nested `message{}` wrapper => events are `{type, timestamp, source, message:{...}}` (consistent with LINE webhook-like event shape).
- Test comment T:~2000: tests assume 100 per page, newest-first.

## POST /api/v1/bots/{botId}/chats/{chatId}/messages/send
- Where: RT:1189 (endpoint), sendBrowserMessage ~1085-1275; path matcher `messageSendPath` RT:~63 regex `^/api/v1/bots/([^/]+)/chats/([^/]+)/messages/send$`
- Headers: `accept: application/json`, `content-type: application/json`, `x-oa-chat-client-version: <captured from page's own request>`; default "20240513144702" (RT:~89 `profileFor`). Only these 3 headers are copied from observed page requests (RT:~74 `safeHeaders`). Cookies via credentials:include; no csrf header seen/copied.
### Request body (JSON). Built from a captured page request template, then overwritten:
| field | type | example | file:line | conf |
|---|---|---|---|---|
| type | "text" | "textV2" (when mention) | "sticker" | "image" (default template only) | "text" | RT:~1148,1167; T:419 | used-in-code |
| sendId | string; client-chosen idempotency/correlation id. Auto format `${chatId}_${Date.now()}_${8-digit random zero-padded}` ; caller can supply any (UUID allowed) | "chat-1_1730000000000_01234567" ; "admin-client-message-1" | RT:1018-1020 (`sendId()`), T:817-818 regex `/^chat-1_\d+_\d{8}$/` | used-in-code |
| text | string, <=2000 chars for type=text (repo-enforced); <=5000 for textV2 | "bridge message" | RT:~1152, ~1163 | used-in-code (limits are repo's own) |
| substitution | object for textV2: key `^[A-Za-z0-9_]{1,20}$` -> `{type:"mention", mentionee:{type:"all"}|{type:"user", userId}}`, 1..20 entries | `{ old: { type:"mention", mentionee:{type:"user", userId:"Uold"} } }` | RT:~1160-1172, T:909-910 | used-in-code (observed from page replay) |
| mention, emojis | present in older captured templates, deleted by repo | - | RT:~1155 | used-in-code |
| packageId, stickerId | strings (sticker) | "1669" / "31690"; "1"/"2" | RT:~1180, T:~829 | used-in-code |
| imageUrl | string (default image template `{type:"image", imageUrl:""}`) - superseded by upload flow | "" | RT:~90 | guessed-by-repo |
### Response
- Repo CANNOT identify an acceptance shape: `classifySendResponse` (RT:1022-1031) returns only "rejected" or "inconclusive"; comment: "No captured provider response currently establishes a conclusive acceptance shape". DOC line "No captured send-response shape currently qualifies for immediate acceptance". Real success body is therefore unknown/possibly empty/{}; test mocks use `null`, `{}`, and `{ id: "sent-N" }` (T:76).
- Therefore the repo confirms by polling GET messages (limit=100, newest first, no cursor) every 1000 ms up to 10 s (SEND_CONFIRM_TIMEOUT_MS, SEND_CONFIRM_POLL_MS RT:12-13) until an event with `source.chatId==chatId` AND `message.sendId == sendId` (or event.sendId) is found; provider message id taken from `message.id` (RT:331-346). => LINE persists the client `sendId` on the message and returns it in history. (sendId idempotency lookup = exactly this.)
### Error handling (response treated as rejected if)
- `!response.ok`, or body.code/errorCode/error.code is a non-numeric-ish string code, or body.errorCode / body.error_code / body.error truthy-and-not 0/"0"/"success" (RT:1022-1031).
- Recognized native error code strings (RT:~1037): BAD_REQUEST INVALID_ARGUMENT INVALID_REQUEST INVALID_PARAMETER VALIDATION_ERROR UNAUTHORIZED FORBIDDEN NOT_FOUND + lowercase variants bad_request invalid_request invalid_argument validation_error invalid_parameter param_error unauthorized forbidden not_found conflict rate_limited too_many_requests internal_error service_unavailable unknown_error; or 1-6 digit numeric. These are a GUESS WHITELIST by the repo, not observed LINE codes.
- Validation error detail arrays tried: body.details[], body.errors[], body.error.details[]; entry field name from `.property ?? .field ?? .path`; whitelist fields: sendId type text substitution mention emojis packageId stickerId imageUrl contentMessageToken items file (RT:~1038-1050). => hints LINE 400 body may be `{code:"INVALID_ARGUMENT", message, details:[{property:"sendId", message}]}` (T:973-975 literal is a mock authored by the repo, "guessed-by-repo").
- 401/403 on any `/api/v\d+/bots...` same-origin fetch marks session failed (RT:~144). No special not_login string appears in repo (`grep not_login` = 0 hits).
### Literal examples
T:973-976 (mock 400 body): `{ code: "INVALID_ARGUMENT", message: "...", details: [{ property: "sendId", message: "..." }, { field: "..." }] }`
T:~417-429 request assertion: type "text", text "bridge message", sendId "caller-send-id".

## POST /api/v1/bots/{botId}/messages/{chatId}/uploadFile   (NOTE path order: /messages/{chatId}, NOT /chats/{chatId}/messages)
- Where: RT:1205; mock T:66
- Body: multipart/form-data, single field `file` (Blob with content-type and filename). Content-Type header deleted so browser sets boundary (RT:~1203, T:850). Other headers: accept, x-oa-chat-client-version.
- Filename: command file_name, else `image.{jpg|gif|png}` / `video.{mp4|mov|m4v|avi}` (RT:~1200).
### Response fields
| field | type | example | file:line | conf |
|---|---|---|---|---|
| contentMessageToken | string (required; missing => "returned no content token") | "upload-token" (mock) | RT:1215, T:48 default uploadBody | used-in-code |
- Error: any !ok -> `providerErrorDetails(body)`; mock statuses 413, 400 (T:858, 989). Body shape unknown beyond whitelist above.
### Size/type limits (repo-enforced, NOT proven LINE limits)
- image 20 MiB (JPEG/PNG/GIF only: image/jpeg->jpg, image/png, image/gif), video 32 MiB (video/mp4, video/quicktime, video/x-m4v, video/x-msvideo), file 32 MiB, file_name required for file. RT:~1190-1200; DOC table; background.js:1660 repeats 20/32 MiB. Text <=2000 chars (RT:~1152).
- Deadlines: whole send 25 s, each request <=20 s, confirm polling 10 s.

## POST /api/v1/bots/{botId}/chats/{chatId}/messages/bulkSendFiles
- Where: RT:1217-1218
- Body JSON: `{ "items": [ { "sendId": "<string>", "contentMessageToken": "<token from uploadFile>" } ] }` (exactly one item; same sendId convention). Same headers as send (content-type application/json).
- Used for image, video AND file (DOC line 12: "Images use this flow too").
- Response: not interpreted beyond classifySendResponse; success body shape unknown. Mock default `{ id: "sent-N" }` (T:76) is invented.
### Literal examples
T:852: `{ items: [{ sendId: "media-send", contentMessageToken: "upload-token" }] }`
DOC:9-12 describes the flow.

## Other endpoints in your list
- GET /api/v1/me : not used. GET /api/v1/bots/{botId}/chats/{chatId} (single chat): not used. csrfToken / XSRF / X-CSRF: not used (grep: zero hits in LINE code; the only `csrf_token` hit is Shopee, extension/shopee-realtime.js:832). markAsRead, contacts, notes, tags, owners, messages.csv download, chat-content.line.biz, streamingApiToken/SSE: not used. Realtime is "authenticated_polling" (RT:postProviderStatus `realtime_transport`).
- Extra fixed strings: manager.line.biz/account/@{basicId} regex used to scrape basic id from HTML (LO:~100); chat URL `https://chat.line.biz/account/@{basicIdWithoutAt}` (LO:~129); header `x-oa-chat-client-version` (value "20240513144702" default, RT:~89).

## Not covered by this repo
/me, single-chat GET, csrfToken and the token header/cookie name, 401 not_login body, 403/404/429 bodies, markAsRead, contacts, notes, tags, owners, CSV download columns, chat-content host and content URL format, SSE/streamingApiToken, shapes for image/video/audio/location/unsent/flex/imagemap/template/system events, contentHash, expired/expiredAt, fileSize, duration, lat/long, sendBy/staff fields, the successful send/bulkSendFiles response body.

## Surprises
1. uploadFile path is `/api/v1/bots/{botId}/messages/{chatId}/uploadFile` (messages BEFORE chatId), unlike send/bulkSendFiles under `/chats/{chatId}/messages/...`.
2. Messages API paginates with a single `backward` cursor (response field `backward`, request query `backward`), `limit` max 100 used; no `next` on messages (`next` is for chat list only). First page = newest.
3. Message list items are EVENTS: `{type:"message"|"messageSent", timestamp(ms), source:{chatId,userId|groupId}, message:{id,sendId,type,text|fileName|stickerId+packageId, contentProvider.originalContentUrl, originalType?}}`; `sendId` may be at event or message level; `message.originalType` preferred over `type`.
4. sendId is client-generated and echoed in history; LINE send response gives no usable id (repo confirms by polling history). Format used by the web-app-like default: `{chatId}_{epochMs}_{8 digits}`; arbitrary strings (incl. UUID) accepted.
5. Image sends go through uploadFile + bulkSendFiles too (type "image" direct send with imageUrl exists only as a fallback template). Required request header `x-oa-chat-client-version` (e.g. "20240513144702"); chat list items may lack `latestEvent`; chat timestamps are ms epoch numbers; bots list uses `basicSearchId` ("@id") and `botId`.
