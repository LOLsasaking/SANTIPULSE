/* ============================================================
   Santipulse multi-page i18n static build
   ------------------------------------------------------------
   Reads:  src/pages/*.html  +  src/i18n/<lang>.json
   Writes: dist/  (ES at root) + dist/en|fr|de|it/  per page
           dist/<assets>, app/lang/contratar/demos .js, tw-config.js
           dist/sitemap.xml, dist/robots.txt
   Default language: ES (root). Others under /en/ /fr/ /de/ /it/.
   Run:    npm run build
   ============================================================ */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');

// ---- Load .env.local so a local `npm run build` / `vercel dev` build embeds
//      the public Supabase config (sb-config.js). On Vercel, real env vars are
//      already set and take precedence (we never overwrite an existing value). ----
{
  const envFile = join(ROOT, '.env.local');
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

// ---- Config ----
const SITE_URL = (process.env.SITE_URL || 'https://santipulse.com').replace(/\/$/, '');
const SOCIAL_IMAGE = `${SITE_URL}/santilogo.png`;
const SOCIAL_IMAGE_ALT = 'SantiPulse logo';

// Cache-busting build id: appended as ?v=… to every local .js URL so browsers
// fetch fresh scripts on each deploy (JS files are cached for 24h by vercel.json).
const BUILD_ID = (process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now())).slice(0, 10);

// Append ?v=BUILD_ID to local .js script srcs in an HTML string.
function bustJsCache(html) {
  return html.replace(/(<script[^>]+src=")([^"]+\.js)(")/g, (m, a, src, c) => {
    if (/^https?:\/\//.test(src)) return m;            // leave CDN scripts alone
    const sep = src.includes('?') ? '&' : '?';
    return `${a}${src}${sep}v=${BUILD_ID}${c}`;
  });
}
const LANGS = ['es', 'en', 'fr', 'de', 'it']; // es = default (root)
const DEFAULT_LANG = 'es';

