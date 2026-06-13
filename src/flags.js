/* ============================================================
   SINGLE REVERSIBLE SWITCH for the AI-automation launch freeze.
   Flip COMINGSOON to false (then `npm run build` + deploy) to
   reactivate: payments, the dashboard login, and the "Coming
   soon" badges all turn back on/off from here. Nothing else.
   The Website / Demos / Contratar side is never affected.
   ============================================================ */
window.__COMINGSOON = true;

window.__COMINGSOON_LABEL = {
  es: 'Próximamente · Septiembre 2026',
  en: 'Coming soon · September 2026',
  fr: 'Bientôt · Septembre 2026',
  de: 'Demnächst · September 2026',
  it: 'Prossimamente · Settembre 2026',
};
window.__COMINGSOON_SHORT = {
  es: 'Próximamente', en: 'Coming soon', fr: 'Bientôt', de: 'Demnächst', it: 'Prossimamente',
};
