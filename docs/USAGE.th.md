# คู่มือการใช้ lineoa-cs (ภาษาไทย)

lineoa-cs ให้ AI (เช่น Claude) ดูแลแชท LINE OA แทนพนักงาน CS ได้ ทำงานผ่านหน้า LINE OA Manager
ด้วยบัญชีของคุณเอง **ค่าเริ่มต้นอ่านอย่างเดียว** ส่งข้อความไม่ได้จนกว่าคุณจะเปิดเอง

## 1. ติดตั้งครั้งแรก (ประมาณ 5 นาที)

ต้องมี: Node 22.13 ขึ้นไป · Google Chrome หรือ Microsoft Edge · บัญชีที่เข้า LINE OA Manager ได้

```bash
git clone https://github.com/Jamamaboy/lineoa-cs-mcp.git
cd lineoa-cs-mcp
npm install
npm run setup     # เพิ่มเข้า Claude Desktop และ Claude Code ให้เอง (อ่านอย่างเดียว)
npm run login     # browser เด้งขึ้นมา ให้ login LINE ด้วยตัวเอง
```

จากนั้นเปิด Claude Desktop ใหม่ หรือพิมพ์ `claude` ใน terminal ก็ใช้ได้เลย

- `npm run setup -- --dry-run` ดูก่อนว่าจะเปลี่ยนอะไร (ยังไม่เปลี่ยนจริง)
- `npm run login -- --browser edge` เลือก browser เองได้: `chrome` `edge` `brave` `chromium` `firefox` `webkit`
  - firefox / webkit ต้องติดตั้งครั้งแรกด้วย `npx playwright-core install firefox` (หรือ `webkit`)
  - Safari ตัวจริงใช้ไม่ได้ เพราะ Safari ไม่ยอมให้โปรแกรมควบคุม ให้ใช้ `webkit` (เครื่องยนต์เดียวกับ Safari) แทน

## 2. ใช้กับ Claude: พิมพ์ถามเป็นภาษาคน

| อยากรู้ / อยากทำ | พิมพ์ประมาณนี้ | tool ที่ Claude เรียก |
|---|---|---|
| login อยู่ไหม เข้า OA ไหนได้ | "เช็กว่า login LINE OA อยู่ไหม" | `auth_status` |
| แชทไหนรอเราตอบ (ลูกค้าพิมพ์มาแล้วเงียบ) | "มีแชทไหนรอตอบบ้าง สรุปให้หน่อย" | `list_chats` (needs_reply) |
| แชทที่ยังไม่มีใครเปิด | "มีแชทไหนยังไม่อ่าน" | `list_chats` (unread) |
| อ่านแชท | "สรุปแชทของ LAY ให้หน่อย" | `read_chat` |
| ค้นทุกแชท | "มีใครพูดถึง OT บ้าง" · "หาคำว่า คืนเงิน" | `search_messages` |
| ลูกค้าคนนี้คือใคร | "โปรไฟล์ของ POKKY มีแท็กหรือโน้ตอะไร" | `get_user_profile` |
| ดูรูป / ไฟล์ที่ลูกค้าส่ง | "รูปที่ลูกค้าส่งมาล่าสุดคืออะไร" | `get_attachment` |
| อยากไปคุยเอง | "ขอลิงก์ไปเปิดแชทนี้ในหน้าเว็บ" | ทุก tool มี `webUrl` |
| ดู OA อื่น | "ใน OA TestOA มีแชทไหนรอตอบ" | ทุก tool รับ `botId` |
| ส่งข้อความ (ต้องเปิดก่อน ดูข้อ 4) | "ร่างคำตอบให้ LAY แล้วให้ฉันดูก่อนส่ง" | `send_message` (dryRun แล้วส่ง) |

**ถ้าบัญชีเข้าได้หลาย OA** แล้วคำถามไม่ได้บอกว่า OA ไหน Claude จะถามกลับก่อน (tool ตอบ `CHOOSE_OA` พร้อมรายชื่อ OA)
ถ้าใช้ OA เดียวประจำ ให้ตั้ง `LINEOA_DEFAULT_OA="ชื่อ OA"` จะได้ไม่ต้องตอบทุกครั้ง

## 3. ใช้ใน terminal (ไม่ต้องมี AI)