const LANG_NAMES = { es: 'Español', en: 'English', fr: 'Français', de: 'Deutsch', it: 'Italiano' };
const LANG_FLAGS = { es: '🇪🇸', en: '🇬🇧', fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹' };

// Page map: template file -> { ns: i18n namespace, path: site path segment ('' = home) }
const PAGES = [
  { tpl: 'home.html',      ns: 'home',      path: '' },
  { tpl: 'servicios.html', ns: 'servicios', path: 'servicios' },
  { tpl: 'contratar.html', ns: 'contratar', path: 'contratar' },
  { tpl: 'demos.html',     ns: 'demos',     path: 'demos' },
  { tpl: 'nosotros.html',  ns: 'nosotros',  path: 'nosotros' },
  { tpl: 'bienvenida.html', ns: 'bienvenida', path: 'bienvenida' },
  { tpl: 'privacidad.html', ns: 'privacidad', path: 'privacidad' },
];

// Single-file JS + static assets copied verbatim into dist root
const JS_FILES = ['tw-config.js', 'lang.js', 'home.js', 'anim.js', 'contratar.js', 'demos.js', 'auth.js', 'login.js', 'dashboard.js', 'dashboard-nav.js', 'pulse-modules.js', 'precios.js', 'site-chrome.js', 'globe.js', 'lanyard.js', 'login-i18n.js', 'dashboard-i18n.js', 'flags.js'];
const ROOT_ASSETS = ['santilogo.png', 'santipulse-logo.webm', 'mascot-favicon.png', 'mascot-icon.png'];
const ASSET_DIRS = ['demo-media'];

// Public (browser-safe) Supabase config — injected into app pages at build time.
// The anon key is DESIGNED to be public; RLS protects the data. Never inject the
// service_role key here.
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// App-like pages (login/dashboard): single-language, no SEO/i18n treatment.
// Built from src/app/*.html, served at /login/ and /dashboard/.
const APP_PAGES = [
  { tpl: 'login.html',     path: 'login' },
  { tpl: 'dashboard.html', path: 'dashboard' },
];

// ---- Helpers ----
function dotGet(obj, path) {
  if (Object.prototype.hasOwnProperty.call(obj, path)) return obj[path];
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function fill(template, data, ctx) {
  return template.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (m, key) => {
    const v = dotGet(data, key);
    if (v === undefined) throw new Error(`[build] Missing key "${key}" in ${ctx}`);
    return String(v);
  });
}

// Absolute site URL for a given lang + page path
function urlFor(lang, pagePath) {
  const langSeg = lang === DEFAULT_LANG ? '' : `${lang}/`;
  const pageSeg = pagePath ? `${pagePath}/` : '';
  return `${SITE_URL}/${langSeg}${pageSeg}`;
}

// Relative path from a page back to dist root (for assets)
function assetPrefix(lang, pagePath) {
  // depth = number of path segments below dist root
  let depth = 0;
  if (lang !== DEFAULT_LANG) depth++;
  if (pagePath) depth++;
  return depth === 0 ? '' : '../'.repeat(depth);
}

// Relative href from one page to the SAME page in another lang (for switcher)
function switchHref(fromLang, toLang, pagePath) {
  // Build an absolute-from-root path, then make it relative using assetPrefix
  const prefix = assetPrefix(fromLang, pagePath); // gets us to dist root
  const langSeg = toLang === DEFAULT_LANG ? '' : `${toLang}/`;
  const pageSeg = pagePath ? `${pagePath}/` : '';
  const target = `${prefix}${langSeg}${pageSeg}`;
  return target === '' ? './' : target;
}

// Nav links (home/contratar/demos/nosotros) relative to current page, same lang
function navLinks(lang, pagePath) {
  const prefix = assetPrefix(lang, pagePath);
  const langSeg = lang === DEFAULT_LANG ? '' : `${lang}/`;
  const mk = (seg) => {
    const t = `${prefix}${langSeg}${seg ? seg + '/' : ''}`;
    return t === '' ? './' : t;
  };
  return { home: mk(''), servicios: mk('servicios'), contratar: mk('contratar'), demos: mk('demos'), nosotros: mk('nosotros'), precios: mk('precios') };
}

function buildSeo(lang, pagePath) {
  const canonical = `<link rel="canonical" href="${urlFor(lang, pagePath)}" />`;
  const alts = LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${urlFor(l, pagePath)}" />`);
  alts.push(`<link rel="alternate" hreflang="x-default" href="${urlFor(DEFAULT_LANG, pagePath)}" />`);
  return {
    'seo.canonical': canonical,
    'seo.hreflang': alts.join('\n'),
    'seo.ogUrl': urlFor(lang, pagePath),
    'seo.ogImage': SOCIAL_IMAGE,
    'seo.ogImageAlt': SOCIAL_IMAGE_ALT,
  };
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeRe(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function setMetaContent(html, attrName, attrValue, content) {
  const tag = `<meta ${attrName}="${attrValue}" content="${escapeAttr(content)}" />`;
  const re = new RegExp(`<meta\\s+${attrName}="${escapeRe(attrValue)}"\\s+content="[^"]*"\\s*/?>`, 'i');
  if (re.test(html)) return html.replace(re, tag);

  const ogUrl = /(<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>)/i;
  if (ogUrl.test(html)) return html.replace(ogUrl, `$1\n${tag}`);
  return html.replace('</head>', `${tag}\n</head>`);
}

function ensureSocialPreviewMeta(html, pageStrings) {
  html = setMetaContent(html, 'property', 'og:image', SOCIAL_IMAGE);
  html = setMetaContent(html, 'property', 'og:image:alt', SOCIAL_IMAGE_ALT);
  html = setMetaContent(html, 'name', 'twitter:card', 'summary_large_image');
  html = setMetaContent(html, 'name', 'twitter:title', pageStrings.title);
  html = setMetaContent(html, 'name', 'twitter:description', pageStrings.metaDescription);
  html = setMetaContent(html, 'name', 'twitter:image', SOCIAL_IMAGE);
  html = setMetaContent(html, 'name', 'twitter:image:alt', SOCIAL_IMAGE_ALT);
  return html;
}

function assertNoTemplateTokens(html, ctx) {
  const tokens = html.match(/\{\{[^}]+\}\}/g);
  if (tokens) throw new Error(`[build] Unresolved template tokens in ${ctx}: ${[...new Set(tokens)].join(', ')}`);
}

function switcherHtml(lang, pagePath) {
  const links = LANGS.map((l) => {
    const cur = l === lang ? ' aria-current="true"' : '';
    const href = l === lang ? '#' : switchHref(lang, l, pagePath);
    return `<a href="${href}" hreflang="${l}"${cur}><span>${LANG_FLAGS[l]}</span><span>${LANG_NAMES[l]}</span></a>`;
  }).join('');
  return (
    `<div class="lang-wrap">` +
    `<button id="langBtn" class="lang-btn" aria-haspopup="true" aria-expanded="false" aria-label="Language">` +
    `<span>${LANG_FLAGS[lang]}</span><span>${lang.toUpperCase()}</span>` +
    `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>` +
    `</button>` +
    `<div id="langMenu" class="lang-menu hidden">${links}</div>` +
    `</div>`
  );
}

function copyDir(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    const s = join(from, entry), d = join(to, entry);
    if (statSync(s).isDirectory()) copyDir(s, d);
    else copyFileSync(s, d);
  }
}

function mergeFallback(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) return override ?? base;
  if (!base || typeof base !== 'object') return override ?? base;
  const out = { ...base };
  for (const key of Object.keys(override || {})) {
    out[key] = mergeFallback(base[key], override[key]);
  }
  return out;
}

