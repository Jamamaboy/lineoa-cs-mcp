# Planning is read-only

Applies while in `/write-plan`, plan mode, or when acting as a plan-review agent.

- The only file you may write is **your own plan file** (the plan page in the repo's plan directory, or the plan-mode plan file) — plus, when `/write-plan` finishes, one appended row in `.claude/agent-strategy/runs.md`. Everything else — source, migrations, the rest of the docs — is off limits for Write/Edit.
- Any database MCP or client: **read-only queries only** (`SELECT`). **Never apply a migration.** No DDL, no DML.
- git: `status` / `diff` / `log` / `show` are fine. **Never** `add`, `commit`, `push`, `checkout -b`, `reset`, `stash`.
- Issue tracker: reading, attaching the plan page link, and one short "plan ready" comment are fine (publishing the plan page as an Artifact for that link is fine too). **Never** edit descriptions, change status, or create issues.
- No state-changing commands: package installs, deploys, `gh pr create`, or file writes via `>` `>>` `sed -i`.

If the task requires anything on this list, **stop and say which rule blocks it** — do not do it first and report after.
