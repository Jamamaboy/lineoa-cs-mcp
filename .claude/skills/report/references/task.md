# Task template

Used by `/report` for each task (sub-issue) when the repo guide defines no issue description template of its own.
Translate the `{headings}` into the profile's `Page language`. Write what you know; leave "now" to `/write-plan` when
you did not find the code.

```markdown
**{Why}** — {the problem, and who runs into it — from the report}
**{Now}** — {what happens today; `path/file:line` if you found it, otherwise "to be found by /write-plan"}
**{Will become}** — {what the user will see — not function names}
**{To decide}** — {open questions, or "none"}
**{Done when}** — {checkable: "open X, see Y"}

{Report}: [{CODE}]({link}) · {Found by}: {mention}
```

Title: the repo's title convention if the repo guide has one (e.g. an area prefix like `[Payroll]`), otherwise a
short outcome sentence. Never put the report code in a task title — it lives on the parent.
