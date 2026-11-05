# sleekflow (SaaS, no account, not-run)
Screenshots via headless Chrome of public help-center + channel page. WebFetch of
https://help.sleekflow.io/en_US/line-business-channel/line-business-channel-overview:
- Send: text (max 1,800 chars), documents/images/videos/voice notes (max 16MB), payment links, product catalog, emoji
- Receive: text (no bold/italic), images, voice notes, emoji. NOT received: location, sticker, contact
- 7-day window for users not friends. No mention of history import. Setup (Messaging API webhook) article not fetched -> unverified.
Initial attempts at /en_US/unsupported-messages and /line-integration/... returned 404 (WhatsApp 404 page), retaken.
