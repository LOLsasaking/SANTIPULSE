/* ============================================================
   Email-sequence helpers (ESM) — shared by Outreach + Cart Recovery
   ------------------------------------------------------------
   • sanitizeSteps  — validate/normalize a user-supplied step array
   • renderTemplate — fill {{name}} / {{company}} / … merge tags
   • escapeHtml     — for safe interpolation into HTML bodies
   ============================================================ */

const MAX_STEPS = 6;
const MAX_SUBJECT = 200;
const MAX_BODY = 10000;

/** Validate a steps array from the browser. Each step:
    { delay_minutes:int>=0, subject:string, body:string }.
    Returns a clean array (max MAX_STEPS); drops anything malformed. */
export function sanitizeSteps(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const s of input.slice(0, MAX_STEPS)) {
    if (!s || typeof s !== 'object') continue;
    const subject = typeof s.subject === 'string' ? s.subject.trim().slice(0, MAX_SUBJECT) : '';
    const body = typeof s.body === 'string' ? s.body.trim().slice(0, MAX_BODY) : '';
    if (!subject || !body) continue;
    let delay = parseInt(s.delay_minutes, 10);
    if (!Number.isFinite(delay) || delay < 0) delay = 0;
    delay = Math.min(delay, 60 * 24 * 30); // cap at 30 days
    out.push({ delay_minutes: delay, subject, body });
  }
  return out;
}

export function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (m) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
  ));
}

/** Fill {{key}} merge tags from `data`, HTML-escaping every value.
    Unknown tags become ''. Newlines in the template become <br> so a
    plain-text body renders sensibly as HTML. */
export function renderTemplate(template, data = {}) {
  const filled = String(template || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const v = data[key];
    return v == null ? '' : escapeHtml(v);
  });
  return filled.replace(/\r?\n/g, '<br>\n');
}
