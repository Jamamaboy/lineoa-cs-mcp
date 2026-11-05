# Evidence: propertyos-line-importer
Repo root: test/research/_vendor/propertyos-line-importer/repo/ . Chrome MV3 extension scraping chat.line.biz in-browser. Paths relative to repo root. This is the best source for contacts/tags/notes/owners/savedReplies/CSV request shapes. It never reads message JSON (uses messages.csv instead), and the CSV header is NOT in the repo (see CSV section).

## Common request conventions
- Base `https://chat.line.biz` (src/oam-api.js:3). Every request: `credentials: "include"` (oam-api.js:229-232; test/oam-api.test.js:254,401 assert it and "no Cookie header").
- Headers (oam-api.js:4-7): `Accept: application/json, text/plain, */*` and custom `x-oa-chat-client-version: 20240513144702`. CSV overrides Accept to `text/csv,*/*` (oam-api.js:~823 in csvFetch).
- NO CSRF header and no csrfToken call anywhere in this repo (GET-only repo).
- Errors (oam-api.js:257-282): 401 or 403 -> "LINE_OAM_COOKIE_INVALID" (body never read); 429 -> rate limited; Retry-After header parsed as seconds or HTTP-date (oam-api.js:178-191), fallback 30s (:9); 500/502/503/504 retried (:8). Other statuses -> LINE_API_ERROR with status. The repo never parses any error JSON body, so error body shape is unknown. Cursor-invalid statuses for a page token: 400/404/410 (oam-api.js:~347).
- Rate limit knowledge (comments, oam-api.js:37-41, 664-675): messages.csv admitted at ~1000 req per rolling 60s; Retry-After is honoured; other endpoints share a gate of 30s fallback. Docs reference docs/line-oam-rate-limit-live-test-report.md (not in repo).

## GET /api/v1/me
- Where: src/oam-api.js:285-292 (validateOamSession). Only HTTP success matters; body never read -> shape unknown.

## GET /api/v1/bots?limit=1000&noFilter=true
- Where: src/oam-api.js:296 (BOTS_ENDPOINT), :302-316 (resolveOamBotId)
- Comment oam-api.js:293-295: "Confirmed by the Task 1 spike (2026-06-29): -> { list: [ { botId, basicSearchId: '@handle', name, iconHash, ... } ] }"
### Response fields
| field | type | example | file:line | confidence |
|---|---|---|---|---|
| list | array (code also tolerates `bots` or bare array) | - | oam-api.js:305 | used-in-code (fallbacks guessed-by-repo) |
| list[].botId | string | "Uaaa" | oam-api.js:302-316; test/oam-api.test.js:348 | used-in-code |
| list[].basicSearchId | string with leading "@" | "@070qfvsc" | oam-api.js:294; test:348 | used-in-code |
| list[].name, iconHash | string | - | comment oam-api.js:295 only | comment only |
### Literal example (test/oam-api.test.js:344-352)
```json
{ "list": [ { "botId": "Uaaa", "basicSearchId": "@070qfvsc" }, { "botId": "Ubbb", "basicSearchId": "@other" } ] }
```

