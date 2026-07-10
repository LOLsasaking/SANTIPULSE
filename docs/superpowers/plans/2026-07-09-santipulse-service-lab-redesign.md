# SantiPulse Client-Ready Project Examples Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the four existing SantiPulse service examples into practical, bilingual, client-ready project modules without rebuilding or changing the rest of the portfolio.

**Architecture:** Keep the current static single-page architecture and Bootstrap accordion. Add a shared data-driven narrative renderer inside `src/pages/home.html`, retain the current local-only tool builders, and replace each generic preview with a distinct functional interface. Add a Cheerio verification script so required public copy, accessibility hooks, and project boundaries are checked before browser QA.

**Tech Stack:** Static HTML, CSS, browser JavaScript, Bootstrap collapse already bundled in the clone, Node.js build scripts, Cheerio, existing localhost preview server.

## Global Constraints

- Modify only the AI, automation, electrical-planning, and brand-identity examples plus their shared service-section support code.
- Preserve the existing navigation, branding, work highlights, web-design gallery, contact section, language toggle, and deployment configuration.
- Preserve English and Spanish public copy; other language variants continue using the existing fallback behavior.
- Use no new dependencies, routes, authentication, databases, live integrations, or external AI API.
- Keep all claims practical and verifiable; do not show fake analytics, invented success figures, developer notes, or vague futuristic language.
- Display the electrical professional-review disclaimer before export and contact actions.
- Work locally. Do not push to GitHub or deploy to Vercel until Santiago approves the localhost result.
- Use Product Design, Figma, and Canva only as reference/critique resources. Use Browser/Chrome and Vercel browser verification for QA.

## File Map

- Modify `src/pages/home.html`: project headers, narratives, forms, previews, bilingual data, shared CTA behavior, electrical estimator, and scoped CSS.
- Create `scripts/verify-service-examples.mjs`: deterministic source/build checks for the four project modules.
- Modify `package.json`: expose the verification script as `npm run verify:services`.
- Modify `docs/superpowers/plans/2026-07-09-santipulse-service-lab-redesign.md`: mark completed steps during execution.

---

### Task 1: Baseline Audit and Structural Verification

**Files:**
- Create: `scripts/verify-service-examples.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `src/pages/home.html` and, when present, `dist/index.html`.
- Produces: `npm run verify:services`, exiting `0` only when all required project structures and copy are present.

- [x] **Step 1: Capture a plugin-assisted baseline**

Run the current localhost site and inspect `#service` with the Product Design audit skill. Search Canva for `workflow process board`, `brand guidelines board`, and `electrical estimate worksheet`; inspect Figma references only if accessible. Record these implementation decisions in the task update:

```text
AI: conversation + captured lead handoff, no score percentage
Automation: event pipeline + explicit status/handoff
Electrical: room schedule + entered quantities + assumptions + secondary diagram
Brand: lockups + named palette + typography + concrete applications
Shared: restrained blue accent, square/low-radius controls, no glow or gradient
```

- [x] **Step 2: Add the failing structural verifier**

Create `scripts/verify-service-examples.mjs` with this complete implementation:

```js
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { load } from 'cheerio';

const root = resolve(process.cwd());
const sourcePath = resolve(root, 'src/pages/home.html');
const source = readFileSync(sourcePath, 'utf8');
const $ = load(source);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const projects = [
  { id: 'service-2', key: 'ai', title: 'AI Business Assistant System', minFeatures: 10, preview: '[data-ai-lead-summary]' },
  { id: 'service-3', key: 'automation', title: 'Business Workflow Automation', minFeatures: 10, preview: '[data-automation-pipeline]' },
  { id: 'service-4', key: 'electrical', title: 'Electrical Planning & Material Estimator', minFeatures: 10, preview: '[data-electrical-materials]' },
  { id: 'service-5', key: 'brand', title: 'Brand Identity System', minFeatures: 12, preview: '[data-brand-board]' },
];

for (const project of projects) {
  const section = $('#' + project.id);
  check(section.length === 1, `missing #${project.id}`);
  check(section.attr('data-project') === project.key, `${project.id} missing data-project=${project.key}`);
  check(section.find('[data-project-problem]').length === 1, `${project.key} missing problem`);
  check(section.find('[data-project-audience]').length === 1, `${project.key} missing audience`);
  check(section.find('[data-project-features] li').length >= project.minFeatures, `${project.key} feature list incomplete`);
  check(section.find('[data-project-workflow]').length === 1, `${project.key} missing workflow`);
  check(section.find('[data-project-deliverables]').length === 1, `${project.key} missing deliverables`);
  check(section.find('[data-project-example-button]').length === 1, `${project.key} missing example CTA`);
  check(section.find('[data-project-contact]').length === 1, `${project.key} missing contact CTA`);
  check(section.find(project.preview).length === 1, `${project.key} missing distinct preview`);
  check(source.includes(project.title), `missing English title: ${project.title}`);
}

const requiredSpanish = [
  'Sistema de Asistente de IA para Negocios',
  'Automatizacion de Flujos de Negocio',
  'Planificador Electrico y Estimador de Materiales',
  'Sistema de Identidad de Marca',
];
for (const text of requiredSpanish) check(source.includes(text), `missing Spanish copy: ${text}`);

