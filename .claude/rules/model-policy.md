# Which model runs what

One expensive model decides, cheap models do the reading and typing.

## The split

| | model | does |
|---|---|---|
| **Orchestrator** — the session the user talks to | opus | plans, decides scope, writes the spec, checks last, and makes small edits itself |
| **Everything it spawns** | sonnet | exploring, writing to a settled spec, reviewing a plan or a diff |

## Spawning

- The six kit agents (`coder`, `code-reviewer`, `security-reviewer`, `uxui-reviewer`, `plan-reviewer`,
  `plan-risk-auditor`) pin `model: sonnet` in their own frontmatter. **Pass no model override for them** — an Agent-tool
  `model` beats frontmatter and would undo it.
- Built-in types (`Explore`, `Plan`, `general-purpose`) have no frontmatter and **inherit the
  caller's model** — spawned from an Opus session they run on Opus. Always pass `model: "sonnet"`
  explicitly:

  ```
  Agent(subagent_type: "Explore", model: "sonnet", prompt: …)
  ```

## How many, and which reviewers

`.claude/agent-strategy/STRATEGY.md` — no fixed cap; sized by worked examples, versioned monthly, re-tuned only
through `/update-skill` after the owner approves.

## When the orchestrator fixes it itself

A round trip costs a briefing plus a report read. Below that cost, do not dispatch — edit it:

- a finding that already survived one `coder` round
- roughly ≤20 lines across ≤2 files
- a one-line correctness / guard / filter fix
- a high-risk file where writing the brief costs more than making the change

Bigger — a new file, a new function, a multi-file change — still goes back to `coder` with the exact
instruction. **Never a third `coder` round for a few lines.**

Own edits get the same treatment as anyone else's: rerun the verify commands, and say in the final
summary which lines were yours rather than `coder`'s.

## Override

A `## Models and passes` section in `.claude/plan-kit-profile.md` wins over everything above. No
profile, or no such section → these defaults hold.
