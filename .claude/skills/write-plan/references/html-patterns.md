# Block recipes for plan pages

All classes are defined in `plan-template.html` — this file is about *when to use which*, and the traps.

## Non-negotiables

1. **No decorative emoji** — status uses `.pill ok` / `.pill warn` / `.pill crit`, never ✅ ❌.
2. **Code / paths / commands / error messages verbatim — never abbreviate, never `...` in place of real content.**
3. **Every number comes from an actual check** — grep, query, `wc -l`, reading code. Didn't check? Don't write a number; write "not counted yet".
4. **Every table / `<pre>` sits inside `<div class="scroll">`** — the page itself must never scroll horizontally.
5. Real screenshots and drawn illustrations are always labeled separately, so nobody mistakes a drawing for evidence of what the app does today.
6. No CDN, no external files — everything must work from `file://`.

## Pick the right block

| To show | Use |
|---|---|
| A flow that changes | Two `.flow` blocks (current / proposed) |
| Outcomes differing per case | 3-column table: case / today / after + `.pill` |
| Impact across 3 axes | `.impact` + `.imp ux/data/risk` |
| A costly-if-missed warning | `.note` (amber) or `.note.crit` (red) |
| Code / SQL / schema | `<pre><code>` inside `.scroll` |
| Step-by-step work | `.task` + `<dl>` (Depends on / files / tests-first) |
| Files to touch | File map table + `.pill` Create/Modify/Delete |

## Flow diagrams — the most common mistake

**Current and proposed must use the exact same HTML structure** — same step count if possible. Only the classes differ:

- `.step` = unchanged
- `.step.new` = added step (blue)
- `.step.gone` = removed step (struck through, faded) — include it in the proposed side so the removal is visible
- `.step.bad` = the breaking point in the current flow (red)

If the two sides have different layouts, the reader has to diff them manually — which defeats the point of drawing a diagram at all.

Branching uses `.branch`:
```html
<div class="branch"><span>hit</span><span class="step bad">400 DUPLICATE</span></div>
<div class="branch"><span>miss</span><span class="step">insert</span></div>
```

## When to add interactivity (slider / tabs)

Add it when **a number is the reason for the decision** — e.g. "cache hit 85% means how much saved?" — let the reader drag through other scenarios.
Build with `<input type="range">` + a short `<script>` at the end of the file. No libraries.
**Defaults must be real measured values**, labeled with where they were measured.

If the decision isn't driven by numbers, skip it — interactivity that doesn't help decide is clutter.

## The "Review rounds" table is mandatory

A plan page without it has not passed the review gate. If reviewers found nothing, write a single row:
`plan-reviewer | — | no findings | —` so the reader knows the gate actually ran.
