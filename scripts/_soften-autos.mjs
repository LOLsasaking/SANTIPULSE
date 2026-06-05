/* ============================================================
   One-shot, idempotent: soften ROI claims on the 3 PAID automations
   (outreach / cart / social) in the demos.autos i18n block, all 5 langs.
   The 2 LIVE demos (price / leads) are real working tools → untouched.

   "Soften to typical": prefix money + headline metric with an
   "up to / typical" qualifier and reframe the `after` line so the
   numbers read as representative outcomes, not guarantees.

   Idempotent: re-running detects the qualifier prefix and skips.
   Safe to delete after a successful build.
   Run:  node scripts/_soften-autos.mjs
   ============================================================ */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '..', 'src', 'i18n');

const PAID = ['outreach', 'cart', 'social'];

// Per-language qualifier ("up to") + a soft note appended to the after-line.
const L = {
  es: { up: 'Hasta ', typical: ' (típico)' },
  en: { up: 'Up to ', typical: ' (typical)' },
  fr: { up: "Jusqu'à ", typical: ' (typique)' },
  de: { up: 'Bis zu ', typical: ' (typisch)' },
  it: { up: 'Fino a ', typical: ' (tipico)' },
};

// Strip a leading "+" so "Up to +€1.200" doesn't read oddly; keep the number.
function softenAmount(up, val) {
  if (val.startsWith(up)) return val;            // already softened
  return up + val.replace(/^\+\s*/, '');
}

// Append the "(typical)" note to the after-line once.
function softenAfter(typical, val) {
  if (val.endsWith(typical)) return val;         // already softened
  return val + typical;
}

let changed = 0;
for (const lang of Object.keys(L)) {
  const file = join(SRC, `${lang}.json`);
  const json = JSON.parse(readFileSync(file, 'utf8'));
  const items = json?.demos?.autos?.items;
  if (!items) { console.warn(`  ! ${lang}: demos.autos.items missing — skipped`); continue; }
  const { up, typical } = L[lang];
  let touched = false;
  for (const key of PAID) {
    const d = items[key];
    if (!d) continue;
    const money = softenAmount(up, d.money);
    const extraV = softenAmount(up, d.extraV);
    const after = softenAfter(typical, d.after);
    if (money !== d.money || extraV !== d.extraV || after !== d.after) {
      d.money = money; d.extraV = extraV; d.after = after; touched = true;
    }
  }
  if (touched) {
    writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
    console.log(`  ✓ ${lang}: softened ${PAID.join(', ')}`);
    changed++;
  } else {
    console.log(`  • ${lang}: already soft — no change`);
  }
}
console.log(changed ? `\n✅ Softened ${changed} lang file(s).` : '\n✅ Nothing to do (all already soft).');
