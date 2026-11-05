# line-api-shapes: รูปร่าง API ภายในของ chat.line.biz (fixture สำหรับทำ mock)

Research round 3 · 2026-11-05 · branch `research`

**ทุกค่าในนี้ปลอม** ทั้ง id, hash, token, ชื่อคน และ cookie ส่วนชื่อ field และโครงสร้างอ่านมาจาก source code ของ 6 repo ใน
`test/research/_vendor/` เราไม่ได้ยิงไปที่ LINE จริงเลย จึงต้องยืนยันทุกอย่างด้วย HAR ใน Phase 4

- ไฟล์ทั้งหมดสร้างจาก `test/research/tools/gen_line_api_shapes.py` ถ้าต้องแก้ ให้แก้ที่สคริปต์แล้วสร้างใหม่ด้วยคำสั่ง
  `python3 -I test/research/tools/gen_line_api_shapes.py test/research`
- หลักฐานดิบแยกตาม repo (มี file:line ทุกบรรทัด) อยู่ใน `_evidence/<repo>.md` linebiz อ่านโดย Opus ส่วน repo อื่นอ่านโดย
  Sonnet 3 ตัว แล้ว Opus สุ่มตรวจบรรทัดสำคัญเทียบกับ source อีกรอบ

## รูปแบบไฟล์

```jsonc
{
  "_meta": {
    "endpoint": "GET /api/v2/bots/{botId}/chats",
    "host": "https://chat.line.biz",
    "requestHeaders": {...},  // ที่ client ควรส่ง (cookie/XSRF เป็นค่าปลอม)
    "query": {...},           // ตัวอย่าง query
    "sources": [...],         // repo + file:line
    "uncertain": [...],       // ต้องยืนยันจาก HAR
    "conflicts": [...],       // repo บอกไม่ตรงกัน (จดไว้ทั้งสองแบบ)
    "notes": [...]
  },
  "request": {...},           // เฉพาะ POST/PUT
  "response": { "status": 200, "body": {...} }   // mock ส่ง body นี้กลับได้เลย
}
```
`errors-other.json` กับ `chat-content.json` ใช้ `examples` แทน `response` ส่วน `download-messages-csv.json` ชี้ไปที่
`download-messages.csv`

### id ปลอมที่ใช้ร่วมกันทุกไฟล์
| อะไร | ค่า | รูปแบบจริง (อ้างอิง) |
|---|---|---|
| bot (OA) | `Ub070000000000000000000000000001` | `U` + 32 hex (linebiz test/fixtures/ids.ts:4) |
| ลูกค้า สมชาย / นก / Mint / อาทิตย์ / พิม | `Uc5…01` … `Uc5…05` | `U` + 32 hex |
| แชทกลุ่ม | `Ca11…01` | กลุ่มขึ้นต้นด้วย `C` ห้อง (room) ขึ้นต้นด้วย `R` (linebiz src/core/validate.ts:63-73) |
| chatId ของแชท 1:1 | **เท่ากับ userId ของลูกค้า** | propertyos src/scrape.js:84-97, linebiz fixtures/contacts.ts:7 |
| staff (bizId) | `00000000-0000-4000-8000-0000000000a1` (ปุ้ย = เรา), `…a2` (Ton) | UUID (linebiz ids.ts:5) |
| message id | `5869000000000001xx` | ตัวเลข 18 หลักแต่ส่งเป็น **string** (linebiz ids.ts:8) |
| tagId | `fakevip000000000000000000a` | ตัวอักษรพิมพ์เล็ก/ตัวเลข 26 ตัว (linebiz ids.ts:6) |
| เวลา | epoch **ms** เริ่มที่ 2026-11-05 09:00 ICT = `1793844000000` | ทุก repo ใช้ ms |

## สารบัญ endpoint

ความมั่นใจ: **สูง** = มี TS type หรือหลาย repo ตรงกัน · **กลาง** = มี repo เดียว หรืออ่านจากโค้ดที่ใช้ field นั้นเท่านั้น ·
**ต่ำ** = เดาเอง (ต้องดู HAR)

