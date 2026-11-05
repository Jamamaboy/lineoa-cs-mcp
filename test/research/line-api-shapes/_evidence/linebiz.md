# Evidence: linebiz (PrakritManStudio/linebiz, TypeScript, read-only SDK)

Read by the orchestrator (Opus). Paths are relative to `test/research/_vendor/linebiz/repo/`.
Confidence: **typed** = declared in a TS interface; **fixture** = in `test/fixtures/*`; **code** = only used in code.

## Common
- Base URLs: chat `https://chat.line.biz`, manager `https://manager.line.biz`, account `https://account.line.biz` — `src/core/services.ts:5-9`
- Header `x-oa-chat-client-version: 20240513144702` on every chat call — `src/core/http.ts:224`, `src/core/services.ts:16`
- `Accept: application/json`; `Content-Type: application/json` when there is a body — `src/core/http.ts:223-225`
- Cookies only sent to https `*.line.biz` / `*.line.me` — `src/core/services.ts:18-31`
- List responses are `{ list: [...], next?: string }` (or `backward` for messages); `null` / `""` cursor = last page — `src/core/pagination.ts:17-43`
- A cursor that does not advance is treated as an error — `src/core/pagination.ts:48`

## GET /api/v1/csrfToken
- Response `{ headerName, parameterName, token }`; only `headerName` + `token` are required — `src/core/http.ts:277-305`, fixture `test/unit/http-csrf.test.ts:17-18` (`{headerName:"X-XSRF-TOKEN", parameterName:"_csrf", token}`)
- Sent on writes in the header the server names (default `x-xsrf-token`) — `src/core/http.ts:272-273`
- On 403: refresh token, resend once — `src/core/http.ts:~459-468`, README.md:184

## Errors
- 401 → `SESSION_EXPIRED` iff body `code === "not_login"`, else `UNAUTHORIZED` — `src/core/errors.ts:213-224`, README.md:237
- 403 → PERMISSION_DENIED, 404 → NOT_FOUND, 429 → RATE_LIMITED (+`Retry-After`), 5xx → server error — `src/core/errors.ts:204-208,245-255`
- Sessions "typically last less than a day", not renewed — README.md:334
- `flexJson` on an unknown message returns **500** (never retry) — `src/resources/messages.ts:82`

## GET /api/v1/me — `src/resources/me.ts:14`
| field | type | file:line | conf |
|---|---|---|---|
| bizId | string (UUID) | src/types/me.ts:3, test/fixtures/ids.ts:5 | typed |
| language | string | src/types/me.ts:4 | typed |
| name | string | src/types/me.ts:5 | typed |
| linePictureUri | string | src/types/me.ts:6 | typed |
| localStorageEncryptionKey | string | src/types/me.ts:7 | typed |

## GET /api/v1/bots?noFilter=true&limit=1000&next= — `src/resources/bots.ts:26-37`
Also `GET /api/v1/bots/{botId}?noFilter=true` → Bot + `hasChatRoom` — `src/resources/bots.ts:47-57`, `src/types/bots.ts:23-25`
Fields `src/types/bots.ts:2-20`: botId, basicSearchId ("@fake-oa"), name, iconUrl, iconHash, region ("TH"), brandType ("GENERAL"),
userPermissionType ("ADMIN"), responseMode ("CHAT"), disabledCrm, unreadCount, plan{code,planType}, offline, chatGrade? ("GRADE_A") — fixture `test/fixtures/bots.ts:4-24`.
Bot ids in fixtures start with `U` + 32 hex (`test/fixtures/ids.ts:4`).

## GET /api/v2/bots/{botId}/chats — `src/resources/chats.ts:34-55`
Query: `folderType` (default `ALL`), `tagIds` (repeated), `autoTagIds=""`, `limit` 1-25 (default 25), `prioritizePinnedChat=true`, `next`.
Chat fields `src/types/chats.ts:33-58`: chatId, updatedAt, tagIds[], autoTagIds[], read, readMentioned?, done, followedUp, spam,
muteAtPc, muteAtApp, assignedBizId?, profile, latestEvent? (a MessageEvent), lastReadAt, lastReceivedAt, lastSentAt?, lastTalkedAt,
lastReadMessageId, userLastReadAt?, userLastReadMessageId?, chatType `GROUP|USER|ROOM`, status `active|blocked`.
profile (user) `src/types/chats.ts:4-15`: userId, name, friend, lastActivityExpiresAt (ms), iconHash.
profile (group) `src/types/chats.ts:18-27`: groupId, count, name?, iconHash?.
Fixture `test/fixtures/chats.ts:8-100`. All timestamps are epoch **ms**.

