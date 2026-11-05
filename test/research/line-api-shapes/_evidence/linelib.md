# Evidence: LINELib (Python) -> chat.line.biz internal API

Repo root: `test/research/_vendor/linelib/repo/` (all paths below relative to it). Static reading only.
Key fact: LINELib is mostly a *client*; it returns raw JSON dicts and almost never types response fields. The repo contains **no real captured response payloads**; only a handful of tiny test stubs. Confidence labels: `typed` = a schema/dataclass declares it (none here), `used-in-code` = code reads/sends the field, `guessed-by-repo` = only in a test stub/doc.

Common request headers (every call): `_base_headers()` = Chrome-on-Windows UA + `sec-ch-ua*`, `Accept: application/json, text/plain, */*`, `x-oa-chat-client-version: 20240513144702` (LINELib/ChatService.py:140-145, 28; UA in LINELib/browser_profile.py:8-42). Cookies come from the `requests.Session`. CSRF header: `x-xsrf-token` (lowercase mostly; `X-XSRF-TOKEN` in a few places; HTTP is case-insensitive) (ChatService.py:153-154, 316, 336, 571, 670).
Cookie names LINELib cares about on chat.line.biz: `__Host-chat-ses`, `chat-device-group`, `XSRF-TOKEN` (LINELib/session_utils.py:8, 26-30, 58-64).

---
## GET /api/v1/csrfToken
- Where: LINELib/ChatService.py:706-712 (`get_csrf_token`); also inline fallback 575 and 674; LINELib/AuthService.py:45, 293-300
- Query/body: none
- Headers/cookies: session cookies; no xsrf header required in the call at AuthService.py:293.
### Response fields
| field | type | example | file:line | confidence |
|---|---|---|---|---|
| token | string (non-empty) | "xsrf" / "fresh-xsrf" | ChatService.py:577-580; AuthService.py:298; tests/test_auth_service.py:60; tests/test_chat_service.py:759 | used-in-code |
### How the token is used
- After fetching, AuthService stores it as cookie: `session.cookies.set("XSRF-TOKEN", token, domain="chat.line.biz", path="/")` (AuthService.py:299-300). So server presumably ALSO sets `XSRF-TOKEN` cookie (inferred; not shown). Then sent as header `x-xsrf-token: <token>` on every mutating/GET call (ChatService.py:153-154).
- `get_chat_messages`/`get_chats` precedence: explicit arg -> `XSRF-TOKEN` cookie for domain chat.line.biz -> fetch `/api/v1/csrfToken` (ChatService.py:569-581, 668-679).
- Login page (account.line.biz, a different system) exposes `csrfToken` inside `<div id="__config__" data-global='{...}'>` JSON (AuthService.py:34-38, 262). Not chat.line.biz.
### Literal examples
`{"token": "xsrf"}` (tests/test_auth_service.py:60), `{"token": "fresh-xsrf"}` (tests/test_chat_service.py:759).
### Notes
- Response key is `token` (not `csrfToken`). Header name `x-xsrf-token` (not `X-CSRF-Token`).

---
## GET /api/v1/me
- Where: ChatService.py:683-689
- Query/body: none. Headers: x-xsrf-token.
### Response fields
No field is read by the library. Test stub only: `{"name": "owner"}` (tests/test_chat_service.py:742-749) -> guessed-by-repo, probably not real.
### Notes
- The *user name* actually lives in `GET /api/v1/bots` as top-level `userName` (see below), which AuthService uses (AuthService.py:322).