| ไฟล์ | Method + path | มั่นใจ | แหล่งหลัก |
|---|---|---|---|
| `me.json` | `GET /api/v1/me` | สูง | linebiz types/me.ts |
| `bots.json` | `GET /api/v1/bots?noFilter=true&limit=1000` | สูง | linebiz types/bots.ts + LINELib + omnichat |
| `chats.json` | `GET /api/v2/bots/{botId}/chats` | สูง | linebiz types/chats.ts + 4 repo |
| `chat.json` | `GET /api/v1/bots/{botId}/chats/{chatId}` | **ต่ำ** | LINELib เรียก endpoint นี้แต่ไม่อ่าน field เลย เราสมมติว่าหน้าตาเหมือน 1 item ของ chats |
| `messages.json` + `messages.older-page.json` | `GET /api/v3/bots/{botId}/chats/{chatId}/messages` | สูง (shape) / กลาง (pagination) | linebiz types/messages.ts |
| `messages-send.json` | `POST /api/v1/bots/{botId}/chats/{chatId}/messages/send` | กลาง (request) / **ต่ำ** (response) | LINELib, omnichat |
| `upload-file.json` | `POST /api/v1/bots/{botId}/messages/{chatId}/uploadFile` | สูง | LINELib + omnichat ตรงกัน |
| `bulk-send-files.json` | `POST /api/v1/bots/{botId}/chats/{chatId}/messages/bulkSendFiles` | สูง (request) / ต่ำ (response) | LINELib + omnichat |
| `csrf-token.json` | `GET /api/v1/csrfToken` | สูง | linebiz http.ts + test, LINELib |
| `error-401-not-login.json` | 401 `{code:"not_login"}` | สูง (เฉพาะ `code`) | linebiz errors.ts:213-224 |
| `errors-other.json` | 400/403/404/429/500 | status สูง / body ต่ำ | linebiz errors.ts, omnichat test |
| `contacts.json` | `GET /api/v2/bots/{botId}/contacts?query=` | สูง | linebiz types/contacts.ts + propertyos fixture |
| `notes.json` | `GET /api/v1/bots/{botId}/chats/{chatId}/notes?limit=20&withTotal=true` | กลาง | propertyos fixture + oam-api.js |
| `tags.json` | `GET /api/v1/bots/{botId}/tags` | สูง | linebiz + propertyos fixture |
| `owners.json` | `GET /api/v1/bots/{botId}/owners` | กลาง | linebiz types (envelope ยังไม่ชัด) |
| `mark-as-read.json` | `PUT /api/v2/bots/{botId}/chats/{chatId}/markAsRead` | กลาง | LINELib เท่านั้น |
| `chat-content.json` | `GET https://chat-content.line.biz/bot/{botId}/{contentHash}[/preview]` | กลาง | downloader, LINELib |
| `download-messages-csv.json` + `.csv` | `GET /download/{botId}/{chatId}/messages.csv?timezoneOffset=-420` | URL สูง / **column ต่ำ** | propertyos |
| `streaming-api-token.json` | `POST /api/v1/bots/{botId}/streamingApiToken` (+ SSE) | กลาง | LINELib (ยังไม่ใช้ใน MVP) |

## แต่ละ field มาจากไหน

ตัวย่อ: **LB** = linebiz (`_vendor/linebiz/repo/`), **LL** = LINELib (`_vendor/linelib/repo/`), **OB** = omnichat-bridge
(`_vendor/omnichat-bridge/repo/`), **DL** = line-chat-history-downloader, **PO** = propertyos-line-importer, **FE** =
line-friend-export

