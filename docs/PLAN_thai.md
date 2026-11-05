# แผนงาน: MCP server สำหรับงาน CS บน LINE OA (ฉบับภาษาไทย)

ไฟล์นี้เป็นฉบับแปลของ [`docs/PLAN.md`](PLAN.md) ไว้อ่านเอง ถ้าเนื้อหาสองไฟล์ไม่ตรงกัน ให้ถือ `PLAN.md` เป็นหลัก
ฉบับที่มี diagram อยู่ที่ [`docs/PLAN.html`](PLAN.html)

สถานะ: v3 (ปรับขอบเขตเป็นผู้ช่วย CS ของ Acme Support) 6 พ.ย. 2026

กำหนดส่ง: **ศุกร์ 6 พ.ย. 2026 เวลา 23:59 (เวลาไทย)** แผนงานของรอบนี้อยู่ที่ [`docs/plan/run-plan.md`](plan/run-plan.md)

สิ่งที่เปลี่ยนใน v3 (รายละเอียดอยู่ในหัวข้อด้านล่าง):
- วางตำแหน่งผลิตภัณฑ์เป็นผู้ช่วย CS ของ OA **Acme Support** งานหลักที่ได้คะแนน (tool 5 ตัว + auth + ไฟล์แนบ) ทำก่อน
  แล้วมี **ชั้นเคส** วางทับเป็นงาน "ควรมี" (§1, §5b)
- ผลของแชทและโปรไฟล์ทุกตัวมี **`webUrl`** เป็นลิงก์ตรงเข้า chat.line.biz เพื่อให้คนเข้ามารับช่วงต่อได้ (§5)
- **กฎข้อมูลส่วนบุคคล** (§6b): ข้อมูลส่วนบุคคลอยู่ใน server และถูกปิดบังเป็นค่าเริ่มต้นในผลลัพธ์ของ tool
- มี **OA จริงให้ใช้แบบอ่านอย่างเดียว** และมี OA ทดสอบใหม่แบบฟรีสำหรับลองส่งข้อความ (§2 A1, A11)
- นำคำขอจากทีม research มาใส่ใน §6a แล้ว: markAsRead เป็น PUT, cursor ของการแบ่งหน้ายังไม่ยืนยัน และตัวกรองโฟลเดอร์ทำฝั่ง client
- §8 ตอนนี้แบ่งเป็นงานคืนนี้กับงานวันศุกร์ §10 แสดง flow ของ Support

โจทย์ตัวจริงอยู่ที่ [`docs/ASSIGNMENT.md`](ASSIGNMENT.md)

---

## 1. เราจะสร้างอะไร

MCP server ที่ให้ automation agent เข้าไปทำงานใน **หน้าแชทของ LINE OA Manager** (chat.line.biz) ได้แบบเดียวกับที่พนักงาน CS ทำ
งานนี้**ไม่ใช่** bot channel ของ Messaging API ต้องมี tool บังคับ 5 ตัว:

| # | สิ่งที่โจทย์ต้องการ | Tool |
|---|---|---|
| 1 | ดูรายการแชทที่กำลังคุยอยู่ | `list_chats` |
| 2 | อ่านแชทที่ระบุ | `read_chat` |
| 3 | ค้นข้อความจากทุกแชท | `search_messages` |
| 4 | ส่งข้อความเข้าแชท | `send_message` |
| 5 | ดูโปรไฟล์ของลูกค้า | `get_user_profile` |

มี tool เสริมอีกตัวคือ `get_attachment` สำหรับโจทย์เรื่องไฟล์แนบ (หัวข้อ 7)

**กรอบของผลิตภัณฑ์ (v3)** Acme มี LINE OA สองบัญชี OA หลัก*คือ*ตัวผลิตภัณฑ์ ลูกค้าบันทึกรายรับรายจ่ายที่นั่น และ bot ตอบกลับด้วย template
ส่วน **Support OA** เป็นที่ที่ลูกค้าแจ้งปัญหา rich menu มีปุ่ม 4 ปุ่ม (onboarding / feature request / report problem / how-to)
และ bot template จะขออีเมล ปัญหา และภาพหน้าจอ เราสร้างให้ทีม CS ของ Support OA:

| ระดับ | อะไร | ทำไม |
|---|---|---|
| ต้องมี | tool 5 ตัว + `get_attachment` + `webUrl`, auth, ไฟล์แนบ บน mock ที่เลียนแบบ Acme Support | ถูกให้คะแนนโดยตรง |
| ควรมี | ชั้นเคส: `list_cases`, `open_case`, `tag_case`, `set_case_status`, `get_person`, `case_stats` (§5b) | แสดงว่าเข้าใจงาน CS จริง ทำน้อยเพราะ AI client ทำงานด้าน AI ทั้งหมด |
| ถ้ามีเวลา | บริบทการใช้งานจาก OA หลักของแต่ละคน (§5b), tool หา link candidate, แจ้งเตือนเมื่อมีข้อความหลังปิดเคส, demo ผ่าน Telegram ด้วย Claude Code Channels | เป็นเรื่องเล่าที่ดีตอนสัมภาษณ์ |
| เขียนใน README เท่านั้น | การ link กับ OA หลักจริงใน production, server กลางของทีม, realtime (SSE) | ข้อจำกัด / ถ้ามีเวลาเพิ่ม |

**ผู้ใช้เห็นอะไร** ไม่มี web app พนักงาน CS (หรือ automation agent ของ Acme) คุยกับ AI client เช่น Claude Desktop หรือ Claude Code
client เรียก tool ของเรา และหน้าต่างขออนุญาตของ client เองจะขึ้นก่อน `send_message` พนักงาน CS login หนึ่งครั้งต่อกะด้วย `npm run login`
หน้าเว็บเดียวที่มีคือ console เล็ก ๆ ของ mock ที่แสดงว่า agent ทำอะไรไป

เกณฑ์ให้คะแนน และหัวข้อในแผนที่ตอบแต่ละเกณฑ์:
- **ใช้งานได้จริง:** tool ทั้ง 5 ต้องทำงานได้ Phase 2 ทำให้ใช้ได้กับ mock ส่วน Phase 4 ทำให้ใช้ได้กับ console จริง
- **การจัด repo และคุณภาพโค้ด:** หัวข้อ 4 และ 9
- **เข้าใจภาพรวมของระบบ:** หัวข้อ 4, 6 และ 7 ซึ่ง README จะนำไปใช้ต่อ
- **Authentication:** หัวข้อ 6
- **Attachments:** หัวข้อ 7
- **กระบวนการทำงาน:** commit ไปเรื่อย ๆ (หัวข้อ 8) และเก็บ `.claude/`, `CLAUDE.md`, `AGENTS.md` ไว้ใน repo (หัวข้อ 9)

---

## 2. สมมติฐาน (ทุกข้อจะเขียนลง README)