## GET /api/v1/bots
- Where: ChatService.py:720-740 (`get_bot_accounts`); AuthService.py:46 (`CHAT_BOTS_URL = .../api/v1/bots?limit=1000&noFilter=true`)
- Query: `limit` int 1..1000 (default 1000) ; `noFilter` "true"/"false" lowercase string (ChatService.py:733-734). No `next` cursor used anywhere.
### Response fields
| field | type | example | file:line | confidence |
|---|---|---|---|---|
| userName | string | "owner" | AuthService.py:322; tests/test_auth_service.py:65 | used-in-code |
| list | array of bot objects | | AuthService.py:309, 314; LINELib.py:584 | used-in-code |
| list[].botId | string, starts with "U" | "Ubot" | AuthService.py:317-318; LINELib.py:844 | used-in-code |
| list[].basicSearchId | string, "@..." handle | "@bot" | LINELib.py:845; tests/test_auth_service.py:91; docs/troubleshooting.md:~100 | used-in-code |
| list[].name | string | | LINELib.py:846, 855 | used-in-code |
| list[].responseMode | "BOT" or "CHAT" (absent on legacy) | "CHAT" | AuthService.py:319; tests/test_auth_service.py:66-68 | used-in-code |
### Literal examples
tests/test_auth_service.py:62-71:
```
{"userName": "owner",
 "list": [{"botId": "Ubot-mode", "responseMode": "BOT"},
          {"botId": "Uchat-mode", "responseMode": "CHAT"},
          {"botId": "Ulegacy"}]}
```
### Notes
- docs/messages-and-media.md:20: bots with `responseMode=BOT` return **403** on manual chat APIs. Good fixture for 403.
- Real bot ids start with `U` + 32 hex (docs use `Uxxxxxxxx...` 33 chars).

## GET /api/v1/bots/{botId}?noFilter=true
- Where: ChatService.py:691-704. Response unread. Only param `noFilter`.

---
## GET /api/v2/bots/{botId}/chats
- Where: ChatService.py:620-681
- Query: `folderType` string default "ALL" (:627, 654); `tagIds` comma string default "" (:628); `autoTagIds` comma string default "" (:629); `limit` int 1..25 default 25 (:630, 644); `prioritizePinnedChat` "true"/"false" default true (:631, 658). Empty strings are passed as params (requests sends `tagIds=`). **No `next` cursor is implemented** by this repo.
- Headers: referer `https://chat.line.biz/{botId}`; x-xsrf-token (:660-672)
### Response fields
| field | type | example | file:line | confidence |
|---|---|---|---|---|
| list | array | [] | LINELib.py:795; tests/test_chat_service.py:757 | used-in-code |
| list[].chatId | string | "Uchat" | LINELib.py:864, 887 | used-in-code (required; missing -> LINEOAError) |
| list[].chatType | "USER" or "GROUP" (others exist?) | "USER" | LINELib.py:886; tests/test_linelib.py:107 | used-in-code |
| list[].profile | object or null | null | LINELib.py:874-879, 894 | used-in-code |
| list[].profile.name | string | | LINELib.py:878 | used-in-code |
### Literal example
`[{"chatType": "USER", "chatId": "Uchat", "profile": None}]` (tests/test_linelib.py:106-108). docs/getting-started.md:58 prints `chat.get("chatId")`, `chat.get("profile", {}).get("name")`.
### Notes
- Nothing about `next`, `hasNext`, unread counts, lastMessage, etc. Not covered.

## GET /api/v1/bots/{botId}/chats/{chatId}
- Where: ChatService.py:755-757. Response unread. Referer `https://chat.line.biz/{botId}/chat/{chatId}`, Origin set.

---
## GET /api/v3/bots/{botId}/chats/{chatId}/messages
- Where: ChatService.py:538-582 (sync); 584-618 (async, uses v3_BASE_URL)
- Query/body:
  - `limit` int 1..100, default 50 (ChatService.py:553, 555)
  - `before` optional: opaque string cursor **or** positive int (`_pagination_cursor`, :91-106, 556-557)
  - `after` optional: same (:558-559)
  - docstring: "before: Message ID before / after: Message ID after" (:547-548) but docs/messages-and-media.md:~125 says "opaque string cursor taken from the LINE response... legacy positive integer also accepted".
- Headers: x-xsrf-token, referer chat page.
### Response fields
**The repo never reads any field from this response** (returns raw dict; ChatService.py:582). Message shapes are known only from the SSE side (below), assumed identical by the repo's normalizer (unverified).
### Notes / disagreements
- Which response key holds the next cursor (`next`, `nextToken`, `prev`...) is NOT in this repo. Cursor semantic is "taken from LINE response" (docs) = cannot confirm name.
- Direction (backward vs forward) not stated.