### Header และ cookie ที่ใช้ทุก request
| อะไร | ค่า | ที่มา | หมายเหตุ |
|---|---|---|---|
| `x-oa-chat-client-version` | `20240513144702` | LB src/core/services.ts:16, http.ts:224 · LL ChatService.py:28 · OB line-oa-realtime.js:81 · PO oam-api.js:4-7 | ทั้ง 4 repo ใช้ค่าเดียวกัน |
| cookie | `__Host-chat-ses`, `chat-device-group`, `XSRF-TOKEN` | LL session_utils.py:8,26-30,58-64 | |
| `X-XSRF-TOKEN` | token จาก csrfToken | LB http.ts:272-273 (ใส่เฉพาะตอนเขียน) · LL ChatService.py:153-154 (ใส่ทุก call) | OB/PO ไม่ส่งเลย |
| ส่ง cookie ได้เฉพาะโดเมน | https `*.line.biz`, `*.line.me` | LB services.ts:18-31 | |

### `me.json`
| field | ที่มา | มั่นใจ |
|---|---|---|
| bizId, language, name, linePictureUri, localStorageEncryptionKey | LB src/types/me.ts:3-7 · fixture test/fixtures/me.ts | typed |
| ค่า `language: "th"` | เดาเอง | ต่ำ |

### `bots.json`
| field | ที่มา | มั่นใจ |
|---|---|---|
| list[].botId, basicSearchId, name, iconUrl, iconHash, region, brandType, userPermissionType, responseMode, disabledCrm, unreadCount, plan{code,planType}, offline, chatGrade? | LB src/types/bots.ts:2-20 · test/fixtures/bots.ts | typed |
| `userName` ที่ระดับบนสุด | LL AuthService.py:322 + tests/test_auth_service.py:65 | กลาง (LB ไม่มี type นี้) |
| `next` | LB src/resources/bots.ts:37 | กลาง (LL/OB ไม่เคยแบ่งหน้า) |
| ค่า `userPermissionType: "OPERATOR"` | เดาเอง | ต่ำ |

### `chats.json` (`chat.json` ใช้ shape เดียวกัน)
| field | ที่มา | มั่นใจ |
|---|---|---|
| query: folderType=ALL, tagIds, autoTagIds="", limit≤25, prioritizePinnedChat, next | LB src/resources/chats.ts:34-55 · OB line-oa-realtime.js:6,~296-306 · LL ChatService.py:~627-658 · DL downloader.js:76 | สูง |
| list[].chatId, updatedAt, tagIds, autoTagIds, read, readMentioned?, done, followedUp, spam, muteAtPc, muteAtApp, assignedBizId?, latestEvent?, lastReadAt, lastReceivedAt, lastSentAt?, lastTalkedAt, lastReadMessageId, userLastReadAt?, userLastReadMessageId?, chatType, status | LB src/types/chats.ts:33-58 | typed |
| profile (user): userId, name, friend, lastActivityExpiresAt, iconHash | LB src/types/chats.ts:4-15 | typed |
| profile (group): groupId, count, name?, iconHash? | LB src/types/chats.ts:18-27 | typed |
| profile.nickname | FE 03-get-chats.ts · PO fixtures/contacts-page.json | กลาง (เราใส่ใน contacts เท่านั้น) |
| item ที่ไม่มี `latestEvent` | OB (comment: เจอ 53 จาก 89 รายการ) | used-in-code |

