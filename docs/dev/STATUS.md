# dev status
Last updated: 2026-11-06 20:31 ICT · branch release/v0.2.2

## Now
- Done: submission polish (dev)
- Done: Windows CI line endings
- v0.2.2 released to main (README assumptions + stack, no stale references). v0.2.1 (CI green on Linux/macOS/Windows). v0.2.0 (tag, GitHub release): the four-persona review fixes (plan
  docs/dev/plans/2026-11-06-review-fixes.html, T1–T9). 78 tests, CI on Linux/macOS/Windows.
- Live OA checks (read-only) pass, including the new response-shape checks. Sending is verified on the mock only.

## Next
- Follow-ups not done: getBytes follows redirects with the cookie header (set redirect manual and re-check the host);
  NOT_FOUND rewrite could move into http.ts options; shared atomic-write helper.
- Before 1.0.0: one live send on a test OA; run on Claude Desktop and Windows.
- Waiting on the user: recorded Claude GIF, Thai intro.

## Blocked
- A live send needs a test OA and chat from the user.

## Requests
- none

## Heads-up (affects other lanes)
- LINEOA_MOCK=1 forces in-memory index and audit. New error code BAD_INPUT. setup has --mock.
- The LOG entry ships in the same commit as the work.
