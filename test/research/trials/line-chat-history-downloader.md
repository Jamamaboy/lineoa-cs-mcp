# line-chat-history-downloader trial
$ git clone --depth 1 https://github.com/xiaoxigua-1/line-bot-chat-history-downloader
No package.json/build; release workflow just zips repo. Not run (needs LINE login).

$ cat manifest.json
{
  "manifest_version": 3,
  "name": "line-chat-downloader",
  "description": "line chat history downloader",
  "version": "1.0",
  "action": {
    "default_popup": "popup/popup.html"
  },
  "content_scripts": [
    {
      "matches": ["https://chat.line.biz/*"],
      "js": ["scripts/jszip.min.js", "scripts/downloader.js"]
    }
  ],
  "permissions": ["tabs", "activeTab", "nativeMessaging", "scripting"]
}

$ node --check scripts/downloader.js  -> SYNTAX_OK (no build step; release = zip of repo)

$ fetch() calls in scripts/downloader.js
L76          `https://chat.line.biz/api/v2/bots/${botId}/chats?folderType=ALL&tagIds=&autoTagIds=&limit=25&${
L97          `https://chat.line.biz/api/v3/bots/${botId}/chats/${chatId}/messages${
L201      `https://chat-content.line.biz/bot/${botId}/${contentHash}`,
L202      { credentials: "include" },
L210      `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/ANDROID/${stickerResourceType}`,
L218      `https://chat.line.biz/api/v1/bots/${botId}/messages/${chatId}/flexJson?timestamp=${timestamp}&messageId=${messageId}`,

Flow (content script on https://chat.line.biz/*, botId parsed from location.pathname):
 1 popup -> chrome.tabs.sendMessage({minTime,maxTime})
 2 GET /api/v2/bots/{bot}/chats?folderType=ALL&limit=25&next=...      (paginate by .next)
 3 GET /api/v3/bots/{bot}/chats/{chat}/messages?backward=...          (paginate by .backward)
 4 per message type:
     text      -> content inline (flex => GET /api/v1/bots/{bot}/messages/{chat}/flexJson?timestamp&messageId)
     image/video/audio/file -> GET https://chat-content.line.biz/bot/{bot}/{contentHash}  credentials:"include"
     sticker   -> GET https://stickershop.line-scdn.net/stickershop/v1/sticker/{id}/ANDROID/sticker.png (public CDN)
 5 JSZip: {chatId}/data.json + media/ + stickers/ + flex-messages/ -> blob -> <a download="data.zip">
Quirks: fileExtension() returns undefined for file/flex (name "<hash>undefined"); .jpg forced for images; no concurrency/backoff.
Permissions: tabs, activeTab, nativeMessaging, scripting (nativeMessaging unused). No host_permissions: content script is same-origin to chat.line.biz;
chat-content.line.biz is cross-origin -> works via LINE's CORS+cookie, not extension privilege.