### `messages.json` / `messages.older-page.json`
| field | ที่มา | มั่นใจ |
|---|---|---|
| `{list, backward}` เรียงใหม่ไปเก่า | LB src/resources/messages.ts:22-23,50 · OB line-oa-realtime.js:335,502-525 · DL downloader.js:92-108 | สูง |
| event: type, timestamp, source{chatId,userId?} | LB src/types/messages.ts:33-319 | typed |
| event type: message, messageSent, chatRead, unsend, join, leave, memberJoined, memberLeft, follow, unfollow | LB src/types/messages.ts:309-319 · fixture test/fixtures/messages.ts | typed |
| messageSent.sendId?, bizId? | LB src/types/messages.ts:226-227 · OB อ่าน `message.sendId ?? event.sendId` | typed |
| text: text, quoteToken?, quotedMessageId?, emojis[]{index,length,productId,emojiId}, mention{mentionees[]}, originalType? ("flex") | LB src/types/messages.ts:133-151 | typed |
| image/video (รับเข้า): contentProvider{type:"line",contentHash,expired,expiredAt}, contentHash, expired, expiredAt, duration (video) | LB src/types/messages.ts:76-104 | typed |
| image/video (ส่งออก): contentProvider{type:"external",originalContentUrl,previewImageUrl} | LB src/types/messages.ts:163-183 | typed |
| audio: contentProvider, duration, contentHash, expired, expiredAt | LB src/types/messages.ts:62-75 | typed |
| file: contentProvider, fileName, fileSize, contentHash, expired, expiredAt | LB src/types/messages.ts:109-123 | typed |
| sticker: packageId, stickerId (string), stickerResourceType | LB src/types/messages.ts:124-132 | typed |
| location: latitude, longitude, address | LB src/types/messages.ts:55-61 | typed (`title` ไม่อยู่ใน type) |
| unsent: `{id, type:"unsent"}` + event `unsend{messageId}` | LB src/types/messages.ts:105-108, 231-240 | typed |
| chatRead: read{watermark} | LB src/types/messages.ts:33-44 | typed |
| duration หน่วย ms, expiredAt = +14 วัน, contentHash รูปแบบ `fakehash-*` | เดาเอง | ต่ำ |

### `messages-send.json`, `upload-file.json`, `bulk-send-files.json`
| field | ที่มา | มั่นใจ |
|---|---|---|
| send body `{id:"", type:"textV2", text, sendId}` | LL LINELib.py:613-626 | กลาง |
| `quoteToken` ใน body (ตอบกลับข้อความ) | LL LINELib.py:~624 | กลาง |
| sendId = `{chatId}_{epochMs}_{เลขสุ่ม}` | LL LINELib.py:617 (7 หลัก) · OB line-oa-realtime.js:1019 (8 หลัก) | สูง (ถือเป็น string ทึบ) |
| send response `{}` | LL ถือว่าว่าง · OB ไม่ parse | **ต่ำ** |
| ประวัติแชทคืน `sendId` เดิมใน messageSent | OB line-oa-realtime.js:331-346 (poll ทุก 1 วินาที นานสุด 10 วินาที) | used-in-code |
| uploadFile path `/messages/{chatId}/uploadFile` | LL ChatService.py:305 · OB line-oa-realtime.js:1205 | สูง |
| multipart field `file` → `{contentMessageToken}` | LL ChatService.py:317-323 · OB line-oa-realtime.js:~1205-1215 | สูง |
| bulkSendFiles `{items:[{sendId, contentMessageToken}]}` | LL ChatService.py:337-338 · OB line-oa-realtime.js:1217 + test:852 | สูง |
| bulkSendFiles response `{}` | LL ต้องเป็น object แต่ไม่อ่าน key ไหนเลย | ต่ำ |

### `csrf-token.json`, errors
| field | ที่มา | มั่นใจ |
|---|---|---|
| `{headerName, parameterName, token}` | LB src/core/http.ts:277-305 · test/unit/http-csrf.test.ts:17-18 | สูง |
| อ่านแค่ `token` แล้วส่งใน header `x-xsrf-token` | LL AuthService.py:293-300 | สูง |
| 403 → ขอ token ใหม่แล้วลองซ้ำ 1 ครั้ง | LB README.md:184, http.ts:~459-468 | สูง |
| 401 + `{code:"not_login"}` = session หมดอายุ | LB src/core/errors.ts:213-224 | สูง (รู้แค่ field `code`) |
| 429 + `Retry-After` | LB errors.ts:245-255 · PO oam-api.js:664-690 | สูง (status), body ไม่รู้ |
| body ของ 400 `{code:"INVALID_ARGUMENT",message,details[]}` | OB test:973-976 (repo เขียนเอง) | ต่ำ |