| id | สมมติฐาน | เหตุผล / ถ้าผิดจะเปลี่ยนอะไร |
|---|---|---|
| A1 | **mock LINE OA** เป็นเส้นทางที่ใช้ให้คะแนน คนตรวจรันได้โดยไม่ต้องมีบัญชี LINE ตอนนี้เรามี OA จริงด้วย (อ่านอย่างเดียว ดู A11) ไว้เก็บหลักฐาน HAR และมี OA ทดสอบแบบฟรีไว้ลองส่ง จึงตรวจ `WebClient` กับของจริงได้ | ถ้า WebClient ไม่เสร็จ README จะบอกตรง ๆ และเส้นทางบน mock ยังใช้ได้ |
| A2 | MCP server หนึ่ง process = session ของพนักงาน CS หนึ่งคน session นั้นเข้าได้หลาย OA (LINE เรียก OA ว่า "bot") และกำหนดใน config ได้ว่าให้เข้า OA ไหนบ้าง | ถ้าต้องรองรับพนักงานหลายคน ต้องแยก session ต่อคน และใช้ HTTP transport |
| A3 | "แชทที่กำลังคุยอยู่" คือแชทที่ยังไม่ได้ mark ว่า done/resolved เรียงตามเวลาข้อความล่าสุด ใหม่สุดขึ้นก่อน มีตัวกรอง `unread` กับ `all` | ถ้าผิด แก้แค่ตัวกรอง สถาปัตยกรรมไม่เปลี่ยน |
| A4 | Search คือค้นแบบคำหรือบางส่วนของคำ จากข้อความในแชท ชื่อลูกค้า และชื่อไฟล์แนบ ต้องค้น**ภาษาไทย**ได้ ซึ่งไม่มีช่องว่างระหว่างคำ client โอเพนซอร์สที่เจอ**ไม่มี endpoint ค้นข้อความ** มีแค่ `/api/v2/bots/{botId}/contacts?query=` จึงค้นจาก **index ในเครื่อง** ที่ดึงประวัติแชทมาเก็บไว้ | ถ้า HAR capture เจอ API ค้นข้อความของ console `WebClient.search` จะใช้ API นั้น แล้ว index จะเหลือหน้าที่เป็นแค่ cache |
| A5 | Agent รันในเครื่องเดียวกับพนักงาน CS (stdio transport) | ถ้าจะ deploy ไว้บน server ต้องใช้ Streamable HTTP และต้องทำ auth ฝั่ง MCP จริงจัง |
| A6 | ข้อความที่ agent ส่ง จะขึ้นว่าส่งโดยพนักงานที่ login อยู่ พนักงานคนนั้นจึงต้องรับผิดชอบข้อความ การส่งทุกครั้งถูกบันทึกใน audit log | ไม่มี |
| A7 | ใน console จริง การ mark ว่าอ่านแล้วเป็น **การเรียกแยกต่างหาก** (`PUT /api/v2/bots/{botId}/chats/{chatId}/markAsRead` มีหลักฐานแค่ PUT) การดึงข้อความไม่ได้ทำให้แชทถูกนับว่าอ่านแล้ว `read_chat` จะไม่ mark read เลย flag `markRead` แยกปิดไว้เป็นค่าเริ่มต้น | ถ้าทีม CS อยากให้สถานะอ่านแล้วตรงกับที่ agent อ่านไปแล้ว ก็เปิด flag นี้ |
| A8 | เรา link ผู้แจ้งปัญหาใน Support กับ **OA หลักของ Acme** เพราะ CS ต้องการบริบทการใช้งาน: แพลนหรือช่วงทดลอง การเชื่อม Google, sync ล่าสุด, เครดิต และข้อความ error ล่าสุด ในข้อมูลตัวอย่าง การ sync Google Sheets เกิดขึ้น 4 นาทีก่อนที่ลูกค้าจะแจ้งเรื่องนั้นใน Support | ถ้าไม่ link CS ต้องถามลูกค้าในสิ่งที่ผลิตภัณฑ์รู้อยู่แล้ว |
| A9 | หนึ่งแชทมี**หลายเคส** ข้อความจากปุ่ม rich menu เปิดเคสใหม่ โดยชนิดเคสตามปุ่ม AI เปิดเคสเองได้ด้วยเมื่อลูกค้าเริ่มหัวข้อใหม่โดยไม่ได้กดปุ่ม | ถ้า CS อยากได้หนึ่งแชทหนึ่งเคส ก็แค่ไม่ใช้ `open_case` |
| A10 | การ link คนข้าม OA ใช้อีเมลที่ลูกค้าพิมพ์ จับคู่ภายใน server **และต้องให้ CS ยืนยัน** event "Google connected (email)" ใน OA หลักนับเป็นอีเมลที่ยืนยันแล้ว การ link อัตโนมัติด้วย LINE userId ต้องให้ทั้งสอง OA อยู่ใต้ provider เดียวกัน ซึ่งเรายังไม่ได้ตรวจ | ถ้าใช้ provider เดียวกัน เพิ่มการ link ด้วย userId ภายหลังได้ |
| A11 | OA จริงมีแชทของคนจริง จึงเป็นแบบ**อ่านอย่างเดียว**: ห้ามส่ง ห้ามกด Follow up หรือ Resolve และห้ามเปิดแชทที่ยังไม่อ่าน (เปิดแล้วจะถูก mark ว่าอ่าน) ไฟล์ HAR เก็บใน `~/lineoa-har/` นอก repo ทดสอบการส่งและอัปโหลดบน OA ทดสอบเท่านั้น | ไม่มี |
| A12 | AI client ทำงานด้าน AI ทั้งหมด (แนะนำแท็ก สรุป ร่างข้อความ) server ไม่เก็บ LLM key และไม่เรียก LLM | ถ้าใช้ LLM ฝั่ง server ต้องมี DPA และต้องใส่ key ใน config |

---

## 3. Stack และเหตุผลที่เลือก

| ส่วน | เลือก | เหตุผล |
|---|---|---|
| ภาษา / runtime | **TypeScript บน Node 22 LTS** | MCP SDK ตัวทางการเขียนด้วย TS เป็นหลัก Playwright ก็เป็น TS อยู่แล้ว ภาษาเดียวใช้ได้ทั้ง server, mock และ test และ type แบบ strict ทำหน้าที่เป็นเอกสารของ data model ไปในตัว |
| MCP | `@modelcontextprotocol/sdk` + `zod` (**pin major version**) | SDK ตัวทางการ ต้อง pin เพราะ whatsapp-mcp พังเมื่อ `mcp` 2.x ตัด `fastmcp` ออก (งานวิจัยรอบ 2) zod schema ใช้เป็น input schema ของ tool และใช้ตรวจข้อมูลไปพร้อมกัน tool มี annotation `readOnlyHint` / `openWorldHint` |
| Transport | stdio (ค่าเริ่มต้น) | ใช้กับ Claude Code, Claude Desktop และ MCP Inspector ได้ทันที ไม่ต้องทำ auth ทาง network Streamable HTTP อยู่ในหมวด "ถ้ามีเวลาเพิ่ม" |
| Mock LINE OA | **Hono** + `@hono/node-server` | HTTP server ขนาดเล็กและเร็ว เลียนแบบ **path และชื่อ field จริงของ internal API** ของ chat.line.biz (หัวข้อ 6a) คือ cookie `__Host-chat-ses`, header `X-XSRF-TOKEN`, cursor `next`/`backward` และ URL ไฟล์แบบ `chat-content` ที่ต้องมี cookie ถึงจะโหลดได้ มีหน้า console HTML เล็ก ๆ ด้วย คนจะได้เห็นว่า agent ส่งอะไรไป **bind แค่ `127.0.0.1`** (bridge ของ whatsapp-mcp เปิด REST ให้ทุก interface โดยไม่มี auth ซึ่งเป็นความผิดพลาดที่ต้องเลี่ยง) |
| การเข้าถึง console จริง | `fetch` (undici) แนบ session cookie ที่เก็บไว้ ใช้ **Playwright** แค่ตอน login และตอนสำรวจ endpoint | ยิง HTTP ซ้ำนั้นเร็วและผลแน่นอน ถ้าคุม browser ทุก action จะช้าและพังง่าย จึงเก็บไว้เป็นทางสำรองเท่านั้น |
| Index ในเครื่อง (ทางสำรองของ search และ cache ไฟล์แนบ) | `better-sqlite3` ใช้ FTS5 กับ **`trigram` tokenizer** | ภาษาไทยไม่มีขอบเขตคำ `unicode61` จะมองทั้งประโยคไทยเป็น token เดียว ส่วน `trigram` ค้นบางส่วนของคำได้ทุกภาษา จำเป็นเพราะไม่รู้จัก endpoint ค้นข้อความ (A4) ข้อมูลใน index ได้จากการ sync `list_chats` กับประวัติแชท (ใช้ polling ส่วน SSE stream อยู่ในหมวด "ถ้ามีเวลาเพิ่ม") ครั้งแรกของแต่ละแชทใช้ `GET /download/{botId}/{chatId}/messages.csv` (เจอใน propertyos-line-importer) ได้ทั้งห้องในคำขอเดียว ไม่ต้องไล่ทีละหน้า |
| รูปภาพ | `sharp` | ย่อรูปก่อนส่งกลับให้ LLM เป็น image content ทำให้ไฟล์เล็กลง ประหยัดขึ้น และไม่เกินขนาดที่ block รับได้ |
| Test | **vitest** + `InMemoryTransport` ของ SDK | test แบบ end-to-end ครบเส้น คือ MCP client ตัวจริงเรียก server ตัวจริง ซึ่งไปเรียก mock server ต่อ ไม่ต้องใช้ network และไม่ต้องมีบัญชี LINE |
| Lint / format | **Biome** | เครื่องมือเดียว เร็ว config น้อย |
| Package manager | npm | คนตรวจไม่ต้องติดตั้งอะไรเพิ่ม |

