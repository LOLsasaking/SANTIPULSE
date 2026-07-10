import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const vaultRoot = process.env.OBSIDIAN_VAULT || '/Users/santimac/Obsidian AI/Ai Projects';
const systemRoot = path.join(vaultRoot, 'Santiago Portfolio System');

const dirs = [
  systemRoot,
  path.join(systemRoot, 'Projects'),
  path.join(systemRoot, 'Client Work'),
  path.join(systemRoot, 'Website Concepts'),
  path.join(systemRoot, 'Certificates'),
  path.join(systemRoot, 'GitHub'),
  path.join(systemRoot, 'Planning'),
  path.join(systemRoot, 'Attachments', 'logos'),
  path.join(systemRoot, 'Attachments', 'work'),
  path.join(systemRoot, 'Attachments', 'websites'),
  path.join(systemRoot, 'Attachments', 'certificates'),
  path.join(systemRoot, 'Attachments', 'profile'),
];

for (const dir of dirs) fs.mkdirSync(dir, { recursive: true });

function writeNote(relativePath, content) {
  const target = path.join(systemRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content.trimStart() + '\n', 'utf8');
}

function copyAsset(sourceRelative, targetRelative) {
  const source = path.join(repoRoot, sourceRelative);
  const target = path.join(systemRoot, 'Attachments', targetRelative);
  if (!fs.existsSync(source)) return null;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  return target;
}

function mdLink(label, filePath) {
  return `[${label}](${filePath})`;
}

const today = new Date().toISOString().slice(0, 10);
const repo = '/Users/santimac/Documents/Santi Project/santipulse';
const localPreview = 'http://127.0.0.1:4599/';

const logoAssets = [
  ['clone-assets/logos/santipulse.png', 'logos/santipulse.png'],
  ['clone-assets/logos/sol-morena-logo-clean.png', 'logos/sol-morena-logo-clean.png'],
  ['clone-assets/logos/vals-logo-clean.png', 'logos/vals-logo-clean.png'],
  ['clone-assets/logos/el-estimado-logo-clean.png', 'logos/el-estimado-logo-clean.png'],
  ['clone-assets/logos/easy-insurance-logo-clean.png', 'logos/easy-insurance-logo-clean.png'],
];

const workAssets = [
  ['clone-assets/profile/santiago-bw.png', 'profile/santiago-bw.png'],
  ['clone-assets/work/sol-morena.jpg', 'work/sol-morena.jpg'],
  ['clone-assets/work/vals-basl.jpg', 'work/vals-basl.jpg'],
  ['clone-assets/work/barberia-el-estimado.jpg', 'work/barberia-el-estimado.jpg'],
  ['clone-assets/websites/dashboard-panel.jpg', 'websites/dashboard-panel.jpg'],
  ['clone-assets/websites/lara-preview.jpg', 'websites/lara-preview.jpg'],
  ['clone-assets/websites/restaurant.jpg', 'websites/restaurant.jpg'],
  ['clone-assets/websites/sakana.jpg', 'websites/sakana.jpg'],
  ['clone-assets/websites/onfleek.jpg', 'websites/onfleek.jpg'],
  ['clone-assets/websites/unas.jpg', 'websites/unas.jpg'],
  ['clone-assets/websites/burger.jpg', 'websites/burger.jpg'],
  ['clone-assets/websites/oficios.jpg', 'websites/oficios.jpg'],
  ['clone-assets/websites/tenerife-tours.jpg', 'websites/tenerife-tours.jpg'],
  ['clone-assets/websites/megasur.jpg', 'websites/megasur.jpg'],
];

const certAssets = [
  'ai-beginners.png',
  'ai-business-professionals.png',
  'aws-generative-ai-art-of-possible.png',
  'aws-machine-learning-basics.png',
  'confined-spaces-safety-2025.png',
  'electrical-certificate.png',
  'electrician-apprentice.png',
  'generative-ai.png',
  'i2cs.png',
  'national-electrical-code.png',
  'osha-10-hour-general-industry.png',
  'osha-30-hour-general-industry.png',
  'solar-photovoltaic-maintenance.png',
  'teenpreneur-ai-business-2025.png',
  'working-at-heights-safety-2024.png',
].map((name) => [`clone-assets/certificates/${name}`, `certificates/${name}`]);

for (const [source, target] of [...logoAssets, ...workAssets, ...certAssets]) copyAsset(source, target);