### `contacts.json`, `notes.json`, `tags.json`, `owners.json`, `mark-as-read.json`, CSV
| field | ที่มา | มั่นใจ |
|---|---|---|
| contacts query: query, sortKey, sortOrder, filterKey, limit≤100, next | LB src/resources/contacts.ts:57-71 · PO oam-api.js:321-331 | สูง |
| contacts list[]: contactId, profile, tagIds, autoTagIds, done, followedUp, spam, friend?, useManualChat, chatAvailable, lastTalkedAt (null ได้), chatExists, assignedBizId? | LB src/types/contacts.ts:19-33 · PO fixtures/contacts-page.json | typed |
| notes `{list:[{noteId, body, userBizId, createdAt, updatedAt}], total}` | PO test/fixtures/notes-page.json · oam-api.js:503-575 | กลาง (fixture ของ repo) |
| tags `{list:[{tagId,name,count,createdAt,updatedAt}]}` | LB src/types/tags.ts:2-8 · PO fixtures/tags.json | สูง |
| owners `{list:[{bizId,name,linePictureUri?}]}` | LB src/types/owners.ts:2-6 | กลาง (PO รับได้ทั้ง array เปล่าและ `{list}`) |
| markAsRead `PUT` v2 body `{lastMessage:{messageId,timestamp}}` | LL ChatService.py:1314-1337 | กลาง |
| CSV: path `/download/…`, `timezoneOffset=-420`, `Accept: text/csv` | PO oam-api.js:~823, 870-876 | สูง |
| CSV column แรก `Sender type` | PO test/oam-api.test.js:366-381 | กลาง |
| CSV column อื่น (Sender name, Sent date, Sent time, Content), รูปแบบวันที่, การแสดง media | **เดาเอง** ค้นเว็บ 2026-11-05 แล้วไม่เจอ | **ต่ำ** |

## จุดที่ repo บอกไม่ตรงกัน (จดไว้ทั้งสองแบบ)

| เรื่อง | แบบ A | แบบ B | mock ควรทำ |
|---|---|---|---|
| แบ่งหน้าข้อความ | `?backward=<cursor>` อย่างเดียว (LB messages.ts:46, DL downloader.js:97-98) · OB เพิ่ม `limit≤100` (line-oa-realtime.js:308-315) | `limit` (1-100, ค่าเริ่ม 50) + `before`/`after` (LL ChatService.py:552-559 โดย docstring บอกว่าเป็น message id แต่ docs บอกว่าเป็น cursor ทึบ) | รับทั้ง `backward`, `limit`, `before`, `after` แต่ตอบกลับด้วย `backward` (3 repo ตรงกัน) |
| markAsRead | `PUT /api/v2/...` (LL ChatService.py:1337) | PLAN A7 เขียน "PUT/POST" แต่ไม่มี repo ไหนใช้ POST | รับ PUT (รับ POST ด้วยก็ได้ ถือว่ายืดหยุ่น) |
| type ตอนส่งข้อความ | `textV2` + `id:""` (LL LINELib.py:620) | `text` (OB test, OB ใช้ template ที่จับได้จากหน้าเว็บจริง) | รับทั้งสองแบบ |
| ตัวเลขท้าย sendId | 7 หลัก (LL) | 8 หลัก เติม 0 ข้างหน้า (OB) | ถือเป็น string ทึบ |
| CSRF | ส่งเฉพาะตอนเขียน ใช้ชื่อ header จาก `headerName` (LB) | ส่งทุก call ด้วย `x-xsrf-token` + เขียนลง cookie `XSRF-TOKEN` (LL) | ตรวจเฉพาะ POST/PUT/DELETE แล้วคืน 403 ถ้าไม่ตรง |
| ไม่มี CSRF เลย | OB, PO, DL ไม่ส่ง (เพราะทำงานในหน้าเว็บหรือใน extension) | | ไม่ต้องตรวจ CSRF ที่ GET |
| content URL | `/bot/{botId}/{hash}` (DL downloader.js:199) | `/bot/{botId}/{hash}/preview` (LL sse.py:57-58 ใช้กับเสียงด้วย) | เสิร์ฟทั้งสองแบบ |
| prioritizePinnedChat | `true` (LB default) | `false` (OB) | ไม่ต้องสนใจ |
| contacts default | sortKey DISPLAY_NAME, limit 20 (LB) | LAST_TALKED_AT, limit 100 (PO) | ใช้ค่าจาก query |
| envelope ของ owners | `{list:[…]}` (LB) | array เปล่า ๆ ก็รับได้ (PO) | ใช้ `{list}` |
| MIME ตอน upload | `application/octet-stream` ทุกไฟล์ (LL) | ใช้ type จริงของไฟล์ (OB) | ตรวจ MIME จริง (PLAN v2) |
| ชื่อ staff | `/api/v1/me` `.name` (LB) | `/api/v1/bots` `.userName` (LL) | ใส่ไว้ทั้งสองที่ |

