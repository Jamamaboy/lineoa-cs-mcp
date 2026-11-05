#!/usr/bin/env python3
"""Generate test/research/line-api-shapes/*.json: realistic, fully fake chat.line.biz API fixtures.

Every id, hash, name and token below is invented. Field names and shapes come from the evidence files in
line-api-shapes/_evidence/ (see README.md there for file:line sources).

Usage: python3 -I test/research/tools/gen_line_api_shapes.py test/research
"""
import csv
import io
import json
import sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else "test/research") / "line-api-shapes"
ROOT.mkdir(parents=True, exist_ok=True)

CLIENT_VERSION = "20240513144702"
HOST = "https://chat.line.biz"


def uid(prefix: str, kind: str, n: int) -> str:
    """LINE-style id: one letter + 32 hex chars. The hex body is obviously fake (mostly zeros)."""
    body = prefix + str(n).rjust(32 - len(prefix), "0")
    assert len(body) == 32
    return kind + body


BOT_ID = uid("b07", "U", 1)
BOT2_ID = uid("b07", "U", 2)
U_SOMCHAI = uid("c5", "U", 1)
U_NOK = uid("c5", "U", 2)
U_MINT = uid("c5", "U", 3)
U_ARTHIT = uid("c5", "U", 4)
U_PIM = uid("c5", "U", 5)
G_AGENTS = uid("a11", "C", 1)
BIZ_ME = "00000000-0000-4000-8000-0000000000a1"
BIZ_OTHER = "00000000-0000-4000-8000-0000000000a2"
TAG_VIP = "fakevip000000000000000000a"
TAG_WAITPAY = "fakewaitpay00000000000000b"
TAG_REFUND = "fakerefund000000000000000c"

T0 = 1793844000000  # 2026-11-05 09:00 ICT, epoch ms
MIN = 60_000
HOUR = 60 * MIN
DAY = 24 * HOUR
EXPIRES = T0 + 14 * DAY  # content kept ~2 weeks (guess; HAR to confirm)

_mid = [586900000000000100]


def mid() -> str:
    """18-digit numeric message id as a string, increasing over time."""
    _mid[0] += 1
    return str(_mid[0])


def chash(name: str) -> str:
    return f"fakehash-{name}"


def line_cp(h: str, expired: bool = False, expired_at: int = EXPIRES) -> dict:
    return {"type": "line", "contentHash": h, "expired": expired, "expiredAt": expired_at}


def src(chat: str, user: str | None = None) -> dict:
    return {"chatId": chat, "userId": user} if user else {"chatId": chat}


def write(name: str, data) -> None:
    p = ROOT / name
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


COMMON_HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "x-oa-chat-client-version": CLIENT_VERSION,
    "Cookie": "__Host-chat-ses=FAKE-SESSION; chat-device-group=FAKE-DEVICE; XSRF-TOKEN=FAKE-XSRF",
}
WRITE_HEADERS = {**COMMON_HEADERS, "Content-Type": "application/json", "X-XSRF-TOKEN": "FAKE-XSRF"}


def envelope(endpoint, sources, body, *, query=None, request=None, status=200, headers=None,
             uncertain=None, conflicts=None, notes=None, resp_headers=None):
    meta = {"endpoint": endpoint, "host": HOST, "requestHeaders": headers or COMMON_HEADERS}
    if query is not None:
        meta["query"] = query
    meta["sources"] = sources
    if uncertain:
        meta["uncertain"] = uncertain
    if conflicts:
        meta["conflicts"] = conflicts
    if notes:
        meta["notes"] = notes
    out = {"_meta": meta}
    if request is not None:
        out["request"] = request
    resp = {"status": status}
    if resp_headers:
        resp["headers"] = resp_headers
    resp["body"] = body
    out["response"] = resp
    return out


# ---------------------------------------------------------------- /api/v1/me
write("me.json", envelope(
    "GET /api/v1/me",
    ["linebiz src/types/me.ts:2-8", "linebiz src/resources/me.ts:14", "linebiz test/fixtures/me.ts:4-10",
     "propertyos-line-importer src/oam-api.js (/me used as login probe)"],
    {
        "bizId": BIZ_ME,
        "language": "th",
        "name": "ปุ้ย ฝ่ายบริการลูกค้า",
        "linePictureUri": "https://profile.line-scdn.net/FAKE-staff-picture",
        "localStorageEncryptionKey": "FAKE-local-storage-key",
    },
    uncertain=["language value for Thai users ('th' assumed)", "linePictureUri host"],
    conflicts=["LINELib reads the staff name from GET /api/v1/bots top-level `userName` instead (LINELib AuthService.py:322); its /me stub is only {name} (tests/test_chat_service.py:742-749)"],
))

# ---------------------------------------------------------------- /api/v1/bots
def bot(bot_id, search_id, name, unread, perm="ADMIN"):
    return {
        "botId": bot_id,
        "basicSearchId": search_id,
        "name": name,
        "iconUrl": "https://profile.line-scdn.net/FAKE-bot-icon",
        "iconHash": "FAKE-bot-iconhash",
        "region": "TH",
        "brandType": "GENERAL",
        "userPermissionType": perm,
        "responseMode": "CHAT",
        "disabledCrm": False,
        "unreadCount": unread,
        "plan": {"code": "free", "planType": "FREE"},
        "offline": False,
        "chatGrade": "GRADE_A",
    }