ตัวเลือกที่ไม่เอา:
- Python/FastMCP ก็ใช้ได้ แต่จะแยก stack ออกจากเครื่องมือ Playwright
- Puppeteer สู้ Playwright ไม่ได้ในงานนี้ เพราะ Playwright มี `storageState` และ codegen/HAR ที่ดีกว่า
- Messaging API ทางการ และ `line-bot-mcp-server` ทำมาเพื่อจุดประสงค์อื่น ดึงรายการแชท อ่านแชทเก่า หรือค้นข้อความไม่ได้ และใช้กับ bot channel เท่านั้น

---

## 4. สถาปัตยกรรม

```
 Agent (Claude Code / Desktop / MCP client ใดก็ได้)
        │ stdio (JSON-RPC)
        ▼
 ┌───────────────────────── lineoa-mcp ─────────────────────────┐
 │ server.ts      ลงทะเบียน tool และแปลง error เป็น MCP error     │
 │ tools/*        tool ละไฟล์: zod schema → เรียก client →        │
 │                ผลลัพธ์รูปแบบกลาง                                │
 │ domain/        Chat · Message · Attachment · UserProfile ·    │
 │                Cursor · typed error (AUTH_EXPIRED, ...)       │
 │ client/        interface LineOAClient  ◄── จุดเชื่อมหลัก       │
 │   ├─ mock/     MockClient   → HTTP → mock-server (Hono)       │
 │   └─ web/      WebClient    → HTTP → internal API ของ          │
 │                chat.line.biz (cookie + CSRF)                  │
 │ auth/          SessionStore (ไฟล์ 0600) · login CLI           │
 │                (Playwright คน login เอง) · refresh CSRF       │
 │ attachments/   ดาวน์โหลด → จำกัดขนาด → ตรวจ MIME → cache       │
 │                → ย่อรูป; allowlist โฟลเดอร์ outbox ตอนอัปโหลด  │
 │ audit/         log แบบ JSONL เขียนต่อท้ายอย่างเดียว ทุกการส่ง  │
 └───────────────────────────────────────────────────────────────┘
```

การตัดสินใจที่สำคัญที่สุดคือมี interface `LineOAClient` ตัวเดียว tool ไม่ต้องรู้ว่ากำลังคุยกับ backend ตัวไหน
mock กับ console จริงใช้ contract test ชุดเดียวกัน ถ้าผ่านบน mock ก็มีโอกาสสูงว่าจะใช้กับของจริงได้

### โครง repo ที่ตั้งเป้าไว้

```
src/
  server.ts            index.ts (bin)      config.ts
  domain/              types.ts  errors.ts  cursor.ts
  client/              LineOAClient.ts  mock/  web/
  tools/               list-chats.ts read-chat.ts search-messages.ts
                       send-message.ts get-user-profile.ts get-attachment.ts
  auth/                session-store.ts  login-cli.ts  csrf.ts
  attachments/         fetch.ts  mime.ts  image.ts  outbox.ts
  cases/               store.ts  case-opener.ts  tools (v3 "ควรมี")
  audit/               audit-log.ts
mock-server/           app.ts  seed/ (เหมือน Acme Support: rich menu, bot template, flex card, ภาพหน้าจอ, PDF;
                       2 OA ที่มีคนเดียวกันหนึ่งคน, ทำให้ไม่ระบุตัวตนแล้ว)  public/ (console เล็ก ๆ, เป้าหมายของ webUrl)
test/                  e2e/ (InMemoryTransport)  contract/ (รันกับ LineOAClient ตัวไหนก็ได้)  unit/
docs/                  ASSIGNMENT.md  PLAN*.md/html (spec ร่วม)  plan/  dev/ (+ dev/plans)  research/  ← แยกโฟลเดอร์ตาม lane
.claude/               skill, agent, rule, profile และ agent-strategy/ จาก plan kit
CLAUDE.md  AGENTS.md  README.md
```

### Domain model (ได้แนวคิดจากโมเดล conversation/message/attachment/contact ของ Chatwoot)

- `Chat { id, botId, user: {id, displayName, pictureUrl}, status: ongoing|done, unreadCount, lastMessage: {preview, at, from}, assignee?, tags[] }`
- `Message { id, chatId, from: customer|staff|bot|system, senderName, sentAt, type: text|image|file|video|audio|sticker|location|unknown, text?, attachments: AttachmentRef[] }`
- `AttachmentRef { id, kind, mime?, sizeBytes?, fileName?, width?, height?, expiresAt? }` เก็บแค่ข้อมูลของไฟล์ ไม่เก็บตัวไฟล์
- `UserProfile { id, displayName, pictureUrl, statusMessage?, language?, followedAt?, tags[], note?, chatId }`
- `Chat` และ `UserProfile` ทุกตัวมี `webUrl`: `https://chat.line.biz/{botId}/chat/{chatId}` บน console จริง
  (รูปแบบที่เห็นใน console จริงและใน repo ที่ศึกษา) หรือ URL ของ console ใน mock
- ชั้นเคส (v3, store ในเครื่อง): `Person { personRef, maskedEmail?, identities: [{oa, chatId, userId}] }` ·
  `Case { caseId, chatId, personRef, type, status: open|waiting|resolve_suggested|resolved, openedAt,
  openedBy: rich_menu|ai|cs, fromMessageId, summary?, tags: CaseTag[] }` ·
  `CaseTag { name, group: type|area|severity, source: ai|cs, confirmed }`
- Cursor เป็นแบบ opaque (base64 JSON) แต่ละ backend จะใช้วิธีแบ่งหน้าของตัวเองได้
- จาก Chatwoot: `AttachmentRef.kind` ใช้ชื่อตาม `file_type` (`image | audio | video | file | location | fallback`)
  ข้อความมีชนิด `system`/activity (เช่น assign, note) นอกจากข้อความแชทปกติ
  ข้อความชนิดที่ agent ใช้ไม่ได้ให้ส่งเป็น placeholder ที่ระบุชัด ไม่ทิ้งเงียบ ๆ (respond.io กับ SleekFlow ก็ทำแบบนี้)

