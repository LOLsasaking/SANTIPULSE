/* One-shot i18n injector — adds the `servicios` namespace + `demos.autos`
   (5 automations: explanation + before/after ROI + status) to every lang file.
   Idempotent: re-running overwrites the same keys. Run: node scripts/_inject-i18n.mjs
   Safe to delete after the build is verified. */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const I18N = resolve(__dirname, '..', 'src', 'i18n');
const LANGS = ['es', 'en', 'fr', 'de', 'it'];

/* ── /servicios chooser: Panel A → web (/contratar), Panel B → AI (/precios) ── */
const SERVICIOS = {
  es: {
    title: 'Santipulse · ¿Qué necesitas?',
    metaDescription: 'Elige lo que necesitas: una web a medida o automatizaciones con IA que te ahorran horas cada semana.',
    eyebrow: 'Para Empresas',
    titleA: '¿Qué',
    titleB: 'necesitas?',
    intro: 'Dos caminos. Elige el que encaje contigo — o pídeme los dos.',
    web: { eyebrow: 'Diseño y Desarrollo', titleA: 'Una', titleB: 'web', desc: 'Diseño y desarrollo a medida con reservas y presupuestos integrados. Entrega en 2–4 semanas.', meta: 'Webs reales · 2–4 semanas', cta: 'Cuéntame tu proyecto' },
    ai: { eyebrow: 'Automatización IA', titleA: 'IA que', titleB: 'trabaja por ti', desc: 'Monitor de precios, captación de leads y más. Recupera horas cada semana con automatizaciones que se ejecutan solas.', meta: 'Planes desde 1 automatización', cta: 'Ver planes y precios' },
  },
  en: {
    title: 'Santipulse · What do you need?',
    metaDescription: 'Pick what you need: a custom website, or AI automations that save you hours every week.',
    eyebrow: 'For Businesses',
    titleA: 'What do',
    titleB: 'you need?',
    intro: 'Two paths. Pick the one that fits — or ask me for both.',
    web: { eyebrow: 'Design & Development', titleA: 'A', titleB: 'website', desc: 'Custom design and development with integrated bookings and quotes. Delivered in 2–4 weeks.', meta: 'Real sites · 2–4 weeks', cta: 'Tell me about your project' },
    ai: { eyebrow: 'AI Automation', titleA: 'AI that', titleB: 'works for you', desc: 'Price monitoring, lead generation and more. Win back hours every week with automations that run themselves.', meta: 'Plans from 1 automation', cta: 'See plans & pricing' },
  },
  fr: {
    title: 'Santipulse · De quoi avez-vous besoin ?',
    metaDescription: 'Choisissez ce qu’il vous faut : un site web sur mesure ou des automatisations IA qui vous font gagner des heures chaque semaine.',
    eyebrow: 'Pour les Entreprises',
    titleA: 'De quoi avez-',
    titleB: 'vous besoin ?',
    intro: 'Deux voies. Choisissez celle qui vous convient — ou demandez les deux.',
    web: { eyebrow: 'Design & Développement', titleA: 'Un', titleB: 'site web', desc: 'Design et développement sur mesure avec réservations et devis intégrés. Livré en 2 à 4 semaines.', meta: 'Sites réels · 2–4 semaines', cta: 'Parlez-moi de votre projet' },
    ai: { eyebrow: 'Automatisation IA', titleA: 'Une IA qui', titleB: 'travaille pour vous', desc: 'Surveillance des prix, génération de leads et plus. Récupérez des heures chaque semaine avec des automatisations autonomes.', meta: 'Forfaits dès 1 automatisation', cta: 'Voir les forfaits et tarifs' },
  },
  de: {
    title: 'Santipulse · Was brauchst du?',
    metaDescription: 'Wähle, was du brauchst: eine maßgeschneiderte Website oder KI-Automatisierungen, die dir jede Woche Stunden sparen.',
    eyebrow: 'Für Unternehmen',
    titleA: 'Was',
    titleB: 'brauchst du?',
    intro: 'Zwei Wege. Wähle den passenden — oder frag nach beiden.',
    web: { eyebrow: 'Design & Entwicklung', titleA: 'Eine', titleB: 'Website', desc: 'Maßgeschneidertes Design und Entwicklung mit integrierten Buchungen und Angeboten. Lieferung in 2–4 Wochen.', meta: 'Echte Sites · 2–4 Wochen', cta: 'Erzähl mir von deinem Projekt' },
    ai: { eyebrow: 'KI-Automatisierung', titleA: 'KI, die', titleB: 'für dich arbeitet', desc: 'Preisüberwachung, Lead-Generierung und mehr. Gewinne jede Woche Stunden zurück mit Automatisierungen, die von selbst laufen.', meta: 'Tarife ab 1 Automatisierung', cta: 'Tarife & Preise ansehen' },
  },
  it: {
    title: 'Santipulse · Di cosa hai bisogno?',
    metaDescription: 'Scegli ciò che ti serve: un sito web su misura o automazioni IA che ti fanno risparmiare ore ogni settimana.',
    eyebrow: 'Per le Aziende',
    titleA: 'Di cosa hai',
    titleB: 'bisogno?',
    intro: 'Due strade. Scegli quella giusta per te — o chiedimele entrambe.',
    web: { eyebrow: 'Design e Sviluppo', titleA: 'Un', titleB: 'sito web', desc: 'Design e sviluppo su misura con prenotazioni e preventivi integrati. Consegna in 2–4 settimane.', meta: 'Siti reali · 2–4 settimane', cta: 'Raccontami il tuo progetto' },
    ai: { eyebrow: 'Automazione IA', titleA: 'IA che', titleB: 'lavora per te', desc: 'Monitoraggio prezzi, generazione di lead e altro. Recupera ore ogni settimana con automazioni che si eseguono da sole.', meta: 'Piani da 1 automazione', cta: 'Vedi piani e prezzi' },
  },
};

