import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { load } from 'cheerio';

const root = resolve(process.cwd());
const sourcePath = resolve(root, 'src/pages/home.html');
const source = readFileSync(sourcePath, 'utf8');
const $ = load(source);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const exportFunction = source.match(/function exportFiles\(root\) \{([\s\S]*?)\n  \}/)?.[1] || '';
check(exportFunction.includes('root.dataset.toolBundle'), 'exports must download the generated bundle, not only the public brief');
check(exportFunction.includes('application/json'), 'bundle exports must use a JSON content type');
check(/toolFilename[^\n]*\.json/.test(exportFunction), 'bundle export filename must use the JSON extension');
check(source.includes("{ path: 'PROJECT-BRIEF.md', content: publicBrief }"), 'generated bundles must include the public brief as a named file');

for (const filename of [
  'assistant-config.json',
  'workflow.json',
  'logo-directions.svg',
  'palette.json',
  'typography.md',
  'brand-voice.md',
  'social-template-notes.md',
  'website-hero-direction.md',
  'business-card-spec.md',
  'favicon.svg',
  'usage-guidelines.md',
]) {
  check(source.includes(`path: '${filename}'`), `bundle is missing named file: ${filename}`);
}
check(source.includes('handoff,') && source.includes('fallback,'), 'AI bundle config must preserve handoff and fallback settings');
check(source.includes('classification: data.action'), 'automation bundle must preserve the workflow JSON contract');

const languageSubscribers = source.match(/santiPulseOnLanguageChange\(/g) || [];
check(source.includes('notifyLanguageChange'), 'language changes must publish one shared state update');
check(languageSubscribers.length >= 4, 'service previews must subscribe to the shared language state update');
for (const staleListener of ['setTimeout(updateCopy', 'setTimeout(applyToolCopy', 'setTimeout(renderPlan', 'setTimeout(() => document.querySelectorAll(\'[data-project]\')']) {
  check(!source.includes(staleListener), `language switching still has a deferred listener race: ${staleListener}`);
}
check(source.includes('data-brand-role'), 'brand swatches must expose named roles alongside hex values');
check(source.includes('Primary') && source.includes('Primario'), 'brand swatch roles must be translated in English and Spanish');
check(source.includes('.language-toggle{position:relative;z-index:10;'), 'language toggle must remain above the intro content for pointer and keyboard input');

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
const electricalSection = $('#service-4');
const electricalDisclaimers = electricalSection.find('[data-electrical-disclaimer]');
check(electricalDisclaimers.length === 1, 'electrical requires exactly one [data-electrical-disclaimer]');
if (electricalDisclaimers.length === 1) {
  check(
    electricalDisclaimers.text().trim() === disclaimer,
    'electrical disclaimer must contain the exact approved English text',
  );
}
const electricalControls = electricalSection
  .find('[data-planner-print], [data-planner-send], [data-planner-copy-plan], [data-tool-export], [data-tool-send], [data-project-example-button], [data-project-contact]')
  .toArray();
if (electricalDisclaimers.length === 1) {
  const electricalNodes = electricalSection.find('*').toArray();
  const disclaimerPosition = electricalNodes.indexOf(electricalDisclaimers[0]);
  for (const control of electricalControls) {
    check(
      disclaimerPosition < electricalNodes.indexOf(control),
      'electrical disclaimer must appear before every electrical export/contact control',
    );
  }
}
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