const projects = [
  {
    title: 'AI Assistant Platform',
    folder: `${repo}/github-projects/ai-assistant-platform`,
    localUrl: 'http://localhost:5101',
    purpose: 'Business assistant that answers visitor questions, classifies intent, scores leads, and prepares contact handoff.',
    features: ['Live chat interface', 'Backend /api/message route', 'Intent detection', 'Lead scoring', 'CRM/contact handoff fields', 'In-memory run history'],
    next: ['Add real LLM provider on the server', 'Store leads in a database', 'Add admin FAQ editor', 'Connect email notifications'],
  },
  {
    title: 'Automation Ops Platform',
    folder: `${repo}/github-projects/automation-ops-platform`,
    localUrl: 'http://localhost:5102',
    purpose: 'Workflow automation app for turning forms, emails, or WhatsApp messages into organized tasks and notifications.',
    features: ['Visual workflow runner', 'Backend /api/run route', 'Priority routing', 'Task and notification records', 'In-memory run history'],
    next: ['Add persistent workflow storage', 'Add status columns', 'Connect Sheets, email, or calendar', 'Add user roles'],
  },
  {
    title: 'Brand Identity AI Studio',
    folder: `${repo}/github-projects/brand-identity-ai-studio`,
    localUrl: 'http://localhost:5103',
    purpose: 'Brand identity studio with logo upload, local no-key SVG generation, optional OpenAI image generation, and exportable brand kits.',
    features: ['Upload or describe a logo', 'Backend /api/generate-brand route', 'No-key fallback SVG identity generator', 'Optional OpenAI image edit/generation', 'Export-ready brand kit'],
    next: ['Add project gallery', 'Add more brand board templates', 'Add downloadable PDF brand guide', 'Keep API keys only on the server'],
  },
  {
    title: 'Electrical Planning Platform',
    folder: `${repo}/github-projects/electrical-planning-platform`,
    localUrl: 'http://localhost:5104',
    purpose: 'Electrical planning assistant for concept diagrams, circuits, materials, and site-review preparation.',
    features: ['Project form', 'Backend /api/plan route', 'Circuit and material generation', 'Review checklist', 'Safety disclaimer'],
    next: ['Improve unifilar and multifilar exports', 'Add printable PDF plan', 'Add client project history', 'Review all outputs with a qualified electrician'],
  },
];

const clients = [
  {
    title: 'Sol Morena Car Collection',
    url: 'https://solmorenacarcollection.com',
    logo: 'sol-morena-logo-clean.png',
    image: 'sol-morena.jpg',
    role: 'Website design and development',
    summary: 'Private car collection website with a premium visual direction and clear showcase structure.',
  },
  {
    title: 'VALS BASL',
    url: 'https://www.valsbasl.com',
    logo: 'vals-logo-clean.png',
    image: 'vals-basl.jpg',
    role: 'Website design and development',
    summary: 'Premium US auto imports website for Tenerife, built around trust, inventory, and service clarity.',
  },
  {
    title: 'Barberia El Estimado',
    url: 'https://www.barberiaelestimado.com',
    logo: 'el-estimado-logo-clean.png',
    image: 'barberia-el-estimado.jpg',
    role: 'Website design and development',
    summary: 'Client website for a Tenerife barber shop with direct brand presence and booking-focused structure.',
  },
  {
    title: 'Easy Insurance and Tags',
    url: 'https://easy-insurance-tax.vercel.app',
    logo: 'easy-insurance-logo-clean.png',
    image: 'dashboard-panel.jpg',
    role: 'AI insurance assistant and website concept',
    summary: 'Insurance and tags concept with an AI assistant direction. Current status is coming soon / in progress.',
  },
];

const concepts = [
  ['Lara Collection Preview', 'https://solmorenacarcollection.com', 'lara-preview.jpg'],
  ['Restaurant Concept', 'https://restaurant-templates-rosy.vercel.app/', 'restaurant.jpg'],
  ['Sakana Restaurant', 'https://restaurant-templates-rosy.vercel.app/sushi.html', 'sakana.jpg'],
  ['OnFleek Nails', 'https://on-fleek-ten.vercel.app/', 'onfleek.jpg'],
  ['Unas Studio', 'https://nail-templates.vercel.app/', 'unas.jpg'],
  ['Burger Concept', 'https://restaurant-templates-rosy.vercel.app/burger.html', 'burger.jpg'],
  ['Oficios Concept', 'https://tenerife-oficios.vercel.app/', 'oficios.jpg'],
  ['Tenerife Tours Preview', '', 'tenerife-tours.jpg'],
  ['Megasur Electrical Preview', '', 'megasur.jpg'],
  ['Dashboard Concept', '#contact', 'dashboard-panel.jpg'],
];