## Message / event shape (SSE-derived; also what the normalizer expects for history)
Source of truth: LINELib/sse.py:42-100 (`normalized_message`).
SSE `data:` line is JSON. Expected envelope (used-in-code):
```
{ "botId": "U...", "chatId": "U...", "subEvent": "message" (optional, linebot.py:225),
  "payload": { "type": "message", "timestamp": <ms?>, "message": {...} } }
```
- Falls back to treating top-level as `inner` if `payload.payload` is not a dict (sse.py:46). `SSEEvent.message_payload()` also accepts `payload.message` directly (sse.py:22-34).
- Tests: tests/test_sse.py:52-62 and 68-75 (literal below); tests/test_linebot.py:160-180 (`{"type":"chat","payload":{"subEvent":"message","payload":{"type":"message","message":{"type":"image"}}}}`).
### message object fields (all "used-in-code" in sse.py)
| field | type | notes | file:line |
|---|---|---|---|
| id | string | message id (stub "1") | sse.py:83 |
| type | "text","image","video","file","audio","sticker","link", ... | `message_type`; unknown types pass through as `kind` | sse.py:52, 79; docs/events-and-polling.md ("text, image, video, file, audio, sticker, link など") |
| text | string | for text and "link body" | sse.py:90 |
| timestamp | number (ms, per docs of mark_as_read/flex) | falls back to `inner.timestamp` | sse.py:84 |
| contentHash | string | sits on message OR in `message.contentProvider.contentHash` | sse.py:53-54 |
| contentProvider | object | may contain `contentHash`, `stickerId`, `packageId`, `fileName`/`file_name`, `url`; test says malformed (string) must not crash | sse.py:53, 60-63, 91; tests/test_sse.py:68-75 |
| stickerId | string ("123") | message or contentProvider | sse.py:60; test_sse.py:58 |
| packageId | string | message or contentProvider | sse.py:61 |
| fileName / name | string | file name; ext derived from it | sse.py:63-66 |
| audio | object, `audio.duration` | | sse.py:62, 97 |
| duration | number | top-level duration or audio.duration | sse.py:97 |
| expired | bool? | "LINE-side expiry state" | sse.py:88; docs/events-and-polling.md |
| expiredAt | number? | | sse.py:89 |
| url / linkUrl | string | link type | sse.py:91 |
| title / linkTitle | string | link type | sse.py:92 |
- NOT present in repo: location (lat/long), unsend/unsent, flex/imagemap/template as received, fileSize, sender/source/sendBy, quoteToken on received messages, read/assign/system events, mentions on received messages. (sticker/image/file/audio/video/link only.)
### Content URL construction (used-in-code)
- image/video/file: `https://chat-content.line.biz/bot/{botId}/{contentHash}/preview` (sse.py:57-58; ChatService.py:829, 919). **audio is NOT given a media_url by normalizer** but `save_message_media` downloads preview for audio (docs/messages-and-media.md table; LINELib.py:453-500).
- sticker: `https://stickershop.line-scdn.net/stickershop/v1/sticker/{stickerId}/android/sticker.png` (sse.py:87; ChatService.py:848).
### Literal examples
tests/test_sse.py:53-60:
```
payload = {"botId": "Ubot", "chatId": "Uchat",
  "payload": {"type": "message",
    "message": {"id": "1", "type": "sticker", "stickerId": "123"}}}
```
tests/test_sse.py:69-75:
```
{"botId": "Ubot", "payload": {"type": "message",
  "message": {"id": "1", "type": "text", "contentProvider": "invalid"}}}
```

---
## POST /api/v1/bots/{botId}/chats/{chatId}/messages/send
- Where: ChatService.py:1113-1146 (generic), LINELib.py:596-627 (text), ChatService.py:1194-1243 (cardType), 257-286 (mention)
- Headers: Origin https://chat.line.biz; Referer `https://chat.line.biz/{botId}/chat/{chatId}`; Content-Type application/json; x-xsrf-token; Sec-Fetch-* same-origin (ChatService.py:1129-1141).
- Body (JSON), three variants:
  1. Text: `{"id": "", "type": "textV2", "text": "<str>", "sendId": "<chatId>_<epoch_ms>_<7-digit rand>"}` ; optional `"quoteToken": "<str>"` for reply (LINELib.py:613-626). sendId format: `f"{user_id}_{int(time.time()*1000)}_{random.randint(1000000,9999999)}"` (LINELib.py:616) -> e.g. `Uchat..._1730800000000_4821937`. **Type is `textV2`** not `text`.
  2. cardType (Flex template): `{"id": "", "type": "cardType", "cardTypeMessageId": <int>, "sendId": "..."}` (ChatService.py:1225-1230)
  3. Mention (uses send_message directly, **no id/sendId**, type plain `text`): `{"type":"text","text":"@<mentioneeId> ","mentions":[{"userId":"<id>","offset":0,"length":<len(text)>}]}` (ChatService.py:274-285). Ambiguity: this likely differs from the real client (textV2 with `mentionees`?); repo unverified.