## GET /api/v2/bots/{botId}/contacts
- Where: src/oam-api.js:318-355 (fetchContactsPage); called from src/scrape.js (fetchContactsPage use ~:395, spam check ~:410)
- Query (oam-api.js:321-330): query="" (empty, present) ; sortKey=LAST_TALKED_AT ; sortOrder=ASC ; filterKey=ALL or SPAM (CONTACT_FILTER_KEYS oam-api.js:~313; comment: ALL excludes spam-marked contacts, "23,290 rows, none with spam=true", verified 2026-11-01) ; limit=100 ; next=<opaque> (oam-api.js:~331)
- Validation (oam-api.js:~339-345): body is object, `list` array with length <= 100, `next` null/undefined/string.
### Response fields (from contacts-page.json + src/scrape.js)
| field | type | example | file:line | confidence |
|---|---|---|---|---|
| list[].contactId | string; "U..." direct user, "C..." group, "R..." room | "U-OAM-DIRECT" | test/fixtures/contacts-page.json:4,41,59; scrape.js:84-97 | typed (fixture) |
| list[].chatExists | boolean | true | fixture:5; scrape.js:101 (required boolean) | typed |
| list[].chatAvailable | boolean | true | fixture:6; scrape.js:76 | typed |
| list[].done | boolean | false | fixture:7; scrape.js:77 | typed |
| list[].followedUp | boolean | true | fixture:8; scrape.js:78 | typed |
| list[].spam | boolean | false | fixture:9; scrape.js:79 | typed |
| list[].useManualChat | boolean | false | fixture:10; scrape.js:80 | typed |
| list[].lastTalkedAt | number epoch ms, or null (no chat) | 1781947777445 | fixture:11,48; scrape.js:105,130 | typed |
| list[].tagIds | string[] (unique, non-empty) | ["tag-apartment"] | fixture:12; scrape.js:102-104 | typed |
| list[].autoTagIds | string[] | ["auto-do-not-upload"] | fixture:13 | fixture only (not read by scrape.js) |
| list[].friend | boolean (optional; read as isSubscribed) | - | scrape.js:131 | used-in-code, absent in fixture |
| list[].profile.userId | string (direct) equals contactId | "U-OAM-DIRECT" | fixture:15; scrape.js:95,111 | typed |
| list[].profile.groupId | string (group) equals contactId | "C-OAM-GROUP" | fixture:33; scrape.js:94,111 | typed |
| list[].profile.roomId | string (room) | "R-OAM-ROOM" | fixture:70; scrape.js:92 | typed |
| list[].profile.name | string | "Direct Person" | fixture:16; scrape.js:120 | typed |
| list[].profile.nickname | string or null | "Direct nickname" / null | fixture:17,35; scrape.js:122 | typed |
| list[].profile.iconHash | string or null | "icon-direct" / null | fixture:18,55; scrape.js:126 | typed |
| list[].profile.count | number (group/room member count) | 3 | fixture:37,74 | fixture only |
| next | string (opaque) or absent/null | "sanitized-next-token" | fixture:78; oam-api.js:~341 | typed |
### Literal example: test/fixtures/contacts-page.json:1-79 (verbatim)
```json
{
  "list": [
    {
      "contactId": "U-OAM-DIRECT",
      "chatExists": true,
      "chatAvailable": true,
      "done": false,
      "followedUp": true,
      "spam": false,
      "useManualChat": false,
      "lastTalkedAt": 1781947777445,
      "tagIds": ["tag-apartment"],
      "autoTagIds": ["auto-do-not-upload"],
      "profile": {
        "userId": "U-OAM-DIRECT",
        "name": "Direct Person",
        "nickname": "Direct nickname",
        "iconHash": "icon-direct"
      }
    },
    {
      "contactId": "C-OAM-GROUP",
      "chatExists": true,
      "chatAvailable": true,
      "done": false,
      "followedUp": false,
      "spam": false,
      "useManualChat": false,
      "lastTalkedAt": 1781947778445,
      "tagIds": ["tag-follow-up"],
      "autoTagIds": [],
      "profile": {
        "groupId": "C-OAM-GROUP",
        "name": "Group Chat",
        "nickname": null,
        "iconHash": "icon-group",
        "count": 3
      }
    },
    {
      "contactId": "U-OAM-NO-CHAT",
      "chatExists": false,
      "chatAvailable": false,
      "done": false,
      "followedUp": false,
      "spam": false,
      "useManualChat": false,
      "lastTalkedAt": null,
      "tagIds": [],
      "autoTagIds": ["auto-do-not-upload"],
      "profile": {
        "userId": "U-OAM-NO-CHAT",
        "name": "No Chat Person",
        "nickname": null,
        "iconHash": null
      }
    },
    {
      "contactId": "R-OAM-ROOM",
      "chatExists": true,
      "chatAvailable": true,
      "done": false,
      "followedUp": false,
      "spam": false,
      "useManualChat": false,
      "lastTalkedAt": 1781947779445,
      "tagIds": [],
      "autoTagIds": [],
      "profile": {
        "roomId": "R-OAM-ROOM",
        "name": "Unsupported Room",
        "nickname": null,
        "iconHash": "icon-room",
        "count": 2
      }
    }
  ],
  "next": "sanitized-next-token"
}
```
### Notes
- Fixture is sanitized/hand-built (ids like "U-OAM-DIRECT"); real LINE ids are "U" + 32 hex. Sorting by lastTalkedAt ASC puts null first presumably (not stated).
- Page cap: list.length <= 100 enforced.