## ต้องยืนยันจาก HAR (Phase 4): เรียงตามผลกระทบต่อ MVP
1. **folderType** ที่ใช้กรอง unread / ongoing / done ไม่มี repo ไหนใช้ค่าอื่นนอกจาก `ALL` ตอนนี้ `list_chats(filter)` จึงต้องกรองฝั่งเราจาก `read`/`done` ไปก่อน
2. **response ของ send และ bulkSendFiles** ว่ามี message id หรือไม่ ถ้าไม่มี ต้องหา `sendId` จากประวัติแชท (แบบเดียวกับ omnichat)
3. **param แบ่งหน้าข้อความ** (`backward` เทียบกับ `before`/`after`) และค่าเริ่มต้นของ `limit`
4. **ชื่อ column ของ CSV** วันที่ และการแสดง media
5. body ของ error อื่นนอกจาก 401 และ status ของ content ที่หมดอายุ (404 หรือ 410)
6. shape ของ `GET /api/v1/bots/{botId}/chats/{chatId}`
7. รูปแบบ `contentHash`, หน่วยของ duration และ `location.title`
8. `query` ของ contacts จับคู่ชื่อแบบไหน (prefix, substring, ไทย)

## สิ่งที่ mock ควรรู้ (สรุปจาก "Surprises" ของทุก repo)
- ข้อความเป็น **event** ต้องดู `type` ชั้นนอกก่อน: `message` = ลูกค้าส่ง, `messageSent` = OA หรือ staff ส่ง (มี `bizId`
  ถ้า staff เป็นคนส่ง) ข้อความจริงอยู่ใน `.message` ส่วน event ระบบ (follow, unsend, chatRead) ไม่มี `.message`
- flex/template ที่ OA ส่งจะมาเป็น `type:"text"` + `originalType:"flex"` (text = alt text) ถ้าอยากได้ JSON ของ flex ต้องเรียก
  `GET /api/v1/bots/{botId}/chats/{chatId}/messages/flexJson?messageId=&timestamp=` (ถ้า id ผิดจะได้ 500)
- LINE emoji ในข้อความเป็นตัว `$` แล้วบอกตำแหน่งไว้ใน `emojis[].index`
- media ที่ลูกค้าส่งมี `contentHash` ซ้ำสองที่ (ระดับบนและใน `contentProvider`) แต่รูป/วิดีโอที่ staff ส่งเป็น
  `external` + URL ไม่มี hash
- ตรวจ `expired`/`expiredAt` ก่อนดาวน์โหลด → `ATTACHMENT_EXPIRED` (มีตัวอย่างใน `messages.older-page.json`)
- โหลด content ด้วย cookie ของ session เดียวกัน ไม่ใช่ signed URL
- id ทุกตัวเป็น string (message id ก็ string แม้จะเป็นตัวเลข) ส่วนเวลาทุกตัวเป็น ms
- chatId ของแชท 1:1 คือ userId ของลูกค้า
- บัญชีที่ `responseMode=BOT` จะได้ 403 เมื่อเรียก API แชทแบบ manual (LL docs/messages-and-media.md:20)
- rate limit: ไม่มีเอกสาร PO สังเกตว่า CSV ได้ประมาณ 1000 req ต่อ 60 วินาที LINELib จำกัดตัวเองไว้ที่ส่ง 18 ข้อความต่อ 60 วินาที