write("bots.json", envelope(
    "GET /api/v1/bots",
    ["linebiz src/types/bots.ts:2-20", "linebiz src/resources/bots.ts:26-37", "linebiz test/fixtures/bots.ts:4-24",
     "LINELib ChatService.py:720-740, AuthService.py:46,322", "omnichat-bridge extension/line-oa-realtime.js:196",
     "propertyos-line-importer src/oam-api.js:293-295"],
    {
        "userName": "ปุ้ย ฝ่ายบริการลูกค้า",
        "list": [
            bot(BOT_ID, "@acme-demo", "Acme Demo Shop", 2),
            bot(BOT2_ID, "@acme-test2", "Acme ร้านทดสอบ 2", 0, perm="OPERATOR"),
        ],
    },
    query={"noFilter": "true", "limit": 1000, "next": "(optional cursor)"},
    uncertain=[
        "`userName` top-level only seen in LINELib (AuthService.py:322 + its test); linebiz does not type it",
        "`next` cursor: linebiz reads it (src/resources/bots.ts:37); LINELib/omnichat never page (limit=1000)",
        "userPermissionType values other than ADMIN (OPERATOR assumed)",
        "responseMode=BOT accounts reject manual chat APIs with 403 (LINELib docs/messages-and-media.md:20)",
    ],
))

# ---------------------------------------------------------------- message events (shared)
def ev_msg(ts, chat, user, message):
    return {"type": "message", "timestamp": ts, "source": src(chat, user), "message": message}


def ev_sent(ts, chat, user, message, send_id=None, biz=BIZ_ME):
    e = {"type": "messageSent", "timestamp": ts, "source": src(chat, user), "message": message}
    if send_id:
        e["sendId"] = send_id
    if biz:
        e["bizId"] = biz
    return e


def send_id(chat, ts, rnd="04821937"):
    return f"{chat}_{ts}_{rnd}"


# Somchai's chat, built oldest -> newest, then reversed (API returns newest first).
S = U_SOMCHAI
t = T0 - 2 * DAY
older = []  # second (older, last) page
older.append({"type": "follow", "timestamp": t, "source": src(S, S)})
t += 2 * MIN
older.append(ev_sent(t, S, S, {"id": mid(), "type": "text",
                               "text": "ขอบคุณที่เพิ่มเพื่อน Acme Demo Shop ค่ะ 🙏 พิมพ์สอบถามได้เลยนะคะ",
                               "originalType": "flex", "quoteToken": "FAKE-quote-1"}, biz=None))
t += 5 * MIN
older.append(ev_msg(t, S, S, {"id": mid(), "type": "text", "text": "สวัสดีครับ สนใจสั่งเคสมือถือ 2 ชิ้นครับ",
                              "quoteToken": "FAKE-quote-2"}))
t += 3 * MIN
older.append(ev_sent(t, S, S, {"id": mid(), "type": "text",
                               "text": "ได้เลยค่ะ ยอดรวม 1,250 บาท โอนเข้าบัญชีแล้วส่งสลิปมาได้เลยนะคะ",
                               "quoteToken": "FAKE-quote-3"}, send_id=send_id(S, t, "00412345")))
t += 1 * MIN
expired_img_id = mid()
older.append(ev_msg(t, S, S, {"id": expired_img_id, "type": "image", "quoteToken": "FAKE-quote-4",
                              "contentProvider": line_cp(chash("old-photo"), True, t + DAY),
                              "contentHash": chash("old-photo"), "expired": True, "expiredAt": t + DAY}))

EMOJI_TEXT = "โอนแล้วนะครับ order #1234 ครับ $"  # LINE emoji = "$" placeholder + emojis[]
t = T0
newer = []
newer.append(ev_msg(t, S, S, {"id": mid(), "type": "text", "text": EMOJI_TEXT,
                              "quoteToken": "FAKE-quote-5",
                              "emojis": [{"index": EMOJI_TEXT.index("$"), "length": 1, "productId": "FAKE-emoji-product", "emojiId": "001"}]}))
t += 1 * MIN
slip_id = mid()
newer.append(ev_msg(t, S, S, {"id": slip_id, "type": "image", "quoteToken": "FAKE-quote-6",
                              "contentProvider": line_cp(chash("slip-1234")),
                              "contentHash": chash("slip-1234"), "expired": False, "expiredAt": EXPIRES}))
t += 1 * MIN
newer.append(ev_msg(t, S, S, {"id": mid(), "type": "file",
                              "contentProvider": line_cp(chash("order-xlsx")),
                              "fileName": "รายการสั่งซื้อ_1234.xlsx", "fileSize": 18342,
                              "contentHash": chash("order-xlsx"), "expired": False, "expiredAt": EXPIRES}))
t += 1 * MIN
newer.append(ev_msg(t, S, S, {"id": mid(), "type": "sticker", "packageId": "11537", "stickerId": "52002734",
                              "stickerResourceType": "STATIC", "quoteToken": "FAKE-quote-7"}))
