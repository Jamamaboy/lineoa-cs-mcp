# Evidence: line-friend-export
Repo root: test/research/_vendor/line-friend-export/repo/ (TypeScript scripts 01-06, node-fetch). Only 03-get-chats.ts touches chat.line.biz; 01/02 use the official Messaging API (api.line.me). Paths below relative to repo root.

## GET https://chat.line.biz/api/v2/bots/{botId}/chats
- Where: 03-get-chats.ts:23-59 (URL built :33-35)
- Query: folderType=ALL (:29), limit=25 (:30), next=<opaque string from previous page> (:35). Nothing else.
- botId comes from env LINE_CHAT_ID (:34). Auth is a raw `Cookie` header from env LINE_CHAT_COOKIE (:38-40). No CSRF/XSRF/other header is sent, so GET needs only the session cookie.
- Non-200: prints body text and exits (:43-46); error body shape not recorded.
### Response fields (type declared at 03-get-chats.ts:9-18)
| field | type | example | file:line | confidence |
|---|---|---|---|---|
| list | array | - | 03:10 | typed (hand-written type, comment :5-7 says undocumented as of Aug 2023) |
| list[].profile | object | - | 03:11 | typed |
| list[].profile.name | string (optional) | - | 03:12 | typed; matched against Messaging-API displayName in 06-join.ts:57 |
| list[].profile.nickname | string (optional) = name the store staff set for the customer | - | 03:13; 06-join.ts:38-40,69 | typed |
| list[].profile.iconHash | string (optional) = path on profile.line-scdn.net | - | 03:14; 05-append-chat-hashes.ts:41 | typed + used-in-code |
| next | string (optional; absent on last page) | - | 03:17, :50 | typed |
### Notes / disagreements
- BUG in repo: `if (!responseBody.next) break;` (03:50-52) runs BEFORE `concat(responseBody.list)` (:54), so the last page's list is dropped. For a mock this only tells us that the final page has no `next` key (or falsy).
- The type lists only `profile`; real items surely have more (chatId etc.) but this repo does not reference them -> unknown here.
- Item `profile` shape differs from the Messaging API profile: `name`/`iconHash` (chat.line.biz) vs `displayName`/`pictureUrl` (api.line.me).

## GET https://profile.line-scdn.net/{iconHash}
- Where: 05-append-chat-hashes.ts:41-44. Public CDN, no auth; body is image bytes (hashed SHA-256, base64, :44).

## (Official API, not chat.line.biz, for contrast) GET https://api.line.me/v2/bot/followers/ids?limit=1000&start=
- Where: 01-get-follower-ids.ts:21-30. Header `Authorization: Bearer <channel token>` (:28). Response typed {userIds: string[]; next?: string} (:8-11). Bug: breaks before concatenating the last page (:39-43).

## GET https://api.line.me/v2/bot/profile/{userId}
- Where: 02-get-profiles.ts:23-30. Typed {displayName: string; userId: string; language?: string; pictureUrl?: string; statusMessage: string} (02:8-14). pictureUrl is a LINE CDN image URL.

## Literal examples
None (no fixtures or tests in repo).

## Not covered by this repo
/api/v1/me, /bots, single chat, messages, send, uploads, csrfToken, error bodies, contacts, notes, tags, owners, markAsRead, CSV download, content host, SSE.

## Surprises
1. chats list items nest user info under `profile` ({name, nickname, iconHash}); `nickname` is where the staff-assigned customer name lives.
2. `iconHash` is not a URL; avatar = https://profile.line-scdn.net/{iconHash}.
3. Pagination is `next` (opaque) in query; page size limit=25 used; last page has no `next`.
4. GET works with Cookie header only (no CSRF) per this repo.
5. Typed fields are optional (name?, nickname?, iconHash?) so the mock should sometimes omit them.
