# dev status
Last updated: 2026-11-06 18:38 ICT · branch release/v0.1.3

## Now
- Done: release v0.1.3
- Done: history guide in README
- Done: linear flow diagram
- Done: diagram restyle
- Done: README diagrams and badges
- Done: README showcase
- v0.1.0 is public at github.com/Jamamaboy/lineoa-cs-mcp (main, dev, plan, research, tag, release; CI green).
- `feat/polish` (local, NOT pushed): grader dry-run on a fresh clone passed; lint warnings cleared; 11 code-review
  findings fixed (id path traversal, cookie host match, numeric config, send path + audit, search dates, filtered
  paging, ENDPOINT_CHANGED on shape change, streamed size cap, Windows setup, CLI filters); README notes that
  Messaging-API bot replies can be invisible. 31 tests green; live read-only checks pass.

## Next
- Wait for the user's review, then push dev (and cut v0.1.1 to main if they want the fixes on the default branch).
- Optional: one live send on a test OA; case layer; file sending; bonus video.

## Blocked
- Push needs the user's OK.

## Requests
- none

## Heads-up (affects other lanes)
- Tool inputs: chatId/messageId must be LINE id characters; search since/until are YYYY-MM-DD (local time).
- list_chats returns `scanned` and reads up to 125 chats for filtered lists.