// ---- Build ----
console.log('• Cleaning dist/');
if (existsSync(DIST)) rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

// Load all language strings up front
const STRINGS = {};
const ES_STRINGS = JSON.parse(readFileSync(join(SRC, 'i18n', `${DEFAULT_LANG}.json`), 'utf8'));
for (const lang of LANGS) {
  const langStrings = JSON.parse(readFileSync(join(SRC, 'i18n', `${lang}.json`), 'utf8'));
  STRINGS[lang] = lang === DEFAULT_LANG ? langStrings : mergeFallback(ES_STRINGS, langStrings);
}

for (const lang of LANGS) {
  const s = STRINGS[lang];
  for (const page of PAGES) {
    const tpl = readFileSync(join(SRC, 'pages', page.tpl), 'utf8');
    const nav = navLinks(lang, page.path);

    const data = {
      ...s,
      'lang': lang,
      'site.url': SITE_URL,
      'asset.prefix': assetPrefix(lang, page.path),
      'tw.css': `<link rel="stylesheet" href="${assetPrefix(lang, page.path)}tw.css?v=${BUILD_ID}">`,
      'lang.switcher': switcherHtml(lang, page.path),
      'nav.home': nav.home,
      'nav.servicios': nav.servicios,
      'nav.contratar': nav.contratar,
      'nav.demos': nav.demos,
      'nav.nosotros': nav.nosotros,
      'nav.precios': nav.precios,
      ...buildSeo(lang, page.path),
    };

    // Per-page JS i18n payloads
    if (page.ns === 'contratar') {
      data['i18n.formJson'] = JSON.stringify({ lang, form: s.contratar.form });
    }
    if (page.ns === 'demos') {
      data['i18n.demosJson'] = JSON.stringify({ lang, live: s.demos.live, items: s.demos.items });
    }
    if (page.ns === 'precios') {
      // Checkout strings for precios.js + the Supabase auth config tag (real
      // asset prefix baked in, since fill() is a single pass).
      data['i18n.preciosJson'] = JSON.stringify({ cta: s.precios.cta });
      data['sb.config'] = `<script src="${data['asset.prefix']}sb-config.js"></script>`;
    }

    let html = fill(tpl, data, `${lang}/${page.tpl}`);
    html = ensureSocialPreviewMeta(html, dotGet(s, page.ns));
    html = bustJsCache(html);
    assertNoTemplateTokens(html, `${lang}/${page.tpl}`);

    const outDir = join(DIST, lang === DEFAULT_LANG ? '' : lang, page.path);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), html, 'utf8');
  }
  console.log(`  ✓ ${lang} (${PAGES.length} pages)`);
}

