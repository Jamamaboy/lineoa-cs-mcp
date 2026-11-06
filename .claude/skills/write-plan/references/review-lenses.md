# Briefing the two plan-review agents

Fire both in one message (two Agent tool calls in a single response). Both have `tools: Read, Grep, Glob` — they cannot edit anything.

## What to send them

**Never make them guess or hunt** — paste all of this directly:

1. The full draft plan (Part A + Part B). If the HTML file exists, give the path too — but still paste the content.
2. The source task — the issue description + "Done when", or the user's request verbatim.
3. The paths you explored this round and what you found (so they don't redo it).
4. `.claude/plan-kit-profile.md` — they need the repo's high-risk files, hard rules, and reusable pieces to judge anything.
5. Your own doubts — say plainly which spots you want scrutinized.

## Each agent's lens

| agent | answers |
|---|---|
| `plan-reviewer` | **Can this plan be executed?** — real references? covers the ask? could `coder` implement from Part B alone? reinventing existing code? |
| `plan-risk-auditor` | **Where does executing it hurt?** — data crossing a tenant boundary, calculations producing wrong output, loose permissions, irreversible migration, plus every item the profile's "hard rules" and "this repo tends to forget" sections name |

They deliberately look from different angles. **Do not send both the same brief** — you'd get duplicate findings and waste the round.

## What to do with the results

- `CRITICAL` + `IMPORTANT` → fix the plan, all of them.
- `NICE` → move to "Open questions" or "Not doing", with a reason.
- Disagree with one → record in the "Review rounds" table why you didn't fix it. **Never silently drop.**
- A finding both agents raised independently → treat it one severity higher.

## Reading findings critically

Don't swallow them whole — the reviewers are smaller models and only saw what you sent.
Before changing the plan for any finding, open the path it cites and confirm it yourself.
If it cites something that isn't real, record "checked — not accurate, not fixed" in the table with the line that proves it.