const certificates = [
  ['What Is Generative AI', 'generative-ai.png'],
  ['AI for Business Professionals', 'ai-business-professionals.png'],
  ['AI for Beginners', 'ai-beginners.png'],
  ['AWS Machine Learning Basics', 'aws-machine-learning-basics.png'],
  ['AWS Generative AI - Art of the Possible', 'aws-generative-ai-art-of-possible.png'],
  ['Introduction to Cybersecurity', 'i2cs.png'],
  ['OSHA 10 Hour General Industry', 'osha-10-hour-general-industry.png'],
  ['OSHA 30 Hour General Industry', 'osha-30-hour-general-industry.png'],
  ['Confined Spaces Safety', 'confined-spaces-safety-2025.png'],
  ['Working at Heights Safety', 'working-at-heights-safety-2024.png'],
  ['National Electrical Code', 'national-electrical-code.png'],
  ['Electrician Apprentice', 'electrician-apprentice.png'],
  ['Solar Photovoltaic Maintenance', 'solar-photovoltaic-maintenance.png'],
  ['Electrical Studies', 'electrical-certificate.png'],
  ['Teenpreneur AI for Business', 'teenpreneur-ai-business-2025.png'],
];

writeNote('00 Dashboard.md', `---
tags:
  - santiago
  - portfolio
  - codex
  - active
updated: ${today}
---

# Santiago Portfolio System

![[Attachments/profile/santiago-bw.png]]

This is the organized Obsidian hub for the portfolio website, client websites, GitHub-ready app projects, services, certificates, and next actions.

## Quick Links

- Local preview: ${localPreview}
- Main repo: ${repo}
- Website note: [[Projects/Portfolio Website - SantiPulse]]
- Design language: [[Planning/Design Language - Premium Portfolio System]]
- GitHub repo plan: [[GitHub/GitHub Repo Plan]]
- Plugin and launch status: [[Planning/Plugin and Launch Status]]
- Verification log: [[Planning/Verification Log]]
- Next actions: [[Planning/Next Actions]]
- Client-ready service examples: [[Planning/Client-Ready Service Examples]]

## Core App Projects

${projects.map((project) => `- [[Projects/${project.title}]]`).join('\n')}

## Client Work

${clients.map((client) => `- [[Client Work/${client.title}]]`).join('\n')}

## Website Concepts

${concepts.map(([title]) => `- [[Website Concepts/${title}]]`).join('\n')}

## Certificates

- [[Certificates/Certificate Index]]

## How To Use This Vault

1. Use this dashboard as the main command center.
2. Every portfolio project has its own note with purpose, folder path, current status, and next steps.
3. When a project is ready for GitHub, open [[GitHub/GitHub Repo Plan]] and follow the checklist.
4. Add screenshots, testimonials, links, and client feedback directly into the matching project note.
`);

writeNote('Projects/Portfolio Website - SantiPulse.md', `---
tags:
  - portfolio
  - website
  - active
updated: ${today}
---

# Portfolio Website - SantiPulse

## Purpose

Turn the old SantiPulse service website into a professional portfolio where Santiago can show real client work, present services, and get hired for websites, AI tools, automation, brand identity, and electrical work.

## Current Local Preview

- ${localPreview}

## Important Local Files

- Main page: ${repo}/src/pages/home.html
- Service demo backend: ${repo}/backend/service-demo.js
- Vercel route: ${repo}/api/[...route].js
- GitHub-ready projects: ${repo}/github-projects
- Assets: ${repo}/clone-assets

## Main Sections

- Hero with Santiago profile, LinkedIn, CV, and positioning.
- About Me with certificates, studies, LinkedIn, and electrical background.
- Work Highlights with real client websites.
- Services with product-style demos.
- Tools and contact form.

## Current Services

- Web Design - visible on the public portfolio.
- AI Business Assistant System - implemented, temporarily hidden pending Santiago's next direction.
- Business Workflow Automation - implemented, temporarily hidden pending Santiago's next direction.
- Electrical Planning & Material Estimator - implemented, temporarily hidden pending Santiago's next direction.
- Brand Identity System - implemented, temporarily hidden pending Santiago's next direction.

## Notes

- The admin/login panel is hidden for now.
- GitHub link is intentionally disabled until the final GitHub profile/repo link is ready.
- Brand Identity works without an OpenAI API key through the local generative SVG engine.
`);