---

## 5. สัญญาของแต่ละ tool (v3)

| Tool | Input | Output | หมายเหตุ |
|---|---|---|---|
| `list_chats` | `filter?: ongoing\|unread\|all` (ค่าเริ่มต้น `ongoing`), `limit≤50`, `cursor?`, `botId?` | `chats[]` (แต่ละตัวมี `webUrl`), `nextCursor?` | อ่านอย่างเดียว ยังไม่รู้จักตัวกรองโฟลเดอร์ของ console นอกจาก `ALL` จึงให้ `unread`/`ongoing` กรองจาก `read`/`done` ฝั่ง client ไปก่อน จนกว่า HAR จะบอกเป็นอย่างอื่น |
| `read_chat` | `chatId`, `limit≤100`, cursor `before?` | `messages[]` เรียงเก่าไปใหม่, `prevCursor?`, สรุปข้อมูล `user`, `webUrl` | อ่านอย่างเดียว ไฟล์แนบส่งกลับเป็นแค่ ref ข้อความของลูกค้าติดป้ายว่าเป็นเนื้อหาที่ไม่น่าเชื่อถือ |
| `search_messages` | `query`, `chatId?`, `from?`, `since?`, `until?`, `limit≤50`, `cursor?` | `hits[] {chatId, messageId, snippet, sentAt, senderName, contextBefore[], contextAfter[]}`, `indexedAt` | อ่านอย่างเดียว ค้นบางส่วนของคำภาษาไทยได้ |
| `send_message` | `chatId`, `text?`, `attachmentPaths?[]` (ต้องอยู่ในโฟลเดอร์ outbox), `dryRun?` | `{messageId, sentAt}` หรือ preview ถ้าตั้ง `dryRun` | tool เดียวที่เขียนข้อมูล ติด `destructiveHint` จะลงทะเบียนเฉพาะเมื่อ `LINEOA_ALLOW_SEND=true` ตรวจกับ allowlist ของแชท (ถ้าตั้งไว้) บันทึกลง audit log ไม่รับข้อความว่างและแชทที่ไม่มีอยู่จริง **ส่งซ้ำไม่ได้ (idempotent):** ทุกครั้งมี `sendId` ถ้าไม่แน่ใจว่าส่งสำเร็จ (timeout หรือ network error) server จะไม่ส่งซ้ำเอง แต่หา `sendId` ในประวัติแชทก่อน ถ้าไม่เจอให้ตอบ `SEND_UNCERTAIN` (แนวจาก omnichat-bridge) |
| `get_user_profile` | `userId` หรือ `chatId` | `UserProfile` (+ `notes`, `tags`, ผู้รับผิดชอบจาก `owners`, `webUrl`) | อ่านอย่างเดียว อีเมลและเบอร์โทรถูกปิดบัง (§6b) |
| `get_attachment` | `chatId`, `messageId`, `attachmentId?`, `mode?: inline\|save` | รูป → MCP `image` content (ย่อแล้ว) + path ในเครื่อง ไฟล์อื่น → path ที่บันทึกไว้ + ข้อมูลไฟล์ (+ preview ข้อความถ้าเป็น txt/csv) | อ่านอย่างเดียว |
| (เสริม) `auth_status` | ไม่มี | พนักงานที่ login อยู่, OA ที่เข้าได้, อายุของ session | ให้ agent เช็ก auth ก่อนเริ่มงานยาว ๆ |

flex card ของ bot (เช่น template ของ bot ใน Support) ส่งกลับเป็น `type: "flex"` พร้อม `altText` และข้อความที่แปลงเป็นข้อความธรรมดาแล้ว ไม่ทิ้ง

error มีชนิดชัดเจน และบอกวิธีแก้ได้:
- `AUTH_EXPIRED` ("ให้พนักงาน CS รัน `npm run login`")
- `NOT_FOUND`
- `RATE_LIMITED` (แนบ `retryAfter`)
- `ATTACHMENT_TOO_LARGE`
- `ATTACHMENT_EXPIRED`
- `PATH_NOT_ALLOWED`
- `SEND_UNCERTAIN`

### 5b. ชั้นเคส (v3, "ควรมี" ทำหลังจากงานหลักผ่านแล้ว)

เก็บในไฟล์ SQLite เดียวกับ search index (`~/.local/share/lineoa-mcp/store.db`) อ่านจากฝั่ง LINE อย่างเดียว ไม่มีอะไรในส่วนนี้เขียนกลับไปที่ LINE

| Tool | Input | Output | หมายเหตุ |
|---|---|---|---|
| `list_cases` | `status?`, `type?`, `tag?`, `since?`, `personRef?`, `limit≤50`, `cursor?` | `cases[]` (มี `webUrl`) | อ่านอย่างเดียว sync ข้อความใหม่ก่อน ข้อความจาก rich menu เปิดเคสให้อัตโนมัติ (A9) |
| `open_case` | `chatId`, `fromMessageId`, `type` | `Case` | AI แยกหัวข้อใหม่ที่มาโดยไม่ได้กดปุ่ม idempotent ตาม `fromMessageId` |
| `tag_case` | `caseId`, `add?[]`, `remove?[]` | `Case` | แท็กจาก AI เก็บเป็น `source: ai, confirmed: false` และจะเป็น confirmed เมื่อ CS ขอแท็กนั้น |
| `set_case_status` | `caseId`, `status`, `summary?`, `confirmedByStaff?` | `Case` | `resolved` ต้องมี `confirmedByStaff: true` ซึ่ง agent ส่งได้เฉพาะหลังจากคนบอกแล้ว ถ้าไม่มี เคสจะไปที่ `resolve_suggested` บันทึกลง audit log |
| `get_person` | `personRef` หรือ `chatId` | `Person` + `cases[]` + `linkCandidates[]` (+ `usage[]` จาก OA หลักถ้า link แล้ว ซึ่งเป็น "ถ้ามีเวลา") | อีเมลถูกปิดบัง การ link ต้องให้ CS ยืนยัน (A10) |
| `case_stats` | `from`, `to`, `groupBy: type\|area\|severity\|status` | จำนวน, เวลาตอบครั้งแรกแบบ median, จำนวนเคสที่เปิดอยู่ | ใช้ SQL อย่างเดียว สรุปรายช่วงเวลามาจากฟิลด์ `summary` ที่เก็บไว้ในเคส AI client เขียนเนื้อความเอง |

taxonomy ของแท็กชุดแรก:
- ชนิด (type): `onboarding`, `feature-request`, `report-problem`, `how-to`
- ส่วนของระบบ (area): `dashboard`, `google-sheet`, `currency`, `billing-credit`, `login`, `line-bot`, `other`
- ความรุนแรง (severity): `low`, `medium`, `high`

event การใช้งานจาก OA หลัก ("ถ้ามีเวลา"): parser แบบกฎแปลง bot template ของ OA หลักเป็น event (`plan`, `trial_expired`,
`google_connected`, `sheets_sync`, `credits_left`, `payment_notice`, `bot_error`) ทำงานเฉพาะคนที่ link แล้ว
ครอบคลุมประมาณ 14 วันก่อนเคสถูกเปิด ยอดเงินถูกซ่อนไว้ เว้นแต่ CS ขอให้เปิดดู
`payment_notice` ที่ซ้ำทุกวันเป็นตัวเลือกสำหรับการแจ้งเตือนเชิงรุก ส่วนจะเป็นการเตือนหรือการตัดเงินซ้ำ เป็นคำถามที่ยังต้องถาม Acme