t += 2 * MIN
newer.append(ev_msg(t, S, S, {"id": mid(), "type": "location", "latitude": 13.7466, "longitude": 100.5393,
                              "address": "999/9 ถนนพระราม 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพมหานคร 10330"}))
t += 1 * MIN
newer.append(ev_msg(t, S, S, {"id": mid(), "type": "video", "quoteToken": "FAKE-quote-8",
                              "contentProvider": line_cp(chash("unbox-video")), "duration": 12500,
                              "contentHash": chash("unbox-video"), "expired": False, "expiredAt": EXPIRES}))
t += 1 * MIN
newer.append(ev_msg(t, S, S, {"id": mid(), "type": "audio",
                              "contentProvider": line_cp(chash("voice-note")), "duration": 8300,
                              "contentHash": chash("voice-note"), "expired": False, "expiredAt": EXPIRES}))
t += 1 * MIN
unsent_id = mid()
newer.append(ev_msg(t, S, S, {"id": unsent_id, "type": "unsent"}))
t += 10 * 1000
newer.append({"type": "unsend", "timestamp": t, "source": src(S), "unsend": {"messageId": unsent_id}})
t += 2 * MIN
newer.append({"type": "chatRead", "timestamp": t, "source": src(S, S), "read": {"watermark": t}})
t += 3 * MIN
newer.append(ev_sent(t, S, S, {"id": mid(), "type": "image", "quoteToken": "FAKE-quote-9",
                               "contentProvider": {"type": "external",
                                                   "originalContentUrl": "https://example.invalid/fake/catalog.jpg",
                                                   "previewImageUrl": "https://example.invalid/fake/catalog-preview.jpg"}},
                     send_id=send_id(S, t, "07731002")))
t += 1 * MIN
newer.append(ev_sent(t, S, S, {"id": mid(), "type": "file",
                               "contentProvider": line_cp(chash("receipt-pdf")),
                               "fileName": "ใบเสร็จ-INV-2026-1105.pdf", "fileSize": 48213,
                               "contentHash": chash("receipt-pdf"), "expired": False, "expiredAt": EXPIRES},
                     send_id=send_id(S, t, "51200977")))
t += 1 * MIN
last_sent_ts = t
last_sent = ev_sent(t, S, S, {"id": mid(), "type": "text",
                              "text": "ได้รับสลิปแล้วค่ะ ยอด 1,250 บาท ตรวจสอบเรียบร้อย ขอบคุณที่ใช้บริการ Acme นะคะ 🙏",
                              "quoteToken": "FAKE-quote-10", "quotedMessageId": slip_id},
                    send_id=send_id(S, t))
newer.append(last_sent)

MSG_SOURCES = [
    "linebiz src/types/messages.ts:33-319 (every event + message variant)",
    "linebiz src/resources/messages.ts:40-50 (query `backward`, response `backward`)",
    "linebiz test/fixtures/messages.ts:8-102",
    "omnichat-bridge extension/line-oa-realtime.js:308-315 (limit<=100 + backward), :466-525 (paging loop)",
    "line-chat-history-downloader scripts/downloader.js:92-108 (backward only), :118 (messageSent = OA side)",
    "LINELib ChatService.py:552-559 (limit + before/after), sse.py:42-100 (message fields)",
]
MSG_UNCERTAIN = [
    "pagination params: see conflicts; `limit` default/max unknown (omnichat uses 100, LINELib default 50)",
    "contentHash format (real ones are opaque strings; ours are `fakehash-*`)",
    "expiredAt for media (we set +14 days) and whether `expired` flips server-side",
    "duration unit for video/audio (assumed ms, like Messaging API)",
    "location may also carry `title` (not typed in linebiz; Messaging API has it)",
    "whether `sendId` also appears inside `message` (omnichat reads message.sendId ?? event.sendId, line-oa-realtime.js:~324 / content.js:44)",
    "`bizId` on messageSent for auto-replies/greeting (we omit it there)",
]
MSG_CONFLICTS = [
    "Pagination: linebiz + line-chat-history-downloader send only `?backward=<cursor>`; omnichat-bridge sends `limit` (<=100) + `backward`; LINELib sends `limit` (1-100, default 50) + `before`/`after` (opaque cursor or legacy int). Response cursor field `backward` is confirmed by linebiz, omnichat and downloader; LINELib never reads the response. Mock should accept all of: backward, limit, before, after.",
    "Order: newest first (linebiz src/resources/messages.ts:22-23, omnichat line-oa-realtime.js:335).",
    "Content URL: `https://chat-content.line.biz/bot/{botId}/{contentHash}` (downloader downloader.js:199-) vs `.../{contentHash}/preview` (LINELib sse.py:57-58). See chat-content.json.",
]