// ---- /aprender redirect (kept for back-compat, per lang) ----
for (const lang of LANGS) {
  const prefix = assetPrefix(lang, 'aprender');
  const langSeg = lang === DEFAULT_LANG ? '' : `${lang}/`;
  const target = `${prefix}${langSeg}nosotros/`;
  const redirect =
    `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8">` +
    `<link rel="canonical" href="${urlFor(lang, 'nosotros')}" />` +
    `<meta http-equiv="refresh" content="0; url=${target}" />` +
    `<title>Santipulse</title></head><body>` +
    `<p>→ <a href="${target}">/nosotros/</a></p></body></html>\n`;
  const outDir = join(DIST, lang === DEFAULT_LANG ? '' : lang, 'aprender');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), redirect, 'utf8');
}
console.log('  ✓ aprender redirects');

// ---- Copy JS + assets ----
for (const f of JS_FILES) {
  copyFileSync(join(SRC, f), join(DIST, f));
}
console.log('  ✓ JS:', JS_FILES.join(', '));

for (const a of ROOT_ASSETS) {
  const from = join(ROOT, a);
  if (existsSync(from)) copyFileSync(from, join(DIST, a));
  else console.warn(`  ! missing asset: ${a}`);
}
for (const d of ASSET_DIRS) {
  const from = join(ROOT, d);
  if (existsSync(from)) { copyDir(from, join(DIST, d)); console.log(`  ✓ ${d}/`); }
  else console.warn(`  ! missing dir: ${d}`);
}

// ---- Self-host the Supabase browser bundle (keeps script-src 'self') ----
{
  const sbBundle = join(ROOT, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js');
  if (existsSync(sbBundle)) { copyFileSync(sbBundle, join(DIST, 'supabase.js')); console.log('  ✓ supabase.js (vendored)'); }
  else console.warn('  ! supabase UMD bundle not found — run npm install');
}

// ---- App pages (login / dashboard): single-language, no SEO/i18n ----
// Config is written to a SEPARATE /sb-config.js file (not an inline <script>),
// because the production CSP is script-src 'self' with no 'unsafe-inline' —
// an inline config script would be blocked. A same-origin .js file is allowed.
{
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('  ! SUPABASE_URL / SUPABASE_ANON_KEY not set — app pages will have empty config');
  }
  writeFileSync(
    join(DIST, 'sb-config.js'),
    `window.__SB=${JSON.stringify({ url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY })};\n`,
    'utf8'
  );
  const cfg = `<script src="/sb-config.js"></script>`;
  for (const page of APP_PAGES) {
    const tplPath = join(SRC, 'app', page.tpl);
    if (!existsSync(tplPath)) { console.warn(`  ! missing app template: ${page.tpl}`); continue; }
    let html = readFileSync(tplPath, 'utf8');
    html = html.replace('{{sb.config}}', cfg);
    html = bustJsCache(html);
    const outDir = join(DIST, page.path);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), html, 'utf8');
  }
  console.log('  ✓ app pages + /sb-config.js:', APP_PAGES.map((p) => '/' + p.path + '/').join(', '));
}

// ---- Compile Tailwind to a static stylesheet (replaces the runtime CDN) ----
// Scans the dist HTML just written, so tw.css contains only the classes used.
{
  try {
    execSync('npx tailwindcss -c tailwind.config.cjs -i src/tw-input.css -o dist/tw.css --minify', {
      cwd: ROOT, stdio: 'inherit',
    });
    console.log('  ✓ tw.css (compiled Tailwind, no runtime CDN)');
  } catch (err) {
    console.warn('  ! tailwind compile failed:', err.message);
  }
}

// ---- sitemap.xml (all langs × pages) ----
let urls = [];
for (const lang of LANGS) {
  for (const page of PAGES) {
    const alts = LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${urlFor(l, page.path)}"/>`).join('\n');
    urls.push(
      `  <url>\n    <loc>${urlFor(lang, page.path)}</loc>\n${alts}\n` +
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${urlFor(DEFAULT_LANG, page.path)}"/>\n  </url>`
    );
  }
}
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
  urls.join('\n') + `\n</urlset>\n`;
writeFileSync(join(DIST, 'sitemap.xml'), sitemap, 'utf8');
console.log('  ✓ sitemap.xml');

// ---- robots.txt ----
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`, 'utf8');
console.log('  ✓ robots.txt');

console.log(`\n✅ Build complete → dist/  (site: ${SITE_URL})`);