### Response
- Library ignores the body and returns `{}` on any 2xx (ChatService.py:1145-1146, "dict: Always empty"). Async: same (:1190). So real response body is unknown; repo author states "Always empty" (docstring :1122). Mock: 200 with `{}` is consistent.
- Failure: any non-2xx -> `LINEOAError("send_message failed: HTTP <status>")`; no error body parsed.

## POST /api/v1/bots/{botId}/messages/{chatId}/uploadFile   (note path order: messages/{chatId}, NOT chats/{chatId}/messages)
- Where: ChatService.py:305, 317-320 (sync); 348, 366-380 (async)
- Body: multipart/form-data, single field **`file`**, filename=basename, content-type `application/octet-stream` (:318; async :368-373). Timeout 120s.
- Headers: Origin, Referer chat page, Sec-Fetch-*, X-XSRF-TOKEN. No explicit Content-Type (requests/aiohttp set boundary).
### Response fields
| field | type | example | file:line | confidence |
|---|---|---|---|---|
| contentMessageToken | string (non-empty) | "content-token" | ChatService.py:321-323; tests/test_chat_service.py:128 | used-in-code |
Other fields unknown (only that key is read).

## POST /api/v1/bots/{botId}/chats/{chatId}/messages/bulkSendFiles
- Where: ChatService.py:324-340 (sync), 385-404 (async)
- Body: `{"items": [{"sendId": "<chatId>_<ms>_<rand7>", "contentMessageToken": "<token from uploadFile>"}]}` (:337-338). Content-Type application/json, x-xsrf-token.
- Response: returned as parsed JSON object (must be a JSON object, else error) (:340, `_json_response`). **Keys not read; unknown.** Library returns whatever (docstring "API response").
- Only one item per call is ever sent, though `items` is an array (so batch supported).

---
## PUT /api/v2/bots/{botId}/chats/{chatId}/markAsRead
- Where: ChatService.py:1286-1340
- Method: **PUT** (`req.put`, :1337). Path uses **v2**.
- Body: `{"lastMessage": {"messageId": "<id>", "timestamp": <int epoch ms>}}` (:1316-1321). timestamp defaults to now in ms (:1310-1311).
- Response: ignored; returns `{}` on 2xx (:1339-1340). Failure -> `LINEOAError("mark_as_read failed: HTTP <status>")`.

## PUT /api/v1/bots/{botId}/chats/{chatId}/typing
- Where: ChatService.py:922-939. No body. Returns `{}`; empty body allowed (`_put_json` allow_empty, :250).

## GET /api/v1/bots/{botId}/chats/{chatId}/messages/flexJson
- Where: ChatService.py:1245-1284. Query: `timestamp` (ms int), `messageId` (string). Response is raw "Flex JSON payload"; keys unknown.

## GET /api/v1/bots/{botId}/chats/{chatId}/members
- Where: ChatService.py:414-448. Query `limit` 1..100 (default 100). Group chats only; 1:1 may give 400 (docs/messages-and-media.md ~line 130). Response keys unknown.

---
## POST /api/v1/bots/{botId}/streamingApiToken
- Where: ChatService.py:968-996
- Method POST, empty body (`data=""`), Origin https://chat.line.biz, Referer `https://chat.line.biz/{botId}/chat/`, x-xsrf-token.
### Response fields
| field | type | example | file:line | confidence |
|---|---|---|---|---|
| streamingApiToken | non-empty string (required) | "stream-token" | LINELib.py:258-260; tests/test_linelib.py:413 | used-in-code |
| streamingApiBaseUrl | string, optional (library fills default if absent) | "https://chat-streaming-api.line.biz" | ChatService.py:988-989; LINELib.py:261 | used-in-code (default is repo-injected) |
| streamingApiVersion | string "v2" (optional; default injected) | "v2" | ChatService.py:990-991; LINELib.py:262 | used-in-code |
| expiredAt | number, epoch **ms** (compared with time.time()*1000) | 1200000 (test) | LINELib.py:263-273; tests/test_linelib.py:506 | used-in-code |
| connectionId | string, optional | | LINELib.py:274, 288-293 | used-in-code |
| lastEventId | string, optional | | LINELib.py:275 | used-in-code |
- Suggests real response includes `streamingApiBaseUrl` and `streamingApiVersion` are probably optional/legacy; library tolerates absence.