write("messages.json", envelope(
    "GET /api/v3/bots/{botId}/chats/{chatId}/messages",
    MSG_SOURCES,
    {"list": list(reversed(newer)), "backward": "FAKE-backward-cursor-page2"},
    query={"backward": "(omit on first page)", "limit": "(optional, <=100; omnichat/LINELib only)"},
    uncertain=MSG_UNCERTAIN, conflicts=MSG_CONFLICTS,
    notes=[f"chatId of a 1:1 chat == the customer's userId ({S})",
           "`message` = from customer, `messageSent` = from the OA (staff, auto-reply). `bizId` = staff who sent.",
           "received image/video/audio/file: contentProvider.type=line + contentHash; sent image/video: contentProvider.type=external + URLs",
           "unsent appears twice: the original message becomes {id,type:'unsent'} and a separate `unsend` event points at it",
           "next page: messages.older-page.json"],
))
write("messages.older-page.json", envelope(
    "GET /api/v3/bots/{botId}/chats/{chatId}/messages?backward=FAKE-backward-cursor-page2",
    MSG_SOURCES,
    {"list": list(reversed(older))},
    query={"backward": "FAKE-backward-cursor-page2"},
    notes=["Last page: no `backward` field (linebiz treats null/''/absent as end, src/core/pagination.ts:41)",
           f"Contains an expired image (id {expired_img_id}) to test ATTACHMENT_EXPIRED",
           "Contains a greeting sent as flex: type text + originalType 'flex', no bizId",
           "Contains a `follow` event (system event, not a message)"],
))

# ---------------------------------------------------------------- chats list
def chat(chat_id, profile, latest, *, read, done=False, tags=(), assigned=None, chat_type="USER",
         status="active", last_recv, last_sent=None, read_mentioned=None, user_read=None):
    c = {
        "chatId": chat_id,
        "updatedAt": max(last_recv, last_sent or 0),
        "tagIds": list(tags),
        "autoTagIds": [],
        "read": read,
        "done": done,
        "followedUp": False,
        "spam": False,
        "muteAtPc": False,
        "muteAtApp": False,
        "profile": profile,
        "lastReadAt": last_recv if read else last_recv - HOUR,
        "lastReceivedAt": last_recv,
        "lastTalkedAt": max(last_recv, last_sent or 0),
        "lastReadMessageId": "586900000000000050",
        "chatType": chat_type,
        "status": status,
    }
    if read_mentioned is not None:
        c["readMentioned"] = read_mentioned
    if assigned:
        c["assignedBizId"] = assigned
    if latest is not None:
        c["latestEvent"] = latest
    if last_sent:
        c["lastSentAt"] = last_sent
    if user_read:
        c["userLastReadAt"] = user_read
        c["userLastReadMessageId"] = "586900000000000060"
    return c


def uprof(user, name, friend=True):
    return {"userId": user, "name": name, "friend": friend, "lastActivityExpiresAt": T0 + 7 * DAY,
            "iconHash": "FAKE-user-iconhash"}


chats = [
    chat(U_NOK, uprof(U_NOK, "นก 🌸"),
         ev_msg(T0 + 3 * HOUR, U_NOK, U_NOK, {"id": "586900000000000301", "type": "text",
                                              "text": "ขอคืนเงินออเดอร์ #1250 ได้ไหมคะ ของมาไม่ครบค่ะ"}),
         read=False, tags=[TAG_REFUND], last_recv=T0 + 3 * HOUR),
    chat(G_AGENTS, {"groupId": G_AGENTS, "count": 6, "name": "ทีมตัวแทนขาย Acme", "iconHash": "FAKE-group-iconhash"},
         ev_msg(T0 + 2 * HOUR, G_AGENTS, U_ARTHIT, {"id": "586900000000000201", "type": "text",
                                                    "text": "@Acme Demo Shop รบกวนเช็กยอดขายเมื่อวานให้หน่อยครับ",
                                                    "mention": {"mentionees": [{"index": 0, "length": 18, "type": "self"}]}}),
         read=False, read_mentioned=True, chat_type="GROUP", last_recv=T0 + 2 * HOUR),
    chat(S, uprof(S, "สมชาย ใจดี"), last_sent, read=True, tags=[TAG_VIP], assigned=BIZ_ME,
         last_recv=T0 + 8 * MIN, last_sent=last_sent_ts, user_read=last_sent_ts),
    chat(U_MINT, uprof(U_MINT, "Mint Chanakarn"),
         ev_sent(T0 - DAY, U_MINT, U_MINT, {"id": "586900000000000090", "type": "sticker", "packageId": "11537",
                                            "stickerId": "52002735", "stickerResourceType": "ANIMATION"},
                 send_id=send_id(U_MINT, T0 - DAY), biz=BIZ_OTHER),
         read=True, done=True, assigned=BIZ_OTHER, last_recv=T0 - DAY - 5 * MIN, last_sent=T0 - DAY),
    # Many real list items have no latestEvent (omnichat: 53 of 89 observed).
    chat(U_PIM, uprof(U_PIM, "พิม (ลูกค้าเก่า)", friend=False), None, read=True, status="blocked",
         last_recv=T0 - 30 * DAY),
]
write("chats.json", envelope(
    "GET /api/v2/bots/{botId}/chats",
    ["linebiz src/types/chats.ts:4-58", "linebiz src/resources/chats.ts:34-55", "linebiz test/fixtures/chats.ts:8-100",
     "omnichat-bridge extension/line-oa-realtime.js:~296-306 (query), 6 (limit 25)",
     "LINELib ChatService.py:~620-660 (query; limit 1-25)", "line-chat-history-downloader scripts/downloader.js:76",
     "line-friend-export 03-get-chats.ts (profile.name, nickname, iconHash, next)"],
    {"list": chats, "next": "FAKE-next-cursor-chats-2"},
    query={"folderType": "ALL", "tagIds": "", "autoTagIds": "", "limit": 25, "prioritizePinnedChat": "true",
           "next": "(omit on first page)"},
    uncertain=[
        "folderType values other than ALL (e.g. UNREAD / FOLLOW_UP / DONE?) are not in any repo; HAR needed for list_chats filter=unread|ongoing",
        "sort order of the list (assumed lastTalkedAt desc, pinned first when prioritizePinnedChat=true)",
        "`profile.nickname` seen only in line-friend-export / propertyos contacts",
        "`lastActivityExpiresAt` meaning (ms timestamp)",
    ],
    conflicts=["prioritizePinnedChat: linebiz default true, omnichat sends false (line-oa-realtime.js:~304)",
               "LINELib implements no `next` paging for chats; linebiz/omnichat/line-friend-export use `next`"],
    notes=["`done` = resolved (PLAN A3 'ongoing' = done:false). `read:false` = unread.",
           "Group chat ids start with C, rooms with R, 1:1 chats are the user's U id."],
))

