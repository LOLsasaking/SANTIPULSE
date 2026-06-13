/* ============================================================
   Site chrome for public pages (CSP-safe: no inline script, no deps):
     1. Floating "tubelight" bottom navbar (ported from the React/
        framer-motion component to vanilla). Hidden on the no-scroll home.
     2. Cookie / privacy consent banner (remembered in localStorage).
   Injects its own <style> (style-src allows 'unsafe-inline').
   ============================================================ */
(function () {
  'use strict';

  var lang = (document.documentElement.getAttribute('lang') || 'es').toLowerCase();
  if (!/^(es|en|fr|de|it)$/.test(lang)) lang = 'es';
  var base = lang === 'es' ? '/' : '/' + lang + '/';
  // Remember the active language so app pages (login, dashboard) can match it.
  try { window.localStorage.setItem('sp_lang', lang); } catch (e) {}

  function norm(p) { return p.replace(/index\.html$/, '').replace(/\/+$/, '') + '/'; }
  var here = norm(location.pathname);

  // Page segment with the current lang prefix stripped — used to build the
  // same-page URL in every other language for the languages pill.
  var pageSeg = here.indexOf(base) === 0 ? here.slice(base.length) : here.replace(/^\/+/, '');
  var LANGS = ['es', 'en', 'fr', 'de', 'it'];
  // Emoji flags don't render on Windows/Chrome — use self-hosted flag PNGs.
  function flagImg(t) { return '<img class="fl" src="/demo-media/flags/' + t + '.png" alt="" width="20" height="15" loading="lazy" />'; }

  // Pages like /contratar/ and /precios/ have a full-width fixed red ".sticky-bar"
  // CTA at bottom:0 — lift the navbar + cookie above it so it isn't covered.
  var stickyBar = document.querySelector('.sticky-bar');
  var barH = stickyBar ? (stickyBar.offsetHeight || 52) : 0;

  // ── i18n ──
  var NAV = {
    es: ['Inicio', 'Sitio Web', 'Demos', 'Nosotros', 'Automatización IA'],
    en: ['Home', 'Website', 'Demos', 'About', 'AI Automation'],
    fr: ['Accueil', 'Site web', 'Démos', 'À propos', 'Automatisation IA'],
    de: ['Start', 'Webseite', 'Demos', 'Über uns', 'KI-Automation'],
    it: ['Home', 'Sito web', 'Demo', 'Chi siamo', 'Automazione IA'],
  };
  var COOKIE = {
    es: { t: 'Cookies y privacidad', d: 'Usamos cookies para mejorar tu experiencia y medir el rendimiento del sitio.', link: 'Política de privacidad', pref: 'Solo esenciales', ok: 'Aceptar' },
    en: { t: 'Cookies & privacy', d: 'We use cookies to improve your experience and measure site performance.', link: 'Privacy policy', pref: 'Essentials only', ok: 'Accept' },
    fr: { t: 'Cookies et confidentialité', d: 'Nous utilisons des cookies pour améliorer votre expérience et mesurer les performances.', link: 'Politique de confidentialité', pref: 'Essentiels uniquement', ok: 'Accepter' },
    de: { t: 'Cookies & Datenschutz', d: 'Wir verwenden Cookies, um dein Erlebnis zu verbessern und die Leistung zu messen.', link: 'Datenschutz', pref: 'Nur notwendige', ok: 'Akzeptieren' },
    it: { t: 'Cookie e privacy', d: 'Usiamo i cookie per migliorare la tua esperienza e misurare le prestazioni.', link: 'Informativa privacy', pref: 'Solo essenziali', ok: 'Accetta' },
  };
  var navLabels = NAV[lang] || NAV.es;
  var ck = COOKIE[lang] || COOKIE.es;

  // segments line up with navLabels: '' (home), Website→contratar, Demos,
  // Nosotros, AI Automation→precios.
  var SEGS = ['', 'contratar', 'demos', 'nosotros', 'precios'];

  // ── styles ──
  var ICONS = [
    '<path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1Z"/>',          // home
    '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',         // website (monitor)
    '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M10 9l4 2.5-4 2.5z"/>',      // demos (play)
    '<circle cx="9" cy="8" r="3"/><path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6M17 11a3 3 0 0 0 0-6"/>', // about (users)
    '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>', // AI automation (cpu)
  ];

  var css =
    '.sp-navbar{position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:55;}' +
    '.sp-navbar-inner{display:flex;align-items:center;gap:4px;background:rgba(12,12,14,.6);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(16px);padding:6px;border-radius:9999px;box-shadow:0 18px 50px rgba(0,0,0,.5);}' +
    '.sp-nav-item{position:relative;display:flex;align-items:center;gap:8px;cursor:pointer;font-family:Inter,system-ui,sans-serif;font-size:13px;font-weight:600;color:rgba(255,255,255,.7);text-decoration:none;padding:9px 16px;border-radius:9999px;transition:color .25s,background .25s;}' +
    '.sp-nav-item:hover{color:#fff;}' +
    '.sp-nav-item.active{color:#fff;background:rgba(255,255,255,.06);}' +
    '.sp-nav-item .sp-nav-ico{display:none;}' +
    '.sp-nav-item.active .sp-lamp{position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:30px;height:4px;background:#E23B4E;border-radius:6px 6px 0 0;box-shadow:0 0 14px 2px rgba(226,59,78,.7);}' +
    '.sp-lang{position:relative;display:flex;align-items:center;margin-left:4px;padding-left:6px;border-left:1px solid rgba(255,255,255,.12);}' +
    '.sp-lang-btn{display:inline-flex;align-items:center;gap:7px;cursor:pointer;border:0;background:transparent;font-family:Inter,system-ui,sans-serif;font-size:13px;font-weight:600;color:rgba(255,255,255,.7);padding:9px 14px;border-radius:9999px;transition:color .2s,background .2s;}' +
    '.sp-lang-btn:hover{color:#fff;background:rgba(255,255,255,.06);}' +
    '.sp-lang-btn .fl{width:20px;height:15px;border-radius:2px;object-fit:cover;display:block;}' +
    '.sp-lang-btn svg{opacity:.7;transition:transform .25s;}' +
    '.sp-lang.open .sp-lang-btn svg{transform:rotate(180deg);}' +
    '.sp-lang-menu{position:absolute;top:calc(100% + 12px);right:0;min-width:172px;background:rgba(12,12,14,.97);border:1px solid rgba(255,255,255,.12);border-radius:14px;overflow:hidden;backdrop-filter:blur(12px);box-shadow:0 20px 50px rgba(0,0,0,.5);}' +
    '.sp-lang-menu.hidden{display:none;}' +
    '.sp-lang-menu a{display:flex;align-items:center;gap:11px;padding:10px 15px;font-family:Inter,system-ui,sans-serif;font-size:13px;color:rgba(255,255,255,.82);text-decoration:none;transition:background .2s;}' +
    '.sp-lang-menu a:hover,.sp-lang-menu a.active{background:rgba(226,59,78,.16);color:#fff;}' +
    '.sp-lang-menu a .fl{width:20px;height:15px;border-radius:2px;object-fit:cover;display:block;}' +
    '.sp-chat-btn{position:fixed;right:18px;bottom:18px;z-index:65;border:0;background:transparent;padding:0;line-height:0;cursor:pointer;box-shadow:none;transition:transform .18s;}' +
    '.sp-chat-btn:hover{transform:translateY(-4px) scale(1.04);}' +
    '.sp-chat-btn img{height:150px;width:auto;display:block;filter:drop-shadow(0 8px 16px rgba(0,0,0,.45));pointer-events:none;}' +
    '.sp-chat{position:fixed;right:24px;bottom:186px;z-index:66;width:368px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 232px);display:flex;flex-direction:column;background:#0c0c0e;border:1px solid rgba(255,255,255,.12);border-radius:20px;overflow:hidden;box-shadow:0 30px 70px rgba(0,0,0,.6);opacity:0;transform:translateY(12px) scale(.98);pointer-events:none;transition:opacity .25s,transform .25s;}' +
    '.sp-chat.open{opacity:1;transform:none;pointer-events:auto;}' +
    '.sp-chat-head{display:flex;align-items:center;gap:11px;padding:13px 15px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02);}' +
    '.sp-chat-head img{width:38px;height:38px;border-radius:10px;background:#161619;object-fit:cover;}' +
    '.sp-chat-head b{color:#fff;font-size:14px;font-family:Archivo,sans-serif;}' +
    '.sp-chat-head span{display:block;font-size:11px;color:#34d399;}' +
    '.sp-chat-head .sp-chat-x{margin-left:auto;background:none;border:0;color:rgba(255,255,255,.5);font-size:22px;cursor:pointer;line-height:1;padding:0 4px;}' +
    '.sp-chat-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;}' +
    '.sp-msg{max-width:84%;padding:10px 13px;border-radius:14px;font-family:Inter,system-ui,sans-serif;font-size:13.5px;line-height:1.5;}' +
    '.sp-msg.bot{align-self:flex-start;background:#161619;color:rgba(255,255,255,.88);border-bottom-left-radius:4px;}' +
    '.sp-msg.user{align-self:flex-end;background:#E23B4E;color:#fff;border-bottom-right-radius:4px;}' +
    '.sp-msg a{color:#ff8a98;font-weight:600;}.sp-msg.user a{color:#fff;}' +
    '.sp-chips{display:flex;flex-wrap:wrap;gap:7px;padding:0 16px 10px;}' +
    '.sp-chip{font-family:Inter,system-ui,sans-serif;font-size:12px;color:#fff;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:9999px;padding:7px 12px;cursor:pointer;transition:background .2s;}' +
    '.sp-chip:hover{background:rgba(226,59,78,.2);}' +
    '.sp-chat-input{display:flex;gap:8px;padding:11px 13px;border-top:1px solid rgba(255,255,255,.08);}' +
    '.sp-chat-input input{flex:1;background:#161619;border:1px solid rgba(255,255,255,.12);border-radius:9999px;padding:10px 14px;color:#fff;font-size:13.5px;outline:none;}' +
    '.sp-chat-input input:focus{border-color:rgba(226,59,78,.6);}' +
    '.sp-chat-send{background:#fff;color:#0a0a0c;border:0;border-radius:50%;width:40px;height:40px;cursor:pointer;font-size:17px;display:grid;place-items:center;flex:none;}' +
    '.sp-soon-badge{display:inline-block;margin-left:7px;font:700 8px Space Mono,monospace;letter-spacing:.06em;text-transform:uppercase;color:#fbbf24;border:1px solid rgba(251,191,36,.45);border-radius:6px;padding:2px 6px;vertical-align:middle;white-space:nowrap;}' +
    '.sp-soon-banner{position:fixed;left:50%;top:118px;transform:translateX(-50%);z-index:54;display:flex;align-items:center;gap:9px;background:rgba(251,191,36,.12);border:1px solid rgba(251,191,36,.45);color:#fbbf24;font:700 11px Space Mono,monospace;letter-spacing:.1em;text-transform:uppercase;padding:9px 18px;border-radius:9999px;backdrop-filter:blur(8px);max-width:calc(100vw - 32px);text-align:center;}' +
    '.sp-soon-btn{opacity:.65 !important;cursor:not-allowed !important;}' +
    '@media (max-width:767px){.sp-soon-banner{top:104px;font-size:10px;padding:8px 14px;}}' +
    '@media (max-width:767px){.sp-nav-item .sp-nav-txt{display:none;}.sp-nav-item .sp-nav-ico{display:block;}.sp-nav-item{padding:11px 13px;}.sp-lang-btn{padding:9px 10px;}}' +
    '@media (max-width:520px){.sp-chat{right:12px;left:12px;width:auto;bottom:150px;}.sp-chat-btn{right:8px;bottom:8px;}.sp-chat-btn img{height:116px;}}' +
    '.sp-cookie{position:fixed;left:22px;bottom:22px;z-index:60;max-width:340px;padding:18px;background:rgba(12,12,14,.96);border:1px solid rgba(255,255,255,.12);border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.55);backdrop-filter:blur(12px);font-family:Inter,system-ui,sans-serif;transform:translateY(8px);opacity:0;transition:opacity .4s ease,transform .4s ease;}' +
    '.sp-cookie.in{opacity:1;transform:translateY(0);}' +
    '.sp-cookie .ck-title{font-weight:700;color:#fff;font-size:15px;}' +
    '.sp-cookie .ck-desc{margin-top:.6rem;font-size:13px;line-height:1.5;color:rgba(255,255,255,.62);}' +
    '.sp-cookie .ck-desc a{color:#E23B4E;text-decoration:none;}.sp-cookie .ck-desc a:hover{text-decoration:underline;}' +
    '.sp-cookie .ck-actions{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-top:1rem;}' +
    '.sp-cookie .ck-pref{font-size:12px;color:rgba(255,255,255,.7);text-decoration:underline;background:none;border:0;cursor:pointer;transition:color .3s;}' +
    '.sp-cookie .ck-pref:hover{color:rgba(255,255,255,.45);}' +
    '.sp-cookie .ck-accept{font-size:12px;font-weight:600;background:#fff;color:#0a0a0c;border:0;border-radius:9999px;padding:.625rem 1.1rem;cursor:pointer;transition:background .15s;}' +
    '.sp-cookie .ck-accept:hover{background:rgba(255,255,255,.85);}' +
    '@media (max-width:520px){.sp-cookie{left:12px;right:12px;max-width:none;}}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ── 1. Top-center "tubelight" navbar with the language menu built in ──
  {
    document.querySelectorAll('.lang-wrap').forEach(function (el) { el.style.display = 'none'; });
    var nav = document.createElement('nav');
    nav.className = 'sp-navbar';
    var inner = document.createElement('div');
    inner.className = 'sp-navbar-inner';
    navLabels.forEach(function (label, i) {
      var seg = SEGS[i];
      var href = base + (seg ? seg + '/' : '');
      var a = document.createElement('a');
      a.className = 'sp-nav-item' + (norm(href) === here ? ' active' : '');
      a.href = href;
      a.innerHTML =
        '<span class="sp-nav-txt">' + label + '</span>' +
        '<span class="sp-nav-ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + ICONS[i] + '</svg></span>' +
        '<span class="sp-lamp"></span>';
      inner.appendChild(a);
    });

    // Language control = last item inside the same pill
    var NAMES = { es: 'Español', en: 'English', fr: 'Français', de: 'Deutsch', it: 'Italiano' };
    var langWrap = document.createElement('div');
    langWrap.className = 'sp-lang';
    var langBtn = document.createElement('button');
    langBtn.type = 'button';
    langBtn.className = 'sp-lang-btn';
    langBtn.setAttribute('aria-haspopup', 'true');
    langBtn.setAttribute('aria-expanded', 'false');
    langBtn.innerHTML = flagImg(lang) + '<span>' + lang.toUpperCase() + '</span>' +
      '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>';
    var langMenu = document.createElement('div');
    langMenu.className = 'sp-lang-menu hidden';
    LANGS.forEach(function (t) {
      var la = document.createElement('a');
      if (t === lang) la.className = 'active';
      la.href = (t === 'es' ? '/' : '/' + t + '/') + pageSeg;
      la.setAttribute('hreflang', t);
      la.innerHTML = flagImg(t) + '<span>' + NAMES[t] + '</span>';
      langMenu.appendChild(la);
    });
    langWrap.appendChild(langBtn);
    langWrap.appendChild(langMenu);
    inner.appendChild(langWrap);

    nav.appendChild(inner);
    document.body.appendChild(nav);

    langBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = langMenu.classList.toggle('hidden') === false;
      langWrap.classList.toggle('open', open);
      langBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (langMenu.classList.contains('hidden')) return;
      if (e.target.closest('.sp-lang')) return;
      langMenu.classList.add('hidden');
      langWrap.classList.remove('open');
    });
  }

  // ── 2. Cookie consent ──
  if (!localStorageGet('sp_cookie_consent')) {
    var box = document.createElement('div');
    box.className = 'sp-cookie';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', ck.t);
    box.innerHTML =
      '<p class="ck-title">' + ck.t + '</p>' +
      '<p class="ck-desc">' + ck.d + ' <a href="' + base + 'privacidad/">' + ck.link + '</a>.</p>' +
      '<div class="ck-actions"><button type="button" class="ck-pref">' + ck.pref + '</button>' +
      '<button type="button" class="ck-accept">' + ck.ok + '</button></div>';
    if (barH) box.style.bottom = (barH + 14) + 'px';
    document.body.appendChild(box);
    requestAnimationFrame(function () { box.classList.add('in'); });

    function dismiss(value) {
      localStorageSet('sp_cookie_consent', value);
      box.classList.remove('in');
      setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 400);
    }
    box.querySelector('.ck-accept').addEventListener('click', function () { dismiss('all'); });
    box.querySelector('.ck-pref').addEventListener('click', function () { dismiss('essential'); });
  }

  // ── 3. Pulse chatbot (mascot button + scripted FAQ, no backend) ──
  {
    var TMAP = {
      es: { title: 'Pulse', sub: 'Asistente · en línea', greet: '¡Hola! Soy <b>Pulse</b> 🤖 Pregúntame por nuestros servicios, precios o cómo empezar.', chips: ['¿Qué hacéis?', 'Precios', '¿Cómo empiezo?', 'Hablar con un humano'], ph: 'Escribe tu pregunta…', fallback: 'Buena pregunta. Echa un ojo a [servicios] o habla con una persona en [contratar]. ¿Te abro una?' },
      en: { title: 'Pulse', sub: 'Assistant · online', greet: 'Hi! I\'m <b>Pulse</b> 🤖 Ask me about our services, pricing or how to get started.', chips: ['What do you do?', 'Pricing', 'How do I start?', 'Talk to a human'], ph: 'Type your question…', fallback: 'Good question. Check [servicios] or talk to a person at [contratar]. Want me to open one?' },
      fr: { title: 'Pulse', sub: 'Assistant · en ligne', greet: 'Salut ! Je suis <b>Pulse</b> 🤖 Pose-moi des questions sur nos services, nos tarifs ou comment démarrer.', chips: ['Que faites-vous ?', 'Tarifs', 'Comment démarrer ?', 'Parler à un humain'], ph: 'Écris ta question…', fallback: 'Bonne question. Regarde [servicios] ou parle à une personne sur [contratar]. Je t\'en ouvre une ?' },
      de: { title: 'Pulse', sub: 'Assistent · online', greet: 'Hallo! Ich bin <b>Pulse</b> 🤖 Frag mich nach unseren Leistungen, Preisen oder wie du startest.', chips: ['Was macht ihr?', 'Preise', 'Wie fange ich an?', 'Mit einem Menschen sprechen'], ph: 'Schreib deine Frage…', fallback: 'Gute Frage. Schau dir [servicios] an oder sprich mit jemandem über [contratar]. Soll ich eine öffnen?' },
      it: { title: 'Pulse', sub: 'Assistente · online', greet: 'Ciao! Sono <b>Pulse</b> 🤖 Chiedimi dei nostri servizi, prezzi o come iniziare.', chips: ['Cosa fate?', 'Prezzi', 'Come inizio?', 'Parlare con un umano'], ph: 'Scrivi la tua domanda…', fallback: 'Bella domanda. Guarda [servicios] o parla con una persona su [contratar]. Te ne apro una?' },
    };
    var IMAP = {
      es: [
        { k: ['que haceis', 'qué hacéis', 'que haces', 'servicio', 'ofrece', 'hacéis', 'haceis'], a: 'Hacemos 2 cosas: 1) <b>Webs</b> profesionales que venden (desde 49€/mes). 2) <b>Empleados IA</b>: Recepcionista IA (llamadas y WhatsApp 24/7), Social Media IA y Gestor de Ads. Todo en un panel simple. → [servicios]' },
        { k: ['precio', 'cuesta', 'coste', 'cuanto', 'cuánto', 'plan', 'tarifa'], a: 'Webs desde <b>49€/mes</b> (o 400€ pago único). Automatización IA: <b>Starter 99€ · Pro 199€ · Agency 299€/mes</b>. → [precios]' },
        { k: ['empez', 'empiezo', 'comenz', 'start', 'contratar', 'quiero', 'apunt'], a: 'Fácil: elige <b>Website</b> (te contactamos) o <b>AI Automation</b> (eliges plan). → [contratar] o [precios]. ¿Ya tienes cuenta? [login]' },
        { k: ['human', 'persona', 'contact', 'hablar', 'soporte', 'ayuda', 'llamar'], a: 'Te paso con una persona: déjanos tu proyecto en [contratar] y respondemos en menos de 24h.' },
        { k: ['recepcion', 'llamada', 'whatsapp', 'telefono', 'teléfono'], a: 'La <b>Recepcionista IA</b> atiende llamadas y WhatsApp 24/7 y avisa a un humano (SOS). Desde el plan Starter.' },
        { k: ['ads', 'anuncio', 'campaña', 'campana', 'publicidad', 'meta', 'tiktok'], a: 'El <b>Gestor de Ads</b> lanza y optimiza campañas Meta/TikTok con foco en ROI. Desde Pro. → [precios]' },
        { k: ['web', 'pagina', 'página', 'sitio'], a: 'Hacemos <b>webs a medida</b>, online en 7 días, desde 49€/mes sin pago inicial. → [contratar]' },
        { k: ['hola', 'buenas', 'hey', 'holi'], a: '¡Hola! ¿En qué te ayudo? Servicios, precios o empezar 🙂' },
        { k: ['gracias', 'genial', 'perfecto'], a: '¡A ti! Cuando quieras empezar: [precios] 🚀' },
      ],
      en: [
        { k: ['what do you', 'service', 'do you do', 'offer'], a: 'Two things: 1) <b>Websites</b> that sell (from €49/mo). 2) <b>AI employees</b>: AI Receptionist (calls & WhatsApp 24/7), Social Media AI and Ads Manager. All in one dashboard. → [servicios]' },
        { k: ['price', 'pricing', 'cost', 'how much', 'plan'], a: 'Websites from <b>€49/mo</b> (or €400 one-off). AI automation: <b>Starter €99 · Pro €199 · Agency €299/mo</b>. → [precios]' },
        { k: ['start', 'begin', 'get started', 'sign up', 'hire'], a: 'Easy: pick <b>Website</b> (we contact you) or <b>AI Automation</b> (choose a plan). → [contratar] or [precios]. Have an account? [login]' },
        { k: ['human', 'person', 'contact', 'support', 'help', 'talk'], a: 'I\'ll connect you with a person: drop your project at [contratar] and we reply within 24h.' },
        { k: ['reception', 'call', 'whatsapp', 'phone'], a: 'The <b>AI Receptionist</b> answers calls & WhatsApp 24/7 and escalates to a human (SOS). From the Starter plan.' },
        { k: ['ads', 'campaign', 'meta', 'tiktok'], a: 'The <b>Ads Manager</b> launches & optimizes Meta/TikTok campaigns with an ROI focus. From Pro. → [precios]' },
        { k: ['web', 'site', 'page'], a: 'We build <b>custom websites</b>, live in 7 days, from €49/mo with no upfront fee. → [contratar]' },
        { k: ['hi', 'hello', 'hey'], a: 'Hi! How can I help? Services, pricing or getting started 🙂' },
        { k: ['thanks', 'thank you', 'great'], a: 'Anytime! Whenever you\'re ready: [precios] 🚀' },
      ],
      fr: [
        { k: ['que faites', 'service', 'offrez', 'faites-vous', 'proposez'], a: 'Deux choses : 1) <b>Sites web</b> qui vendent (dès 49€/mois). 2) <b>Employés IA</b> : Réceptionniste IA (appels & WhatsApp 24/7), Réseaux sociaux IA et Gestion de pub. → [servicios]' },
        { k: ['prix', 'tarif', 'coûte', 'combien', 'plan'], a: 'Sites web dès <b>49€/mois</b> (ou 400€). Automatisation IA : <b>Starter 99€ · Pro 199€ · Agency 299€/mois</b>. → [precios]' },
        { k: ['commenc', 'démarr', 'start', 'inscri', 'débuter'], a: 'Facile : choisis <b>Website</b> (on te contacte) ou <b>AI Automation</b> (choisis un plan). → [contratar] ou [precios]. Déjà un compte ? [login]' },
        { k: ['humain', 'personne', 'contact', 'aide', 'parler'], a: 'Je te mets en relation avec une personne : laisse ton projet sur [contratar], réponse sous 24h.' },
        { k: ['salut', 'bonjour', 'coucou'], a: 'Salut ! Comment puis-je aider ? Services, tarifs ou démarrer 🙂' },
      ],
      de: [
        { k: ['was macht', 'leistung', 'service', 'bietet', 'angebot'], a: 'Zwei Dinge: 1) <b>Websites</b>, die verkaufen (ab 49€/Monat). 2) <b>KI-Mitarbeiter</b>: KI-Rezeption (Anrufe & WhatsApp 24/7), Social Media KI und Ads-Manager. → [servicios]' },
        { k: ['preis', 'kostet', 'wie viel', 'plan', 'tarif'], a: 'Websites ab <b>49€/Monat</b> (oder 400€). KI-Automation: <b>Starter 99€ · Pro 199€ · Agency 299€/Monat</b>. → [precios]' },
        { k: ['anfang', 'start', 'beginn', 'anmeld', 'starten'], a: 'Einfach: wähle <b>Website</b> (wir melden uns) oder <b>AI Automation</b> (Plan wählen). → [contratar] oder [precios]. Konto? [login]' },
        { k: ['mensch', 'person', 'kontakt', 'hilfe', 'sprechen'], a: 'Ich verbinde dich mit einer Person: hinterlasse dein Projekt auf [contratar], Antwort in unter 24h.' },
        { k: ['hallo', 'hi', 'hey', 'servus'], a: 'Hallo! Wie kann ich helfen? Leistungen, Preise oder Start 🙂' },
      ],
      it: [
        { k: ['cosa fate', 'servizi', 'offrite', 'fate', 'proponete'], a: 'Due cose: 1) <b>Siti web</b> che vendono (da 49€/mese). 2) <b>Dipendenti IA</b>: Receptionist IA (chiamate & WhatsApp 24/7), Social Media IA e Gestore Ads. → [servicios]' },
        { k: ['prezzo', 'prezzi', 'costa', 'quanto', 'piano'], a: 'Siti web da <b>49€/mese</b> (o 400€). Automazione IA: <b>Starter 99€ · Pro 199€ · Agency 299€/mese</b>. → [precios]' },
        { k: ['inizi', 'comincia', 'start', 'registr', 'partire'], a: 'Facile: scegli <b>Website</b> (ti contattiamo) o <b>AI Automation</b> (scegli un piano). → [contratar] o [precios]. Hai un account? [login]' },
        { k: ['umano', 'persona', 'contatt', 'aiuto', 'parlare'], a: 'Ti metto in contatto con una persona: lascia il tuo progetto su [contratar], rispondiamo entro 24h.' },
        { k: ['ciao', 'salve', 'hey'], a: 'Ciao! Come posso aiutarti? Servizi, prezzi o iniziare 🙂' },
      ],
    };
    var T = TMAP[lang] || TMAP.en;
    var INTENTS = IMAP[lang] || IMAP.en;
    var LBL = {
      servicios: { es: 'Servicios', en: 'Services', fr: 'Services', de: 'Leistungen', it: 'Servizi' },
      precios: { es: 'Precios', en: 'Pricing', fr: 'Tarifs', de: 'Preise', it: 'Prezzi' },
      login: { es: 'Iniciar sesión', en: 'Log in', fr: 'Connexion', de: 'Anmelden', it: 'Accedi' },
    };
    var LINKS = {
      servicios: [base + 'servicios/', LBL.servicios[lang] || LBL.servicios.en],
      precios: [base + 'precios/', LBL.precios[lang] || LBL.precios.en],
      contratar: [base + 'contratar/', 'Website'],
      login: ['/login/', LBL.login[lang] || LBL.login.en],
    };
    function linkify(s) { return s.replace(/\[(\w+)\]/g, function (m, k) { var L = LINKS[k]; return L ? '<a href="' + L[0] + '">' + L[1] + '</a>' : m; }); }
    function escc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
    function reply(text) {
      var t = text.toLowerCase();
      for (var i = 0; i < INTENTS.length; i++) {
        for (var j = 0; j < INTENTS[i].k.length; j++) {
          if (t.indexOf(INTENTS[i].k[j]) >= 0) return INTENTS[i].a;
        }
      }
      return T.fallback;
    }

    var cbtn = document.createElement('button');
    cbtn.type = 'button';
    cbtn.className = 'sp-chat-btn';
    cbtn.setAttribute('aria-label', 'Chat');
    cbtn.innerHTML = '<img src="/demo-media/chatbot-' + lang + '.png" alt="Pulse" />';
    if (barH) cbtn.style.bottom = (barH + 14) + 'px';

    var panel = document.createElement('div');
    panel.className = 'sp-chat';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', T.title);
    panel.innerHTML =
      '<div class="sp-chat-head"><img src="/mascot-favicon.png" alt="" /><div><b>' + T.title + '</b><span>' + T.sub + '</span></div><button class="sp-chat-x" type="button" aria-label="Cerrar">&times;</button></div>' +
      '<div class="sp-chat-body"></div>' +
      '<div class="sp-chips"></div>' +
      '<form class="sp-chat-input"><input type="text" placeholder="' + T.ph + '" autocomplete="off" /><button class="sp-chat-send" type="submit" aria-label="Enviar">&rarr;</button></form>';
    if (barH) panel.style.bottom = (barH + 182) + 'px';

    document.body.appendChild(cbtn);
    document.body.appendChild(panel);

    var cbody = panel.querySelector('.sp-chat-body');
    var cchips = panel.querySelector('.sp-chips');
    var cform = panel.querySelector('.sp-chat-input');
    var cinput = cform.querySelector('input');
    function add(text, who) {
      var m = document.createElement('div');
      m.className = 'sp-msg ' + who;
      m.innerHTML = who === 'bot' ? linkify(text) : escc(text);
      cbody.appendChild(m);
      cbody.scrollTop = cbody.scrollHeight;
    }
    function botReply(text) { setTimeout(function () { add(reply(text), 'bot'); }, 350); }
    var greeted = false;
    function openChat() { panel.classList.add('open'); if (!greeted) { greeted = true; add(T.greet, 'bot'); } cinput.focus(); }
    function closeChat() { panel.classList.remove('open'); }
    cbtn.addEventListener('click', function () { panel.classList.contains('open') ? closeChat() : openChat(); });
    panel.querySelector('.sp-chat-x').addEventListener('click', closeChat);
    T.chips.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'sp-chip';
      b.textContent = c;
      b.addEventListener('click', function () { add(c, 'user'); botReply(c); });
      cchips.appendChild(b);
    });
    cform.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = cinput.value.trim();
      if (!v) return;
      add(v, 'user');
      cinput.value = '';
      botReply(v);
    });
  }

  // ── 4. AI-automation launch freeze (toggle in flags.js) ──
  if (window.__COMINGSOON) {
    var SOON = (window.__COMINGSOON_LABEL && window.__COMINGSOON_LABEL[lang]) || 'Coming soon';
    var SOONS = (window.__COMINGSOON_SHORT && window.__COMINGSOON_SHORT[lang]) || 'Soon';

    // Block every payment trigger (capture phase, before precios.js / others).
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-checkout]');
      if (!b) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    }, true);

    // Relabel + soften the plan buttons.
    document.querySelectorAll('[data-checkout]').forEach(function (b) {
      b.classList.add('sp-soon-btn');
      b.textContent = SOON;
      b.setAttribute('aria-disabled', 'true');
    });

    // Badge the "AI Automation" nav item (it links to …/precios/).
    var aiItem = document.querySelector('.sp-nav-item[href$="precios/"]');
    if (aiItem && !aiItem.querySelector('.sp-soon-badge')) {
      var bdg = document.createElement('span');
      bdg.className = 'sp-soon-badge sp-nav-txt';
      bdg.textContent = SOONS;
      aiItem.appendChild(bdg);
    }

    // Banner on the AI pricing page.
    if (here === norm(base + 'precios/')) {
      var banner = document.createElement('div');
      banner.className = 'sp-soon-banner';
      banner.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:#fbbf24;display:inline-block;"></span>' + SOON;
      document.body.appendChild(banner);
    }
  }

  function localStorageGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function localStorageSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
})();
