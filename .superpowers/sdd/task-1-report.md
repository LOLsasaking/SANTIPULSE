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
