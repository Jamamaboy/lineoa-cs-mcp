# Research: reading list and patterns (2026-11-05)

Collected by two research subagents during planning. Claims are backed by the linked sources. Items marked
**unverified** could not be confirmed. Nothing here was tested against a live LINE OA.

## 1. Prior work on the chat.line.biz internal API

| Repo | Lang | Last push | Approach | Why read it |
|---|---|---|---|---|
| [PrakritManStudio/linebiz](https://github.com/PrakritManStudio/linebiz) | TS (ISC) | 2026-11-02 | Cookie HTTP replay, read-only | The cleanest typed models: `Chat`, message events, cookie names, 401 `not_login` |
| [Madoa5561/LINELib](https://github.com/Madoa5561/LINELib) | Python | 2026-08-25 | HTTP replay, email+OTP login, Playwright fallback for reCAPTCHA, SSE, send, upload | The most complete. Has the send/upload payloads and the streaming flow |
| [xiaoxigua-1/line-bot-chat-history-downloader](https://github.com/xiaoxigua-1/line-bot-chat-history-downloader) | JS | 2025-02 | In-browser fetch script | Exports history and media |
| [kaojai-ai/omnichat-bridge](https://github.com/kaojai-ai/omnichat-bridge) | JS | 2026-11-05 | Chrome extension that polls `/v2/chats` + `/v3/messages` and intercepts send | Thai product, polling instead of SSE |
| [zimplemedia/propertyos-line-importer](https://github.com/zimplemedia/propertyos-line-importer) | JS | 2026-11-03 | Extension that scrapes history | Importing history |
| [tatsuyasusukida/line-friend-export-v2](https://github.com/tatsuyasusukida/line-friend-export-v2) | TS | 2023 | Cookie replay against `/v2/chats` | Has a companion Zenn article |
| OpenClaw skill [picseeinc-line-oa](https://getclawkit.com/skills/official-picseeinc-line-oa) | n/a | n/a | Browser automation of the page | Its source link returned 404 (**unverified**) |

The endpoint map is in [`docs/PLAN.md` section 6a](../PLAN.md). Two things are still open and need our own HAR capture:
- how history pagination works (`backward` cursor vs `limit/before/after`)
- whether `markAsRead` is PUT or POST, and whether a message-text search endpoint exists (none found)

Official LINE features that partly overlap (we explain in the README why we don't use them):
- The [Messaging API](https://developers.line.biz/en/docs/messaging-api/overview/) works through webhooks only. It has no history, no chat list and no search, and its user IDs are a different ID space.
- [Mark-as-read API](https://developers.line.biz/en/docs/messaging-api/mark-as-read/) needs a `markAsReadToken` from a webhook event.
- [Chat Control module](https://developers.line.biz/en/docs/partner-docs/module-technical-chat-control/) is partner-only and needs a sales agreement.
- Vendors confirm that a Messaging API integration never sees history from before it was connected ([no8.io](https://help.no8.io/en/articles/4161502-can-i-import-history-messages-before-connecting-to-line-official-account)).

## 2. Unified inbox products

### Thailand
- **SleekFlow** ([connect](https://help.sleekflow.io/line-business-channel/connect-to-line-business), [overview](https://help.sleekflow.io/line-business/line-business-channel-overview)): uses the Messaging API webhook. Receives text, images and voice. Stickers, locations and contact cards are not supported. Sent files are capped at 16 MB. → Give every message type an explicit placeholder; never drop a message silently.
- **Zaapi** ([page](https://www.zaapi.com/integration/line)): assignment, auto-assign, role permissions, tags. → Assignee and tags belong on `Chat`.
- **Zwiz.ai** ([HDmall roundup](https://hdmall.co.th/jib-os/blog/7-line-oa-chat-systems-for-clinics/)): omnichannel inbox, CRM, **payment-slip verification**. → For Thai SMEs, slip images are a core case.
- **OHO Chat, KaoJai, klink, Botnoi, Jib OS** (same roundup): case-status sorting, and AI drafts replies that an admin edits or sends. → Draft first, then send.
- **Page365** ([App Store](https://apps.apple.com/th/app/page365/id894477175)): FB, LINE and IG in one inbox. It tags which admin replied. → Record the staff member on every outgoing message (our audit log).
- ChatCone, ZORT, Primo, Deeple, Socialeads: **unverified**, no usable docs found.
- Chat tags are a paid OA feature, and they can't be read through the official API ([Medium/linedevth](https://medium.com/linedevth/248e290b7c4b)). That makes the console the only source for tags.

### International
- **Chatwoot** ([messages API](https://developers.chatwoot.com/api-reference/messages-api/list-all-messages.md), [conversations](https://developers.chatwoot.com/api-reference/conversations/conversations-list.md)): Inbox → ContactInbox → Conversation → Message (`message_type` incoming/outgoing/activity) → Attachment (`file_type`, `data_url`, `thumb_url`, `file_size`, `width`, `height`). → This is our domain model.
- **respond.io** ([LINE](https://respond.io/help/line/line-overview)): images under 1 MB get a preview, larger ones become a link. → Our inline-vs-save threshold.
- **Front** ([API](https://dev.frontapp.com/reference/conversations)): prefixed IDs (`cnv_`, `inb_`) and open/waiting/resolved statuses. → Prefixed IDs stop the model from mixing up a chat ID and a user ID.
- Zendesk, Trengo, Freshchat: **not researched in depth**.

## 3. MCP servers that wrap chat products

| Server | Auth | Attachments | Safety | Take |
|---|---|---|---|---|
| [lharries/whatsapp-mcp](https://github.com/lharries/whatsapp-mcp) | QR login through whatsmeow; re-auth about every 20 days; local SQLite | `download_media` → local path; `send_file(path)` | Warns about the "lethal trifecta" | Local index; media downloaded on request; search returns context around each hit |
| [korotovsky/slack-mcp-server](https://github.com/korotovsky/slack-mcp-server) | Browser `xoxc`/`xoxd` tokens ("stealth") | `attachment_get_data` is opt-in | **Sending is off by default** and can be scoped to a channel allowlist | Feature flags for sending; `next_cursor` |
| [chigwell/telegram-mcp](https://github.com/chigwell/telegram-mcp) | MTProto user session file; `TELEGRAM_EXPECTED_USERNAME` | Downloads limited to allowed roots plus an extension allowlist | Read-only mode, chat allowlist, output marked untrusted, FloodWait passed on | An identity guard; sandboxed file roots |
| [Beeper Desktop MCP](https://developers.beeper.com/desktop-api/mcp) | Local, OAuth or bearer | Assets API (details **unverified**) | Local only | Chats/Messages/Assets resource split |
| [Beeper LINE bridge](https://matrix.org/ecosystem/bridges/line/) | Email+password, then a PIN approved on the phone; poses as the Chrome-extension client | Media and history sync | n/a | The closest model of unofficial LINE auth (personal LINE, not OA) |
| [line/line-bot-mcp-server](https://github.com/line/line-bot-mcp-server) | Channel access token | No image tool | n/a | **Wrong purpose**: it acts as the bot and can't read history |
| [Intercom MCP](https://developers.intercom.com/docs/guides/mcp) | OAuth | n/a | Its only write is an internal note | Small default page size; cursor paging |
| Chatwoot and Zendesk MCPs | Community, API token | Ticket attachments listed | n/a | Simple list/send tools |

## 4. Patterns we adopt (mapped to PLAN.md)

1. The session is a chmod-600 file outside the repo, plus an **expected-identity guard**: refuse to start if `/api/v1/me` is not the configured account (PLAN §6).
2. A human approves the login once, the session is then reused headlessly, and expiry produces a clear `AUTH_EXPIRED` (PLAN §6).
3. Attachments come back as metadata first. A separate `get_attachment` returns an `image` block for small images and a saved path or `resource_link` for everything else (PLAN §7).
4. Inline below about 1 MB after downscaling; above that, save the file and return a link (PLAN §7).
5. Downloads are sandboxed to a cache root, and uploads are sandboxed to the outbox root (PLAN §7).
6. Cursors are opaque, the default page size is small, and the response includes `hasMore` (PLAN §5).
7. Search accepts filters (chat, sender, date) and returns surrounding context messages (PLAN §5).
8. **Sending is gated**: `LINEOA_ALLOW_SEND` is off in read-only mode, there is an optional chat allowlist, plus `dryRun` and `destructiveHint` (PLAN §5).
9. Customer content is marked untrusted, and rate limits and backoff are passed through to the agent (PLAN §7, §12).
10. A local SQLite mirror is used for search; its schema follows Chatwoot (PLAN §3).
11. A mock backend sits behind an interface and shares a contract test suite with the real client. No repo we read had this; it's our own addition (PLAN §4).
