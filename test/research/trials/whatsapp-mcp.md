# whatsapp-mcp trial

Go not installed (bridge not built, QR login not attempted). Python MCP part only.

```
$ cd _vendor/whatsapp-mcp/repo/whatsapp-mcp-server && uv venv .venv && uv pip install -p .venv/bin/python httpx requests "mcp[cli]"
$ npx -y @modelcontextprotocol/inspector --cli .venv/bin/python main.py --method tools/list
-> Failed to connect to MCP server: MCP error -32000: Connection closed
$ .venv/bin/python main.py </dev/null
ModuleNotFoundError: No module named 'mcp.server.fastmcp'. This is mcp 2.x ... pin 'mcp<2'
$ uv pip install "mcp[cli]<2"   # repo has uv.lock but pyproject is unpinned (mcp>=1.6.0)
$ npx -y @modelcontextprotocol/inspector --cli .venv/bin/python main.py --method tools/list   # exit 0
```

Result: 12 tools listed with no bridge running (tools only hit http://localhost:8080/api or read ../whatsapp-bridge/store/messages.db lazily).

```
- search_contacts(query)
    Search WhatsApp contacts by name or phone number.
- list_messages(after, before, sender_phone_number, chat_jid, query, limit, page, include_context, context_before, context_after)
    Get WhatsApp messages matching specified criteria with optional context.
- list_chats(query, limit, page, include_last_message, sort_by)
    Get WhatsApp chats matching specified criteria.
- get_chat(chat_jid, include_last_message)
    Get WhatsApp chat metadata by JID.
- get_direct_chat_by_contact(sender_phone_number)
    Get WhatsApp chat metadata by sender phone number.
- get_contact_chats(jid, limit, page)
    Get all WhatsApp chats involving the contact.
- get_last_interaction(jid)
    Get most recent WhatsApp message involving the contact.
- get_message_context(message_id, before, after)
    Get context around a specific WhatsApp message.
- send_message(recipient, message)
    Send a WhatsApp message to a person or group. For group chats use the JID.
- send_file(recipient, media_path)
    Send a file such as a picture, raw audio, video or document via WhatsApp to the specified recip
- send_audio_message(recipient, media_path)
    Send any audio file as a WhatsApp audio message to the specified recipient. For group messages 
- download_media(message_id, chat_jid)
    Download media from a WhatsApp message and get the local file path.

12 tools listed, exit 0. Note: unpinned mcp>=1.6 resolves to mcp 2.x -> ModuleNotFoundError mcp.server.fastmcp; pinned mcp<2 to run.```

Static read (whatsapp-bridge/main.go): QR via whatsmeow GetQRChannel, sessions in store/whatsapp.db, messages in store/messages.db, REST on :8080 bound to all interfaces without auth, download path = store/<chat_jid>/<filename> with filename taken from DB (no sanitising seen), no size limit on send_file/download, no send allowlist.
