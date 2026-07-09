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

  // Pages with a bottom sticky CTA lift the navbar + cookie above it.
  var stickyBar = document.querySelector('.sticky-bar');
  var barH = stickyBar ? (stickyBar.offsetHeight || 52) : 0;

  // ── i18n ──
  var NAV = {
    es: ['Inicio', 'Portfolio', 'About Me', 'Trabajar'],
    en: ['Home', 'Portfolio', 'About Me', 'Work With Me'],
    fr: ['Accueil', 'Portfolio', 'About Me', 'Travailler'],
    de: ['Start', 'Portfolio', 'About Me', 'Zusammenarbeiten'],
    it: ['Home', 'Portfolio', 'About Me', 'Lavora con me'],
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

  // segments line up with navLabels: home, portfolio, about, work inquiry.
  var SEGS = ['', 'demos', 'nosotros', 'contratar'];

  // ── styles ──
  var ICONS = [
    '<path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1Z"/>',          // home
    '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',         // portfolio
    '<circle cx="12" cy="8" r="4"/><path d="M6 21c1.3-3.2 3.3-5 6-5s4.7 1.8 6 5"/>',       // about
    '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 5V3h8v2M4 11h16M12 11v3"/>', // work inquiry
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
      es: { title: 'Pulse', sub: 'Asistente de Santi · en línea', greet: '¡Hola! Soy <b>Pulse</b>. Puedo contarte quién es Santi, qué certificados tiene, qué proyectos ha hecho y cómo pedirle una web o un sistema con IA.', chips: ['¿Quién es Santi?', 'Certificados', 'Qué puede hacer', 'Quiero trabajar con él'], ph: 'Escribe tu pregunta...', fallback: 'Buena pregunta. Puedo hablarte de Santi, su portfolio, certificados, webs, chatbots o cómo contactarlo. También puedes dejar tu proyecto en [contratar].' },
      en: { title: 'Pulse', sub: 'Santi assistant · online', greet: 'Hi! I am <b>Pulse</b>. I can tell you who Santi is, what certificates he has, what he builds, and how to ask for a website or AI project.', chips: ['Who is Santi?', 'Certificates', 'What can he build?', 'Work with him'], ph: 'Type your question...', fallback: 'Good question. I can explain Santi, his portfolio, certificates, websites, chatbots or how to contact him. You can also send a project at [contratar].' },
      fr: { title: 'Pulse', sub: 'Assistant de Santi · en ligne', greet: 'Salut ! Je suis <b>Pulse</b>. Je peux présenter Santi, ses certificats, ses projets et comment le contacter pour un site ou un projet IA.', chips: ['Qui est Santi ?', 'Certificats', 'Que peut-il faire ?', 'Travailler avec lui'], ph: 'Écris ta question...', fallback: 'Bonne question. Je peux parler de Santi, de son portfolio, de ses certificats, de sites web, de chatbots ou du contact. Tu peux aussi envoyer ton projet sur [contratar].' },
      de: { title: 'Pulse', sub: 'Santi-Assistent · online', greet: 'Hallo! Ich bin <b>Pulse</b>. Ich kann Santi, seine Zertifikate, seine Projekte und den Kontakt für Websites oder KI-Projekte erklären.', chips: ['Wer ist Santi?', 'Zertifikate', 'Was baut er?', 'Mit ihm arbeiten'], ph: 'Schreib deine Frage...', fallback: 'Gute Frage. Ich kann Santi, Portfolio, Zertifikate, Websites, Chatbots oder den Kontakt erklären. Du kannst dein Projekt auch über [contratar] senden.' },
      it: { title: 'Pulse', sub: 'Assistente di Santi · online', greet: 'Ciao! Sono <b>Pulse</b>. Posso raccontarti chi è Santi, i suoi certificati, i suoi progetti e come contattarlo per un sito o un progetto IA.', chips: ['Chi è Santi?', 'Certificati', 'Cosa crea?', 'Lavora con lui'], ph: 'Scrivi la tua domanda...', fallback: 'Bella domanda. Posso parlare di Santi, portfolio, certificati, siti, chatbot o contatto. Puoi anche inviare il progetto su [contratar].' },
    };
    var IMAP = {
      es: [
        { k: ['quien es santi', 'quién es santi', 'sobre santi', 'about me', 'sobre mi', 'sobre mí'], a: 'Santi es el creador de <b>SantiPulse</b>. Construye webs modernas, portfolios, asistentes con IA y chatbots para negocios. Está entre Tenerife y EE.UU. → [nosotros]' },
        { k: ['certificado', 'certificados', 'certification', 'certificate', 'cuantos certificados', 'cuántos certificados'], a: 'Santi tiene <b>10+ certificados verificados</b> entre IA, machine learning, ciberseguridad, seguridad laboral y electricidad. Los principales: AWS Machine Learning Basics, LinkedIn Generative AI, HP LIFE AI for Business Professionals, HP LIFE AI for Beginners y Cisco Cybersecurity. → [nosotros]' },
        { k: ['que sabe', 'qué sabe', 'habilidad', 'skills', 'bueno', 'especialidad'], a: 'Lo más fuerte de Santi: diseño web visual, páginas rápidas, formularios/contacto, portfolio profesional, chatbots con IA y entender negocios locales.' },
        { k: ['que hace', 'qué hace', 'servicio', 'ofrece', 'puede hacer', 'construir'], a: 'Puede construir <b>webs para negocios</b>, portfolios personales, landing pages, asistentes IA, chatbots de preguntas frecuentes, analizadores y dashboards simples. Mira ejemplos en [demos].' },
        { k: ['web', 'pagina', 'página', 'sitio'], a: 'Si quieres una web, Santi puede hacer una página clara con hero, servicios, portfolio, formulario, WhatsApp, móvil y SEO básico. Cuéntale tu idea en [contratar].' },
        { k: ['ia', 'ai', 'chatbot', 'assistant', 'asistente'], a: 'Para IA, Santi puede preparar chatbots de soporte, asistentes de seguros, formularios inteligentes y sistemas para ordenar leads. Lo mejor es explicar el caso en [contratar].' },
        { k: ['portfolio', 'trabajos', 'proyectos', 'clientes', 'demos'], a: 'El portfolio empieza con proyectos reales como Barberia El Estimado, VALS BASL y Sol Morena Car Collection. También incluye previews de webs y proyectos IA en progreso como Easy Insurance. → [demos]' },
        { k: ['empez', 'empiezo', 'comenz', 'start', 'contratar', 'quiero', 'trabajar', 'hire'], a: 'Para trabajar con Santi, deja tu nombre, email y una explicación corta del proyecto en [contratar]. No hay checkout público ahora mismo; primero se habla del proyecto.' },
        { k: ['human', 'persona', 'contact', 'hablar', 'soporte', 'ayuda', 'llamar', 'whatsapp'], a: 'Puedes escribirle desde el formulario de [contratar]. Si quieres algo rápido, menciona tu negocio, qué necesitas y cuándo te gustaría tenerlo.' },
        { k: ['precio', 'cuesta', 'coste', 'cuanto', 'cuánto', 'plan', 'tarifa'], a: 'Ahora mismo Santi no muestra precios públicos. Cada proyecto se revisa según alcance, urgencia, contenido y si incluye IA. Envíale la idea en [contratar].' },
        { k: ['hola', 'buenas', 'hey', 'holi'], a: '¡Hola! Puedo contarte sobre Santi, certificados, portfolio, webs, IA o cómo pedir un proyecto.' },
        { k: ['gracias', 'genial', 'perfecto'], a: '¡A ti! Cuando quieras, puedes enviar el proyecto por [contratar].' },
      ],
      en: [
        { k: ['who is santi', 'about santi', 'about me'], a: 'Santi is the creator of <b>SantiPulse</b>. He builds modern websites, portfolios, AI assistants and chatbots for businesses. → [nosotros]' },
        { k: ['certificate', 'certificates', 'certification', 'how many'], a: 'Santi has <b>10+ verified certificates</b> across AI, machine learning, cybersecurity, workplace safety and electrical training. Main ones: AWS Machine Learning Basics, LinkedIn Generative AI, HP LIFE AI for Business Professionals, HP LIFE AI for Beginners and Cisco Cybersecurity. → [nosotros]' },
        { k: ['skill', 'good at', 'specialty', 'speciality'], a: 'His strongest areas are visual web design, fast landing pages, contact forms, professional portfolios, AI chatbots and local-business workflows.' },
        { k: ['what do you', 'service', 'do you do', 'offer', 'build'], a: 'He can build business websites, personal portfolios, landing pages, AI assistants, FAQ chatbots, analyzers and simple dashboards. See the portfolio at [demos].' },
        { k: ['web', 'site', 'page'], a: 'For websites, Santi can create a clear page with hero, services, portfolio, contact form, WhatsApp, mobile optimization and basic SEO. Send the idea at [contratar].' },
        { k: ['ai', 'chatbot', 'assistant'], a: 'For AI, Santi can prepare support chatbots, insurance assistants, smart forms and lead organizers. Explain the use case at [contratar].' },
        { k: ['portfolio', 'projects', 'clients', 'demos'], a: 'The portfolio starts with real projects like Barberia El Estimado, VALS BASL and Sol Morena Car Collection. It also includes website previews and upcoming AI work like Easy Insurance. → [demos]' },
        { k: ['start', 'begin', 'get started', 'hire', 'work'], a: 'To work with Santi, send your name, email and a short project description at [contratar]. There is no public checkout right now; the project is discussed first.' },
        { k: ['price', 'pricing', 'cost', 'how much', 'plan'], a: 'Santi is not showing public prices right now. Each project depends on scope, speed, content and whether it includes AI. Send the idea at [contratar].' },
        { k: ['human', 'person', 'contact', 'support', 'help', 'talk'], a: 'Send the project through [contratar]. Include your business, what you need and the rough timeline.' },
        { k: ['hi', 'hello', 'hey'], a: 'Hi! Ask me about Santi, certificates, portfolio, websites, AI or how to request a project.' },
        { k: ['thanks', 'thank you', 'great'], a: 'Anytime. When you are ready, send the project at [contratar].' },
      ],
    };
    var T = TMAP[lang] || TMAP.en;
    var INTENTS = IMAP[lang] || IMAP.en;
    var LBL = {
      servicios: { es: 'Servicios', en: 'Services', fr: 'Services', de: 'Leistungen', it: 'Servizi' },
      nosotros: { es: 'About Me', en: 'About Me', fr: 'About Me', de: 'About Me', it: 'About Me' },
    };
    var LINKS = {
      servicios: [base + 'servicios/', LBL.servicios[lang] || LBL.servicios.en],
      contratar: [base + 'contratar/', 'Work With Me'],
      demos: [base + 'demos/', 'Portfolio'],
      nosotros: [base + 'nosotros/', LBL.nosotros[lang] || LBL.nosotros.en],
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

  function localStorageGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function localStorageSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
})();
