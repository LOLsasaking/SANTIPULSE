/* Demos — expandable cards (list → modal). Click a row to expand; Play opens
   the live website. Descriptions come translated from #i18n-data. */
(function () {
  'use strict';

  var I18N = {};
  try { I18N = JSON.parse(document.getElementById('i18n-data').textContent); } catch (e) { I18N = {}; }
  var D = I18N.items || {};

  var WEBSITES = [
    { key: 'onfleek', name: 'On Fleek', type: 'video', media: 'demo-media/onfleek.mp4', url: 'https://on-fleek-ten.vercel.app/' },
    { key: 'suehtam', name: 'SUEHTAM', type: 'video', media: 'demo-media/suehtam.mp4', url: 'https://suehtam.vercel.app/' },
    { key: 'estimado', name: 'Barberia El Estimado', type: 'video', media: 'demo-media/estimado-web.mp4', url: 'https://www.barberiaelestimado.com/' },
    { key: 'urban', name: 'El Estimado Urban', type: 'image', media: 'demo-media/elestimado.jpg', url: 'https://barber-templates.vercel.app/urban' },
    { key: 'burgur', name: 'BURGUR', type: 'video', media: 'demo-media/burgur.mp4', url: 'https://restaurant-templates-rosy.vercel.app/burger.html' },
    { key: 'sakana', name: 'SAKANA', type: 'video', media: 'demo-media/sakana.mp4', url: 'https://restaurant-templates-rosy.vercel.app/sushi.html' },
    { key: 'tours', name: 'Tenerife Tours', type: 'video', media: 'demo-media/tenerife-tours.mp4', url: 'https://tenerife-tours.vercel.app/' },
    { key: 'vals', name: 'VALS', type: 'video', media: 'demo-media/vals.mp4', url: 'https://vals-xi.vercel.app/' },
    { key: 'megasur', name: 'MEGASUR Tenerife', type: 'video', media: 'demo-media/megasur.mp4', url: 'https://megasur-tenerife-demo.vercel.app/' },
    // ── NEW (2026-06-13) — live on Vercel.
    { key: 'elevate', name: 'ELEVATE Barber', type: 'video', media: 'demo-media/elevate-barber.mp4', url: 'https://elevate-barbershop-cyan.vercel.app/' },
    { key: 'bmwm3', name: 'BMW E30 M3', type: 'video', media: 'demo-media/bmw-e30.mp4', url: 'https://bmw-clone-eosin.vercel.app/', cat: '3d' },
    { key: 'lara', name: 'The Lara Collection', type: 'video', media: 'demo-media/lara-collection.mp4', url: 'https://lara-collection.vercel.app/' },
    { key: 'rentalmiami', name: 'Mirador Miami Estate', type: 'video', media: 'demo-media/rental-miami/rental place hero.mp4', url: '/demo-media/rental-miami/' },
  ];
  var DISPLAY_WEBSITES = WEBSITES;

  var PANELS = ['demo-media/panel-1.jpg', 'demo-media/panel-2.jpg', 'demo-media/panel-3.jpg'];

  var prefix = '';
  var me = document.querySelector('script[src*="demos.js"]');
  if (me) prefix = me.getAttribute('src').split('?')[0].replace(/demos\.js$/, '');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
  // Show the actual website: for videos render the first frame (#t=0.5) instead
  // of the generic panel poster; for image demos use the screenshot directly.
  function thumb(w) {
    if (w.type === 'image') return '<img src="' + prefix + w.media + '" alt="" loading="lazy" />';
    return '<video src="' + prefix + w.media + '#t=0.5" muted playsinline preload="metadata"></video>';
  }

  // Category labels per language (short titles; card descriptions come from #i18n-data)
  var LANG = (document.documentElement.lang || 'es').slice(0, 2);
  var LABELS = {
    es: { threed: 'Sitios Web 3D', threedSub: 'Experiencias WebGL interactivas', web: 'Webs & Plantillas', webSub: 'Sitios reales y plantillas en vivo' },
    en: { threed: '3D Websites', threedSub: 'Interactive WebGL experiences', web: 'Websites & Templates', webSub: 'Real sites and live templates' },
    de: { threed: '3D-Websites', threedSub: 'Interaktive WebGL-Erlebnisse', web: 'Websites & Vorlagen', webSub: 'Echte Seiten und Live-Vorlagen' },
    fr: { threed: 'Sites Web 3D', threedSub: 'Expériences WebGL interactives', web: 'Sites & Modèles', webSub: 'Sites réels et modèles en direct' },
    it: { threed: 'Siti Web 3D', threedSub: 'Esperienze WebGL interattive', web: 'Siti & Template', webSub: 'Siti reali e template dal vivo' }
  };
  var L = LABELS[LANG] || LABELS.es;

  var PORTFOLIO_COPY = {
    es: {
      navAbout: 'Sobre mi',
      navProjects: 'Proyectos',
      navContact: 'Contacto',
      hero: 'Hola, soy Santi',
      role: 'creo webs con personalidad, movimiento y sistemas que ayudan a vender mas',
      aboutTitle: 'Sobre mi',
      about: 'Soy Santi, creador de SantiPulse. Construyo webs reales para negocios, experiencias 3D y automatizaciones con IA que convierten una pagina normal en algo que se recuerda. Cada proyecto esta pensado para que el cliente vea valor rapido, confie y de el siguiente paso.',
      projectsTitle: 'Proyectos',
      projectsIntro: 'Todas las demos reales de SantiPulse en una sola experiencia.',
      contact: 'Contactar',
      finalTitle: 'Creamos tu web',
      preview: 'Vista rapida',
      open: 'Ver proyecto',
      count: 'demos en vivo',
      category3d: 'Web 3D',
      categoryRental: 'Alquiler de lujo',
      categoryPortfolio: 'Portfolio',
      categoryWeb: 'Web real'
    },
    en: {
      navAbout: 'About',
      navProjects: 'Projects',
      navContact: 'Contact',
      hero: "Hi, i'm Santi",
      role: 'i create websites with personality, motion and systems that help businesses sell',
      aboutTitle: 'About me',
      about: "I'm Santi, the creator behind SantiPulse. I build real websites for businesses, 3D web experiences and AI automations that turn a normal page into something people remember. Every project is shaped so a visitor sees value fast, trusts the brand and takes the next step.",
      projectsTitle: 'Projects',
      projectsIntro: 'Every live SantiPulse demo in one portfolio experience.',
      contact: 'Contact me',
      finalTitle: "Let's build",
      preview: 'Quick view',
      open: 'Live project',
      count: 'live demos',
      category3d: '3D Web',
      categoryRental: 'Luxury rental',
      categoryPortfolio: 'Portfolio',
      categoryWeb: 'Real website'
    },
    fr: {
      navAbout: 'A propos',
      navProjects: 'Projets',
      navContact: 'Contact',
      hero: 'Salut, je suis Santi',
      role: 'je cree des sites avec du caractere, du mouvement et des systemes qui vendent',
      aboutTitle: 'A propos',
      about: 'Je suis Santi, le createur de SantiPulse. Je construis des sites reels pour les entreprises, des experiences web 3D et des automatisations IA qui transforment une page normale en experience memorable.',
      projectsTitle: 'Projets',
      projectsIntro: 'Toutes les demos SantiPulse dans une seule experience portfolio.',
      contact: 'Me contacter',
      finalTitle: 'Creons votre site',
      preview: 'Apercu',
      open: 'Voir le projet',
      count: 'demos en direct',
      category3d: 'Web 3D',
      categoryRental: 'Location luxe',
      categoryPortfolio: 'Portfolio',
      categoryWeb: 'Site reel'
    },
    de: {
      navAbout: 'Uber mich',
      navProjects: 'Projekte',
      navContact: 'Kontakt',
      hero: 'Hi, ich bin Santi',
      role: 'ich baue Websites mit Charakter, Bewegung und Systemen, die verkaufen helfen',
      aboutTitle: 'Uber mich',
      about: 'Ich bin Santi, der Creator hinter SantiPulse. Ich baue echte Websites fur Unternehmen, 3D-Web-Erlebnisse und KI-Automationen, die aus einer normalen Seite etwas machen, das man im Kopf behalt.',
      projectsTitle: 'Projekte',
      projectsIntro: 'Alle Live-Demos von SantiPulse in einer Portfolio-Erfahrung.',
      contact: 'Kontakt',
      finalTitle: 'Lass uns bauen',
      preview: 'Vorschau',
      open: 'Projekt ansehen',
      count: 'Live-Demos',
      category3d: '3D Web',
      categoryRental: 'Luxus-Miete',
      categoryPortfolio: 'Portfolio',
      categoryWeb: 'Echte Website'
    },
    it: {
      navAbout: 'Chi sono',
      navProjects: 'Progetti',
      navContact: 'Contatto',
      hero: 'Ciao, sono Santi',
      role: 'creo siti con personalita, movimento e sistemi che aiutano a vendere',
      aboutTitle: 'Chi sono',
      about: 'Sono Santi, il creator dietro SantiPulse. Costruisco siti reali per aziende, esperienze web 3D e automazioni IA che trasformano una pagina normale in qualcosa che resta impresso.',
      projectsTitle: 'Progetti',
      projectsIntro: 'Tutte le demo SantiPulse in una sola esperienza portfolio.',
      contact: 'Contattami',
      finalTitle: 'Costruiamo',
      preview: 'Anteprima',
      open: 'Vedi progetto',
      count: 'demo live',
      category3d: 'Web 3D',
      categoryRental: 'Affitto luxury',
      categoryPortfolio: 'Portfolio',
      categoryWeb: 'Sito reale'
    }
  };
  var P = PORTFOLIO_COPY[LANG] || PORTFOLIO_COPY.es;

  function applyPortfolioCopy() {
    document.querySelectorAll('[data-copy]').forEach(function (node) {
      var key = node.getAttribute('data-copy');
      if (P[key]) node.textContent = P[key];
    });
  }

  function categoryFor(w) {
    if (w.key === 'rentalmiami') return P.categoryRental;
    if (w.cat === '3d') return P.category3d;
    return P.categoryWeb;
  }

  function mediaHtml(w, className, extra) {
    className = className || '';
    extra = extra || '';
    if (w.type === 'image') return '<img class="' + className + '" src="' + prefix + w.media + '" alt="" loading="lazy" ' + extra + '/>';
    return '<video class="' + className + '" src="' + prefix + w.media + '#t=0.5" muted loop playsinline preload="metadata" ' + extra + '></video>';
  }

  function renderPortfolioMarquee() {
    var a = document.getElementById('portfolio-marquee-a');
    var b = document.getElementById('portfolio-marquee-b');
    if (!a || !b) return;
    var first = DISPLAY_WEBSITES.slice(0, Math.ceil(DISPLAY_WEBSITES.length / 2));
    var second = DISPLAY_WEBSITES.slice(Math.ceil(DISPLAY_WEBSITES.length / 2));
    function row(items) {
      return items.concat(items).map(function (w) {
        return '<div class="marquee-tile">' + mediaHtml(w, '', 'autoplay') + '</div>';
      }).join('');
    }
    a.innerHTML = row(first);
    b.innerHTML = row(second.length ? second : first);
  }

  function renderPortfolioProjects() {
    var target = document.getElementById('portfolio-projects');
    if (!target) return;
    var count = document.getElementById('portfolio-count');
    if (count) count.textContent = DISPLAY_WEBSITES.length + ' ' + P.count;

    target.innerHTML = DISPLAY_WEBSITES.map(function (w, i) {
      var n = String(i + 1).padStart(2, '0');
      var desc = D[w.key] || '';
      return '<article class="portfolio-card is-in" data-demo-card="' + i + '" style="z-index:' + (i + 1) + ';--pop-delay:' + Math.min(i * 55, 700) + 'ms">' +
        '<div class="portfolio-media">' + mediaHtml(w, '', 'autoplay') + '</div>' +
        '<div class="portfolio-info">' +
          '<div>' +
            '<div class="portfolio-num">' + n + '</div>' +
            '<p class="portfolio-cat">' + esc(categoryFor(w)) + '</p>' +
            '<h3 class="portfolio-name">' + esc(w.name) + '</h3>' +
            '<p class="portfolio-desc">' + esc(desc) + '</p>' +
          '</div>' +
          '<div class="portfolio-actions">' +
            '<button class="outline-btn" type="button" data-preview="' + i + '">' + esc(P.preview) + '</button>' +
            '<a class="outline-btn" href="' + esc(demoUrl(w)) + '"' + (/^(https?:)?\/\//.test(demoUrl(w)) ? ' target="_blank" rel="noopener"' : '') + '>' + esc(P.open) + '</a>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('');

    target.addEventListener('click', function (e) {
      var preview = e.target.closest('[data-preview]');
      if (preview) {
        e.preventDefault();
        openModal(+preview.getAttribute('data-preview'));
      }
    });
  }

  function observePortfolioVideos() {
    var videos = document.querySelectorAll('.marquee video[autoplay], #portfolio-projects video[autoplay]');
    if (!videos.length) return;
    if (!('IntersectionObserver' in window)) {
      videos.forEach(function (video) {
        var play = video.play();
        if (play && play.catch) play.catch(function () {});
      });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target;
        if (entry.isIntersecting) {
          var play = video.play();
          if (play && play.catch) play.catch(function () {});
        } else if (!video.paused) {
          video.pause();
        }
      });
    }, { rootMargin: '160px' });
    videos.forEach(function (video) { io.observe(video); });
  }

  function enableMascotMagnet() {
    var mascot = document.querySelector('[data-mascot-magnet]');
    if (!mascot || (window.matchMedia && window.matchMedia('(hover: none)').matches)) return;
    function reset() {
      mascot.classList.remove('is-active');
      mascot.style.transform = 'translate3d(-50%,0,0)';
    }
    mascot.addEventListener('mousemove', function (event) {
      var rect = mascot.getBoundingClientRect();
      var x = (event.clientX - (rect.left + rect.width / 2)) / 7;
      var y = (event.clientY - (rect.top + rect.height / 2)) / 7;
      mascot.classList.add('is-active');
      mascot.style.transform = 'translate3d(calc(-50% + ' + x.toFixed(1) + 'px),' + y.toFixed(1) + 'px,0)';
    });
    mascot.addEventListener('mouseleave', reset);
    reset();
  }

  function cardHtml(w, i) {
    return '<div class="exp-card" data-i="' + i + '">' +
      '<div class="exp-thumb">' + thumb(w) + '</div>' +
      '<div class="exp-meta"><h3>' + esc(w.name) + '</h3></div>' +
      '<button class="exp-play" type="button" data-play="' + i + '">Play</button>' +
      '</div>';
  }
  function groupHead(title, sub) {
    return '<div class="exp-group-head"><span class="eyebrow">' + esc(title) + '</span>' +
      (sub ? '<p class="exp-group-sub">' + esc(sub) + '</p>' : '') + '</div>';
  }
  function demoUrl(w) {
    if (/^(https?:)?\/\//.test(w.url) || w.url.charAt(0) === '/') return w.url;
    var url = prefix + w.url;
    return url;
  }

  // ── List (grouped: 3D websites first, then the rest) ──
  var gallery = document.getElementById('gallery');
  if (gallery) {
    var g3d = [], gWeb = [];
    DISPLAY_WEBSITES.forEach(function (w, i) {
      (w.cat === '3d' ? g3d : gWeb).push(cardHtml(w, i));
    });
    var html = '';
    if (g3d.length) html += groupHead(L.threed, L.threedSub) + g3d.join('');
    if (gWeb.length) html += groupHead(L.web, L.webSub) + gWeb.join('');
    gallery.innerHTML = html;
  }

  // ── Modal ──
  var overlay = document.createElement('div');
  overlay.className = 'exp-overlay';
  var modal = document.createElement('div');
  modal.className = 'exp-modal';
  modal.innerHTML =
    '<div class="exp-dialog">' +
      '<button class="exp-x" type="button" aria-label="Cerrar">&times;</button>' +
      '<div class="exp-media-wrap"></div>' +
      '<div class="exp-head"><div><h2></h2><p class="dom"></p></div><a class="outline-btn" target="_blank" rel="noopener"></a></div>' +
      '<div class="exp-bodytext"></div>' +
    '</div>';
  document.body.appendChild(overlay);
  document.body.appendChild(modal);

  function openModal(i) {
    var w = DISPLAY_WEBSITES[i];
    modal.querySelector('h2').textContent = w.name;
    modal.querySelector('.dom').textContent = '';
    modal.querySelector('.dom').hidden = true;
    modal.querySelector('.exp-bodytext').textContent = D[w.key] || '';
    var play = modal.querySelector('a.outline-btn');
    play.href = demoUrl(w);
    play.textContent = P.open;
    var mw = modal.querySelector('.exp-media-wrap');
    mw.innerHTML = w.type === 'video'
      ? '<video class="exp-media" src="' + prefix + w.media + '#t=0.5" autoplay loop muted playsinline></video>'
      : '<img class="exp-media" src="' + prefix + w.media + '" alt="" />';
    overlay.classList.add('open');
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    overlay.classList.remove('open');
    modal.classList.remove('open');
    document.body.style.overflow = '';
    var v = modal.querySelector('video');
    if (v) { try { v.pause(); } catch (e) {} }
  }

  if (gallery) {
    gallery.addEventListener('click', function (e) {
      var play = e.target.closest('[data-play]');
      if (play) { e.stopPropagation(); window.open(demoUrl(DISPLAY_WEBSITES[+play.getAttribute('data-play')]), '_blank', 'noopener'); return; }
      var card = e.target.closest('.exp-card');
      if (card) openModal(+card.getAttribute('data-i'));
    });
  }
  overlay.addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  modal.querySelector('.exp-x').addEventListener('click', closeModal);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  applyPortfolioCopy();
  renderPortfolioMarquee();
  renderPortfolioProjects();
  observePortfolioVideos();
  enableMascotMagnet();
})();
