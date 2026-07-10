# Task 1: Baseline Audit and Structural Verification

## Status

`DONE`

Task 1 is complete. The structural verifier and npm command are in place, and the verifier fails against the current service markup as intentionally expected. Later service UI tasks must make the verifier pass.

## Baseline Audit Evidence

The baseline-audit step is treated as completed evidence from the controller. The captured artifact is:

`.superpowers/audits/service-baseline/01-current-service.png`

The baseline observations were:

- The AI example uses an invented `84%` lead score.
- All four service rows use small, generic preview panels.
- The labels explain mechanisms rather than client value.

The implementation decisions recorded for the follow-up service work are:

```text
AI: conversation + captured lead handoff, no score percentage
Automation: event pipeline + explicit status/handoff
Electrical: room schedule + entered quantities + assumptions + secondary diagram
Brand: lockups + named palette + typography + concrete applications
Shared: restrained blue accent, square/low-radius controls, no glow or gradient
```

## Verification Harness

Created `scripts/verify-service-examples.mjs` using the complete verifier requirements from the brief. It checks:

- Four service sections, project keys, English titles, Spanish copy, and required narrative structure.
- Minimum feature counts, workflows, deliverables, example CTAs, contact CTAs, and distinct preview hooks.
- The exact electrical planning disclaimer.
- Preservation of the existing contact form and web-design service.
- Prohibited public service phrases.
- Required English titles in `dist/index.html` when a built page is present.

Added this package command:

```json
"verify:services": "node scripts/verify-service-examples.mjs"
```

The brief's verifier code ran under this repository without correction. `cheerio` was already installed and declared in `package.json`.

## TDD Evidence

The verifier was executed directly before the npm command was added:

```text
node scripts/verify-service-examples.mjs
exit 1
```

It failed with the expected missing `data-project`, narrative, CTA, and distinct-preview messages, as well as the currently absent titles, Spanish copy, disclaimer, and built-page titles.

The wired command was then executed:

```text
npm run verify:services
exit 1
```

It reproduced the same expected RED result through the project npm interface.

## Scope and Preservation

Task 1 changed only:

- `package.json`
- `scripts/verify-service-examples.mjs`
- `.superpowers/sdd/task-1-report.md`

The pre-existing uncommitted changes in `src/pages/home.html` were preserved and were not edited or staged by this task.

## Review Findings Follow-up

### Baseline Audit Evidence

The live localhost DOM showed these accessible service-row texts:

- AI: `02 AI Solutions Assistant Lead score Follow-up 84% Quote request detected Name, email, service, timeline`.
- Automation: `03 Automation Triggers Tasks Status board 01 Intake 02 Classify 03 Route 04 Notify`.
- Electrical: `04 Electrical Planning Unifilar Multifilar Materials Electrical schema preview`.
- Brand: `05 Brand Identity Logo system Brand kit Usage preview SP`.

Screenshot evidence: `.superpowers/audits/service-baseline/01-current-service.png`.

Read-only Canva searches for `workflow process board`, `brand guidelines board`, and `electrical estimate worksheet` returned sparse or mostly unrelated account designs, so nothing was copied. Retained reference ideas: clear stage progression, labeled brand-system groups, and worksheet quantity hierarchy.

Figma access is view-only; no file was created or edited.

### Electrical Disclaimer Structure

The verifier now requires exactly one `[data-electrical-disclaimer]` inside `#service-4`. When any of `[data-planner-print]`, `[data-planner-send]`, `[data-tool-export]`, or `[data-tool-send]` exists inside that section, the verifier checks that the disclaimer precedes every such control in DOM order. The current verifier remains RED until later UI tasks add the future hooks and service markup.

### Review Verification

```text
node --check scripts/verify-service-examples.mjs
exit 0

npm run verify:services
exit 1
- electrical requires exactly one [data-electrical-disclaimer]
```

The remaining verifier failures are the expected missing future service markup, titles, Spanish copy, and built-page titles; no failure is caused by a syntax error or by the new structural check beyond the absent future disclaimer hook.

## Remaining Verifier Finding Fix

### TDD Evidence

RED before the fix:

```text
node scripts/verify-service-examples.mjs
exit 1
- missing exact electrical disclaimer
- electrical requires exactly one [data-electrical-disclaimer]
```

GREEN after the verifier change:

```text
node --check scripts/verify-service-examples.mjs
exit 0
```

### Fix Evidence

- Replaced the global disclaimer search with an exact trimmed-text assertion on the single `#service-4 [data-electrical-disclaimer]` element.
- Added `[data-project-example-button]` and `[data-project-contact]` to the electrical controls required to follow the disclaimer in DOM order.
- Preserved the expected RED state because the future electrical disclaimer hook and service-example markup are not yet present.

Final RED verification:

```text
npm run verify:services
exit 1
- electrical requires exactly one [data-electrical-disclaimer]
```

The uncommitted `src/pages/home.html` changes remain untouched and unstaged.

## Baseline Audit Commit

Committed tracked audit evidence as `df8286f` (`docs: record service examples baseline audit`).

Checks before commit:

```text
test -s docs/superpowers/research/assets/service-examples-baseline.png
test -s docs/superpowers/research/assets/service-examples-baseline-lower.png
git diff --check
git diff --cached --check
```

All checks passed. The commit contains only the audit document and the two current localhost screenshots.

## Electrical Plan Copy Disclaimer Order Follow-up

Updated `scripts/verify-service-examples.mjs` to include `[data-planner-copy-plan]` in the electrical controls required to appear after `#service-4 [data-electrical-disclaimer]`.

Checks:

```text
node --check scripts/verify-service-examples.mjs
exit 0

npm run verify:services
exit 1
expected future-task markup, title, Spanish-copy, disclaimer-hook, and built-page failures; no verifier crash

git diff --check
exit 0
```

Commit: `d82156f` (`test: cover electrical plan copy disclaimer order`)