## GET /api/v3/bots/{botId}/chats/{chatId}/messages?backward= — `src/resources/messages.ts:40-50`
- Only query param is `backward` (cursor from previous page). **Newest first**; following pages go back in time — `src/resources/messages.ts:9,22-23`
- Response `{ list: MessageEvent[], backward?: string }` — `src/resources/messages.ts:50`, fixture `test/fixtures/messages.ts:8-102`
- Event types `src/types/messages.ts:309-319`: `chatRead`, `message` (from user), `messageSent` (from OA), `unsend`, `join`, `leave`,
  `memberLeft`, `memberJoined`, `follow`, `unfollow`. Every event: `type`, `timestamp` (ms), `source{chatId, userId?}`.
- `message` (received) payloads `src/types/messages.ts:54-151`:
  - text: id, text, quotedMessageId?, quoteToken?, emojis?[{index,length,productId,emojiId}], mention?{mentionees[]}, originalType? (e.g. "flex")
  - image: id, quoteToken?, contentProvider{type:"line",contentHash,expired,expiredAt}, contentHash, expired, expiredAt
  - video: same as image + duration (ms?) ; audio: contentProvider + duration + contentHash/expired/expiredAt (no quoteToken)
  - file: contentProvider + fileName + fileSize + contentHash/expired/expiredAt
  - sticker: packageId (string), stickerId (string), stickerResourceType `STATIC|ANIMATION|SOUND|ANIMATION_SOUND|…`, quotedMessageId?, quoteToken?
  - location: latitude, longitude, address (no title in the type)
  - unsent: `{id, type:"unsent"}` only — `src/types/messages.ts:105-108`
- `messageSent` payloads `src/types/messages.ts:162-227`: text / sticker like above; image & video use
  `contentProvider{type:"external", originalContentUrl, previewImageUrl}` and **no contentHash**; file uses `type:"line"` like received.
  Extra top-level `sendId?`, `bizId?` (staff who sent) — `src/types/messages.ts:226-227`.
- `unsend` event: `unsend{messageId}` — `src/types/messages.ts:231-240`. `chatRead`: `read{watermark}` — `:33-44`.
- Flex: `GET /api/v1/bots/{botId}/chats/{chatId}/messages/flexJson?messageId=&timestamp=` — `src/resources/messages.ts:80-81`

## GET /api/v2/bots/{botId}/contacts — `src/resources/contacts.ts:62-71`
Query: `query` (name search, default ""), `sortKey` DISPLAY_NAME|LAST_TALKED_AT, `sortOrder` ASC|DESC, `filterKey` ALL|FRIEND|NOT_FRIEND|GROUP|SPAM,
`limit` 1-100 (default 20), `next`. Fields `src/types/contacts.ts:19-33`: contactId, profile, tagIds, autoTagIds, done, followedUp, spam,
friend?, useManualChat, chatAvailable, lastTalkedAt, chatExists, assignedBizId?. Fixture `test/fixtures/contacts.ts`.
Note `contactId` equals the user's `userId` for users (fixture `test/fixtures/contacts.ts:7`).

## GET /api/v1/bots/{botId}/tags?tagIds= — `src/resources/tags.ts:29`
`{list:[{tagId, name, count, createdAt, updatedAt}]}` — `src/types/tags.ts:2-8`; tag ids are 26 lowercase alnum (`test/fixtures/ids.ts:6`).

## GET /api/v1/bots/{botId}/owners?bizIds= — `src/resources/owners.ts:33`
`{list:[{bizId, name, linePictureUri?}]}` — `src/types/owners.ts:2-6`.

## GET /api/v1/bots/{botId}/chats/{chatId}/members — `src/resources/members.ts:51`
Group/room only (chatId starts with `C` or `R`) — `src/core/validate.ts:63-73`. `{list:[{userId,name,iconHash}], next?}`.

## POST /api/v1/logoutUri `{redirectPath:"/"}` → `{logoutUri}` — `src/resources/auth.ts:16-31`

## Not covered by linebiz
messages/send, uploadFile, bulkSendFiles, markAsRead, notes, single chat GET, download/messages.csv, chat-content download, SSE.

## Surprises
- Messages page is **newest-first** with a `backward` cursor; no `limit` param is sent.
- `message` vs `messageSent` is how you tell customer vs staff; `bizId` on `messageSent` names the staff member.
- Sent image/video use `contentProvider.type:"external"` with URLs, while received media use `type:"line"` + `contentHash`.
- `unsent` is a *message type* inside a `message` event **and** `unsend` is a separate event type.
- ids: user/bot `U`+32 hex, group `C`+32 hex, room `R`+…, message id = 18-digit numeric string, bizId = UUID.