## GET /api/v1/bots/{botId}/tags
- Where: src/oam-api.js:360-390 (fetchTags). No query.
- Strict envelope: object with EXACTLY one key `list` (oam-api.js:~364-370).
### Response fields
| field | type | example | file:line | confidence |
|---|---|---|---|---|
| list[].tagId | non-empty string | "tag-apartment" | fixtures/tags.json:4 | typed |
| list[].name | string | "Apartment" | tags.json:5 | typed |
| list[].count | number | 28 | tags.json:6 | typed |
| list[].createdAt | number epoch ms | 1686036211358 | tags.json:7 | typed |
| list[].updatedAt | number epoch ms | 1781947777445 | tags.json:8 | typed |
### Literal: test/fixtures/tags.json:1-18 (verbatim)
```json
{
  "list": [
    { "tagId": "tag-apartment", "name": "Apartment", "count": 28, "createdAt": 1686036211358, "updatedAt": 1781947777445 },
    { "tagId": "tag-follow-up", "name": "Follow up", "count": 7, "createdAt": 1686036212358, "updatedAt": 1781947778445 }
  ]
}
```
(Original fixture is the same data pretty-printed, one field per line.)

## GET /api/v1/bots/{botId}/owners
- Where: src/oam-api.js:477-500 (fetchOwners); called only on final batch (src/scrape.js:~439-449).
- Comment (oam-api.js:~470-476): "The envelope is unconfirmed - admins were observed as { bizId, name, linePictureUri } objects - so both a bare array and { list } are accepted."
### Response fields
| field | type | example | file:line | confidence |
|---|---|---|---|---|
| (root) | array OR { list: [] } - unconfirmed | - | oam-api.js:478-486 | guessed-by-repo |
| [].bizId | non-empty string | "B1" | oam-api.js:~490; test/oam-api.test.js:1032 | used-in-code |
| [].name | string | "Alice" | test:1032 | used-in-code |
| [].linePictureUri | URL string | "https://x/a.png" | test:1032; comment | comment/test only |
### Literal (test/oam-api.test.js:1031-1039)
```js
[ { bizId: "B1", name: " Alice ", linePictureUri: "https://x/a.png" }, { bizId: "B2", name: "Bob" }, { bizId: "B1", name: "Alice again" }, { bizId: "", name: "No id" }, { bizId: "B3", name: "   " }, { bizId: "B4" }, null ]
```

## GET /api/v1/bots/{botId}/chats/{chatId}/notes
- Where: src/oam-api.js:503-575 (fetchChatNotes)
- Query (oam-api.js:511-513): limit=20, withTotal=true, next=<opaque cursor>. Comment (oam-api.js:~498-501): confirmed with authenticated probe 2026-08-11; same opaque `next` cursor as contacts; every page reports `total`.
### Response fields
| field | type | example | file:line | confidence |
|---|---|---|---|---|
| list | array | - | oam-api.js:~522 | typed |
| total | non-negative integer, present on every page, equal across pages | 1 | fixtures/notes-page.json:11; oam-api.js:~523-525 | typed |
| next | non-empty string, or absent/null on last page | - | oam-api.js:~526 | used-in-code (no next in fixtures) |
| list[].noteId | string | "note-1" | notes-page.json:4 | typed |
| list[].body | string | "Sanitized note body" | notes-page.json:5 | typed |
| list[].userBizId | string or null (author = owners[].bizId) | "sanitized-admin-id" | notes-page.json:6; oam-api.js:~540 | typed |
| list[].createdAt / updatedAt | number epoch ms | 1686036211358 / 1686036212358 | notes-page.json:7-8 | typed |
### Literal: test/fixtures/notes-page.json (verbatim) and notes-empty-page.json
```json
{ "list": [ { "noteId": "note-1", "body": "Sanitized note body", "userBizId": "sanitized-admin-id", "createdAt": 1686036211358, "updatedAt": 1686036212358 } ], "total": 1 }
```
```json
{ "list": [], "total": 0 }
```
(Originals are pretty-printed; same content.)