for (const project of projects) {
  writeNote(`Projects/${project.title}.md`, `---
tags:
  - project
  - github-ready
  - portfolio
updated: ${today}
---

# ${project.title}

## Purpose

${project.purpose}

## Local Folder

${project.folder}

## Local URL

${project.localUrl}

## Run

\`\`\`bash
cd "${project.folder}"
npm install
npm start
\`\`\`

## Features

${project.features.map((item) => `- ${item}`).join('\n')}

## Next Build Steps

${project.next.map((item) => `- [ ] ${item}`).join('\n')}

## GitHub Status

- [ ] Create public repo
- [ ] Add README screenshots
- [ ] Add live demo link
- [ ] Add environment notes
- [ ] Push first clean version

## Related

- [[GitHub/GitHub Repo Plan]]
- [[Projects/Portfolio Website - SantiPulse]]
`);
}

for (const client of clients) {
  writeNote(`Client Work/${client.title}.md`, `---
tags:
  - client-work
  - website
updated: ${today}
---

# ${client.title}

![[Attachments/logos/${client.logo}]]

![[Attachments/work/${client.image}]]

## Website

${client.url}

## Role

${client.role}

## Summary

${client.summary}

## Portfolio Use

- Add as real client work.
- Use screenshots or short hero video on the portfolio.
- Link preview cards directly to the website.

## Follow Up

- [ ] Add client testimonial when available.
- [ ] Add before/after or build notes.
- [ ] Add mobile screenshot.
`);
}

for (const [title, url, image] of concepts) {
  writeNote(`Website Concepts/${title}.md`, `---
tags:
  - website-concept
  - portfolio
updated: ${today}
---

# ${title}

![[Attachments/websites/${image}]]

## Link

${url || 'No public link added yet.'}

## Status

Preview / concept. Keep as portfolio website design examples unless Santiago decides to remove or replace it.

## Next Steps

- [ ] Confirm the final public link.
- [ ] Add a short explanation of what this design proves.
- [ ] Decide if this should become its own GitHub repo.
`);
}