write("chat.json", envelope(
    "GET /api/v1/bots/{botId}/chats/{chatId}",
    ["LINELib ChatService.py (get_chat; response keys never read)", "PLAN.md §6a (get_user_profile)"],
    chats[2],
    uncertain=["Whole shape is ASSUMED to equal one item of chats.json `list` — no repo types or reads it. Confirm in HAR."],
))

# ---------------------------------------------------------------- send
ts_send = T0 + 4 * HOUR
write("messages-send.json", envelope(
    "POST /api/v1/bots/{botId}/chats/{chatId}/messages/send",
    ["LINELib LINELib.py:613-626 (textV2 body, 7-digit random)", "LINELib ChatService.py:1194-1243 (cardType), :257-286 (mention)",
     "omnichat-bridge extension/line-oa-realtime.js:1019 (sendId 8-digit), :1184 (endpoint), :~1152-1163 (text limits)",
     "omnichat-bridge test (request assertion type text)"],
    {},
    headers=WRITE_HEADERS,
    request={
        "id": "",
        "type": "textV2",
        "text": "สวัสดีค่ะคุณนก ทางร้านขอโทษที่ของมาไม่ครบนะคะ เดี๋ยวดำเนินการคืนเงินให้ภายใน 3 วันทำการค่ะ",
        "sendId": f"{U_NOK}_{ts_send}_4821937",
    },
    uncertain=[
        "Success response body: no repo reads it (LINELib treats as {}; omnichat never parses it). We return {} — confirm in HAR.",
        "Whether the response carries the new message id (omnichat confirms by polling history for sendId every 1s up to 10s)",
        "Text length limit: omnichat enforces 2000 (text) / 5000 (textV2) — repo's own numbers",
    ],
    conflicts=[
        "type: LINELib sends `textV2` with `id:\"\"`; omnichat replays the page's captured template and sets `type:\"text\"` in tests. Mock should accept both.",
        "sendId random suffix: LINELib 7 digits (random.randint(1000000,9999999)); omnichat 8 digits zero-padded. Format `{chatId}_{epochMs}_{digits}`; treat as opaque.",
        "mention send (LINELib only): {type:'text', text, mentions:[{userId,offset,length}]} without id/sendId — likely not what the real web app sends.",
    ],
    notes=["Echo: the sent message appears in history as a `messageSent` event with the same `sendId` (omnichat relies on it). Use for SEND_UNCERTAIN lookup.",
           "Optional `quoteToken` in the body = reply to a message (LINELib LINELib.py:~624)."],
))

# ---------------------------------------------------------------- upload + bulk send
write("upload-file.json", envelope(
    "POST /api/v1/bots/{botId}/messages/{chatId}/uploadFile",
    ["LINELib ChatService.py:305-323 (sync), :348-380 (async)", "omnichat-bridge extension/line-oa-realtime.js:1205-1215",
     "LINELib tests/test_chat_service.py:128", "omnichat-bridge test (uploadBody default)"],
    {"contentMessageToken": "FAKE-content-message-token-0001"},
    headers={**COMMON_HEADERS, "X-XSRF-TOKEN": "FAKE-XSRF",
             "Content-Type": "multipart/form-data; boundary=----FAKEBOUNDARY"},
    request={"multipart": {"file": {"filename": "ใบเสร็จ-INV-2026-1105.pdf", "contentType": "application/pdf",
                                    "bytes": "(binary)"}}},
    uncertain=["Other response fields (only contentMessageToken is read by both repos)",
               "Server-side size/type limits: omnichat enforces image 20 MiB, video/file 32 MiB (repo's own)",
               "Token lifetime"],
    conflicts=["Part content-type: LINELib always sends application/octet-stream; omnichat sends the File's own type. PLAN v2 says send the real MIME."],
    notes=["Path order is /messages/{chatId}/uploadFile (NOT /chats/{chatId}/messages/...) — both repos agree.",
           "Single multipart field named `file`."],
))
write("bulk-send-files.json", envelope(
    "POST /api/v1/bots/{botId}/chats/{chatId}/messages/bulkSendFiles",
    ["LINELib ChatService.py:324-340, :385-404", "omnichat-bridge extension/line-oa-realtime.js:1217", "omnichat-bridge test:852"],
    {},
    headers=WRITE_HEADERS,
    request={"items": [{"sendId": f"{U_SOMCHAI}_{ts_send}_51200977",
                        "contentMessageToken": "FAKE-content-message-token-0001"}]},
    uncertain=["Response body: LINELib requires a JSON object but reads no key; omnichat ignores it. {} assumed.",
               "Whether several items per call work (both repos send exactly one)"],
    notes=["Used for image, video and file alike (omnichat). After send, history shows a messageSent event with the item's sendId."],
))