## PUT /api/v1/bots/{botId}/streaming/state
- Where: ChatService.py:941-966. Body `{"connectionId": "<str>", "idle": true}`. Called with idle=True right after token fetch when `connectionId` present (LINELib.py:288-293). Response empty/ignored.

## GET https://chat-streaming-api.line.biz/api/v2/sse   (SSE)
- Where: ChatService.py:998-1111
- Query: `token` (streamingApiToken), `deviceType` ("" default), `clientType` ("PC" default), `pingSecs` int (60), optional `lastEventId` (:1041-1048)
- Headers: `accept: text/event-stream`, `origin: https://chat.line.biz`, `referer: https://chat.line.biz/`, `cache-control: no-cache`, `sec-fetch-site: same-site`, optional X-XSRF-TOKEN, and a `cookie` header built ONLY from cookies `__Host-chat-ses`, `chat-device-group`, `XSRF-TOKEN` on chat.line.biz (:1049-1068; session_utils.py:58-64).
- Host is hard-pinned: base_url must be https chat-streaming-api.line.biz or error (:1022-1037). Timeout (connect, read=max(90, ping+30)) (:1073).
- SSE wire format parsed by LINELib/sse.py:103-150: fields `id`, `event`, `data` (multi-line joined by "\n"), `:` comments ignored, blank line dispatches; id persists until reset (tests/test_sse.py:28-45).
- Event names seen in repo: `init`, `ping` (docs/events-and-polling.md:~58-62, linebot.py:236-237), `chat` (ChatService.py:527 filter; tests). Chat events carry `payload.subEvent` (e.g. "message") (linebot.py:225-243). Other event names/subEvents (read, assign, unsend, etc.) NOT enumerated.
- Output dict yielded by library: `{"id", "type"(=SSE event), "payload"(parsed JSON or raw str), "time": "HH:MM:SS.mmm"(local, added)}` (ChatService.py:1095-1100). Library `time` is NOT from LINE.
- Max stream default 82800s (23h); reconnect 60s before token `expiredAt` (docs/events-and-polling.md:~168-170).

## GET /api/v3/bots/{botId}/chats/{chatId}/events   (per-chat SSE; legacy)
- Where: ChatService.py:481-536. Accept text/event-stream; only events with event name None or "chat" processed (:527). Payload passed to callback unparsed beyond JSON.

---
## Content download
- GET `https://chat-content.line.biz/bot/{botId}/{contentHash}/preview` (ChatService.py:827-843, 916-920). Accept image/avif,webp...; session cookies sent; returns raw bytes; non-2xx -> error with status only. No `Range`, no other path variants (no `/download`, no original). Referer not set.
- Stickers from `stickershop.line-scdn.net/stickershop/v1/sticker/{id}/android/sticker.png` (no auth).

## Other endpoints touched (response keys not read)
GET /api/v2/bots/{botId}/chats/{chatId}/messages/pin (:752); /api/v1/bots/{botId}/chats/{chatId}/activities?limit= (:782); .../notes?limit=20&withTotal=true (:788, lowercase "true"); /api/v1/bots/{botId}/authorizedUsers?bizIds=__AUTO_RESPONSE (:792); /api/v2/.../useManualChat (:796); /api/v1/bots/{botId}/stickers/recently (:800); /emojis/recently (:804); /api/v2/bots/{botId}/savedReplies?query&excludeUsernamePlaceholder&sortKey=CREATED_AT&pageSize=25&page=1 (:806-814); /api/v1/clock/now (:817); /api/v1/holiday/{country} (:821); /api/v1/bots/{botId}/plugins (:825); /api/v1/whitelistDomains (:715); /api/v1/me/settings/pc (:718); /api/v4/bots/{botId}/settings/chatMode (:761); /api/v1/bots/{botId}/settings/chatModeSchedules (:765); /api/v2/bots/{botId}/availableFeatures (:769); /api/v2/bots/{botId}/banner/web (:773); /api/v1/bots/{botId}/callSession (:777); /api/v1/providers (LINELib.py:811, returns dict or list).
manager.line.biz: POST `https://manager.line.biz/api/bots/@{atId}/cardTypeMessages` (body at ChatService.py:1388-1430; response key `id` int-or-digit-string, :1438-1447); DELETE `.../cardTypeMessages/{id}` (:1464).