writeNote('Certificates/Certificate Index.md', `---
tags:
  - certificates
  - education
  - portfolio
updated: ${today}
---

# Certificate Index

These are the certificate assets currently connected to the portfolio.

${certificates.map(([title, image]) => `## ${title}\n\n![[Attachments/certificates/${image}]]\n`).join('\n')}

## Next Steps

- [ ] Add certificate issuer and date to each certificate.
- [ ] Decide which certificates should appear first on the public website.
- [ ] Add missing LinkedIn certificates if more are exported later.
`);

writeNote('Planning/Design Language - Premium Portfolio System.md', `---
tags:
  - design-system
  - portfolio
  - premium-ui
  - codex-rules
updated: ${today}
---

# Design Language - Premium Portfolio System

This is the reusable design standard for Santiago's portfolio and future GitHub projects. Use it before coding any new page, demo, dashboard, or repo.

## Positioning

Santiago Alexander is a programmer and electrician based in Tenerife. The website should feel like a serious portfolio for getting hired, not like a generic agency template. The work should communicate:

- I build websites and AI solutions for businesses.
- I can create real tools with frontend and backend.
- I also understand professional electrical installations and planning.
- I can connect design, code, automation, and practical business work.

## Research Takeaways

- Awwwards portfolio galleries emphasize strong interaction, typography, motion, photo/video, responsive design, and memorable project pages: https://www.awwwards.com/websites/portfolio/
- Creative Bloq's portfolio examples show that good portfolios need personality, role clarity, curated work, and enough process to prove the creator's contribution: https://www.creativebloq.com/portfolios/examples-712368
- Dashboard Design Patterns research recommends making dashboard surfaces structured around clear patterns, tradeoffs, and the actual decisions users need to make: https://arxiv.org/abs/2205.00757
- Conversational AI dashboard research highlights transparency and user control. AI demos should show why something happened, not just output a message: https://arxiv.org/abs/2406.07882
- Recent/Godly-style inspiration is useful for visual freshness, but only as reference. Do not copy layouts directly: https://godly.website/

## Non-Negotiable Rules

- No generic Tailwind-style card grids.
- No fake AI gradients, glow blobs, or decorative noise that does not help the content.
- No section should look like it was made in one minute.
- Every service demo needs a real product surface, real states, and backend-style behavior.
- Every major page should survive a screenshot critique against premium products like Linear, Stripe, Vercel, Apple, and Arc.
- Every project should have one memorable interaction that belongs to that product.
- The portfolio should prove Santiago's work through links, screenshots, certificates, process, and contact paths.

## Visual Tokens

### Color

- Canvas: #070707
- Surface: #101114
- Elevated surface: #181B21
- Border: rgba(255,255,255,0.10)
- Primary action blue: #124BA7
- Bright blue hover: #1E63D6
- Text: #F5F5F2
- Muted text: #A7A7A7
- Technical linework: #DDE7FF

Use blue as the single action color. Anything currently green should become deep blue unless it represents success state data.

### Typography

- Display: large, editorial, high confidence.
- Section titles: big but controlled, not hero-size inside compact panels.
- UI labels: small, uppercase only when it improves scanning.
- Body copy: short, plain, human.
- Letter spacing: 0 by default.

### Spacing

- Base spacing: 8px.
- Compact component gaps: 8px or 12px.
- Panel gaps: 16px or 24px.
- Section rhythm: 64px, 96px, or 128px depending on screen.
- Avoid cramped side rails. If text becomes narrow, move it or rewrite it.

### Radius and Shadows

- Cards and panels: 8px maximum radius.
- Buttons: 999px is allowed only for pills and circular icon buttons.
- Use border, contrast, and spacing before heavy shadows.
- Shadows should be rare on dark UI.

### Motion

- Use motion to reveal meaning: hover previews, certificate previews, service rows expanding, product dashboards updating.
- Timing: 160ms for controls, 280ms for panels, 500ms for hero or gallery transitions.
- Motion should feel precise and calm.

## Page System

### Hero

- First viewport must say who Santiago is and what he does.
- Keep the black-and-white portrait as the emotional anchor.
- The left rail must be useful: short intro, contact, CV, LinkedIn, GitHub placeholder.
- The main headline should be bold but not broken awkwardly on desktop or mobile.

### Work

- Show real client work before concepts.
- Every website card must have a consistent aspect ratio.
- Every live website preview should open the real client URL.
- Concepts are allowed, but label them as concepts and avoid mixing them with real clients without context.

### Certificates

- Certificates should preview horizontally where possible.
- Hover should show a clear PNG preview, like the reference website behavior.
- Include issuer/date when available.

### Services

Each service row must expand into a different product-style interface:

- Web Design: website gallery, case study, live links, responsive preview.
- AI Business Assistant System: bilingual narrative, intake conversation preview, captured lead summary with handoff and safe fallback.
- Business Workflow Automation: five-stage operations pipeline (Intake, Classify, Route, Notify, Follow-up) with explicit request states.
- Electrical Planning & Material Estimator: room schedule, entered-quantity material estimate, version history, print summary, unifilar/multifilar concept.
- Brand Identity System: lockups, named palette with hex values, typography roles, application tiles, and one usage rule.

## Repo Design Standards

Every standalone repo should include:

- A real frontend screen, not only a form.
- A backend route that returns useful structured data.
- A README with purpose, screenshots, run commands, API notes, and next steps.
- A sample data path that works without paid APIs.
- Optional API provider integration hidden behind environment variables.
- A visual identity different from the other projects.

## Designer Critique Checklist

Before saying a project is ready, score it from 1 to 10 as if reviewing at a premium software company.

- Does the first screen instantly explain the product?
- Does the interface have a clear hierarchy?
- Are colors restrained and intentional?
- Is spacing consistent?
- Are buttons, controls, and forms actually usable?
- Does it look different from the other demos?
- Would someone believe this is a real app?
- Are empty states, loading states, and errors handled?
- Is the mobile layout still professional?
- Did the decision get saved to Obsidian?
`);

writeNote('Planning/Plugin and Launch Status.md', `---
tags:
  - plugins
  - github
  - vercel
  - figma
  - canva
updated: ${today}
---

# Plugin and Launch Status

## GitHub

- Connected repo confirmed: \`LOLsasaking/SANTIPULSE\`
- Access level confirmed by connector: admin, maintain, push, pull, triage.
- Current repo is public.
- GitHub connector can inspect and edit existing repositories.
- Current connector session does not expose a create-new-repository tool.
- Local \`gh\` CLI is not installed on this Mac at the moment.

## Vercel

- Vercel plugin is available for teams, projects, deployments, and deploy actions.
- Do not deploy production without a final local QA pass and Santiago's explicit approval.
- Preview deployment is the best next step before production.

## Figma

- Figma plugin is available.
- A premium design-system deck brief is ready.
- Figma deck generation currently needs Santiago to choose the team or organization plan in the widget before generation can continue.

## Canva

- Canva plugin is available.
- Canva brand-template/autofill workflow is blocked by the account plan because autofill-capable templates require Canva Pro/Teams/Enterprise.
- Use Canva manually for now, or upgrade/reconnect if design generation from brand templates is needed.

## Public Launch Rule

Before publishing anything live:

- [ ] Confirm exact repo name.
- [ ] Confirm whether the repo should be public or private.
- [ ] Confirm whether this is a preview deploy or production deploy.
- [ ] Run local build/checks.
- [ ] Check the live URL in the browser.
- [ ] Save final links in Obsidian and the portfolio.
`);

