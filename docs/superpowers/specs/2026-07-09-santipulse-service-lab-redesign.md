# SantiPulse Client-Ready Project Examples

## Goal

Upgrade only the four non-web project examples in the existing SantiPulse services accordion so visitors can understand what Santiago can build, who each service helps, what problem it solves, what is delivered, and how to start a conversation.

The rest of the portfolio stays intact. This work does not replace the navigation, branding, layout, work highlights, web-design gallery, contact section, deployment configuration, or portfolio structure.

## Selected Approach

Keep all four examples inside the existing accordion. Each closed row remains the project entry point. Expanding it reveals a complete client-facing explanation and an interactive example. The project CTA scrolls to and focuses that interactive example without navigating away from the portfolio.

This approach preserves the site's identity, avoids additional routes, and lets a visitor move from understanding the service to trying it and contacting Santiago in one place.

## Shared Content Structure

Each project must include the following content in this order:

1. Professional project title and short value proposition.
2. The business problem it solves.
3. The audiences for whom it is best suited.
4. A complete feature list, grouped into readable categories where needed.
5. A visible example workflow from input to business outcome.
6. Concrete deliverables a paying client receives.
7. A distinct interactive preview that demonstrates the service.
8. A primary `View ... Example` action that focuses the preview.
9. A secondary contact action that carries the project name into the existing contact form.

Copy must remain practical and verifiable. Do not use fake performance figures, unsupported claims, vague AI language, public developer notes, or futuristic decoration that does not explain functionality.

## Project 1: AI Business Assistant System

### Positioning

Custom business assistants that answer questions, qualify leads, detect quote requests, collect customer information, and hand structured conversations to the business. Explain that this is a business-specific system connected to company FAQs, services, forms, documents, and workflow rather than a generic chatbot.

### Problem and Audience

The system helps businesses avoid missed questions and incomplete quote requests when staff cannot respond immediately. It is suitable for insurance agencies, transportation businesses, local services, real estate agents, and small businesses.

### Features

- Website AI assistant
- Lead qualification
- Quote-request detection
- Customer intake
- FAQ answers
- Business-specific knowledge base
- Email or CRM handoff
- Conversation summaries
- Admin-editable responses
- Safe fallback responses

### Workflow

Visitor requests a quote -> assistant asks service-specific questions -> contact details are collected -> the business receives a structured lead summary.

### Deliverables

A branded website assistant, business knowledge setup, intake fields, suggested questions, safe fallback rules, lead-summary format, and an optional email or CRM handoff specification.

### Preview

Show a compact customer conversation beside an intake summary. The preview must visibly distinguish visitor messages, assistant responses, detected intent, captured fields, lead status, and the final business handoff. Do not present invented analytics as real data.

Primary CTA: `View AI Assistant Example`.

## Project 2: Business Workflow Automation

### Positioning

Automation systems that connect forms, emails, spreadsheets, CRMs, calendars, and notifications so a business can replace repetitive manual handling with a visible, trackable process.

### Problem and Audience

The service helps prevent requests from being lost across inboxes, messages, and spreadsheets. It is suitable for small businesses, agencies, service companies, consultants, and local operations.

### Features

- Lead-intake automation
- Automatic follow-ups
- Email parsing
- CRM updates
- Google Sheets or Airtable dashboards
- Appointment reminders
- Task creation
- Status tracking
- Customer notifications
- Daily business summaries

### Workflow

Quote form submitted -> lead classified -> CRM updated -> owner notified -> follow-up scheduled -> status tracked.

### Deliverables

A documented workflow map, trigger and routing rules, required fields, status model, notification plan, integration list, exception handling, and a build-ready automation brief.

### Preview

Show a horizontal or stepped operations pipeline with realistic stages, a sample incoming request, routing decision, owner notification, follow-up time, and current status. The design should read like an operations board, not a generic dashboard.

Primary CTA: `View Automation Example`.

## Project 3: Electrical Planning & Material Estimator

### Positioning

A planning and estimating aid for organizing rooms, electrical points, project notes, circuit concepts, and material quantities before qualified review and installation.

### Problem and Audience

The tool helps electricians, contractors, homeowners, apprentices, and small renovation teams prepare a clearer project brief and reduce missing information before a site visit or estimate.

### Features

- Room-by-room planning
- Outlet, switch, and lighting notes
- Circuit and load planning assistant
- Material-list generator
- Basic diagram preview
- Contractor notes
- PDF project summary
- Client approval checklist
- Version history
- Material quantity estimates

### Workflow

User enters rooms -> selects outlets, lights, switches, and panel notes -> tool calculates preliminary quantities -> material list and project summary are generated for professional review.

### Deliverables

A room schedule, point and quantity summary, preliminary material estimate, project notes, basic diagram concept, client checklist, and exportable project summary.

### Preview

Replace the current dossier-first presentation with a recognizable room-and-material estimator. Keep useful REBT-style circuit organization as supporting output, but make rooms, points, quantities, and materials the main interaction. Provide a simple unifilar/multifilar concept only as a secondary preview.

Display this disclaimer prominently:

> Planning and estimating support only. Final electrical work, permits, code compliance, and installation must be verified by a licensed professional.

Primary CTA: `View Electrical Tool Example`.

## Project 4: Brand Identity System

### Positioning

Complete visual identity kits that combine logo systems, colors, typography, social assets, website direction, and practical usage guidance. Present this as a brand system rather than a single logo service.