```bash
npm run lineoa -- status                 # ใคร login · เข้า OA ไหนได้ · การส่งเปิดไหม
npm run lineoa -- chats --needs-reply    # แชทที่รอตอบ  (--unread · --all · --oa "TestOA")
npm run lineoa -- read <chatId>          # อ่านแชท (chatId ได้จากคำสั่ง chats หรือ webUrl)
npm run lineoa -- search คืนเงิน          # ค้นข้อความ
```

ในรายการแชท: `●` = ยังไม่อ่าน · `←` = ลูกค้าพิมพ์ล่าสุด · `→` = ฝั่งเราตอบล่าสุด

## 4. เปิดการส่งข้อความ (เมื่อพร้อม)

```bash
npm run setup -- --allow-send            # แล้วเปิด Claude ใหม่
```

ด่านป้องกันการส่งผิด:
- ถ้าไม่เปิด AI จะไม่เห็น tool ส่งข้อความเลย
- Claude ถามคุณก่อนส่งทุกครั้ง และ AI สั่ง `dryRun` ดูตัวอย่างก่อนส่งจริงได้
- จำกัดว่าส่งได้แค่บางแชท: ตั้ง `LINEOA_SEND_CHAT_ALLOWLIST`
- จำกัดจำนวนต่อวัน: `LINEOA_SEND_DAILY_LIMIT` (ค่าเริ่มต้น 50)
- ทุกการส่งถูกบันทึกที่ `~/.local/share/lineoa-mcp/audit.jsonl` (เก็บแค่ความยาวกับ hash ไม่เก็บข้อความ)
- ทดสอบการส่งกับ OA ทดสอบเท่านั้น อย่าทดสอบกับแชทลูกค้าจริง

## 5. ลองโดยไม่ต้องมีบัญชี LINE (mock)

```bash
npm run try                 # ทัวร์ 10 วินาทีใน terminal
npm run try -- --real       # ทัวร์เดียวกันกับ OA จริง (อ่านอย่างเดียว ไม่เปิดแชทที่ยังไม่อ่าน)
npm run mock                # หน้าเว็บของ LINE ปลอม: http://127.0.0.1:8787
```

ใน Claude Code ที่โฟลเดอร์นี้ ให้กดอนุญาต server `lineoa-cs-mock` จะได้คุยกับข้อมูลปลอม

## 6. เจอปัญหา

| เห็นข้อความนี้ | แปลว่า | ทำยังไง |
|---|---|---|
| `AUTH_EXPIRED` / "Not logged in" | session หมดอายุ (มักไม่เกิน 1 วัน) | `npm run login` |
| "No browser could be opened" | ไม่เจอ browser ที่ใช้ได้ | ติดตั้ง Chrome หรือ Edge หรือ `npx playwright-core install chromium` |
| `FORBIDDEN` | บัญชีนี้ไม่มีสิทธิ์ใน OA หรือแชทนั้น | ขอสิทธิ์จากแอดมิน OA |
| `ENDPOINT_CHANGED` | LINE เปลี่ยน API ภายใน | แจ้งผู้ดูแล repo (ดู CONTRIBUTING.md) |
| `CHOOSE_OA` | บัญชีเข้าได้หลาย OA แต่ไม่ได้บอกว่าเอา OA ไหน | ตอบชื่อ OA หรือใส่ `--oa "ชื่อ"` |
| `SEND_UNCERTAIN` | ไม่แน่ใจว่าส่งไปแล้วหรือยัง | เปิดแชทดูก่อน **อย่าส่งซ้ำ** |
| `ATTACHMENT_EXPIRED` | LINE ลบไฟล์นั้นแล้ว | ขอให้ลูกค้าส่งใหม่ |

## 7. ไฟล์ที่เก็บในเครื่องคุณ (ไม่เข้า git)

| ไฟล์ | คืออะไร |
|---|---|
| `~/.config/lineoa-mcp/session.json` | cookie ของ LINE (เปิดได้แค่คุณ) ลบไฟล์นี้ = logout |
| `~/.local/share/lineoa-mcp/index.db` | สำเนาข้อความไว้ค้นหา |
| `~/.cache/lineoa-mcp/attachments/` | รูป / ไฟล์ที่โหลดมา |
| `~/.local/share/lineoa-mcp/audit.jsonl` | log การส่ง |