---

## 6. Authentication: server ทำงานแทนพนักงาน CS ได้อย่างไร

**หลักการ: คน login เอง server ถือแค่ session ไม่เคยเห็น password**

1. **`npm run login`** (Playwright เปิด browser ขึ้นมาให้เห็น) เปิดหน้าต่าง Chromium จริงไปที่หน้า login ของ LINE OA Manager
   พนักงาน CS login เอง ด้วย LINE Business ID, อีเมล หรือ QR รวมถึง 2FA หรือ captcha ถ้ามี
   ทำแบบนี้เราไม่ต้องรับมือ captcha หรือระบบตรวจจับ bot และไม่ต้องเก็บรหัสผ่านเลย
2. พอหน้า chat.line.biz โหลดเสร็จ CLI จะเก็บ **session cookie** ไว้ (Playwright `storageState`)
   ได้แก่ `__Host-chat-ses`, `chat-device-group`, `XSRF-TOKEN` ของ chat.line.biz และ `session` ของ account.line.biz
   - ตรวจว่า session ใช้ได้ด้วย `GET /api/v1/me`
   - ดึงรายการ OA (bot id) และ role ที่พนักงานคนนี้เข้าได้ (`GET /api/v1/bots`)
   - server จะไม่ยอมเริ่มทำงาน ถ้า `me` ไม่ตรงกับ `LINEOA_EXPECTED_ACCOUNT` (identity guard ยืมแนวมาจาก telegram-mcp)
3. **SessionStore** เขียน session ลง `~/.config/lineoa-mcp/session.json` ด้วยสิทธิ์ `0600`
   ไฟล์อยู่นอก repo และอยู่ใน gitignore ค่าลับไม่ถูกพิมพ์ลง log หรือผลลัพธ์ของ tool เด็ดขาด
   ถ้ามีเวลาเพิ่ม จะย้ายไปเก็บใน macOS Keychain หรือ libsecret
4. **WebClient** แนบ cookie ทุก request, refresh CSRF header และจำกัด rate ของตัวเอง
   - เจอ 401 พร้อม `not_login` → `AUTH_EXPIRED`
   - เจอ 403 → refresh CSRF token หนึ่งครั้ง ถ้ายังไม่ได้ → `FORBIDDEN` (เรื่องสิทธิ์ของ role)
   - linebiz บอกว่า session **มักอยู่ได้ไม่ถึงวัน** และไม่ต่ออายุให้เอง README จึงจะบอกพนักงานให้ login ใหม่ทุกกะ
   - ถ้า server ส่ง `Set-Cookie` ใหม่มา เราเก็บค่าใหม่ไว้ใช้
   - **ไม่ login ใหม่ให้เองเงียบ ๆ** แต่จะบอก agent ให้ไปขอคน
   - แนบ cookie เฉพาะ host ใน allowlist (`chat.line.biz`, `chat-content.line.biz`) และ redact header ลับในทุกบรรทัดของ log (ทั้งสองข้อมาจาก linebiz)
   - มี **lock file** ข้าง `session.json` กันไม่ให้ server สองตัวใช้ session เดียวกัน (จาก telegram-mcp และ LINELib) และไม่ขอ login ผ่าน stdio
5. **จำกัดขอบเขต:** เข้าได้แค่ bot id ที่ตั้งไว้ใน config แม้พนักงานจะมีสิทธิ์เข้า OA อื่นด้วยก็ตาม
   role ของพนักงานเอง (Admin / Operator / chat-only) ก็ยังมีผลฝั่ง LINE ตามปกติ
6. **Mock ทำ flow เดียวกันทั้งหมด:** หน้า login, session cookie แบบ httpOnly, CSRF header, session หมดอายุ และ URL ไฟล์แนบที่ต้อง auth
   จึง demo และ test เส้นทาง auth ได้ครบโดยไม่ต้องมีบัญชี LINE

ทางเลือกอื่นที่พิจารณาแล้ว (จะเขียนในส่วน "trade-offs" ของ README):

| ทางเลือก | ผล |
|---|---|
| เก็บอีเมลกับรหัสผ่าน แล้ว login อัตโนมัติแบบไม่เปิดหน้าจอ (`POST account.line.biz/api/login/email` + รหัสทางอีเมล แบบที่ LINELib ทำ) | ไม่เอา เพราะต้องเก็บรหัสผ่าน reCAPTCHA กับรหัสทางอีเมลจะทำให้พัง และเสี่ยงที่สุดทั้งเรื่องโดนจับว่าเป็น bot และเรื่อง ToS |
| ให้คนก๊อป cookie จาก DevTools มาวางเอง | เก็บไว้เป็นทางสำรองที่มีเอกสารบอกวิธี (`npm run login -- --import-cookie`) |
| คุม UI ของ browser ทุก action | ไม่ใช้เป็นทางหลัก (ช้า selector พังง่าย) อาจใช้เป็นทางสำรองสำหรับ endpoint บางตัว |
| Messaging API ทางการ | ไม่เอา เพราะทำมาเพื่อจุดประสงค์อื่น อ่านประวัติแชทเดิมหรือค้นข้อความไม่ได้ และการเปิด webhook ทำให้ OA ทำงานต่างไปจากเดิม |

---

## 6a. Endpoint ภายในของ chat.line.biz ที่รู้แล้ว