### Problem and Audience

The service helps new or inconsistent businesses establish one usable visual direction across web, social media, and print. It is suitable for new businesses, rebrands, portfolio sites, insurance agencies, transportation companies, real estate, contractors, and creators.

### Features

- Logo system
- Color palette
- Typography
- Brand usage rules
- Social media templates
- Website hero direction
- Business-card mockups
- Flyer mockups
- Favicon and app icon
- Brand voice notes
- Canva- or Figma-ready assets
- Downloadable brand kit

### Workflow

Business provides name, industry, and style -> brand direction is established -> logo system, colors, and type are developed -> assets are prepared for web, social media, and print.

### Deliverables

Primary and secondary logo directions, color and typography specifications, usage examples, social templates, web direction, icon files, mockups, voice notes, and an organized brand-kit package.

### Preview

Show one coherent brand board with a primary mark, alternate lockup, palette with readable color values, typography pairing, favicon, social tile, business-card application, and one usage warning. User inputs update the board without pretending to deliver a finished AI-generated logo.

Primary CTA: `View Brand Kit Example`.

## Visual Direction

- Preserve the existing black, white, gray, and deep-blue SantiPulse language.
- Keep the editorial typography and restrained borders already used by the portfolio.
- Use one shared information hierarchy while making each preview structurally different.
- Keep cards at a restrained radius and avoid nested decorative cards.
- Use icons only when they clarify an action or status.
- Avoid gradients, glow effects, meaningless symbols, and repeated generic dashboard layouts.
- Keep content widths and preview dimensions stable so generated content cannot shift the page.

## Interaction and Data Flow

1. Visitor expands a project accordion row.
2. Visitor reads the problem, audience, features, workflow, and deliverables.
3. Primary CTA scrolls to the embedded example and moves keyboard focus to its first meaningful control.
4. Visitor edits example inputs and updates the preview locally in the browser.
5. Download actions create a clear project brief from the visitor's inputs.
6. Contact actions populate the existing contact form with the selected project and visitor-generated summary.

No external API is required for these examples. They should remain honest front-end demonstrations of the planning and deliverable experience. Failures to save, export, or populate the contact form must produce a visible, plain-language message without breaking the accordion.

## Language and Accessibility

- Preserve English and Spanish behavior for all new public copy.
- Keep the existing fallback behavior for other language variants.
- Use semantic headings, lists, labels, buttons, and status text.
- Preserve Bootstrap collapse ARIA state and keyboard operation.
- Ensure primary actions have descriptive accessible names.
- Move focus only after an explicit CTA click; never on accordion expansion alone.
- Maintain readable contrast in light and dark site themes.

## Responsive Behavior

- Desktop: content overview and functional preview may use two columns when space permits.
- Tablet: stack dense feature and preview areas without hiding information.
- Mobile: use one column, full-width controls, horizontally safe workflow steps, and no clipped labels or generated values.
- Long English and Spanish copy must wrap without changing the width of controls or accordion rows.

## Implementation Boundaries

- Primary implementation remains in `src/pages/home.html`, following the current static HTML/CSS/JavaScript architecture.
- Reuse the existing accordion, translation, tool-form, download, and contact-handoff mechanisms where they are sound.
- Refactor only service-section code needed to remove duplication or support the approved content structure.
- Do not add routes, dependencies, authentication, databases, deployment changes, or live integrations.
- Do not deploy or push until Santiago reviews the localhost result.

## Plugin Resource Strategy

Use installed plugins selectively as design and verification resources:

- **Product Design:** audit the existing service flow and critique the finished section for hierarchy, clarity, repeated AI patterns, and task usability. Use ideation only when a project preview needs a genuinely different layout direction.
- **Figma:** inspect available design references and extract useful spacing, typography, and component patterns. Do not copy complete designs. The connected account currently has view-level access, so creating or editing a Figma file is not required for this implementation.
- **Canva:** search accessible designs and templates for practical brand-board, business-card, workflow, and estimator presentation patterns. Use these as visual references; do not create unrelated Canva collateral or make permanent Canva edits without separate approval.
- **Browser and Chrome:** inspect the live localhost experience, operate every accordion and tool, and capture desktop and mobile views for comparison.
- **Vercel browser verification:** run automated checks against the local server for rendering, navigation, console errors, responsive behavior, and interactive states.
- **GitHub and Vercel deployment:** keep inactive during local development. Use them only after Santiago explicitly approves publishing.

Image generation, data-dashboard, presentation, Cloudflare, Supabase, and unrelated plugins are not required for this scoped section update. Functional HTML/CSS/JavaScript previews are more truthful and maintainable than generated decorative assets for these four examples.

## Verification Criteria

- `npm run build` completes successfully.
- Each of the four accordion rows expands and collapses correctly.
- Every required title, audience, problem, feature, workflow, deliverable, and CTA appears in English and Spanish.
- All four previews are visibly and functionally distinct.
- Update, download, and contact-handoff actions work for every example.
- The electrical disclaimer is visible before a user exports or contacts.
- Keyboard navigation and focus behavior work through the accordion and tool controls.
- No overlap, clipping, or horizontal page overflow occurs at representative desktop, tablet, and mobile widths.
- The existing portfolio, web-design gallery, work highlights, contact form, navigation, and deployment files remain unchanged in behavior.
