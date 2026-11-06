---
name: review
description: For the senior — brief them on a task that is in review (what changed, acceptance criteria pass/fail, reviewer findings, screens, risks, review round), then carry out their decision: approve (and merge only on a separate yes), send back with a numbered list, reassign, or take over. Never decides on its own. Use when the user types /review <issue id or PR number> or asks for a review brief.
argument-hint: issue id (e.g. ABC-12) | PR number
---

One page that lets the senior decide in a few minutes — then do exactly what they decide, in the tracker and on the PR.

**You brief; the senior decides.** Never approve, send back, reassign or merge without their answer in this run.

## 0. Load the profile and the tools

Read `.claude/plan-kit-profile.md`: `Issue tracker` · `Reports` (`Senior`, `Devs`, `Review in`) · `Visual check` · `Deploy` ·
`Page language`. Load the tracker's tools (ToolSearch). `Review in: tracker` needs the tracker's code-review tools
(for Linear: `list_diffs`, `get_diff`, `get_diff_threads`, `save_diff_comment`, `submit_diff_review`) — if they are
not there, fall back to `github` and say so. `Issue tracker: none` or no `Reports` section → GitHub only: skip every tracker comment, status and trail step below.

## 1. Gather

- The task issue (and its parent report, if it has one): description, acceptance criteria, comments, status, assignee.
- The plan page: the issue's latest `plan vN` attachment. Its Part B acceptance criteria are what you check against.
- The PR: argument, or the PR linked on the issue, or `gh pr list --search "<issue id>"`. Then
  `gh pr view <n> --json title,body,isDraft,files,reviews,comments,statusCheckRollup` and `gh pr diff <n>`.
- The review round: how many "changes requested" rounds this PR has had + 1.
- Screens: if the diff touches a screen and the profile's `Visual check` allows it, capture the changed screens now — same rules as `/implement-plan` §4b (changed screens only, keep images local, never claim a check that did not happen).

## 2. Write the brief

In the profile's `Page language` (no such line → the language the issue is written in), one screen long:

| Part | Contains |
|---|---|
| Verdict line | what this PR does in one sentence · version (the issue's milestone, if any) · round rN · CI state · draft or ready |
| What changed | 3–5 plain lines a non-coder can follow, then `git diff --stat` |
| Acceptance criteria | table: criterion · pass / fail / not checkable · evidence (test name, screenshot, `path:line`) |
| Open findings | from the PR's reviewer reports and comments, plus anything you see in the diff — severity · `path:line` · one line |
| Risks | unapplied migration (the PR must stay a draft) · files on the profile's high-risk list · anything touching money, permissions or personal data |
| Check it yourself | which page, what to click, what you should see |

Show the brief in the chat. Then AskUserQuestion: **approve** · **send back** · **reassign** · **take over** · **just post the brief**.

## 3. Carry out the decision

For approve, send back and just post the brief: post the brief as a tracker comment and as the PR review body (`gh pr review <n> --approve --body …` / `--request-changes --body …` / `--comment --body …`, or the tracker's code review when `Review in: tracker`). Reassign and take over post only the reason comment.

| Decision | Do |
|---|---|
| approve | Approve the PR (as above). GitHub refuses (e.g. the senior is the PR author or shares the `gh` account) → post it with `--comment` instead and say approval was not recorded on GitHub. Tracker comment: approved in round rN. Then ask separately **"merge now?"** — merge only on yes, only if the PR is not a draft and no migration is waiting (profile `Deploy`: merging may ship to production). Never merge on approve alone. After a merge, the next step is `/implement-plan <issue id> deployed` |
| send back | Draft a numbered list from the open findings; the senior edits it. Post it as "changes requested" (`gh pr review <n> --request-changes --body …`, or the tracker review) and as a tracker comment mentioning the assignee. Status → in progress. The assignee continues with `/implement-plan <issue id> fixes` |
| reassign | New assignee from the profile's `Devs` (ask which). Tracker comment with the reason the senior gives. Status unchanged |
| take over | Assign to the senior (profile `Senior`). Tracker comment saying so |
| just post the brief | Post it; change nothing else |

Attach the round to the issue's trail as a link to the PR review (or the PR when no review was posted): `review rN — approved | changes requested | reassigned`.

## 4. Report and stop

Three lines: the decision · what was posted where · the next step (merge done / waiting for fixes / new assignee).
Do not start fixing anything yourself.