## GET /api/v1/bots/{botId}/chats/{chatId}/members (group chats only)
- Where: src/oam-api.js:582-612. Query: limit=100, next=<cursor>.
- Fields: list[].userId (string, required), list[].name, list[].nickname (string or null), list[].iconHash (string or null); next string/absent (oam-api.js:~596-612). Used-in-code only; no fixture. Group roster excludes the OA host side (comment above fn).

## GET /api/v2/bots/{botId}/savedReplies
- Where: src/oam-api.js:435-465 (fetchSavedReplies)
- Query: query= (empty), excludeUsernamePlaceholder=false, sortKey=CREATED_AT, pageSize=100, page=N starting at 1 (oam-api.js:440-443; asserted in test/oam-api.test.js:1113-1116). Page-numbered, NOT cursor.
- Response: { list: [ { savedReplyId, title, message: { type: "text", text, emojis: [] }, isFavorite } ], total: int, totalFavorites: int } (comment oam-api.js:~407-409 "observed live 2026-10-28"; validation :~444-452; test:1067-1068). Empty `list` ends the walk.

## GET /download/{botId}/{chatId}/messages.csv?timezoneOffset=-420
- Where: src/oam-api.js:872-876 (downloadChatCsv): `${BASE}/download/${botId}/${chatId}/messages.csv?timezoneOffset=${timezoneOffset}`; default timezoneOffset = -420 (minutes; UTC+7 Bangkok sign convention: negative east of UTC like JS getTimezoneOffset) (oam-api.js:~870).
- Headers: standard HEADERS but Accept: `text/csv,*/*` (oam-api.js:~823). credentials include.
- Response handling: `res.text()` (oam-api.js:~876) -> raw string passed through to server as `csv` (src/scrape.js:196-203); the extension does NOT parse the CSV.
- **Columns/encoding/header row: NOT PRESENT in this repo.** The only evidence is the test stub body `"Sender type,..."` and `"Sender type,ok"` (test/oam-api.test.js:366-367, 378-381), suggesting the header row's first column is `Sender type`. No BOM, encoding or quoting info (res.text() decodes as UTF-8 by default; a BOM, if any, would remain in the string - unknown).
- Rate limit: ~1000 requests / 60 s admission; 429 recovery probe after 2 s then 60 s (oam-api.js:~677-690 constants CSV_START_SPACING_MS=67, CSV_FIRST_429_RETRY_MS=2000, CSV_FINAL_429_RETRY_MS=60000).

## Not covered by this repo
chats list endpoint (/api/v2/bots/{id}/chats), single chat, messages JSON (v3), send, uploadFile/bulkSend, csrfToken, markAsRead, error JSON bodies, content host, SSE, CSV columns.

## Surprises
1. contacts: `contactId` doubles as chatId; type by prefix: U=direct, C=group, R=room (scrape.js:84-97); group profile has `groupId` instead of `userId`, plus `count`.
2. All ts are epoch ms numbers; `lastTalkedAt` can be null when chatExists=false.
3. contacts uses `query=` (empty but present), `filterKey=ALL|SPAM`, `sortKey=LAST_TALKED_AT&sortOrder=ASC`, limit up to 100; cursor `next`.
4. Notes envelope includes `total` (needs `withTotal=true`); tags envelope has only `list`; saved replies page-numbered with `total`/`totalFavorites`.
5. Custom header `x-oa-chat-client-version: 20240513144702` is sent on every call; 401 AND 403 are both treated as "cookie invalid"; 429 carries Retry-After.
6. messages.csv path is /download/... (not /api/...), query `timezoneOffset`, first header column apparently "Sender type".