# ---------------------------------------------------------------- csrf
write("csrf-token.json", envelope(
    "GET /api/v1/csrfToken",
    ["linebiz src/core/http.ts:272-305", "linebiz test/unit/http-csrf.test.ts:17-18", "linebiz README.md:184",
     "LINELib AuthService.py:293-300, ChatService.py:153-154,569-581"],
    {"headerName": "X-XSRF-TOKEN", "parameterName": "_csrf", "token": "FAKE-xsrf-token-1b2c3d4e"},
    conflicts=["LINELib reads only `token` and sends header `x-xsrf-token`, also mirroring it into cookie XSRF-TOKEN on chat.line.biz (its own code, AuthService.py:299-300). linebiz uses `headerName` from the body.",
               "omnichat-bridge and propertyos send NO CSRF header at all (they run inside the page/extension with cookies), so whether GETs need it is unclear; linebiz only adds it on writes."],
    notes=["On 403 for a write: refetch token once and retry (linebiz README.md:184)."],
))

# ---------------------------------------------------------------- errors
write("error-401-not-login.json", envelope(
    "ANY chat.line.biz /api/* when the session cookie is missing or expired",
    ["linebiz src/core/errors.ts:213-224", "linebiz README.md:237,334"],
    {"code": "not_login"},
    status=401,
    uncertain=["Only `code: \"not_login\"` is evidenced. Any `message`/other fields are unknown — keep the mock body minimal.",
               "Whether chat-content.line.biz returns the same JSON or a redirect"],
    notes=["Map to AUTH_EXPIRED. Sessions typically last < 1 day and are not renewed (linebiz README.md:334).",
           "propertyos treats both 401 and 403 as 'cookie invalid' (src/oam-api.js)"],
))
write("errors-other.json", {
    "_meta": {
        "endpoint": "Other error responses (bodies are NOT evidenced by any repo; statuses are)",
        "sources": ["linebiz src/core/errors.ts:204-208,245-255", "linebiz src/resources/messages.ts:82",
                    "omnichat-bridge test (mock 400 body, repo-authored)", "propertyos-line-importer src/oam-api.js:37-41,664-690",
                    "LINELib docs/messages-and-media.md:20"],
        "uncertain": ["Every body below is a placeholder guess except the status codes and the Retry-After header."],
    },
    "examples": {
        "400_validation": {"status": 400, "body": {"code": "INVALID_ARGUMENT", "message": "sendId is required",
                                                   "details": [{"property": "sendId", "message": "must not be empty"}]},
                           "source": "omnichat-bridge test:973-976 (guessed-by-repo)"},
        "403_csrf_or_role": {"status": 403, "body": {},
                             "source": "linebiz errors.ts:205; LINELib: responseMode=BOT accounts get 403 on manual chat"},
        "404_not_found": {"status": 404, "body": {}, "source": "linebiz errors.ts:206"},
        "429_rate_limited": {"status": 429, "headers": {"Retry-After": "2"}, "body": {},
                             "source": "linebiz errors.ts:245-255; propertyos (csv ~1000 req/60s)"},
        "500_unknown_flex": {"status": 500, "body": {},
                             "source": "linebiz src/resources/messages.ts:82 (flexJson on unknown message, never retry)"},
    },
})

# ---------------------------------------------------------------- contacts
def contact_user(user, name, *, tags=(), last=None, assigned=None, friend=True, nickname=None):
    c = {
        "contactId": user,
        "profile": {"userId": user, "name": name, "nickname": nickname, "friend": friend,
                    "lastActivityExpiresAt": T0 + 7 * DAY, "iconHash": "FAKE-user-iconhash"},
        "tagIds": list(tags), "autoTagIds": [], "done": False, "followedUp": False, "spam": False,
        "friend": friend, "useManualChat": False, "chatAvailable": True,
        "lastTalkedAt": last, "chatExists": last is not None,
    }
    if assigned:
        c["assignedBizId"] = assigned
    return c


