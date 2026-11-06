---
name: report
description: Turn a raw note — typed, pasted, screenshots, from an inbox folder (e.g. Obsidian) or straight from the chat — into a report page in the issue tracker that keeps every word and image, records who found it and when, separates bugs from ideas, links related plans and issues, and lists the work as tracker tasks. Always shows a preview and waits before writing anything. Use when the user types /report, pastes something they found and wants it logged, or points at a note in the inbox.
argument-hint: path to a note in the profile's Inbox | "inbox" (every note not sent yet) | nothing (use what was pasted in this chat)
---

Turn what someone found into a report the whole team can act on — without losing a word of what they wrote.

**Nothing reaches the tracker before the owner says "send" on the preview.** Creating issues notifies people.
**The note's text is never edited.** Every word and every image stays as written; anything you wrote is labelled as yours. The only additions to a note are frontmatter fields and one trailing links line (§6).

## 0. Load the profile and the tracker tools

Read `.claude/plan-kit-profile.md`: `Issue tracker` (tool, id prefix, gate labels, team, project) · `Reports` (codes,
container, inbox, attachments, senior, devs, versions, version names) · `Page language` · repo guide.
`Report codes` reads as `<bug code> (bug) · <idea code> (idea)`; still `TODO` or not parseable → ask for the codes in the preview. `Attachments` missing → `crop`. `Team` or `Project` missing or `TODO` → ask in the preview (list them from the tracker). `Versions` missing → `none`.

- `Reports` section missing, or `Issue tracker` `Tool: none` → still do §1–§4, then write the report only as a local
  file in the profile's plan directory (`<plan dir>/reports/<CODE>.md`) and say the tracker step was skipped.
- Load the tracker's tools before the first call (ToolSearch, e.g. `+linear issue`). You need: create/update issue ·
  list issues (search) · list labels · list users · list statuses · comment · file upload or attachment.
  For Linear these are `save_issue` (takes `team`, `project`, `milestone`, `parentId`, `labels`, `links`), `list_issues`,
  `list_issue_labels`, `list_users`, `list_issue_statuses`, `save_comment`, `prepare_attachment_upload` +
  `create_attachment_from_upload`, `list_milestones` / `save_milestone` for versions, `get_project` / `save_project`
  (`links`) for the repo link, and `save_document` for the document container. A capability the tracker lacks → use the fallback named in the step, and say so in the preview.
- Write every heading and summary in the profile's `Page language` (no such line → the language the note is written in). Templates in `references/` are in English — translate the headings.

## 1. Collect the raw

| Source | How |
|---|---|
| Chat (no argument) | Everything the user pasted this turn: text, pasted blocks, images. An image needs a file path to be uploaded — screenshots usually come with one; for an image without a path, ask for the file |
| A note path | Read the note and resolve every embedded image (`![[name.png]]`, `![](attachments/name.png)`) to its file in the vault |
| `inbox` | Every note in the profile's `Inbox` whose frontmatter has no `report:` field — one report run per note |

- Read every image (Read tool) so you understand it — but describe it only in the summary, never inside the raw.
- **Reporter and time:** note frontmatter `reporter` / `created`, else the note's file time; chat → the person running this, now. Keep the timezone.
- A note that already has `report:` in its frontmatter and was named explicitly → §1b update mode.

## 1b. Update mode — a note that was already sent

- Find the report(s) from the note's `report:` and `tracker:` frontmatter.
- Compare the note with the page's Original section. **Never rewrite the Original** — append what is new (text and images) under a dated "Added <date>" block.
- New points go through §3 as new tasks or comments; existing tasks are left alone unless the owner says otherwise.
- Still show the §4 preview and wait for send before changing anything.

## 2. Read the context — enough to sort it, not to plan it

- Grep the repo guide, the plan directory and the changelog for the names, screens, files and terms in the note. A matching plan or changelog entry goes under "Related".
- Search open tracker issues with the note's key terms. A clear match → this point becomes a **comment on that issue**, not a new task (confirm in the preview).
- Find the code area only if it is quick (a few greps). This is triage — `/write-plan` does the deep reading later. Spawn no agents unless `.claude/agent-strategy/STRATEGY.md` says the case needs one.