/* ── demos.autos: the 5 automations as explanation + Before/After ROI cards ──
   status: 'live' (2 with real demo backend) | 'paid' (3 client-only).
   roi: { time, money, extra } each = { k: label, v: value }. before/after = short phrases. */
const AUTOS = {
  es: {
    eyebrow: 'Lo que automatizo · Antes y después',
    heading: 'Tus 5 automatizaciones',
    intro: 'Cada una hace un trabajo repetitivo por ti, en automático. Esto es lo que hace cada una y lo que te ahorra.',
    liveTag: 'Demo gratis',
    paidTag: 'Para clientes',
    beforeLabel: 'Antes',
    afterLabel: 'Después',
    timeKey: 'Tiempo',
    moneyKey: 'Ingresos',
    items: {
      price:   { name: 'Monitor de precios', what: 'Vigila los precios de tu competencia y te avisa cuándo bajar o subir el tuyo para ganar más sin perder ventas.', before: 'Revisas precios a mano, tarde y mal', after: 'Precio óptimo, vigilado 24/7', time: '5 h/semana', money: '+€600/mes', extraK: 'Margen', extraV: '+12%' },
      leads:   { name: 'Captación de leads', what: 'Extrae nombres, emails y teléfonos de directorios y webs para que empieces el día con una lista de clientes potenciales.', before: 'Copias contactos uno a uno', after: '100+ leads listos cada mañana', time: '8 h/semana', money: '+€900/mes', extraK: 'Leads', extraV: '100+/día' },
      outreach:{ name: 'Outreach en frío', what: 'Envía emails personalizados a tus leads automáticamente y hace seguimiento, para que tu bandeja de salida nunca pare.', before: 'Escribes cada email a mano', after: 'Cientos de emails personalizados/día', time: '10 h/semana', money: '+€1.200/mes', extraK: 'Respuestas', extraV: '3× más' },
      cart:    { name: 'Recuperación de carritos', what: 'Detecta carritos abandonados en tu tienda y envía una secuencia de emails para recuperar la venta perdida.', before: 'Pierdes el 70% de los carritos', after: 'Recuperas 1 de cada 4 ventas', time: '6 h/semana', money: '+€1.500/mes', extraK: 'Recuperación', extraV: '25%' },
      social:  { name: 'Programador de redes', what: 'Programa y publica tus posts en Instagram y Facebook solo, para que tu presencia online nunca se apague.', before: 'Publicas cuando te acuerdas', after: 'Contenido constante, sin pensar', time: '7 h/semana', money: '+€500/mes', extraK: 'Alcance', extraV: '+40%' },
    },
  },
  en: {
    eyebrow: 'What I automate · Before & after',
    heading: 'Your 5 automations',
    intro: 'Each one does a repetitive job for you, automatically. Here’s what each does and what it saves you.',
    liveTag: 'Free demo',
    paidTag: 'For clients',
    beforeLabel: 'Before',
    afterLabel: 'After',
    timeKey: 'Time',
    moneyKey: 'Revenue',
    items: {
      price:   { name: 'Price Monitor', what: 'Watches your competitors’ prices and tells you when to drop or raise yours to earn more without losing sales.', before: 'You check prices by hand, late', after: 'Optimal price, watched 24/7', time: '5 hrs/week', money: '+$650/mo', extraK: 'Margin', extraV: '+12%' },
      leads:   { name: 'Lead Generation', what: 'Pulls names, emails and phone numbers from directories and websites so you start the day with a list of prospects.', before: 'You copy contacts one by one', after: '100+ leads ready each morning', time: '8 hrs/week', money: '+$1,000/mo', extraK: 'Leads', extraV: '100+/day' },
      outreach:{ name: 'Cold Outreach', what: 'Sends personalized emails to your leads automatically and follows up, so your outbox never stops.', before: 'You write every email by hand', after: 'Hundreds of personalized emails/day', time: '10 hrs/week', money: '+$1,300/mo', extraK: 'Replies', extraV: '3× more' },
      cart:    { name: 'Abandoned Cart Recovery', what: 'Detects abandoned carts in your store and sends an email sequence to win back the lost sale.', before: 'You lose 70% of carts', after: 'Recover 1 in 4 lost sales', time: '6 hrs/week', money: '+$1,600/mo', extraK: 'Recovery', extraV: '25%' },
      social:  { name: 'Social Media Scheduler', what: 'Schedules and posts to Instagram and Facebook on its own, so your online presence never goes quiet.', before: 'You post when you remember', after: 'Consistent content, hands-off', time: '7 hrs/week', money: '+$550/mo', extraK: 'Reach', extraV: '+40%' },
    },
  },
  fr: {
    eyebrow: 'Ce que j’automatise · Avant et après',
    heading: 'Vos 5 automatisations',
    intro: 'Chacune fait une tâche répétitive à votre place, automatiquement. Voici ce que fait chacune et ce qu’elle vous fait gagner.',
    liveTag: 'Démo gratuite',
    paidTag: 'Pour les clients',
    beforeLabel: 'Avant',
    afterLabel: 'Après',
    timeKey: 'Temps',
    moneyKey: 'Revenus',
    items: {
      price:   { name: 'Surveillance des prix', what: 'Surveille les prix de vos concurrents et vous dit quand baisser ou augmenter le vôtre pour gagner plus sans perdre de ventes.', before: 'Vous vérifiez les prix à la main', after: 'Prix optimal, surveillé 24/7', time: '5 h/sem.', money: '+600 €/mois', extraK: 'Marge', extraV: '+12 %' },
      leads:   { name: 'Génération de leads', what: 'Extrait noms, e-mails et téléphones d’annuaires et de sites pour commencer la journée avec une liste de prospects.', before: 'Vous copiez les contacts un à un', after: '100+ leads prêts chaque matin', time: '8 h/sem.', money: '+900 €/mois', extraK: 'Leads', extraV: '100+/jour' },
      outreach:{ name: 'Prospection à froid', what: 'Envoie des e-mails personnalisés à vos leads automatiquement et relance, pour que votre boîte d’envoi ne s’arrête jamais.', before: 'Vous écrivez chaque e-mail à la main', after: 'Des centaines d’e-mails personnalisés/jour', time: '10 h/sem.', money: '+1 200 €/mois', extraK: 'Réponses', extraV: '3× plus' },
      cart:    { name: 'Récupération de paniers', what: 'Détecte les paniers abandonnés dans votre boutique et envoie une séquence d’e-mails pour récupérer la vente perdue.', before: 'Vous perdez 70 % des paniers', after: 'Récupérez 1 vente sur 4', time: '6 h/sem.', money: '+1 500 €/mois', extraK: 'Récupération', extraV: '25 %' },
      social:  { name: 'Planificateur de réseaux', what: 'Planifie et publie sur Instagram et Facebook tout seul, pour que votre présence en ligne ne s’éteigne jamais.', before: 'Vous publiez quand vous y pensez', after: 'Contenu régulier, sans effort', time: '7 h/sem.', money: '+500 €/mois', extraK: 'Portée', extraV: '+40 %' },
    },
  },
  de: {
    eyebrow: 'Was ich automatisiere · Vorher und nachher',
    heading: 'Deine 5 Automatisierungen',
    intro: 'Jede erledigt eine sich wiederholende Aufgabe für dich — automatisch. Das macht jede und das spart sie dir.',
    liveTag: 'Gratis-Demo',
    paidTag: 'Für Kunden',
    beforeLabel: 'Vorher',
    afterLabel: 'Nachher',
    timeKey: 'Zeit',
    moneyKey: 'Umsatz',
    items: {
      price:   { name: 'Preisüberwachung', what: 'Beobachtet die Preise deiner Konkurrenz und sagt dir, wann du deinen senken oder erhöhen solltest, um mehr zu verdienen, ohne Verkäufe zu verlieren.', before: 'Du prüfst Preise von Hand, zu spät', after: 'Optimaler Preis, rund um die Uhr überwacht', time: '5 Std./Woche', money: '+600 €/Monat', extraK: 'Marge', extraV: '+12 %' },
      leads:   { name: 'Lead-Generierung', what: 'Zieht Namen, E-Mails und Telefonnummern aus Verzeichnissen und Websites, damit du den Tag mit einer Liste potenzieller Kunden beginnst.', before: 'Du kopierst Kontakte einzeln', after: '100+ Leads jeden Morgen bereit', time: '8 Std./Woche', money: '+900 €/Monat', extraK: 'Leads', extraV: '100+/Tag' },
      outreach:{ name: 'Kaltakquise', what: 'Sendet automatisch personalisierte E-Mails an deine Leads und folgt nach, damit dein Postausgang nie stillsteht.', before: 'Du schreibst jede E-Mail von Hand', after: 'Hunderte personalisierte E-Mails/Tag', time: '10 Std./Woche', money: '+1.200 €/Monat', extraK: 'Antworten', extraV: '3× mehr' },
      cart:    { name: 'Warenkorb-Rückgewinnung', what: 'Erkennt abgebrochene Warenkörbe in deinem Shop und sendet eine E-Mail-Serie, um den verlorenen Verkauf zurückzugewinnen.', before: 'Du verlierst 70 % der Warenkörbe', after: 'Hol dir 1 von 4 Verkäufen zurück', time: '6 Std./Woche', money: '+1.500 €/Monat', extraK: 'Rückgewinnung', extraV: '25 %' },
      social:  { name: 'Social-Media-Planer', what: 'Plant und postet von selbst auf Instagram und Facebook, damit deine Online-Präsenz nie verstummt.', before: 'Du postest, wenn du daran denkst', after: 'Konstanter Content, ohne Aufwand', time: '7 Std./Woche', money: '+500 €/Monat', extraK: 'Reichweite', extraV: '+40 %' },
    },
  },
  it: {
    eyebrow: 'Cosa automatizzo · Prima e dopo',
    heading: 'Le tue 5 automazioni',
    intro: 'Ognuna svolge un lavoro ripetitivo al posto tuo, in automatico. Ecco cosa fa ognuna e cosa ti fa risparmiare.',
    liveTag: 'Demo gratis',
    paidTag: 'Per i clienti',
    beforeLabel: 'Prima',
    afterLabel: 'Dopo',
    timeKey: 'Tempo',
    moneyKey: 'Ricavi',
    items: {
      price:   { name: 'Monitoraggio prezzi', what: 'Tiene d’occhio i prezzi dei concorrenti e ti dice quando abbassare o alzare il tuo per guadagnare di più senza perdere vendite.', before: 'Controlli i prezzi a mano, in ritardo', after: 'Prezzo ottimale, monitorato 24/7', time: '5 h/sett.', money: '+€600/mese', extraK: 'Margine', extraV: '+12%' },
      leads:   { name: 'Generazione di lead', what: 'Estrae nomi, email e numeri di telefono da elenchi e siti, così inizi la giornata con una lista di potenziali clienti.', before: 'Copi i contatti uno a uno', after: '100+ lead pronti ogni mattina', time: '8 h/sett.', money: '+€900/mese', extraK: 'Lead', extraV: '100+/giorno' },
      outreach:{ name: 'Outreach a freddo', what: 'Invia email personalizzate ai tuoi lead in automatico e fa follow-up, così la tua posta in uscita non si ferma mai.', before: 'Scrivi ogni email a mano', after: 'Centinaia di email personalizzate/giorno', time: '10 h/sett.', money: '+€1.200/mese', extraK: 'Risposte', extraV: '3× di più' },
      cart:    { name: 'Recupero carrelli', what: 'Rileva i carrelli abbandonati nel tuo negozio e invia una sequenza di email per recuperare la vendita persa.', before: 'Perdi il 70% dei carrelli', after: 'Recuperi 1 vendita su 4', time: '6 h/sett.', money: '+€1.500/mese', extraK: 'Recupero', extraV: '25%' },
      social:  { name: 'Pianificatore social', what: 'Programma e pubblica su Instagram e Facebook da solo, così la tua presenza online non si spegne mai.', before: 'Pubblichi quando te ne ricordi', after: 'Contenuti costanti, senza pensieri', time: '7 h/sett.', money: '+€500/mese', extraK: 'Copertura', extraV: '+40%' },
    },
  },
};

const STATUS = { price: 'live', leads: 'live', outreach: 'paid', cart: 'paid', social: 'paid' };

/* Rebuild an object inserting `newKey:newVal` immediately after `afterKey`,
   preserving the order of all other keys. */
function insertAfter(obj, afterKey, newKey, newVal) {
  const out = {};
  for (const k of Object.keys(obj)) {
    out[k] = obj[k];
    if (k === afterKey) out[newKey] = newVal;
  }
  if (!(newKey in out)) out[newKey] = newVal; // fallback: append
  return out;
}

for (const lang of LANGS) {
  const file = join(I18N, `${lang}.json`);
  let data = JSON.parse(readFileSync(file, 'utf8'));

  // 1) servicios — right after `home`
  delete data.servicios;
  data = insertAfter(data, 'home', 'servicios', SERVICIOS[lang]);

  // 2) demos.autos — attach status onto each item, then set the block
  const autos = JSON.parse(JSON.stringify(AUTOS[lang]));
  for (const key of Object.keys(autos.items)) autos.items[key].status = STATUS[key];
  data.demos.autos = autos;

  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`  ✓ ${lang}: +servicios  +demos.autos (${Object.keys(autos.items).length} items)`);
}
console.log('\n✅ i18n injected.');