write("contacts.json", envelope(
    "GET /api/v2/bots/{botId}/contacts?query=สม",
    ["linebiz src/types/contacts.ts:2-33", "linebiz src/resources/contacts.ts:57-71", "linebiz test/fixtures/contacts.ts",
     "propertyos-line-importer src/oam-api.js:321-331, test/fixtures/contacts-page.json:1-79, src/scrape.js:84-130"],
    {"list": [
        contact_user(U_SOMCHAI, "สมชาย ใจดี", tags=[TAG_VIP], last=T0 + 11 * MIN, assigned=BIZ_ME, nickname="พี่ชาย"),
        contact_user(uid("c5", "U", 6), "สมหญิง รักสวย", last=None),
    ], "next": None},
    query={"query": "สม", "sortKey": "DISPLAY_NAME", "sortOrder": "ASC", "filterKey": "ALL", "limit": 20,
           "next": "(omit on first page)"},
    uncertain=["How `query` matches (prefix? substring? Thai?) — name only, NOT message text (PLAN A4)",
               "Second contact has lastTalkedAt null + chatExists false (propertyos fixture shows this)"],
    conflicts=["Defaults: linebiz sortKey DISPLAY_NAME/limit 20; propertyos LAST_TALKED_AT/limit 100. Values allowed: sortKey DISPLAY_NAME|LAST_TALKED_AT, sortOrder ASC|DESC, filterKey ALL|FRIEND|NOT_FRIEND|GROUP|SPAM (linebiz contacts.ts:9-17)."],
    notes=["contactId doubles as chatId (U = 1:1, C = group, R = room) — propertyos scrape.js:84-97",
           "`profile.nickname` from propertyos fixture (string|null); linebiz does not type it"],
))

# ---------------------------------------------------------------- notes / tags / owners
write("notes.json", envelope(
    "GET /api/v1/bots/{botId}/chats/{chatId}/notes",
    ["propertyos-line-importer src/oam-api.js:503-575, test/fixtures/notes-page.json, notes-empty-page.json",
     "LINELib ChatService.py:788 (path + query only)"],
    {"list": [
        {"noteId": "fakenote0001", "body": "ลูกค้า VIP ชอบให้ส่งของด่วน (Kerry) · เคยขอใบกำกับภาษีเต็มรูป",
         "userBizId": BIZ_ME, "createdAt": T0 - 20 * DAY, "updatedAt": T0 - 2 * DAY},
        {"noteId": "fakenote0002", "body": "5 พ.ย. โอน 1,250 บาท order #1234 ตรวจแล้ว",
         "userBizId": BIZ_OTHER, "createdAt": T0 + 9 * MIN, "updatedAt": T0 + 9 * MIN},
    ], "total": 2},
    query={"limit": 20, "withTotal": "true", "next": "(omit on first page)"},
    uncertain=["Sort order of notes", "noteId format", "`next` cursor when more than `limit` notes"],
    notes=["Empty chat: {\"list\": [], \"total\": 0} (propertyos notes-empty-page.json)",
           "userBizId = author, join with owners.json bizId"],
))
write("tags.json", envelope(
    "GET /api/v1/bots/{botId}/tags",
    ["linebiz src/types/tags.ts:2-8, src/resources/tags.ts:29, test/fixtures/tags.ts",
     "propertyos-line-importer test/fixtures/tags.json"],
    {"list": [
        {"tagId": TAG_VIP, "name": "ลูกค้า VIP", "count": 12, "createdAt": T0 - 200 * DAY, "updatedAt": T0 - DAY},
        {"tagId": TAG_WAITPAY, "name": "รอโอนเงิน", "count": 4, "createdAt": T0 - 150 * DAY, "updatedAt": T0 - 3 * HOUR},
        {"tagId": TAG_REFUND, "name": "ขอคืนเงิน", "count": 2, "createdAt": T0 - 90 * DAY, "updatedAt": T0 + 3 * HOUR},
    ]},
    query={"tagIds": "(optional filter)"},
    notes=["Real tag ids are 26 lowercase alnum chars (linebiz test/fixtures/ids.ts:6); ours are fake but same length.",
           "Chat.tagIds / Contact.tagIds reference these."],
))
write("owners.json", envelope(
    "GET /api/v1/bots/{botId}/owners",
    ["linebiz src/types/owners.ts:2-6, src/resources/owners.ts:33, test/fixtures/owners.ts",
     "propertyos-line-importer src/oam-api.js:~470-476, test/oam-api.test.js:1031-1039"],
    {"list": [
        {"bizId": BIZ_ME, "name": "ปุ้ย ฝ่ายบริการลูกค้า", "linePictureUri": "https://profile.line-scdn.net/FAKE-staff-picture"},
        {"bizId": BIZ_OTHER, "name": "Ton (Admin)"},
    ]},
    query={"bizIds": "(optional filter, UUIDs)"},
    conflicts=["Envelope: linebiz expects {list:[...]}; propertyos accepts a bare array OR {list} because it was never confirmed."],
    notes=["Chat.assignedBizId / note.userBizId / messageSent.bizId all point at owners[].bizId."],
))

# ---------------------------------------------------------------- markAsRead
write("mark-as-read.json", envelope(
    "PUT /api/v2/bots/{botId}/chats/{chatId}/markAsRead",
    ["LINELib ChatService.py:1286-1340"],
    {},
    headers=WRITE_HEADERS,
    request={"lastMessage": {"messageId": last_sent["message"]["id"], "timestamp": last_sent_ts}},
    conflicts=["Method: LINELib uses PUT on /api/v2 (ChatService.py:1337). PLAN.md A7 wrote 'PUT/POST' — no repo shows POST. Mock should accept PUT (and may accept POST to be lenient)."],
    uncertain=["Response body (LINELib ignores it, returns {})"],
    notes=["Reading messages does NOT mark read; this is a separate call (PLAN A7)."],
))