const disclaimer = 'Planning and estimating support only. Final electrical work, permits, code compliance, and installation must be verified by a licensed professional.';
check(source.includes(disclaimer), 'missing exact electrical disclaimer');
check($('#contactform').length === 1, 'existing contact form was removed');
check($('#service-1').length === 1, 'existing web-design service was removed');

const publicServiceText = $('#service').text().toLowerCase();
for (const term of ['next-generation ai innovation', 'add later', 'production upgrades']) {
  check(!publicServiceText.includes(term), `public service copy contains prohibited phrase: ${term}`);
}

if (existsSync(resolve(root, 'dist/index.html'))) {
  const built = readFileSync(resolve(root, 'dist/index.html'), 'utf8');
  for (const project of projects) check(built.includes(project.title), `built page missing ${project.title}`);
}

if (failures.length) {
  console.error(failures.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}
console.log('Service examples verified.');
```

- [x] **Step 3: Add the package command**

Add this script to `package.json`:

```json
"verify:services": "node scripts/verify-service-examples.mjs"
```

- [x] **Step 4: Run the verifier and confirm the expected failure**

Run: `npm run verify:services`

Expected: exit `1` with missing `data-project`, narrative, CTA, and distinct-preview messages.

- [x] **Step 5: Commit the verification harness**

```bash
git add package.json scripts/verify-service-examples.mjs
git commit -m "test: define service example requirements"
```

---

### Task 2: Shared Project Narrative and Accordion Presentation

**Files:**
- Modify: `src/pages/home.html:171-565`
- Modify: `src/pages/home.html:646-778`
- Modify: `src/pages/home.html:813-1101`

**Interfaces:**
- Consumes: existing `#accordion-service`, `.service-accordion_item`, language state at `document.documentElement.dataset.langCurrent`, and `#contactform`.
- Produces: `PROJECT_CATALOG`, `renderProjectNarrative(section)`, `[data-project-example-button]`, and `[data-project-contact]` hooks consumed by later tasks.

- [x] **Step 1: Add the shared static project structure**

For `#service-2` through `#service-5`, add `data-project="ai|automation|electrical|brand"`. Replace each two-card generic overview with this semantic skeleton while retaining its existing tool below it:

```html
<div class="project-narrative" data-project-narrative>
  <div class="project-intro">
    <p class="project-value" data-project-value></p>
    <div class="project-actions">
      <button type="button" class="project-primary" data-project-example-button></button>
      <button type="button" class="project-secondary" data-project-contact></button>
    </div>
  </div>
  <div class="project-facts">
    <section data-project-problem><span data-project-label="problem"></span><p></p></section>
    <section data-project-audience><span data-project-label="audience"></span><p></p></section>
  </div>
  <section class="project-block"><h5 data-project-label="features"></h5><ul class="project-feature-grid" data-project-features></ul></section>
  <section class="project-block"><h5 data-project-label="workflow"></h5><ol class="project-workflow" data-project-workflow></ol></section>
  <section class="project-block"><h5 data-project-label="deliverables"></h5><ul class="project-deliverables" data-project-deliverables></ul></section>
</div>
```

Set the four accordion headings to the approved English titles and add a wrapping subtitle below each heading. Keep the existing Bootstrap collapse attributes and expand/collapse icon.

- [x] **Step 2: Add the complete bilingual catalog**

Replace the old `service-detail-script` copy with a `PROJECT_CATALOG` object using these exact values:

```js
const PROJECT_CATALOG = {
  en: {
    labels: { problem: 'Problem solved', audience: 'Best for', features: 'Included capabilities', workflow: 'Example workflow', deliverables: 'Client deliverables', contact: 'Discuss this project' },
    ai: {
      title: 'AI Business Assistant System',
      value: 'Custom business assistants that answer questions, qualify leads, collect quote requests, and organize customer information.',
      problem: 'Avoid missed questions and incomplete quote requests when staff cannot respond immediately.',
      audience: 'Insurance agencies, transportation businesses, local services, real estate agents, and small businesses.',
      features: ['Website AI assistant', 'Lead qualification', 'Quote request detection', 'Customer intake', 'FAQ answers', 'Business-specific knowledge base', 'Email or CRM handoff', 'Conversation summaries', 'Admin-editable responses', 'Safe fallback responses'],
      workflow: ['Visitor asks for a quote', 'Assistant asks service-specific questions', 'Contact details are collected', 'Business receives a structured lead'],
      deliverables: ['Branded website assistant', 'Business knowledge setup', 'Intake fields and suggested questions', 'Fallback and handoff rules', 'Lead-summary format'],
      cta: 'View AI Assistant Example'
    },
    automation: {
      title: 'Business Workflow Automation',
      value: 'Automation systems that connect forms, emails, spreadsheets, CRMs, calendars, and notifications so repetitive work stays organized.',
      problem: 'Prevent requests from being lost across inboxes, messages, spreadsheets, and manual follow-up lists.',
      audience: 'Small businesses, agencies, service companies, consultants, and local operations.',
      features: ['Lead intake automation', 'Automatic follow-ups', 'Email parsing', 'CRM updates', 'Google Sheets or Airtable dashboards', 'Appointment reminders', 'Task creation', 'Status tracking', 'Customer notifications', 'Daily business summaries'],
      workflow: ['Quote form is submitted', 'Lead is classified', 'CRM is updated', 'Owner is notified', 'Follow-up is scheduled', 'Status is tracked'],
      deliverables: ['Workflow map', 'Trigger and routing rules', 'Required data fields', 'Status and notification model', 'Integration and exception plan'],
      cta: 'View Automation Example'
    },
    electrical: {
      title: 'Electrical Planning & Material Estimator',
      value: 'A planning and estimating aid for organizing rooms, electrical points, project notes, circuit concepts, and preliminary material quantities.',
      problem: 'Prepare a clearer project brief and reduce missing information before a site visit, estimate, or qualified review.',
      audience: 'Electricians, contractors, homeowners, apprentices, and small renovation teams.',
      features: ['Room-by-room planning', 'Outlet, switch, and lighting notes', 'Circuit and load planning assistant', 'Material list generator', 'Basic diagram preview', 'Contractor notes', 'PDF project summary', 'Client approval checklist', 'Version history', 'Material quantity estimates'],
      workflow: ['Enter project rooms', 'Add outlets, lights, switches, and panel notes', 'Review preliminary quantities', 'Generate the material list and project summary'],
      deliverables: ['Room schedule', 'Point and quantity summary', 'Preliminary material estimate', 'Project and contractor notes', 'Diagram concept and client checklist'],
      cta: 'View Electrical Tool Example'
    },
    brand: {
      title: 'Brand Identity System',
      value: 'Complete brand kits with logo systems, colors, typography, social assets, website direction, and practical usage guidance.',
      problem: 'Give new or inconsistent businesses one usable visual direction across web, social media, and print.',
      audience: 'New businesses, rebrands, portfolio sites, insurance, transportation, real estate, contractors, and creators.',
      features: ['Logo system', 'Color palette', 'Typography', 'Brand usage rules', 'Social media templates', 'Website hero direction', 'Business card mockups', 'Flyer mockups', 'Favicon and app icon', 'Brand voice notes', 'Canva or Figma-ready assets', 'Downloadable brand kit'],
      workflow: ['Share the business name, industry, and style', 'Establish the brand direction', 'Build the logo system, colors, and type', 'Prepare assets for web, social, and print'],
      deliverables: ['Primary and alternate logo directions', 'Color and typography specifications', 'Usage examples and social templates', 'Web direction and icon files', 'Organized brand-kit package'],
      cta: 'View Brand Kit Example'
    }
  },
  es: {
    labels: { problem: 'Problema que resuelve', audience: 'Ideal para', features: 'Capacidades incluidas', workflow: 'Flujo de ejemplo', deliverables: 'Entregables para el cliente', contact: 'Hablar sobre este proyecto' },
    ai: {
      title: 'Sistema de Asistente de IA para Negocios',
      value: 'Asistentes personalizados que responden preguntas, califican leads, recogen solicitudes de presupuesto y organizan informacion del cliente.',
      problem: 'Evita perder preguntas y solicitudes incompletas cuando el equipo no puede responder al momento.',
      audience: 'Agencias de seguros, transporte, servicios locales, inmobiliarias y pequenos negocios.',
      features: ['Asistente IA para la web', 'Calificacion de leads', 'Deteccion de presupuestos', 'Toma de datos', 'Respuestas FAQ', 'Base de conocimiento del negocio', 'Entrega por email o CRM', 'Resumen de conversaciones', 'Respuestas editables', 'Respuestas seguras de reserva'],
      workflow: ['El visitante pide presupuesto', 'El asistente hace preguntas del servicio', 'Recoge los datos de contacto', 'El negocio recibe un lead estructurado'],
      deliverables: ['Asistente web con marca', 'Configuracion del conocimiento', 'Campos y preguntas sugeridas', 'Reglas de respuesta y entrega', 'Formato de resumen del lead'],
      cta: 'Ver ejemplo del asistente IA'
    },
    automation: {
      title: 'Automatizacion de Flujos de Negocio',
      value: 'Sistemas que conectan formularios, emails, hojas de calculo, CRM, calendarios y avisos para ordenar el trabajo repetitivo.',
      problem: 'Evita que las solicitudes se pierdan entre bandejas de entrada, mensajes, hojas y seguimientos manuales.',
      audience: 'Pequenos negocios, agencias, empresas de servicios, consultores y operaciones locales.',
      features: ['Automatizacion de leads', 'Seguimientos automaticos', 'Lectura de emails', 'Actualizaciones de CRM', 'Dashboards en Sheets o Airtable', 'Recordatorios de citas', 'Creacion de tareas', 'Seguimiento de estados', 'Avisos al cliente', 'Resumen diario del negocio'],
      workflow: ['Se envia el formulario', 'Se clasifica el lead', 'Se actualiza el CRM', 'Se avisa al responsable', 'Se programa el seguimiento', 'Se controla el estado'],
      deliverables: ['Mapa del flujo', 'Reglas de entrada y enrutado', 'Campos necesarios', 'Modelo de estados y avisos', 'Plan de integraciones y excepciones'],
      cta: 'Ver ejemplo de automatizacion'
    },
    electrical: {
      title: 'Planificador Electrico y Estimador de Materiales',
      value: 'Herramienta de apoyo para organizar estancias, puntos electricos, notas, conceptos de circuitos y cantidades preliminares.',
      problem: 'Prepara un brief mas claro y reduce informacion olvidada antes de una visita, presupuesto o revision cualificada.',
      audience: 'Electricistas, contratistas, propietarios, aprendices y pequenos equipos de reforma.',
      features: ['Planificacion por estancia', 'Notas de tomas, interruptores y luces', 'Asistente de circuitos y cargas', 'Generador de materiales', 'Vista basica del esquema', 'Notas del contratista', 'Resumen PDF del proyecto', 'Checklist de aprobacion', 'Historial de versiones', 'Estimacion de cantidades'],
      workflow: ['Introduce las estancias', 'Anade tomas, luces, interruptores y notas del cuadro', 'Revisa cantidades preliminares', 'Genera materiales y resumen del proyecto'],
      deliverables: ['Cuadro de estancias', 'Resumen de puntos y cantidades', 'Estimacion preliminar de materiales', 'Notas de proyecto y contratista', 'Concepto de esquema y checklist'],
      cta: 'Ver ejemplo de herramienta electrica'
    },
    brand: {
      title: 'Sistema de Identidad de Marca',
      value: 'Kits completos con sistema de logos, colores, tipografia, recursos sociales, direccion web y reglas practicas de uso.',
      problem: 'Da a negocios nuevos o inconsistentes una direccion visual util para web, redes e impresion.',
      audience: 'Negocios nuevos, rebrandings, portfolios, seguros, transporte, inmobiliarias, contratistas y creadores.',
      features: ['Sistema de logos', 'Paleta de color', 'Tipografia', 'Reglas de uso', 'Plantillas para redes', 'Direccion del hero web', 'Mockups de tarjetas', 'Mockups de flyers', 'Favicon e icono de app', 'Notas de voz de marca', 'Assets para Canva o Figma', 'Brand kit descargable'],
      workflow: ['Comparte nombre, sector y estilo', 'Se define la direccion de marca', 'Se construyen logos, colores y tipografia', 'Se preparan assets para web, redes e impresion'],
      deliverables: ['Direcciones de logo principal y alternativo', 'Especificaciones de color y tipografia', 'Ejemplos de uso y plantillas sociales', 'Direccion web e iconos', 'Paquete organizado de marca'],
      cta: 'Ver ejemplo de brand kit'
    }
  }
};
```

- [x] **Step 3: Render the catalog safely and wire CTAs**

Add these functions inside the same IIFE:

```js
const projectLang = () => document.documentElement.dataset.langCurrent === 'es' ? 'es' : 'en';
const projectEscape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function renderProjectNarrative(section) {
  const language = projectLang();
  const key = section.dataset.project;
  const catalog = PROJECT_CATALOG[language];
  const project = catalog[key];
  if (!project) return;
  const heading = document.querySelector(`[data-project-heading="${key}"]`);
  const subtitle = document.querySelector(`[data-project-subtitle="${key}"]`);
  if (heading) heading.textContent = project.title;
  if (subtitle) subtitle.textContent = project.value;
  section.querySelector('[data-project-value]').textContent = project.value;
  section.querySelector('[data-project-problem] p').textContent = project.problem;
  section.querySelector('[data-project-audience] p').textContent = project.audience;
  section.querySelector('[data-project-features]').innerHTML = project.features.map((item) => `<li>${projectEscape(item)}</li>`).join('');
  section.querySelector('[data-project-workflow]').innerHTML = project.workflow.map((item, index) => `<li><span>${String(index + 1).padStart(2, '0')}</span><p>${projectEscape(item)}</p></li>`).join('');
  section.querySelector('[data-project-deliverables]').innerHTML = project.deliverables.map((item) => `<li>${projectEscape(item)}</li>`).join('');
  section.querySelectorAll('[data-project-label]').forEach((node) => { node.textContent = catalog.labels[node.dataset.projectLabel] || ''; });
  section.querySelector('[data-project-example-button]').textContent = project.cta;
  section.querySelector('[data-project-contact]').textContent = catalog.labels.contact;
}

function focusProjectExample(section) {
  const target = section.querySelector('[data-project-example]');
  const firstControl = target?.querySelector('input, select, textarea, button');
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.setTimeout(() => firstControl?.focus({ preventScroll: true }), 450);
}

document.querySelectorAll('[data-project]').forEach((section) => {
  renderProjectNarrative(section);
  section.querySelector('[data-project-example-button]')?.addEventListener('click', () => focusProjectExample(section));
});
document.querySelectorAll('.language-toggle [data-lang]').forEach((button) => button.addEventListener('click', () => {
  window.setTimeout(() => document.querySelectorAll('[data-project]').forEach(renderProjectNarrative), 0);
}));
```

- [x] **Step 4: Add the shared visual system**

Extend `#santiago-service-lab-v2` with scoped rules for `.project-narrative`, `.project-intro`, `.project-facts`, `.project-feature-grid`, `.project-workflow`, `.project-deliverables`, and `.project-actions`. Use `border-radius: 6px`, `gap` values from the existing 8px rhythm, blue `#0b3d91` only for emphasis, and stable `minmax(0, 1fr)` tracks. At `max-width: 767px`, stack every grid and make both actions full-width.

- [x] **Step 5: Run structural checks**

Run: `npm run verify:services`

Expected: AI/automation/electrical/brand distinct-preview checks still fail; narrative, title, feature, workflow, deliverable, and CTA checks pass.

- [x] **Step 6: Commit the shared narrative**

```bash
git add src/pages/home.html
git commit -m "feat: add client-ready service narratives"
```

---

### Task 3: AI Assistant and Automation Examples

**Files:**
- Modify: `src/pages/home.html:650-698`
- Modify: `src/pages/home.html:1102-1566`

**Interfaces:**
- Consumes: `[data-repo-tool="ai"]`, `[data-repo-tool="automation"]`, `formData(root)`, `labelFor(root, name)`, `bundleFile()`, and `sendToContact(root)`.
- Produces: `buildAi(root, data)` with `[data-ai-lead-summary]` and `buildAutomation(root, data)` with `[data-automation-pipeline]`.

- [x] **Step 1: Extend the AI form with real handoff controls**

Add these fields to the AI form:

```html
<label class="repo-field"><span data-tool-copy="field.handoff">Handoff</span><select name="handoff"><option value="email">Email summary</option><option value="crm">CRM lead</option><option value="sheet">Spreadsheet row</option></select></label>
<label class="repo-field repo-field-full"><span data-tool-copy="field.fallback">Safe fallback response</span><textarea name="fallback">I do not have enough verified information to answer that. I can collect your details so the team can follow up.</textarea></label>
```

Add equivalent Spanish and English `data-tool-copy` entries.

- [x] **Step 2: Replace fake AI scoring with captured lead state**

Remove `confidence`, percentage bars, and invented completion figures from `buildAi()`. Return a preview with this exact semantic structure:

```js
const handoff = labelFor(root, 'handoff') || data.handoff || 'Email summary';
const fallback = data.fallback || (isEs ? 'No tengo informacion verificada suficiente. Puedo recoger tus datos para que el equipo responda.' : 'I do not have enough verified information. I can collect your details so the team can respond.');
const preview = '<div class="repo-preview ai-intake-preview">'
  + '<div class="repo-preview-title">' + escapeHtml(t('assistantPreview')) + '</div>'
  + '<div class="ai-intake-layout">'
  + '<div class="ai-conversation"><div class="ai-message visitor"><strong>' + (isEs ? 'Visitante' : 'Visitor') + '</strong><p>' + escapeHtml(isEs ? 'Necesito un presupuesto y saber que documentos tengo que traer.' : 'I need a quote and want to know which documents to bring.') + '</p></div>'
  + '<div class="ai-message assistant"><strong>' + escapeHtml(business) + '</strong><p>' + escapeHtml(greeting) + '</p><ul><li>' + escapeHtml(isEs ? 'Servicio solicitado' : 'Requested service') + '</li><li>' + escapeHtml(isEs ? 'Fecha preferida' : 'Preferred date') + '</li><li>' + escapeHtml(isEs ? 'Nombre y contacto' : 'Name and contact') + '</li></ul></div></div>'
  + '<aside class="ai-lead-summary" data-ai-lead-summary><span>' + (isEs ? 'Solicitud detectada' : 'Detected request') + '</span><h6>' + escapeHtml(goal) + '</h6><dl><div><dt>' + (isEs ? 'Estado' : 'Status') + '</dt><dd>' + (isEs ? 'Lista para revision' : 'Ready for review') + '</dd></div><div><dt>' + (isEs ? 'Entrega' : 'Handoff') + '</dt><dd>' + escapeHtml(handoff) + '</dd></div><div><dt>' + (isEs ? 'Respuesta segura' : 'Safe fallback') + '</dt><dd>' + escapeHtml(fallback) + '</dd></div></dl></aside>'
  + '</div></div>';
```

Include `handoff`, `fallback`, `conversationSummary`, and `adminEditableResponses: true` in the exported config and public brief.

- [x] **Step 3: Turn automation into an operations pipeline**

Add a `followUp` select with `15 minutes`, `1 hour`, and `next business day`. Build five stages: Intake, Classify, Route, Notify, Follow-up. Render the preview inside an element marked `data-automation-pipeline`, with one sample request card and explicit `Queued`, `Assigned`, and scheduled follow-up states. The exported JSON must include `trigger`, `classification`, `destination`, `followUp`, `rules`, and `steps`.

Use this stage contract:

```js
const stages = [
  { id: '01', label: isEs ? 'Entrada' : 'Intake', value: trigger, state: isEs ? 'Recibida' : 'Received' },
  { id: '02', label: isEs ? 'Clasificar' : 'Classify', value: action, state: isEs ? 'Prioridad alta' : 'High priority' },
  { id: '03', label: isEs ? 'Enrutar' : 'Route', value: destination, state: isEs ? 'Asignada' : 'Assigned' },
  { id: '04', label: isEs ? 'Avisar' : 'Notify', value: isEs ? 'Responsable y cliente' : 'Owner and customer', state: isEs ? 'En cola' : 'Queued' },
  { id: '05', label: isEs ? 'Seguimiento' : 'Follow-up', value: followUp, state: isEs ? 'Programado' : 'Scheduled' }
];
```

- [x] **Step 4: Verify both tools**

Run: `npm run verify:services`

Expected: AI and automation preview checks pass; electrical and brand preview checks still fail.

Manually verify that changing each form updates only its own preview and that downloaded briefs contain no internal phrases such as `production upgrades`.

- [x] **Step 5: Commit both examples**

```bash
git add src/pages/home.html
git commit -m "feat: build practical AI and automation examples"
```

---

### Task 4: Electrical Room Planner and Material Estimator

**Files:**
- Modify: `src/pages/home.html:702-749`
- Modify: `src/pages/home.html:400-565`
- Modify: `src/pages/home.html:1567-2047`

**Interfaces:**
- Consumes: `[data-electric-planner]`, the existing language toggle, and the existing contact `#message` field.
- Produces: `readElectricalRooms()`, `estimateElectricalMaterials()`, `buildElectricalPlan()`, `renderElectricalPlan()`, print-to-PDF summary, local version history, and `[data-electrical-materials]`.

- [x] **Step 1: Replace dossier-first inputs with a room schedule**

Keep project type, supply, board status, and notes. Replace the single room count with an editable room table containing room name/type, lights, outlets, switches, and average route length. Start with Kitchen, Living room, and Bedroom rows. Add `Add room`, `Save version`, `Print / Save PDF`, `Copy summary`, and `Send to contact form` actions.

Each row must use this markup:

```html
<div class="electrical-room-row" data-room-row>
  <input name="roomName" value="Kitchen" aria-label="Room name">
  <select name="roomType" aria-label="Room type"><option value="kitchen">Kitchen</option><option value="living">Living room</option><option value="bedroom">Bedroom</option><option value="bathroom">Bathroom</option><option value="exterior">Exterior</option><option value="other">Other</option></select>
  <input type="number" name="lights" min="0" max="40" value="2" aria-label="Lighting points">
  <input type="number" name="outlets" min="0" max="60" value="6" aria-label="Outlet points">
  <input type="number" name="switches" min="0" max="40" value="2" aria-label="Switches">
  <input type="number" name="averageRun" min="1" max="40" value="6" aria-label="Average route length in metres">
  <button type="button" data-remove-room aria-label="Remove room">Remove</button>
</div>
```

- [x] **Step 2: Implement entered-quantity estimation**

Replace the current `getState()` and material logic with these contracts:

```js
function readElectricalRooms() {
  return Array.from(root.querySelectorAll('[data-room-row]')).map((row, index) => ({
    id: index + 1,
    name: row.querySelector('[name="roomName"]').value.trim() || `${text('room')} ${index + 1}`,
    type: row.querySelector('[name="roomType"]').value,
    lights: Math.max(0, Number(row.querySelector('[name="lights"]').value) || 0),
    outlets: Math.max(0, Number(row.querySelector('[name="outlets"]').value) || 0),
    switches: Math.max(0, Number(row.querySelector('[name="switches"]').value) || 0),
    averageRun: Math.max(1, Number(row.querySelector('[name="averageRun"]').value) || 1)
  }));
}

function estimateElectricalMaterials(rooms) {
  const totals = rooms.reduce((sum, room) => ({
    lights: sum.lights + room.lights,
    outlets: sum.outlets + room.outlets,
    switches: sum.switches + room.switches,
    routeMetres: sum.routeMetres + (room.lights + room.outlets + room.switches) * room.averageRun
  }), { lights: 0, outlets: 0, switches: 0, routeMetres: 0 });
  const conduitMetres = Math.ceil(totals.routeMetres * 1.1);
  const conductorAllowance = Math.ceil(conduitMetres * 3);
  return {
    ...totals,
    deviceBoxes: totals.outlets + totals.switches,
    conduitMetres,
    conductorAllowance,
    note: text('materialAssumption')
  };
}

function buildElectricalPlan() {
  const formData = new FormData(form);
  const rooms = readElectricalRooms();
  const materials = estimateElectricalMaterials(rooms);
  const state = {
    projectName: String(formData.get('projectName') || text('untitledProject')).trim(),
    projectType: String(formData.get('projectType') || 'renovation'),
    phase: String(formData.get('phase') || 'single'),
    board: String(formData.get('board') || 'unknown'),
    panelNotes: String(formData.get('panelNotes') || '').trim(),
    contractorNotes: String(formData.get('contractorNotes') || '').trim(),
    rooms
  };
  const circuits = buildCircuits({
    type: state.projectType,
    level: 'basic',
    board: state.board,
    rooms: Math.max(1, rooms.length),
    area: 10,
    phase: state.phase,
    loads: Array.from(form.querySelectorAll('input[name="load"]:checked')).map((input) => input.value),
    inferredLoads: analyzeBrief(state.panelNotes + ' ' + state.contractorNotes),
    brief: state.contractorNotes
  });
  const checklist = currentLang() === 'es'
    ? ['Estancias y cantidades confirmadas con el cliente', 'Recorridos medios y puntos ocultos revisados', 'Fotos del cuadro y zonas de trabajo preparadas', 'Cargas opcionales confirmadas', 'Revision final por profesional autorizado pendiente']
    : ['Rooms and quantities confirmed with the client', 'Average routes and hidden points reviewed', 'Board and work-area photos prepared', 'Optional loads confirmed', 'Final licensed-professional review pending'];
  return { state, materials, circuits, checklist };
}
```

Label route, conduit, and conductor values as preliminary allowances based on user-entered average route lengths. Do not automatically claim conductor section, breaker size, permit compliance, or final circuit capacity.

- [x] **Step 3: Keep circuits and diagrams as secondary professional context**

Retain C1-C5 and optional C8/C9/C11/C13 classification from the current script, driven by room types, selected loads, and notes. Place material quantities and room schedule first; place the unifilar/multifilar tabs below them. Add `data-electrical-materials` to the material table and `data-planner-checklist` to the five-item approval checklist returned by `buildElectricalPlan()`. Keep the diagram caption explicit that it is conceptual.

- [x] **Step 4: Implement version history and PDF handoff**

On `Save version`, write at most five summaries to `localStorage` under `santiago-electrical-estimator-versions`. Render timestamp, room count, point count, and project name. On `Print / Save PDF`, open a print-only summary document containing project details, room table, material table, notes, checklist, and the exact disclaimer, then call `print()` from that user gesture.

Use this exact disclaimer in visible HTML, print output, copied text, downloaded text, and contact handoff:

```text
Planning and estimating support only. Final electrical work, permits, code compliance, and installation must be verified by a licensed professional.
```

Use this Spanish equivalent when Spanish is active:

```text
Solo sirve como apoyo para planificacion y estimacion. El trabajo electrico final, permisos, cumplimiento normativo e instalacion deben ser verificados por un profesional autorizado.
```

- [x] **Step 5: Verify the estimator**

Run: `npm run verify:services`

Expected: electrical distinct-preview and disclaimer checks pass; only brand preview may remain failing.

Manual calculation check: for one room with 2 lights, 6 outlets, 2 switches, and 6m average route, expect 60 entered route metres, 66 conduit metres including 10% allowance, 198 conductor metres as a planning allowance, and 8 device boxes.

- [x] **Step 6: Commit the electrical example**

```bash
git add src/pages/home.html
git commit -m "feat: add electrical room and material estimator"
```

---

### Task 5: Complete Brand Identity Board

**Files:**
- Modify: `src/pages/home.html:753-778`
- Modify: `src/pages/home.html:1435-1473`
- Modify: `src/pages/home.html:447-565`

**Interfaces:**
- Consumes: `[data-repo-tool="brand"]`, `initials()`, `mix()`, `bundleFile()`, and shared export/contact helpers.
- Produces: `buildBrand(root, data)` with a `[data-brand-board]` preview and an export bundle describing all client deliverables.

- [x] **Step 1: Add practical identity inputs**

Keep brand name, sector, style, primary color, and promise. Add typography pairing (`Modern sans`, `Editorial serif`, `Technical grotesk`), voice (`Direct`, `Warm`, `Premium`, `Technical`), and primary application (`Website`, `Social`, `Print`, `All`). Remove the template names that imply a premade final design.

- [x] **Step 2: Render one coherent identity system**

Replace the current three-row brand board with a preview marked `data-brand-board` containing:

```html
<div class="brand-system-board" data-brand-board>
  <section class="brand-lockups"><div data-brand-primary-mark></div><div data-brand-horizontal-lockup></div></section>
  <section class="brand-color-spec" data-brand-palette></section>
  <section class="brand-type-spec" data-brand-typography></section>
  <section class="brand-applications"><div data-brand-favicon></div><div data-brand-social></div><div data-brand-card></div></section>
  <aside class="brand-rule"><strong>Usage rule</strong><p data-brand-rule></p></aside>
</div>
```

Populate each palette swatch with its hex value, show the chosen display/body type roles, render an initials-based mark as a direction rather than a finished AI logo, and include one explicit misuse warning such as `Do not stretch the mark or place it on low-contrast colors.`

- [x] **Step 3: Complete the downloadable brand-kit brief**

The exported bundle JSON must contain named files for `logo-directions.svg`, `palette.json`, `typography.md`, `brand-voice.md`, `social-template-notes.md`, `website-hero-direction.md`, `business-card-spec.md`, `favicon.svg`, and `usage-guidelines.md`. Public copy must explain that final editable Canva/Figma assets are a client deliverable, not generated by this browser demo.

- [x] **Step 4: Run the complete structural verifier**

Run: `npm run verify:services`

Expected: `Service examples verified.` and exit `0`.

- [x] **Step 5: Commit the identity system**

```bash
git add src/pages/home.html
git commit -m "feat: expand brand identity system example"
```

---

### Task 6: Contact Handoff, Language, Accessibility, and Error States

**Files:**
- Modify: `src/pages/home.html:813-1101`
- Modify: `src/pages/home.html:1246-1566`
- Modify: `src/pages/home.html:2014-2047`

**Interfaces:**
- Consumes: `PROJECT_CATALOG`, `sendToContact(root)`, `focusProjectExample(section)`, the language toggle, and `#message`.
- Produces: complete bilingual rerendering, keyboard focus behavior, descriptive status messages, and project-aware contact handoff.

- [x] **Step 1: Wire narrative contact buttons**

On `[data-project-contact]`, populate `#message` with the selected translated project title plus its current public brief when available, scroll to `#contact`, and focus `#message` after scrolling. Never overwrite existing visitor text without inserting a visible separator.

- [x] **Step 2: Make tool errors visible and accessible**

Set every `.repo-tool-toast` and `.planner-toast` to `role="status" aria-live="polite"`. Update `sendToContact()` to focus the message field. Use clear translated messages for save unavailable, download unavailable, copied, print blocked, empty room schedule, and contact form unavailable.

- [x] **Step 3: Verify language switching**

Switch EN -> ES -> EN while AI and electrical sections are open. Confirm project titles, narratives, feature lists, workflows, buttons, form labels, generated previews, export text, disclaimer, and contact handoff all follow the active language. Confirm user-entered values are preserved while labels change.

- [x] **Step 4: Verify keyboard behavior**

Using only Tab, Shift+Tab, Enter, and Space:

```text
Open each accordion
Activate its View Example button
Confirm focus reaches the first tool control
Operate form controls and update action
Activate contact action
Confirm focus reaches the contact message field
Return to the service section without a keyboard trap
```

- [x] **Step 5: Run source and build checks**

Run:

```bash
npm run verify:services
npm run build
npm run verify:services
git diff --check
```

Expected: all commands exit `0`; the second verifier also validates `dist/index.html`.

- [x] **Step 6: Commit interaction hardening**

```bash
git add src/pages/home.html
git commit -m "fix: harden service accessibility and contact handoff"
```

---

### Task 7: Plugin-Assisted Visual QA and Local Handoff

**Files:**
- Modify if defects are found: `src/pages/home.html`
- Modify: `docs/superpowers/plans/2026-07-09-santipulse-service-lab-redesign.md`

**Interfaces:**
- Consumes: built `dist/`, localhost preview, Product Design audit, Browser/Chrome controls, and Vercel browser verification.
- Produces: a visually reviewed localhost build with no known overlap, clipping, console errors, or broken interactions.

- [x] **Step 1: Start the production-like preview**

Run: `npm run preview`

Expected: localhost server reports the chosen port and serves `/` with HTTP `200`.

- [x] **Step 2: Run browser verification at representative viewports**

Use Browser/Chrome and Vercel browser verification at:

```text
1440 x 1000 desktop
1024 x 768 tablet landscape
768 x 1024 tablet portrait
390 x 844 mobile
```

For each viewport, open every project, capture the header plus preview, and check `document.documentElement.scrollWidth === document.documentElement.clientWidth`.

- [x] **Step 3: Perform a Product Design self-critique**

Rate the section against the approved spec and list anything that still looks generic or repeated. Fix findings involving weak hierarchy, excessive card framing, duplicate layouts, arbitrary decoration, unclear CTA order, or text that describes implementation instead of client value.

- [x] **Step 4: Inspect console and interaction state**

Confirm no uncaught errors, missing assets, failed local requests, or broken Bootstrap collapse state. Exercise save, download, copy, print, language, contact, add/remove room, version history, and diagram mode actions.

- [x] **Step 5: Run final verification**

Run:

```bash
npm run build
npm run verify:services
git diff --check
```

Expected: all commands exit `0`.

- [x] **Step 6: Mark this plan complete and commit final fixes**

```bash
git add src/pages/home.html docs/superpowers/plans/2026-07-09-santipulse-service-lab-redesign.md
git commit -m "polish: finish client-ready service examples"
```

- [x] **Step 7: Hand off localhost only**

Report the localhost URL, files changed, sections updated, verification commands, and any remaining limitations. Do not push or deploy.

---

### Task 8: Obsidian AI Project Sync

**Files:**
- Modify: `scripts/sync-obsidian.mjs`
- Read: `docs/superpowers/specs/2026-07-09-santipulse-service-lab-redesign.md`
- Read: `docs/superpowers/plans/2026-07-09-santipulse-service-lab-redesign.md`
- Write through the sync script: `/Users/santimac/Obsidian AI/Ai Projects/Santiago Portfolio System/`

**Interfaces:**
- Consumes: final project names, implementation result, localhost URL, verification commands, specification, and implementation plan.
- Produces: current Obsidian project notes, design/implementation records, and verification status without copying secrets.

- [x] **Step 1: Replace stale service notes**

Update the portfolio, design-language, verification, and next-actions notes generated by `scripts/sync-obsidian.mjs`. Remove stale public descriptions such as fake lead scoring, backend logs, add-later notes, and generic product-demo language. Use the four approved project names and client-facing descriptions.

- [x] **Step 2: Add durable project documentation**

Generate `Planning/Client-Ready Service Examples.md` with links to the specification and implementation plan, the four project purposes, their deliverables, the plugin resources used, local run instructions, and final verification results. Copy the approved spec and plan into `Planning/Source Documents/` so future Codex tasks can recover the exact decisions.

- [x] **Step 3: Validate and run the sync**

Run:

```bash
node --check scripts/sync-obsidian.mjs
node scripts/sync-obsidian.mjs
```

Expected: syntax exits `0`; sync writes the organized notes under `/Users/santimac/Obsidian AI/Ai Projects/Santiago Portfolio System/` without touching unrelated vault folders.

- [x] **Step 4: Verify the vault output**

Confirm the dashboard links resolve, both source documents exist, the four approved project names appear, the localhost URL is current, and no `.env`, API key, token, private customer data, or build artifact was copied.

- [x] **Step 5: Commit the sync source**

```bash
git add scripts/sync-obsidian.mjs docs/superpowers/plans/2026-07-09-santipulse-service-lab-redesign.md
git commit -m "docs: sync service redesign with Obsidian"
```

---

## Post-Implementation Visibility Decision

On 2026-07-10, Santiago asked to keep projects 2-5 fully implemented but hide them from the public Services accordion until he provides the next direction. The public site shows Web Design only. The hidden project rows use `hidden`, `aria-hidden="true"`, and `data-portfolio-hidden="pending-direction"` so the tools remain recoverable in source without appearing in layout or keyboard navigation.