---
## Error handling (401/403/404/429)
- The library NEVER parses error bodies. `_json_response`: if `not response.ok` -> `LINEOAError("<action> failed: HTTP <status>")` (ChatService.py:180-182). Async: `status >= 400` (:195-196). So no `not_login` string, no `{"error": ...}` shape, no 429 handling exist in this repo.
- Only error-body shape in the repo is for account.line.biz login, not chat: `{"status": "<str>"}` on 4xx (AuthService.py:868, 940); statuses seen: "success", "needReCaptchaVerification" (AuthService.py:794-796), plus `redirectUri`, `twoFactorSetupModalTargetUri` (:418-421).
- docs/troubleshooting.md "401 / 403 / CSRF" lists causes only (expired cookie, missing/mismatched XSRF-TOKEN, extra verification, spec change). 403 specifically: Bot-mode accounts (`responseMode=BOT`) reject manual chat APIs (docs/messages-and-media.md:20). 400: members on 1:1 chat.
- Rate limit is LOCAL (18 sends/60s), returns dict `{"ratelimit": True, "ratelimit_after": <unix ts>}` (docs/troubleshooting.md:~115-130; LINELib.py:173-205), not an HTTP response.
- LINEOAError class: message, `.code`, `.details` (LINELib/exceptions.py:4-9).

---
## Not covered by this repo
- GET /download/{botId}/{chatId}/messages.csv (columns): absent.
- contacts?query=, tags, owners endpoints: absent. (notes/activities only requested, response unread.)
- Real response fixtures for /me, /bots/{id}/chats list items beyond chatId/chatType/profile.name, single chat, messages list (wrapper key, cursor key), send, bulkSendFiles.
- Message shapes: location, unsent/unsend, flex/imagemap/template (received), videos' duration/fileSize, sender/source/staff-vs-user flag, read/assign events, system events.
- 401 `not_login` body, 404, 429 bodies.
- Pagination `next` for /bots and /chats; folderType other than "ALL".

## Surprises
1. Text send uses `type: "textV2"` with `id: ""` and a client-generated `sendId = "{chatId}_{epochMs}_{7-digit random}"` (LINELib.py:616-621). Cards: `type: "cardType"` + `cardTypeMessageId` int.
2. uploadFile path is `/api/v1/bots/{botId}/messages/{chatId}/uploadFile` (messages BEFORE chatId) whereas bulkSendFiles is `/bots/{botId}/chats/{chatId}/messages/bulkSendFiles`. Upload returns `contentMessageToken`; bulk body is `{"items":[{"sendId","contentMessageToken"}]}`.
3. markAsRead is **PUT**, on **v2**, body `{"lastMessage":{"messageId","timestamp(ms int)"}}`. typing is PUT v1 with no body.
4. CSRF: GET /api/v1/csrfToken -> `{"token": "..."}`; sent as header `x-xsrf-token` and mirrored as cookie `XSRF-TOKEN` (domain chat.line.biz). Message list and chat list explicitly fetch it if no cookie.
5. Streaming: `POST /api/v1/bots/{botId}/streamingApiToken` (empty body) -> `{streamingApiToken, expiredAt(ms), connectionId?, lastEventId?, streamingApiBaseUrl?, streamingApiVersion?}`; SSE at `chat-streaming-api.line.biz/api/v2/sse?token&deviceType&clientType=PC&pingSecs=60[&lastEventId]`; events named `init`, `ping`, `chat`; chat event data is an envelope `{botId, chatId, subEvent?, payload:{type:"message", timestamp?, message:{id,type,...}}}` (nested `payload.payload`). Media hash may be at `message.contentHash` or `message.contentProvider.contentHash`.
6. Send/mark-read/typing responses are treated as empty (`{}`) by the library; send does NOT surface the created message id (get_flex_json docstring says "Message ID returned after sending" but send returns nothing).
7. Chats list limit max is 25; messages list limit max 100; bots limit max 1000. Booleans in query are lowercase strings "true"/"false". No `next` handling anywhere.
8. Library injects `x-oa-chat-client-version: 20240513144702` header; the mock may ignore it.
9. Errors are only status codes to this client; do not trust it for error body shape.
