# Evidence: line-chat-history-downloader
Repo root: test/research/_vendor/line-chat-history-downloader/repo/ . Browser extension (content script runs on chat.line.biz, uses the logged-in cookie via same-origin fetch; no CSRF header is sent anywhere). All paths below are relative to the repo root. Response shapes are inferred from usage only (plain JS, no types, no fixtures): confidence is "used-in-code" throughout.

## GET /api/v2/bots/{botId}/chats
- Where: scripts/downloader.js:70-89 (call at :74-80)
- URL literal (:76-78): `https://chat.line.biz/api/v2/bots/${botId}/chats?folderType=ALL&tagIds=&autoTagIds=&limit=25&` + (`next=${next}&` when set) + `prioritizePinnedChat=true`
- Query: folderType=ALL (:76), tagIds= (empty, :76), autoTagIds= (empty, :76), limit=25 (:76), next=<opaque> (:77), prioritizePinnedChat=true (:78)
- botId source: `location.href.split("/")[3]` i.e. first path segment of https://chat.line.biz/{botId}/... (:3-4)
- Headers/cookies: none set explicitly (same-origin, cookie implicit).
### Response fields
| field | type | example | file:line | confidence |
|---|---|---|---|---|
| list | array | - | scripts/downloader.js:83 | used-in-code |
| list[].chatId | string | - | :84 | used-in-code |
| next | string or falsy (absent/null at end) | - | :81, :87 | used-in-code |
### Notes
- Termination: `if (!next) break;` (:87), so last page has no `next` (or falsy).

## GET /api/v3/bots/{botId}/chats/{chatId}/messages
- Where: scripts/downloader.js:91-110 (call :95-101)
- URL (:97-99): `https://chat.line.biz/api/v3/bots/${botId}/chats/${chatId}/messages` + (`?backward=${backward}` when set). First request has NO query string at all.
- Pagination: **backward cursor only**. Response field `backward` (opaque string) is fed back as `?backward=`. Loop ends when `backward` falsy (:102, :108). No `before`/`after`/`limit` are used by this repo. Items in `list` are yielded in the order returned (:104-106); the repo does not state the order, but since it pages with `backward` it is walking toward older messages (inference).
### Response fields
| field | type | example | file:line | confidence |
|---|---|---|---|---|
| list | array of event objects | - | :104 | used-in-code |
| backward | string or falsy | - | :102,108 | used-in-code |
| list[].type | string: "message" (from user) / "messageSent" (from OA/staff/bot); other types silently skipped | "message" | :118-122, :124 | used-in-code |
| list[].timestamp | number, epoch **milliseconds** (compared with Date.now() and with `<input type=date>.valueAsNumber`, both ms) | - | :116, popup/js/script.js:4-5 | used-in-code |
| list[].source.chatId | string | - | :126 | used-in-code |
| list[].message | object (inner message) | - | :128 | used-in-code |
| list[].message.type | "text" / "flex" / "image" / "file" / "audio" / "video" / "sticker" (others fall through the switch -> undefined -> dropped) | - | :141-185 | used-in-code |
| list[].message.id | string (messageId) | - | :147 | used-in-code |
| list[].message.text | string | - | :156 | used-in-code |
| list[].message.originalType | "flex" when a flex message is exposed as type "text" | "flex" | :143 | used-in-code |
| list[].message.contentHash | string (used to build content URL and filename) | - | :168-169 | used-in-code |
| list[].message.stickerId | string/number (interpolated into URL) | - | :177, :210 | used-in-code |
| list[].message.stickerResourceType | "STATIC" / "POPUP" -> png; anything else -> animation (e.g. ANIMATION, SOUND, ...) | "STATIC" | :178-182 | used-in-code |
### Message-type handling table (generateMessageData, :140-186)
| message.type | emitted | fields consumed |
|---|---|---|
| text, originalType=="flex" | type "flex" | message.id, timestamp (:143-150) |
| text (otherwise) | type "text" | message.text (:151-158) |
| flex (type literally "flex") | treated as media! | contentHash, ext from fileExtension("flex") = undefined -> filename ends "undefined" (:159-171, :188-197) |
| image | media, ext .jpg | contentHash (:160,168,190-191) |
| file | media, ext undefined (fileExtension has no "file" case, filename becomes `<hash>undefined`) | contentHash (:161) |
| audio | media, ext .m4a | contentHash (:162,192-193) |
| video | media, ext .mp4 | contentHash (:163,194-195) |
| sticker | sticker | stickerId, stickerResourceType (:172-184) |
| location / unsend / imagemap / template / others | not handled (returns undefined; dropped, :132) | - |
- Events with outer `type` other than "message"/"messageSent" (system, read, assign events etc.) are skipped (`role` null, :117-124). The repo never names those other types.
- fileName for files: no original fileName/fileSize used; only contentHash.

## GET https://chat-content.line.biz/bot/{botId}/{contentHash}
- Where: scripts/downloader.js:199-206
- URL: `https://chat-content.line.biz/bot/${botId}/${contentHash}` (:201), `{ credentials: "include" }` (:202), response read as `.blob()` (:205). No `?preview`/size params. Same URL used for image, file, audio, video (and "flex" typed as media).
- Auth: cross-origin to chat-content.line.biz, relies on cookies (credentials include).

## GET https://stickershop.line-scdn.net/stickershop/v1/sticker/{stickerId}/ANDROID/{sticker.png|sticker_animation.png}
- Where: scripts/downloader.js:208-214 (:210). Public CDN, no credentials. Suffix chosen at :178-182.

## GET /api/v1/bots/{botId}/messages/{chatId}/flexJson
- Where: scripts/downloader.js:216-222 (URL :218)
- Query: timestamp=<ms from list[].timestamp> (:46,218), messageId=<message.id> (:45,218). Note the path puts chatId after "messages/" (not "chats/").
- Response: arbitrary JSON (the flex container), saved as-is via JSON.stringify (:49). Shape not inspected -> unknown.

## Literal examples
None in repo (no fixtures, no tests). Only saved-output format (zip): per chat folder named by chatId (:15) with media/, stickers/, flex-messages/{messageId}.json and data.json (an array of {type,timestamp,content?|messageId?|fileName?|sticker?|stickerResourceType?,role}) (:53-61).

## Not covered by this repo
/api/v1/me, /api/v1/bots, single chat, send, uploadFile/bulkSendFiles, csrfToken, error bodies, contacts/notes/tags/owners/markAsRead, messages.csv, SSE/streamingApiToken, message `limit`/before/after, fileName/fileSize/duration/location lat-long/unsend shapes, sender/sendBy fields. No error handling at all (no status checks, :74-80, :95-101).

## Surprises
1. Messages pagination uses ONLY `backward` (response field `backward` -> next query `?backward=`), first call has no query.
2. Outer event type is "message" (user->OA) vs "messageSent" (OA->user); the actual payload is nested in `.message` with its own `.type` (:118-128). Chat id lives at `source.chatId`.
3. Flex messages are delivered as `message.type=="text"` with `originalType=="flex"`; full JSON is obtained from a separate /api/v1/bots/{botId}/messages/{chatId}/flexJson?timestamp&messageId call.
4. Media content URL is chat-content.line.biz/bot/{botId}/{contentHash} with no extension; the repo guesses extensions (.jpg/.m4a/.mp4).
5. Timestamps are epoch ms; sticker image type is picked from stickerResourceType STATIC/POPUP vs anything else.
