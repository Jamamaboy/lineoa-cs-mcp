# propertyos-line-importer trial
$ git clone --depth 1 https://github.com/zimplemedia/propertyos-line-importer
$ bun test  => 65 pass, 0 fail (255 expect) ; no npm deps

$ cat manifest.json  (propertyos-line-importer v0.4.23, MV3)
host_permissions : https://chat.line.biz/*
permissions      : (none)
background       : src/background.js (service worker); NO content scripts
externally_connectable.matches:
   "https://chat.line.biz/*"
   "https://app.propertyos.io/*"
   "https://*.propertyos.io/*"
   "https://app.propertyos.dev/*"
   "https://app.propertyos.in.th/*"
   "https://propertyos.in.th/*"
   "http://localhost/*"

$ endpoints in src/oam-api.js (fetch credentials:"include", header x-oa-chat-client-version)
/api/v1/bots
/api/v1/bots/{id}/chats/{id}/members
/api/v1/bots/{id}/chats/{id}/notes
/api/v1/bots/{id}/owners
/api/v1/bots/{id}/tags
/api/v1/me
/api/v2/bots/{id}/contacts
/api/v2/bots/{id}/savedReplies
/download/{id}/{id}/messages.csv

$ bun test
 65 pass
 0 fail
 255 expect() calls
Ran 65 tests across 2 files. [1480.00ms]

Auth / trust model (src/oam-api.js L1-2, src/background.js L22):
  "cookie auto-attaches via credentials:'include' under host_permissions; it is never read here."
  Page origin app.propertyos.io --chrome.runtime.sendMessage(extId)--> onMessageExternal (only externally_connectable origins)
  Actions: ping | checkSession (GET /api/v1/me) | scrapeOam {botId, period, includeHistory, notes, presets}
  History = GET /download/{bot}/{chat}/messages.csv?timezoneOffset=-420  (text CSV only; no media download code)
  Rate limit handling: ~1000 csv req / rolling 60 s gate, 429 retry with fallback 30 s, concurrency pool, abort signals
  Attachments: grep contentHash|chat-content|image|media in src/*.js => no hits (attachments ignored)
