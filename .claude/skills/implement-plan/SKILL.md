---
name: implement-plan
description: Execute a plan produced by /write-plan — size and batch coder agents per .claude/agent-strategy/STRATEGY.md, capture changed screens, review with whichever of code-reviewer / security-reviewer / uxui-reviewer the diff triggers (+ /simplify), walk acceptance criteria yourself, close with PR + changelog, keep the issue tracker in step (status, trail links, senior ping), apply the senior's send-back list (`fixes`), and run a post-deploy log check once it ships. Use when the user types /implement-plan or asks to implement an approved plan.
argument-hint: path to the plan page | issue id (e.g. ABC-12) | <issue id> fixes  (the senior's send-back list) | <plan or issue id> deployed  (runs only §10, the post-deploy check)
---

Execute a plan produced by `/write-plan` — orchestrate → coder writes → the triggered reviewers review → fix loop → final check yourself.

## 0. Load the project profile and the agent strategy

Read `.claude/plan-kit-profile.md` for: plan directory · PR base branch · verify commands · changelog path · migration convention · hard rules · issue tracker · `Models and passes` · `Reviewers` · `Visual check` · `Deploy`.
**Everything below that says "the profile" means that file.** A field set to `none` turns that step off. No profile → fall back to the repo guide, then detection (`package.json` scripts, `git symbolic-ref refs/remotes/origin/HEAD`), then ask. Say which fallback you used.
A profile written before kit 1.3.0 has no `Reviewers` / `Visual check` / `Deploy` sections → use the defaults shown in the kit's `templates/plan-kit-profile.md` comments (all three lenses on; screenshots only if a dev server is obvious from `package.json`; assume merging the base branch deploys) and tell the owner to add the sections.

Then read `.claude/agent-strategy/STRATEGY.md` — it decides how many coders, which reviewers, and when `/simplify` runs. There is no fixed agent cap; the count comes from its worked examples (§4 of that file).
- Its `version` month is older than today's (`date +%Y-%m`) → print the one-line notice from its §0 (suggest `/update-skill`) and **continue with the current version**. Never block on it.
- No strategy file → say so (`install.sh --update` creates it) and size by the rules in `references/batching.md`.

**Tracker updates** (status moves, trail links, pings — marked *Tracker* below) run only when the profile has an `Issue tracker` tool and a `Reports` section. Issues live in the profile's `Team` / `Project`. Load the tracker's tools (ToolSearch) before the first call. Status names differ per tracker: list the team's statuses once and map "in progress / in review / done" onto them; no clear match → ask. Never assign people, set priority, or close an issue on your own.

## 1. Read the plan

- Argument is a path → read that file. Argument is an issue id → newest file matching `<ISSUE-ID>-*` in the profile's plan directory. Argument ends in `deployed` → go straight to §10. Argument ends in `fixes` → go to §1b.
- **Part B is the contract** — acceptance criteria / file map / tasks / test strategy. Part A is context for why.
- Pre-flight checks:
  - "Open questions" is not "none" → **stop**, ask the user each one. Never answer them yourself.
  - No "Review rounds" table → the plan never passed its review gate. Tell the user to run `/write-plan` first.
  - The task touches a screen and the issue still carries a blocking gate label from the profile (e.g. `needs-mockup`) → stop and warn.
- Open every file the File map references — the plan may be days old and the code has moved. Mismatch → tell the user before proceeding.

## 1b. Fixes round (argument ends in `fixes`)

The senior sent the PR back. Work on the existing branch — no new branch, and never `gh pr create` here.
1. Find the PR (`gh pr list --search "<issue id>"`), then `gh pr checkout <n>` and `git pull`. Dirty working tree → stop and ask.
2. Read the latest "changes requested" review: `gh pr view <n> --json reviews,comments` (or the tracker's review threads when the profile's `Review in` is `tracker`) plus the numbered list the senior posted on the issue.
3. Each numbered item becomes a task. Size and fix them through §3–§6 as usual (small items: fix them yourself).
4. Commit and push. Reply on the PR to each item with what changed.
5. Close out with §8 step 2 (add to this PR's changelog entry), step 5 (`runs.md` row) and step 6 (*Tracker*: status → in review, trail `review rN fixes pushed`, ping the senior). Then §9.

## 2. Set up

```
git checkout <base branch> && git pull
git checkout -b feat/<issue-id lowercased>-<slug>
```
Base branch comes from the profile — that is also the PR base. Dirty working tree → stop and ask. The issue id in the branch name lets trackers that link by id pick up the branch and PR.
*Tracker:* status → in progress.

## 3. Batch tasks to coder — parallel only when files don't overlap

Full rules in `references/batching.md` — summary:

- Group tasks by `Depends on` + File map: same batch = no dependency between them **and** zero file overlap.
- **Size the coders with `STRATEGY.md` §3–§4 — no fixed cap.** One coder per independent group; a dependency chain stays in one coder; tiny groups merge into one coder; ≤ ~20 lines across ≤ 2 files → no coder, edit it yourself.
- Fire every coder of a wave in one message (multiple Agent calls). `coder` is pinned to `sonnet` by its frontmatter — pass no model override.
- **Announce the batching before firing**: which strategy case it matches (e.g. "Case D"), how many waves, which tasks, which files, how many agents in total — and the reason if you deviate from the case.
- Per task send coder: the full task text from the plan + the plan path + the profile's hard rules + the reminder that migrations are written to file, never applied.
- Tests from the test strategy go in the same task as the code they test — never a separate batch.

## 4. Merge + green gate

All batches done → run **every verify command in the profile** yourself, at the top level.
Red → send back to the coder that owns that file (`SendMessage` to that same agent), with the full error text. Green across all of them before moving on.

## 4b. Capture the changed screens — real pixels, not guesses

Only when the diff touches a path under the profile's `uxui-reviewer` triggers and the profile's `Dev server` is not `none`. Otherwise skip this section.
`Dev server`, `Base URL` or `Login` still says `TODO` → ask the owner before capturing; never run a placeholder.

- Start the profile's dev server and capture with the `run` skill, or any browser tool this session has.
- Each changed screen in the File map, at the profile's `Viewports`. Changed screens only — every image costs tokens for whoever reads it.
- Pages behind a login: use the profile's `Login` method. No way in → ask the owner for the screenshots, or mark the screen "not captured".
- Surfaces under the profile's `Can't capture` → read the code, and ask the owner to check them on the real device.
- Screenshots of a real system can show personal data → keep them in the scratchpad. Never commit, publish, or attach them anywhere.
- Hand the image paths to `uxui-reviewer` (§5) and use them yourself in §6.
- **Never claim a visual check that did not happen.** §9 lists which screens were captured and which were not, and why.

## 5. Review — three lenses, only the ones the diff triggers, all at once

1. Pick the reviewers from the profile's `Reviewers` section by the paths in `git status --short`. A lens whose triggers still say `TODO` → use the example triggers in that line's comment and tell the owner to fill them in.

   | Reviewer | Lens |
   |---|---|
   | `code-reviewer` | data crossing a boundary, wrong output from critical logic, permissions on queries, audit trail |
   | `security-reviewer` | guards on every entry point, ids from the client, privileged credentials / row-level security, webhooks and token links, secrets and personal data leaking |
   | `uxui-reviewer` | shared components, small screens, colour tokens + contrast, translations, loading / error / empty states, number formatting |

   A lens set to `off` in the profile never runs. At least one always runs — the diff triggers none (e.g. docs or config only) → run the lens closest to the changed files and say so. All three are review-only and pinned to `sonnet` by their own frontmatter — pass no model override.
2. Fire the chosen reviewers **in one message**. Each gets only its slice: `git diff -- <its paths>` + the new files in its paths (from `git status --short`) + the acceptance criteria for those files. Never the whole diff, never the whole plan. `uxui-reviewer` also gets the §4b screenshot paths.
3. Merge the reports yourself: dedupe (one root cause flagged by two lenses = one finding), then group by file.
4. **Round 1** — findings rated severe/should-fix → back to the `coder` that owns the file, via `SendMessage` to that same agent (it still has the context — don't spawn a fresh one). Suggestions → note for the final report.
   Re-review only the lenses that had findings, only on what changed since their review.
5. **Round 2, and anything you conclude yourself → you fix it.** There is no third `coder` round.
   Fix it yourself immediately, without dispatching, when:
   - the finding already survived one `coder` round, or
   - it is roughly ≤20 lines across ≤2 files, or
   - it is a one-line correctness / guard / filter fix, or
   - the file is on the profile's high-risk list and writing the brief costs more than making the change.

   Bigger than that — a new file, a new function, a multi-file change — still goes back to `coder` with the exact instruction. Full rule: `.claude/rules/model-policy.md`.
6. `/simplify` (Skill tool) — only if the profile's `Simplify pass:` is `on` **and** `STRATEGY.md` §3 says the diff is big enough. It edits real code in this session, so **never run it alongside coder**; wait until every coder is done. Skipped → say so in the final summary.
7. Rerun the verify commands after any edit — `/simplify`'s and your own alike.

If findings remain after round two and your own pass, stop and report to the user plainly what remains and why — **never bury it.**

## 6. Final check yourself (don't trust the sub-agents' reports)

- Walk the acceptance criteria **one by one** — runnable ones, run for real; visual ones, against the §4b screenshots (where none could be captured, read the code and say that check was code-only).
- Rerun the verify commands yourself and paste the real output.
- Compare `git diff --stat` against the File map — every extra or missing file must be explainable.
- **Whatever you find here, you fix yourself** — you already have the context; a fresh coder does not. Then rerun the verify commands, and list your own fixes separately in the §9 summary so the user can see which lines came from you rather than `coder`.

## 7. Migration (if the profile has one)

- **Order is always apply → merge → deploy.** When merging the profile's `Deploys on merge` branch ships to production, code that reads a column or table before it exists fails on every request.
- coder has only written the migration file under the profile's migrations directory, following its naming convention — nothing applied.
- If the plan has a collision pre-flight query (e.g. a unique index on a populated table) → run it read-only and show the user the result.
- **Always stop and ask before applying.** Only after the user confirms, apply it the way the profile says, then record the result in the changelog.

## 8. Close out

1. Commit — follow the repo's existing commit message convention (read `git log` if the profile doesn't state one).
2. Changelog entry at the profile's changelog path, **matching the format of the entries already there** — what changed and why, files touched, the real verify output, and anything deliberately left undone. Changelog is `none` → skip.
3. `gh pr create` with the profile's base branch — title starts with the issue id; body summarizes the plan + links the plan page + the issue.
   **Migration not applied yet → open it as a draft** (`gh pr create --draft`) and make the first line of the body:
   `**Merge gate:** apply <migration file> first — this code reads <tables/columns> that do not exist until then.`
   Run `gh pr ready <n>` only after the owner confirms the apply.
4. Issue tracker: attach the PR URL to the issue's trail as `PR #<n>` — **never close the issue yourself**; the user confirms closure.
5. Append one row to `.claude/agent-strategy/runs.md` (columns are defined at the top of that file): strategy version · case · agents spawned · findings per reviewer · fix rounds · agent tokens and wall-clock taken from the Agent results' usage lines (`n/a` when a result shows none — never estimate).
6. *Tracker:* status → in review · one comment that mentions the profile's `Senior`: what to look at first + "run `/review <issue id>`" (`Senior` still `TODO` → post without the mention and say so).

## 9. Stop for review

Short summary: every task done? · which AC pass/fail · verify command results · strategy case used + agents spawned (and any deviation) · screens captured / not captured and why · remaining findings · migration awaiting apply (PR is a draft until then)? · PR link · **how to verify by eye** (which page, what to click) · say: after merging, run `/implement-plan <plan> deployed` for the post-deploy check.

Then wait — do not flow into the next task.

## 10. After it ships — post-deploy check

Runs when the argument ends in `deployed`, or when the owner says the PR is merged. Only this section runs. The profile's `After-deploy logs` is `none` → say there is nowhere to look and stop.

0. Read the plan named before `deployed` (path or issue id, resolved as in §1) for its File map. Find the PR: `gh pr list --state merged --search "<issue id>"`, or by the branch `feat/<slug>`; not found → ask the owner for the PR number.
1. Find when it went live: `gh pr view <n> --json mergedAt,mergeCommit`, then the production deployment for that commit if the profile's log sources can list deployments.
2. From that time until now, search every source in the profile's `After-deploy logs` for errors that mention any table, column, function or route in the plan's File map.
3. Report the real counts with the time window checked. Zero is a result — say zero.
4. Errors found → stop and report them with the log lines. No hotfix without the owner.
5. Add the window and the counts to that PR's changelog entry.
6. No errors → close the loop. Closing is the owner's call: ask **"close <issue id> as done?"** — no → stop here. Everything below runs only after that yes (*Tracker* parts only when the profile has a tracker):
   - *Tracker:* status → done · trail `shipped <YYYY-MM-DD>` (plus ` · <version>` when the issue has a milestone).
   - **Version** — `Versions: milestone`: the version is the issue's milestone (e.g. `v0.2`) and it ships when its last issue is done; this issue alone ships nothing more (an issue with no milestone → treat this deploy as `Versions: none`). `Versions: none`: every deploy is a release named by `Version names` (`date` → `YYYY.MM.DD`, then `.2`, `.3` … the same day; `semver` → ask which number). Check existing tags so a name is never reused.
   - **Shipping a version** (the milestone's last issue just closed, or every deploy when `Versions: none`) → ask **"ship <version>?"**; on yes:
     - *Tracker:* a project status update listing the shipped issues and the version (Linear: `save_status_update`, `type: project`) — it shows in the project's activity.
     - Release record per the profile's `Releases`: `changelog` → the changelog entry names the version; propose `git tag <version>` (semver) or `git tag release/<version>` (date) + push, and run them only on a separate yes · `tracker` → the tracker's release feature (Linear: `save_release` with `version` and `commitSha` in an existing release pipeline, then `save_issue` `addReleases` on the shipped issues); no release pipeline or no such feature → fall back to `changelog` and say so.
     - Offer to create the next milestone (next semver) — only on yes.
   - The issue has a parent report → re-sync that report's task table (done column) · every task of it done → ask to close the parent too; on yes, parent status → done and one comment mentioning the reporter: fixed in release `<name>`.
