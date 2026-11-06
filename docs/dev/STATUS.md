# dev status
Last updated: 2026-11-06 19:11 ICT · branch feat/welcome

## Now
- Done: features page
- Done: welcome on session start
- v0.1.4 released to main (tag v0.1.4, GitHub release). Public repo: github.com/Jamamaboy/lineoa-cs-mcp.
- All 5 required actions, auth, attachments and the README sections are done. 33 tests green, CI green.
- Live OA checks are read-only and pass. Sending is verified on the mock only.
- The user is testing from a fresh `git clone` with a new Claude session.

## Next
- Waiting on the user: the recorded Claude GIF (docs/assets/demo.gif) and a Thai intro paragraph to translate.
- Before 1.0.0: one live send on a test OA, and a run on Claude Desktop and Windows.
- Optional: restyle architecture.svg and supports.svg like the left-to-right flow.svg; case layer; file sending.
- After submission: delete ~/lineoa-backup-before-scrub.bundle and the old private repo.

## Blocked
- A live send needs a test OA and chat from the user.

## Requests
- none

## Heads-up (affects other lanes)
- LINEOA_MOCK=1 now applies to the CLI too (src/mock-env.ts).
- The LOG entry ships in the same commit as the work; no separate docs(dev) log commits.