ตารางนี้มาจาก client โอเพนซอร์สสองตัว:
- [PrakritManStudio/linebiz](https://github.com/PrakritManStudio/linebiz) เขียนด้วย TypeScript อ่านได้อย่างเดียว type ครบ
- [Madoa5561/LINELib](https://github.com/Madoa5561/LINELib) เขียนด้วย Python ครบที่สุด มีทั้ง send, upload และ SSE

**ยังไม่ได้ยืนยันจนกว่าจะเก็บ HAR เอง** (Phase 4)

| Tool | Endpoint (base `https://chat.line.biz`) |
|---|---|
| เช็ก auth / `auth_status` | `GET /api/v1/me`, `GET /api/v1/bots?noFilter=true&limit=1000` |
| CSRF | `GET /api/v1/csrfToken` → `{token}` ส่งไปใน header `X-XSRF-TOKEN` ถ้าเจอ 403 ให้ refresh token แล้วลองใหม่หนึ่งครั้ง |
| `list_chats` | `GET /api/v2/bots/{botId}/chats?folderType=ALL&limit=25&next=` → `chatId, profile{userId,name,iconHash}, read, done, assignedBizId, tagIds, latestEvent, lastReceivedAt` |
| `read_chat` | `GET /api/v3/bots/{botId}/chats/{chatId}/messages?backward=<cursor>` repo สามตัว (linebiz, omnichat-bridge, ตัวดาวน์โหลด) ใช้ `backward` ส่วน LINELib ใช้ `before`/`after` **ต้องยืนยันจาก HAR** |
| `search_messages` | ไม่รู้จัก endpoint ใช้ FTS5 index ในเครื่อง ส่วน endpoint ค้นรายชื่อลูกค้าคือ `GET /api/v2/bots/{botId}/contacts?query=` |
| `send_message` | `POST /api/v1/bots/{botId}/chats/{chatId}/messages/send` body `{type:"text", text, sendId:"{chatId}_{ms}_{rand}"}` |
| ส่งไฟล์ | `POST /api/v1/bots/{botId}/messages/{chatId}/uploadFile` (multipart `file`) → `contentMessageToken` → `POST .../chats/{chatId}/messages/bulkSendFiles` body `{items:[{sendId, contentMessageToken}]}` |
| `get_user_profile` | `GET /api/v1/bots/{botId}/chats/{chatId}` + `profile` ของแชท + `/notes` + `/tags` |
| `get_attachment` | `GET https://chat-content.line.biz/bot/{botId}/{contentHash}` (`/preview` = รูปย่อ) ใช้ **session cookie ไม่ใช่ URL ที่เซ็นไว้** ในข้อความมี `expired` และ `expiredAt` บอกอยู่แล้ว |
| mark read (`read_chat` ไม่ใช้) | `PUT /api/v2/bots/{botId}/chats/{chatId}/markAsRead` มีหลักฐานแค่ PUT (LINELib) |
| deep link (`webUrl`) | `https://chat.line.biz/{botId}/chat/{chatId}` ยืนยันแล้วใน console จริง chatId หน้าตาเหมือน userId ที่ขึ้นต้นด้วย `U…` |
| realtime (ทำทีหลัง) | `POST /api/v1/bots/{botId}/streamingApiToken` → SSE `https://chat-streaming-api.line.biz/api/v2/sse?token=…` |

หมายเหตุ:
- chat id และ user id ในระบบนี้**ไม่ใช่** userId ของ Messaging API นี่เป็นอีกเหตุผลว่าทำไมใช้ Messaging API ไม่ได้
- linebiz ส่ง header `x-oa-chat-client-version` ไปด้วย
- fixture ของทุก endpoint ข้างบนอยู่ที่ `test/research/line-api-shapes/` (branch `research`) mock ส่ง `response.body` ของ fixture กลับไปตามที่เป็น
- รายการตรวจ HAR เพิ่ม: การเรียกจากช่องค้นหา, Tags, Standard replies, Contact list, Follow up / Resolve (ดูแค่รูปแบบ request
  ห้ามกดบน OA จริง) และ `bulkSendFiles` รับ PDF ไหม (ลองบน OA ทดสอบ)
- ไม่มีเอกสารเรื่อง rate limit จึงต้องเคารพ 429 และ `Retry-After`

### 6b. กฎข้อมูลส่วนบุคคล (PDPA) (v3)

- ข้อมูลส่วนบุคคลอยู่ใน server ผลลัพธ์ของ tool ใช้ `personRef` และค่าที่ปิดบังแล้ว: อีเมล (`s***@gmail.com`) และเบอร์โทร
  ถูกปิดบังในข้อความและโปรไฟล์เป็นค่าเริ่มต้น argument `reveal: true` ใช้เปิดดู และทุกครั้งที่เปิดดูถูกบันทึกใน audit log
- การจับคู่อีเมลเพื่อ link ทำภายใน server อีเมลจริงไม่ไปถึง LLM
- รูปภาพไม่ถูกส่งให้ model เว้นแต่จะเรียก `get_attachment` ภาพหน้าจออาจมีข้อมูลของคนอื่น
- ยอดเงินจาก OA หลักถูกซ่อนเป็นค่าเริ่มต้น (§5b)
- การเก็บข้อมูล: ค่าใน config (ค่าเริ่มต้น 180 วัน ตรงกับประวัติแชทของแพลนฟรีของ LINE) และมี `npm run forget -- <personRef>`
  ลบข้อมูลของคนหนึ่งคนทุกที่ ทั้งสองข้อใส่ใน README พร้อมฐานทางกฎหมาย (สัญญา / ประโยชน์โดยชอบด้วยกฎหมาย)
  และหมายเหตุว่าผู้ให้บริการ LLM เป็นผู้ประมวลผลข้อมูลที่ต้องมี DPA

---

## 7. ไฟล์แนบ (Attachments)

หลักการ: **ในแชทมีแค่ข้อมูลของไฟล์ ตัวไฟล์ดึงเมื่อมีคนขอ และจำกัดขนาดกับตรวจชนิดไฟล์ทุกครั้ง**

ตอนอ่าน:
- `read_chat` ส่งกลับแค่ `AttachmentRef` context ของ agent จึงเล็ก แชทที่มีรูปเต็มไปหมดก็ยังไม่เปลือง
- `get_attachment` ดาวน์โหลดจาก `chat-content.line.biz/bot/{botId}/{contentHash}` ด้วย session cookie (ไม่ใช่ URL ที่เซ็นไว้)
  แล้ว stream ลง `~/.cache/lineoa-mcp/attachments/<sha256>` โดยเขียนลงไฟล์ temp ก่อน แล้วค่อย rename เมื่อโหลดครบ
  ไฟล์ที่โหลดไม่ครบจะไม่โผล่ออกมาให้เห็น (atomic, จาก telegram-mcp) จำกัดขนาดดาวน์โหลดที่ 32 MiB เป็นค่าเริ่มต้น
- **ตรวจ MIME จาก magic bytes** ไม่เชื่อนามสกุลไฟล์หรือสิ่งที่ server บอก ชื่อไฟล์ถูก clean ก่อนใช้ (กัน path traversal และ control character)
- **รูปภาพ** (สลิปโอนเงิน รูปสินค้า) ย่อให้ด้านยาวไม่เกิน 1568 px
  - ถ้าย่อแล้วเล็กกว่าประมาณ 1 MB ส่งกลับเป็น MCP `image` content ให้ vision model อ่านได้เลย (เกณฑ์นี้เอามาจาก respond.io)
  - ถ้าใหญ่กว่านั้น บันทึกลงเครื่องแล้วส่งกลับเป็น `resource_link`
  - ส่ง path ในเครื่องกลับไปด้วยทั้งสองกรณี
- **ไฟล์อื่น** (PDF, docx, xlsx, zip) บันทึกลงเครื่อง tool ส่งกลับ path + ข้อมูลไฟล์ (+ preview ข้อความถ้าเป็น text หรือ CSV)
  การดึงข้อความจาก PDF อยู่ในหมวด "ถ้ามีเวลาเพิ่ม"
- ข้อความประเภทวิดีโอ เสียง sticker และ location ส่งกลับเป็น placeholder ที่ระบุชนิดพร้อมข้อมูลของไฟล์ วิดีโอกับเสียงดาวน์โหลดได้ แต่ไม่ส่งแบบ inline
- ไฟล์หมดอายุ: ในข้อความมี `expired` / `expiredAt` อยู่แล้ว เราเช็ก**ก่อน**ดาวน์โหลด แล้วตอบ `ATTACHMENT_EXPIRED` ไม่ปล่อยให้ crash
- Sticker โหลดจาก CDN สาธารณะ `stickershop.line-scdn.net/...` ไม่ต้อง auth

ตอนส่ง:
- `send_message.attachmentPaths` ต้องชี้ไปที่ไฟล์**ในโฟลเดอร์ outbox ที่อยู่ใน allowlist** (ค่าเริ่มต้น `~/lineoa-outbox`)
  กันไม่ให้ agent ที่โดน prompt injection ส่ง `~/.ssh/id_rsa` ไปให้ลูกค้า
- ตรวจชนิดและขนาดไฟล์ก่อนอัปโหลด: รูปไม่เกิน 20 MiB วิดีโอและไฟล์ไม่เกิน 32 MiB (ตัวเลขของ omnichat-bridge ต้องยืนยันจาก HAR)
  ส่ง **MIME จริง** ตอนอัปโหลด (LINELib ส่ง `application/octet-stream` ทุกไฟล์ เราไม่ทำตาม) และมี allowlist นามสกุลไฟล์ต่อ tool
  ลำดับคือ `uploadFile` → `contentMessageToken` → `bulkSendFiles`

ความปลอดภัย: ข้อความและไฟล์จากลูกค้าเป็น input ที่ไม่น่าเชื่อถือ ผลลัพธ์ของ tool จะติดป้ายบอกไว้ และ README มีส่วนอธิบายเรื่อง prompt injection

---

## 8. ลำดับงานและ commit

commit ทุกครั้งที่ทำขั้นที่มีความหมายเสร็จ commit ละเรื่อง ใช้ prefix ตามแบบ conventional commits และห้าม squash
ลำดับงานพร้อม prompt ของแต่ละ lane: [`docs/plan/run-plan.md`](plan/run-plan.md)
เวลาที่ตายตัวมีแค่กำหนดส่ง **ศุกร์ 6 พ.ย. 2026 เวลา 23:59 (เวลาไทย)** ขั้นเรียงตามลำดับนี้ แต่ละ lane ทำขนานกัน

| ขั้น | งาน | Lane |
|---|---|---|
| 0 | PLAN v3 merge เข้า `dev` และ `research` แล้วปลด pause dev (เสร็จแล้ว) | plan |
| 0 | สร้าง OA ทดสอบ · เก็บ HAR จาก OA จริง (อ่านอย่างเดียว) และจาก OA ทดสอบ (ลองส่ง) | user |
| 1 | ตั้งโปรเจกต์ TS + Biome + vitest + CI · ติดตั้ง plan kit | dev |
| 2 | domain types + `LineOAClient` → mock server จาก fixture (seed แบบ Support, 2 OA, คนเดียวกันหนึ่งคน) ‖ auth (SessionStore, login CLI กับ mock) | dev |
| 2 | HAR → แผนที่ endpoint ที่ลบข้อมูลจริงแล้ว เทียบกับ fixture | research |
| 3 | tool หลัก 6 ตัว + `webUrl` + การปิดการส่ง | dev |
| 4 | e2e test (MCP client → server → mock) + แก้ตามผล HAR | dev |
| ✓ | **Checkpoint:** merge เข้า `dev`, CI ผ่าน, เดโมบน mock | ทุก lane |
| 5 | `WebClient` กับ console จริง (OA ทดสอบก่อน) + contract test | dev |
| 6 | ชั้นเคส (§5b) | dev |
| 7 | README (setup, สถาปัตยกรรม, auth, ไฟล์แนบ, PII, ข้อจำกัด) + GIF เดโม | dev |
| 8 | ถ้ามีเวลา: เดโม Telegram ผ่าน Claude Code Channels, event การใช้งานจาก OA หลัก | dev |
| 9 | release `dev` → `main`, tag `v0.1.0`, CHANGELOG | dev |
| 10 | วิดีโอโบนัส (repo สาธารณะแยก) ถ้ามีเวลา | — |
| — | push ขึ้น repo สาธารณะและตอบอีเมลก่อนกำหนดส่ง | user |

ถ้าเวลาไม่พอ ตัดตามลำดับ: วิดีโอโบนัส → Telegram → บริบทจาก OA หลัก → ชั้นเคส → WebClient เส้นทางบน mock ต้องผ่านตลอด
สิ่งที่ตัดออกจะเขียนไว้ใน README พร้อมเหตุผล

---

## 9. แบ่งงานให้ agent อย่างไร (plan kit: github.com/Jamamaboy/claude-skill)

- **Orchestrator** (session หลัก, Opus) เป็นเจ้าของแผนนี้ และเขียน **domain type + interface `LineOAClient`** เอง เพราะทุกส่วนต้องใช้
  นอกจากนี้ยังรวมงาน แก้จุดเล็ก ๆ และตรวจรับงานรอบสุดท้าย
- `/write-plan` → แผน HTML หนึ่งหน้าต่อ phase เก็บใน `docs/dev/plans/` แต่ละหน้าผ่าน `plan-reviewer` และ `plan-risk-auditor`
  เพราะเวลาจำกัด จึง **review แค่รอบเดียว**
- `/implement-plan` แบ่งงานให้ `coder` (Sonnet) เป็นรอบ ๆ **ไม่ให้แก้ไฟล์ทับกัน**
  - รอบที่ 1 (หลังจาก contract พร้อม): `mock-server/**` ‖ `src/tools/** + src/client/mock/**` ‖ `src/auth/**`
  - รอบที่ 2: `src/attachments/**` ‖ `src/client/web/**` (หลังเก็บ HAR แล้ว)
  - รอบที่ 3: `src/cases/**` (store, ตัวเปิดเคสจาก rich menu, tool ของเคส) ‖ README
- Reviewer:
  - `code-reviewer` ตรวจทุก diff
  - `security-reviewer` ทำงานเมื่อแก้ `src/auth/**`, `src/attachments/**`, `src/client/web/**` หรือ `src/audit/**`
  - ปิด `uxui-reviewer` เพราะ console ของ mock ไม่ใช่ UI ที่ถูกให้คะแนน
- ทุกการรันบันทึกลง `.claude/agent-strategy/runs.md` log นี้เป็นหลักฐานว่าเราทำงานกับ coding agent อย่างไร
- ค่าใน profile ที่ต้องกรอก:
  - plan dir: `docs/dev/plans`
  - base branch: `main`
  - verify: `npm run lint && npm run typecheck && npm test`
  - high-risk: `src/auth/**`, `src/attachments/outbox.ts`, `src/tools/send-message.ts`
  - hard rule: ห้าม commit session หรือ cookie และห้าม log เนื้อหาข้อความที่ระดับ info

---

## 10. User flow (v3, Acme Support)

| id | Flow | Tool | กฎ |
|---|---|---|---|
| F1 | คัดแชทตอนเช้า: "แชทไหนรออยู่บ้าง" | `list_chats(ongoing)` → `read_chat` ×N | `read_chat` ไม่ mark read เลย (A7) คำตอบแสดง `webUrl` ของแต่ละแชท |
| F2 | ตอบผู้แจ้งปัญหา | `read_chat` → `get_user_profile` → ร่างข้อความ → `send_message` | AI ร่าง คนอนุมัติในหน้าต่างขออนุญาตของ client มี `dryRun` ให้ใช้ |
| F3 | มีภาพหน้าจอบั๊กเข้ามา | `read_chat` → `get_attachment(inline)` | รูปถึง model เฉพาะเมื่อมีคนขอ (§6b) |
| F4 | "มีคนอื่นแจ้งบั๊กเรื่องสกุลเงินไหม" | `search_messages` → `read_chat` | ค้นบางส่วนของคำภาษาไทยได้ ผลมี context และ `webUrl` |
| F5 | Session หมดอายุระหว่างทำงาน | tool ใดก็ได้ → `AUTH_EXPIRED` → คนรัน `npm run login` | ไม่ login ใหม่ให้เองเงียบ ๆ |
| F6 | ส่ง PDF วิธีใช้งาน | วางไฟล์ใน outbox → `send_message(attachmentPaths)` | ผ่าน outbox เท่านั้น การส่ง PDF ต้องยืนยันจาก HAR |
| F7 | คัดแยกเคส | `list_cases(open)` → `tag_case` (AI แนะนำ) → `set_case_status(waiting)` | แท็กของ AI ยังไม่ confirmed จนกว่า CS เห็นด้วย |
| F8 | ปิดเคส | คนบอกว่า "เสร็จแล้ว" → `set_case_status(resolved, confirmedByStaff)` | ถ้ามีข้อความเข้ามาหลัง resolve เคสจะเปิดใหม่เป็น `open` และติดธงไว้ |
| F9 | สรุปรายสัปดาห์ | `case_stats(groupBy=area)` + `list_cases(since)` | AI client เขียนเนื้อความจากสรุปที่เก็บไว้ |
| F10 | ผู้แจ้งคนนี้คือใคร | `get_person` → link candidate → CS ยืนยัน | อีเมลถูกปิดบัง ข้อมูลการใช้งานจาก OA หลักดูได้หลัง link เท่านั้น (ถ้ามีเวลา) |
| F11 | รับช่วงต่อด้วยมือ | ผลลัพธ์ใดก็ได้ → เปิด `webUrl` | คนทำต่อใน chat.line.biz |

---

## 11. งานวิจัย: ระบบที่คล้ายกันที่ควรอ่าน

บันทึกฉบับเต็มพร้อมแหล่งอ้างอิง: [`docs/research/2026-11-05-reading-list.md`](research/2026-11-05-reading-list.md) ประเด็นหลัก:

- **ผลิตภัณฑ์ที่ใช้ Messaging API ดึงประวัติแชทก่อนวันที่เชื่อมต่อไม่ได้เลย**
  ([no8.io](https://help.no8.io/en/articles/4161502-can-i-import-history-messages-before-connecting-to-line-official-account))
  ระบบรวมแชทในไทย (SleekFlow, Zaapi, Zwiz.ai, Page365) จึงเห็นแค่ข้อความที่เข้ามาหลังเชื่อมต่อ
  การทำงานผ่าน session ของ console เป็นทางเดียวที่จะเห็นแบบเดียวกับที่พนักงาน CS เห็นจริง
- ผลงานเดิมที่แกะ internal API ไว้แล้ว: [linebiz](https://github.com/PrakritManStudio/linebiz) (type ของ TS) และ
  [LINELib](https://github.com/Madoa5561/LINELib) (send/upload/SSE) เราใช้สองตัวนี้อ้างอิงเรื่อง endpoint (หัวข้อ 6a)
- MCP server ที่ login ในนามผู้ใช้จริง ซึ่งเราเอาแนวการออกแบบมาใช้:
  - [whatsapp-mcp](https://github.com/lharries/whatsapp-mcp): index ในเครื่อง ดาวน์โหลดไฟล์เมื่อขอ
  - [slack-mcp-server](https://github.com/korotovsky/slack-mcp-server): ปิดการส่งไว้เป็นค่าเริ่มต้น และมี allowlist
  - [telegram-mcp](https://github.com/chigwell/telegram-mcp): identity guard, โหมดอ่านอย่างเดียว, จำกัดโฟลเดอร์ไฟล์
- แนวที่ยืมมาจากระบบอื่น:
  - domain model ตาม Chatwoot
  - เกณฑ์ 1 MB ระหว่างส่งรูปให้ดูเลยกับส่ง link มาจาก respond.io
  - ID ที่มี prefix มาจาก Front
  - ร่างก่อนส่งมาจาก Jib OS และ OHO

สิ่งที่แผนนี้เปลี่ยนจากผลการค้นข้อมูล (แก้ไว้ในหัวข้อด้านบนแล้ว):
1. `LINEOA_ALLOW_SEND=false` ทำให้ server อยู่ในโหมดอ่านอย่างเดียว และ `LINEOA_SEND_CHAT_ALLOWLIST` (ไม่บังคับ) จำกัดว่าส่งได้แค่แชทไหน
2. **Identity guard:** `LINEOA_EXPECTED_ACCOUNT` server ไม่ยอมเริ่มทำงานถ้า `/api/v1/me` ไม่ตรงกับค่านี้
3. `search_messages` ส่งข้อความรอบ ๆ ผลที่เจอกลับมาด้วย (`contextBefore` / `contextAfter`)
4. ID ในผลลัพธ์ของ tool มี prefix (`chat_…`, `user_…`, `msg_…`, `att_…`) model จะได้ไม่สับสนระหว่าง id แต่ละชนิด

---

### งานวิจัยรอบ 2: ลองติดตั้งและเทียบกันจริง (branch `research`)

agent Sonnet 5 ตัวทำงานขนานกัน ติดตั้งหรือลองใช้ 17 โปรเจกต์ ให้คะแนนแบบถ่วงน้ำหนัก และสรุปไว้ในหน้าเดียว:
`test/research/index.html` (branch `research`)

คะแนนสูงสุด: telegram-mcp 81, slack-mcp-server 74, LINELib 71, Chatwoot 66, omnichat-bridge 66
ตัวที่ตรงโจทย์ที่สุดคือ omnichat-bridge เป็น extension ของบริษัทไทย ที่อ่าน ส่ง และแนบไฟล์ผ่าน endpoint ภายในของ chat.line.biz และมี test 995 ข้อ
ข้อที่แก้ด้านบนและมีชื่อโปรเจกต์กำกับไว้ ได้มาจากรอบนี้

สิ่งที่ยังไม่มีใครทำ (จุดที่งานของเราต่างออกไป):
- MCP server สำหรับ LINE OA ในนามพนักงาน CS
- mock backend + contract test
- search ภาษาไทย
- outbox ที่จำกัดโฟลเดอร์ตอนส่งไฟล์

---

## 12. ความเสี่ยงและคำถามที่ยังเปิดอยู่

| ความเสี่ยง / คำถาม | วิธีรับมือ |
|---|---|
| ยังไม่ได้ยืนยัน endpoint จริง | เก็บ HAR จาก OA จริง (อ่านอย่างเดียว) และ OA ทดสอบ mock ยังเป็นเส้นทางที่ใช้ให้คะแนน |
| แตะแชทของคนจริงบน OA จริง | A11: กฎอ่านอย่างเดียว, `LINEOA_ALLOW_SEND=false`, allowlist ของ bot, เก็บ HAR ไว้นอก repo |
| ขอบเขตบานจากชั้นเคสและงานเสริม | แบ่ง ต้องมี/ควรมี/ถ้ามีเวลา ใน §1 และลำดับการตัดงานใน §8 งานหลักส่งก่อน |
| Internal API เปลี่ยน หรือไม่มีเอกสาร | endpoint ทั้งหมดอยู่ใน module เดียว และมี contract test ถ้าพังจะรู้ทัน |
| ข้อกังวลเรื่อง ToS และความปลอดภัยของบัญชี จากการ automate แบบไม่เป็นทางการ | คน login เอง, rate limit ต่ำ, ไม่ login ใหม่ให้เอง, จำกัด OA, มี audit log และเขียนบอกตรง ๆ ใน README |
| ไม่มี endpoint ค้นข้อความ → index สดเท่ากับการ sync ครั้งล่าสุดเท่านั้น | `search_messages` ส่ง `indexedAt` กลับไปด้วย และ sync แชทที่เพิ่งเปลี่ยนก่อนค้นทุกครั้ง |
| คุณภาพการค้นภาษาไทย | FTS5 trigram ถ้าคำค้นสั้นกว่า 3 ตัวอักษร ใช้ `LIKE` แทน |
| Prompt injection จากข้อความหรือไฟล์ของลูกค้า | ป้ายบอกว่าเนื้อหาไม่น่าเชื่อถือ, allowlist ของ outbox และส่งแบบ `dryRun` |
| กำหนดส่ง (ศุกร์ 6 พ.ย. 23:59) | ลำดับการตัดงานในหัวข้อ 8 เส้นทางบน mock พร้อมส่งได้ตลอด |
