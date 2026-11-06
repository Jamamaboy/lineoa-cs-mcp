# Report page template

Used by `/report` for the parent issue description (or the document body). Translate every `{heading}` into the
profile's `Page language`; keep codes, ids, paths and the raw verbatim. Remove a row only when it truly does not apply.

```markdown
# {CODE} · {title — the outcome or symptom in plain words}

| | |
|---|---|
| {Found by} | {tracker mention, or the name as plain text} |
| {When} | {YYYY-MM-DD HH:MM} ({timezone}) |
| {Category} | {Bug | Idea} |
| {Source} | {inbox note path, or "chat"} |
| {Related} | {plans, issues, changelog entries, files — as links} |
| {Pair} | {the other report this note was split into, with link — only when split} |

## {Summary for readers}
_{AI summary — confirmed by the reporter | AI summary — not confirmed yet}_

{3–5 plain lines: what is wrong or wanted, who meets it, where. Refer to images by number (image #2).}

## {Tasks}

| id | {name} | done | {found by} |
|---|---|---|---|
| {ISSUE-ID} | {task title} | [ ] | {mention} |

{One line: the tracker's own sub-issue list shows live status; this table is re-synced at review and at release.}

## {Original — verbatim}

{Every word exactly as written. Put each image and each pasted block where it appeared:
[image #1] … [pasted text #2 · N lines] … — then the pasted text itself in a quote block.}

### {Attachments}

- {image #1} — {uploaded file / link} {(cropped | blurred) when the Attachments rule changed it}
```