writeNote('Planning/Verification Log.md', `---
tags:
  - verification
  - qa
  - launch
updated: ${today}
---

# Verification Log

## Current Verified Checks

- Main portfolio build command: \`npm run build\`
- Obsidian sync syntax: \`node --check scripts/sync-obsidian.mjs\`
- GitHub projects smoke test: \`node scripts/smoke-github-projects.mjs\`

## Latest Design Upgrade

- The four service examples are now client-ready project modules with shared bilingual narratives (problem, audience, capabilities, workflow, deliverables) and distinct functional previews:
  - AI Business Assistant System: conversation preview plus a captured lead summary with handoff and safe fallback (no invented scores).
  - Business Workflow Automation: five-stage pipeline with explicit Queued, Assigned, and Scheduled states.
  - Electrical Planning & Material Estimator: editable room schedule, preliminary material table, approval checklist, version history, print/PDF summary, concept diagrams.
  - Brand Identity System: lockups, palette with hex values, typography roles, application tiles, and a usage rule.
- The electrical module shows the licensed-professional disclaimer before every export and contact action.

## Last Known Result

- \`npm run verify:services\` passed against source and built output.
- \`npm run build\` passed.
- Inline scripts parse cleanly; DOM QA at 1440px and 375px showed no service-section overflow and no console errors.

## Notes

- Local server smoke tests may require permission because the managed sandbox blocks binding localhost ports from ordinary commands.
- The standalone servers bind to \`127.0.0.1\` for safer local defaults.
- Browser screenshot QA still needs a working browser-control session before production launch.

## Required Before Production

- [ ] Run \`npm run build\`.
- [ ] Run \`node scripts/smoke-github-projects.mjs\`.
- [ ] Open the portfolio in browser on desktop and mobile sizes.
- [ ] Check service rows, certificate previews, work links, contact form, language toggle, and mobile layout.
- [ ] Deploy preview first.
- [ ] Promote production only after Santiago approves the preview.
`);

writeNote('GitHub/GitHub Repo Plan.md', `---
tags:
  - github
  - repo-plan
  - portfolio
updated: ${today}
---

# GitHub Repo Plan

## Goal

Turn each major project into its own clean GitHub repository so people can see that Santiago builds real apps, not just static mockups.

## Main Repos To Create

${projects.map((project) => `- [ ] ${project.title} - source folder: ${project.folder}`).join('\n')}

## Suggested Repo Checklist

- [ ] Create a clean repo name.
- [ ] Copy the standalone folder into the repo.
- [ ] Run \`npm install\`.
- [ ] Run \`npm start\`.
- [ ] Add screenshots to README.
- [ ] Add a clear feature list.
- [ ] Add environment variable notes.
- [ ] Push to GitHub.
- [ ] Add GitHub link back to the portfolio.

## Repo Naming Ideas

- \`santiago-ai-assistant-platform\`
- \`santiago-automation-ops-platform\`
- \`santiago-brand-identity-ai-studio\`
- \`santiago-electrical-planning-platform\`
`);