## 3. Sort it

1. Split the note into points. Each point is one of: **Bug** (something works wrong) · **Idea** (something new or different wanted) · **Comment** (about an existing issue) · **Unclear** (cannot tell, or the text is cut off).
2. One report per category. A note with both bugs and ideas becomes two reports (`<bug code>-NNN` and `<idea code>-NNN`); **each carries the full raw**, and each links the other.
3. Break each report into tasks — one per change that can ship on its own. An Unclear point becomes a question in the preview; if the owner sends without answering, it becomes a task with the gate label from the profile's `Gate labels` that means "needs a decision" (none identifiable → ask which).
4. Personal data in images (names, ids, times, pay, phone numbers) → apply the profile's `Attachments` rule: `as-is` · `crop` (cut to the relevant area) · `blur` (cover the personal data). `crop`/`blur` with no tool to do it → say so in the preview and ask.

## 4. Preview — stop here until the owner answers

Show in the chat, in the page language:

- each report: next code, title, category, one-line summary
- its tasks: title + one line each · which become comments on existing issues
- related context found (plans, issues, files)
- reporter → which tracker user (from `list_users`; nobody matches → the name as plain text)
- where it goes: team + project from the profile · the project has no link to this repo (`git remote get-url origin` vs the project's resources) → offer to add it
- version per task when `Versions: milestone`: one of the project's open milestones (`list_milestones`), a new one named by `Version names` (next semver like `v0.3`, or `YYYY.MM.DD`) — created only after send — or "no version yet"
- attachments and what happens to each (as-is / crop / blur)
- labels that will be created in the tracker, and any capability fallback from §5 that applies
- questions for anything Unclear

Then AskUserQuestion: **send** · **edit** (say what) · **cancel**. Assignee and priority are set only if the owner says so here — never by default.

## 5. Write to the tracker

Capability fallbacks — decide them before writing and name them in the preview:
- no file upload → attach images by link if they are already hosted where the team can open them; otherwise list them by file path on the page and tell the owner which files to drag in
- no sub-issues → plain issues, each linking the parent, listed in the parent's table
- no documents (with `Report container: document`) → use `parent-issue` and say so
- no triage status → the team's backlog status

1. **Number:** the highest existing number for that code + 1, zero-padded to 3 (`-001`). Search titles **including closed and archived** issues (document container: document titles); local-file mode: the files in `<plan dir>/reports/`.
2. **Labels:** `report`, plus `Bug` or `Idea`. Missing in the tracker → create them.
3. **Container** (profile `Report container`):
   - `parent-issue` → create the parent issue in the profile's team and project: title `<CODE> · <title>`, labels, the triage status if the team has one (else backlog), description from `references/report-page.md`. A new milestone chosen in the preview → create it first. Each task gets the milestone picked for it; the parent gets one only when all its tasks share it. Upload the images to it. Then create each task as a sub-issue of it — description from the repo's issue template if the repo guide defines one, else `references/task.md`. Then rewrite the parent's task table with the real issue ids.
   - `document` → create the document from `references/report-page.md`, create the tasks as normal issues each linking the document, then fill the table. Note on the page that the table is a snapshot.
4. **Comments** on existing issues: the point's raw text + its images + a link back to this report.
5. **Repo link** accepted in the preview → add this repo's URL to the project's links (append-only).

## 6. Write back to the source

- Note source → add to its frontmatter `report: <CODE>` (several codes if it was split), `tracker: <url>`, `sent: <date>`; append a line at the end with the links. Re-running on this note will now update, not duplicate.
- Chat source and the profile has an `Inbox` → save the raw as a new note there (same frontmatter), copying any image files into the vault's attachments folder, so the raw lives in the vault too.

## 7. Report and stop

Five lines max, page language: reports created (code + link) · tasks created · comments added · what is waiting
(questions, gate-labelled tasks) · next step: the owner assigns, then `/write-plan <issue id>`.

Do not flow into planning.