# ---------------------------------------------------------------- content + streaming
write("chat-content.json", {
    "_meta": {
        "endpoint": "GET https://chat-content.line.biz/bot/{botId}/{contentHash}[/preview]",
        "sources": ["line-chat-history-downloader scripts/downloader.js:168-169,199-", "LINELib sse.py:57-58, ChatService.py:827-843,916-920",
                    "PLAN.md §6a, §7"],
        "conflicts": ["downloader fetches the original at /bot/{botId}/{contentHash}; LINELib only ever fetches /preview (also for audio). Mock should serve both."],
        "uncertain": ["Response Content-Type / Content-Disposition (filename) headers", "status when expired (404? 410?)",
                      "max size; Range support"],
        "notes": ["Auth = the same session cookies (not a signed URL)", "Stickers: https://stickershop.line-scdn.net/stickershop/v1/sticker/{stickerId}/android/sticker.png (public, LINELib sse.py:87)",
                  "Sent image/video use contentProvider.originalContentUrl/previewImageUrl instead of a hash"],
    },
    "examples": {
        "original": f"https://chat-content.line.biz/bot/{BOT_ID}/{chash('slip-1234')}",
        "preview": f"https://chat-content.line.biz/bot/{BOT_ID}/{chash('slip-1234')}/preview",
        "file": f"https://chat-content.line.biz/bot/{BOT_ID}/{chash('receipt-pdf')}",
        "sticker": "https://stickershop.line-scdn.net/stickershop/v1/sticker/52002734/android/sticker.png",
    },
})
write("streaming-api-token.json", envelope(
    "POST /api/v1/bots/{botId}/streamingApiToken",
    ["LINELib ChatService.py:968-996, LINELib.py:258-293, sse.py:42-100, tests/test_sse.py:53-75"],
    {"streamingApiToken": "FAKE-streaming-token", "expiredAt": T0 + 23 * HOUR,
     "streamingApiBaseUrl": "https://chat-streaming-api.line.biz", "streamingApiVersion": "v2",
     "connectionId": "FAKE-connection-id", "lastEventId": "0"},
    headers=WRITE_HEADERS, request="(empty body)",
    uncertain=["Which of streamingApiBaseUrl/Version/connectionId/lastEventId really appear (LINELib tolerates absence)"],
    notes=["Later (not MVP). SSE: GET https://chat-streaming-api.line.biz/api/v2/sse?token=&deviceType=&clientType=PC&pingSecs=60[&lastEventId=]",
           "SSE events: init, ping, chat. chat data = {botId, chatId, subEvent:'message', payload:{type:'message', timestamp, message:{...}}}"],
))

# ---------------------------------------------------------------- CSV download
csv_rows = [
    ("Sender type", "Sender name", "Sent date", "Sent time", "Content"),
    ("User", "สมชาย ใจดี", "2026/11/05", "09:00", "โอนแล้วนะครับ order #1234 ครับ (emoji)"),
    ("User", "สมชาย ใจดี", "2026/11/05", "09:01", "Photo"),
    ("User", "สมชาย ใจดี", "2026/11/05", "09:02", "File"),
    ("Account", "ปุ้ย ฝ่ายบริการลูกค้า", "2026/11/05", "09:18", "ได้รับสลิปแล้วค่ะ ยอด 1,250 บาท ตรวจสอบเรียบร้อย ขอบคุณที่ใช้บริการ Acme นะคะ 🙏"),
    ("Account", "ปุ้ย ฝ่ายบริการลูกค้า", "2026/11/05", "09:19", "ขึ้นบรรทัดใหม่\nและมี, จุลภาค"),
]
_buf = io.StringIO()
csv.writer(_buf, lineterminator="\n").writerows(csv_rows)
(ROOT / "download-messages.csv").write_text(_buf.getvalue(), encoding="utf-8")
write("download-messages-csv.json", {
    "_meta": {
        "endpoint": "GET /download/{botId}/{chatId}/messages.csv?timezoneOffset=-420",
        "host": HOST,
        "requestHeaders": {**COMMON_HEADERS, "Accept": "text/csv,*/*"},
        "sources": ["propertyos-line-importer src/oam-api.js:~823 (Accept), :870-876 (URL, timezoneOffset=-420), test/oam-api.test.js:366-381 (body starts 'Sender type,')",
                    "propertyos-line-importer src/oam-api.js:37-41,677-690 (~1000 req / 60 s, 429 + Retry-After)"],
        "uncertain": [
            "ONLY the first header column 'Sender type' is evidenced. 'Sender name, Sent date, Sent time, Content' are GUESSES; no repo or public doc lists them (web search 2026-11-05 found nothing).",
            "Encoding/BOM, date format, how media appears (we wrote 'Photo'/'File'), quoting of newlines",
            "Whether the real file has metadata lines before the header",
        ],
        "notes": ["Path is /download/... not /api/...", "timezoneOffset in minutes, JS getTimezoneOffset sign (ICT = -420)",
                  "Body file: download-messages.csv"],
    },
    "response": {"status": 200, "headers": {"Content-Type": "text/csv; charset=UTF-8"}, "bodyFile": "download-messages.csv"},
})

print("wrote", len(list(ROOT.glob("*.json"))), "json files to", ROOT)