writeNote('Planning/Next Actions.md', `---
tags:
  - planning
  - todo
  - portfolio
updated: ${today}
---

# Next Actions

## Website Polish

- [ ] Add final GitHub profile link.
- [ ] Add final CV file if different from LinkedIn profile PDF.
- [ ] Add real testimonials from Sol Morena, VALS, and Barberia El Estimado.
- [ ] Add stronger screenshots or videos for every website preview.
- [ ] Decide which website concepts stay public.

## Project Repos

${projects.map((project) => `- [ ] Prepare GitHub repo for [[Projects/${project.title}]]`).join('\n')}

## Services

- [ ] AI Business Assistant System: add real screenshots when a client assistant is finished.
- [ ] Business Workflow Automation: add real examples when a business workflow is finished.
- [ ] Electrical Planning & Material Estimator: collect feedback from a licensed electrician on the printed summary.
- [ ] Brand Identity System: add real logo redesign case studies.

## Content To Collect

- [ ] Client logos in high quality.
- [ ] Client testimonials.
- [ ] LinkedIn certificate exports.
- [ ] Screenshots of each client website on desktop and mobile.
- [ ] A short personal bio in Spanish and English.
`);

const serviceLabDocs = [
  ['docs/superpowers/specs/2026-07-09-santipulse-service-lab-redesign.md', 'Planning/Source Documents/Spec - Client-Ready Service Examples.md'],
  ['docs/superpowers/plans/2026-07-09-santipulse-service-lab-redesign.md', 'Planning/Source Documents/Plan - Client-Ready Service Examples.md'],
];
for (const [docSource, docTarget] of serviceLabDocs) {
  const absolute = path.join(repoRoot, docSource);
  if (fs.existsSync(absolute)) writeNote(docTarget, fs.readFileSync(absolute, 'utf8'));
}

writeNote('Planning/Client-Ready Service Examples.md', `---
tags:
  - planning
  - services
  - portfolio
updated: ${today}
---

# Client-Ready Service Examples

The four portfolio service examples were rebuilt as practical, bilingual, client-ready project modules inside the existing accordion.

## Current Public Visibility

Only Web Design is currently visible in the public Services accordion. Projects 2-5 remain fully implemented in the source and are hidden with explicit data-portfolio-hidden="pending-direction" markers until Santiago decides their next presentation.

## Source Documents

- Specification: [[Planning/Source Documents/Spec - Client-Ready Service Examples]]
- Implementation plan: [[Planning/Source Documents/Plan - Client-Ready Service Examples]]

## The Four Projects

- **AI Business Assistant System** - business assistants that answer questions, qualify leads, collect quote requests, and organize customer information. Deliverables: branded website assistant, business knowledge setup, intake fields, fallback and handoff rules, lead-summary format.
- **Business Workflow Automation** - automation that connects forms, emails, spreadsheets, CRMs, calendars, and notifications. Deliverables: workflow map, trigger and routing rules, required data fields, status and notification model, integration and exception plan.
- **Electrical Planning & Material Estimator** - a planning aid for rooms, electrical points, circuit concepts, and preliminary material quantities. Deliverables: room schedule, point and quantity summary, preliminary material estimate, project notes, diagram concept and client checklist. Always shows the licensed-professional disclaimer before export and contact actions.
- **Brand Identity System** - complete brand kits with logo direction, colors, typography, social assets, and usage guidance. Deliverables: logo directions, color and typography specifications, usage examples, web direction and icon files, organized brand-kit package.

## Run Locally

\`\`\`bash
cd "${repo}"
npm run preview   # builds and serves at ${localPreview}
npm run verify:services
\`\`\`

## Verification Status

- \`npm run verify:services\` passes against source and built output.
- \`npm run build\` passes; inline scripts parse cleanly.
- DOM QA at 1440px and 375px: all four previews render, add/remove room, version history, print, copy, contact handoff, and EN/ES switching work with user values preserved; no service-section overflow; no console errors.
- Public visibility QA confirms only Web Design is exposed; projects 2-5 remain hidden without removing their code.
- Santiago approved deploying this visibility state to \`santipulse.com\` on ${today}.

`);

writeNote('../Santiago Portfolio System.md', `# Santiago Portfolio System

Open the main dashboard here:

[[Santiago Portfolio System/00 Dashboard]]
`);

console.log(JSON.stringify({
  ok: true,
  vaultRoot,
  systemRoot,
  notes: {
    projects: projects.length,
    clients: clients.length,
    concepts: concepts.length,
    certificates: certificates.length,
  },
}, null, 2));
