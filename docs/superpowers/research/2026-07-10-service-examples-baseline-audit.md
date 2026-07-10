# Service Examples Baseline Audit

**Date:** 2026-07-10
**Scope:** Current localhost service examples in `#service`, before the client-ready service work.

## Evidence

These are real current-run localhost captures supplied for this audit. They are retained as screenshot evidence; no screenshot was generated, edited, or copied from a design reference.

- [Upper capture: Web Design and AI Solutions](assets/service-examples-baseline.png)
- [Lower capture: AI continuation, Automation, Electrical Planning, and Brand Identity](assets/service-examples-baseline-lower.png)

The two captures together show the current Web Design row and all four service rows relevant to this task. The upper and lower captures intentionally overlap at the AI row so the transition between screenshots is identifiable.

## DOM Baseline

The current browser DOM audit recorded these accessible names:

| Row | Current accessible name | Baseline limitation |
| --- | --- | --- |
| AI | `02 AI Solutions Assistant Lead score Follow-up 84% Quote request detected Name, email, service, timeline` | The preview presents a lead-score metric and short UI fragments, but does not yet make the conversation-to-lead handoff, inputs, assumptions, or client deliverables clear. The `84%` score is an unsupported-looking trust risk. |
| Automation | `03 Automation Triggers Tasks Status board 01 Intake 02 Classify 03 Route 04 Notify` | The four-stage board communicates a generic mechanism, but not the trigger, owner, output, exception path, or business result a client would receive. |
| Electrical | `04 Electrical Planning Unifilar Multifilar Materials Electrical schema preview` | The schematic preview is too small and abstract to communicate a room schedule, entered quantities, estimate basis, assumptions, or the boundary between planning support and licensed work. |
| Brand | `05 Brand Identity Logo system Brand kit Usage preview SP` | The preview suggests a logo and color tokens, but does not show a complete identity system: lockups, named palette, typography, or concrete applications. |

Across the rows, labels describe implementation mechanisms more strongly than a client's problem, audience, workflow, deliverables, or next action. The previews are compact visual hooks rather than complete, inspectable service examples.

## Plugin Research

### Canva

Read-only searches were performed for:

- `workflow process board`: one irrelevant social-post direction.
- `brand guidelines board`: one document direction.
- `electrical estimate worksheet`: Lean Canvas whiteboards.

Nothing was copied. The retained patterns are limited to left-to-right process progression, labeled brand-system grouping, and worksheet quantity hierarchy.

### Figma

Figma access was view-only. No file was created or edited, and no Figma content was copied into the service examples.

## Risks And Acceptance Implications

- **Trust:** Remove the unsupported AI score treatment and show a credible conversation plus captured lead handoff instead.
- **Clarity:** Replace generic labels with explicit problem, audience, workflow, deliverables, example CTA, and contact CTA content for every service row.
- **Operational detail:** Make Automation show an event pipeline with status and handoff; make Electrical show a room schedule, entered quantities, assumptions, and a secondary diagram; make Brand show lockups, named palette, typography, and concrete applications.
- **Safety:** Electrical planning copy must clearly state that planning and estimating support is not final electrical work, permitting, code compliance, or installation, which must be verified by a licensed professional.
- **Layout:** Preserve the scan-friendly row structure and distinct previews, while keeping controls low-radius and restrained. Avoid glow or gradient treatments that compete with the service evidence.
- **Acceptance:** The finished rows should be independently understandable as client-facing tools, with distinct previews and clear routes to inspect an example or contact SantiPulse. Existing Web Design and contact-form behavior must remain present.

No private secrets, credentials, or external design assets are included in this audit.
