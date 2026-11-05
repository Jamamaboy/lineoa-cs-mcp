# omnichat-bridge trial (static + unit tests)
$ git clone --depth 1 https://github.com/kaojai-ai/omnichat-bridge _vendor/omnichat-bridge/repo
$ node --test   (no deps; package.json has no dependencies, nothing installed)
=> tests 995, pass 994, fail 1 (test/provider-readiness-grace.test.js:102 "confirmed negatives and a restarted worker never borrow recent readiness")

## manifest + endpoints
$ cat extension/manifest.json  (omnichat-bridge v0.9.7, MV3)
permissions            : alarms, scripting, storage
host_permissions       : https://seller.shopee.co.th/*, https://chat.line.biz/*
optional_host_perms    : https://*/*   (user's own server, requested at runtime)
background             : service_worker background.js (module)
content_scripts (LINE) :
  [MAIN world, document_start]  https://chat.line.biz/*
      lib/provider-adapters.js, lib/line-oa.js, line-oa-realtime.js   <- wraps window.fetch, calls /api with page cookie
  [ISOLATED world]              https://chat.line.biz/*
      lib/message-id-cache.js, lib/provider-adapters.js, lib/line-oa.js, content.js
NOT requested: "cookies", "webRequest", "tabs"  -> cannot read the session cookie; works only inside the logged-in tab

$ grep -n apiBase line-oa-realtime.js   (LINE endpoints, all same-origin chat.line.biz, credentials:"include")
L196          const body = await json(`${apiBase}/v1/bots?noFilter=true&limit=1000`, REQUEST_TIMEOUT_MS, sessionEpoch);
L298      const url = new URL(`${apiBase}/v2/bots/${encodeURIComponent(botId)}/chats`);
L309      const url = new URL(`${apiBase}/v3/bots/${encodeURIComponent(botId)}/chats/${encodeURIComponent(chatId)}/messages`);
L1184        let endpoint = `${apiBase}/v1/bots/${encodeURIComponent(botId)}/chats/${encodeURIComponent(conversationId)}/messages/send`;
L1205          const upload = await nativeFetch(`${apiBase}/v1/bots/${encodeURIComponent(botId)}/messages/${encodeURIComponent(conversationId)}/uploadFile`, {
L1217          endpoint = `${apiBase}/v1/bots/${encodeURIComponent(botId)}/chats/${encodeURIComponent(conversationId)}/messages/bulkSendFiles`;

Attachment limits (line-oa-realtime.js ~L1186): image <=20 MiB JPEG/PNG/GIF; video/file <=32 MiB; file_name required.
Send flow: POST .../messages/{chatId}/uploadFile (multipart) -> contentMessageToken -> POST .../chats/{chatId}/messages/bulkSendFiles
Incoming media: only message.contentProvider.originalContentUrl forwarded as media_url (no bytes downloaded by extension).
Test: node --test => 995 tests, 994 pass, 1 fail (provider-readiness-grace #610)
