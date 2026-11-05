# LINELib trial (login flow NOT run)
$ git clone --depth 1 https://github.com/Madoa5561/LINELib
$ uv venv .venv && uv pip install ./repo pytest   (requests, aiohttp; python 3.11)
$ cd /tmp && .venv/bin/python -I -c "import LINELib ..."
exports: AuthService ChatService InteractiveLoginRequired LINELib LINEOAError LineBot ListenConfig RateLimitConfig SSEEvent SSEParser ...
LineBot 41 public methods (sendMessage, sendFile, getChatMessages, getChats, getBots, getMembers, listen, save_message_media, save_image_preview, get_csrf_token, set_typing, ...)
LINELib 56, ChatService 48 (send_message, send_file, async_send_file, get_content_preview, get_streaming_api_token, stream_events, mark_as_read, send_flex_message ...)
$ .venv/bin/python -I -m pytest -q tests
150 passed, 518 subtests passed in 0.43s
Login (account.line.biz email+OTP, Playwright visible-Chrome fallback) read from source only.
