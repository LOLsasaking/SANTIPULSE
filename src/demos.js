/* Demos — expandable cards (list → modal). Click a row to expand; Play opens
   the live website. Descriptions come translated from #i18n-data. */
(function () {
  'use strict';

  var I18N = {};
  try { I18N = JSON.parse(document.getElementById('i18n-data').textContent); } catch (e) { I18N = {}; }
  var D = I18N.items || {};

  var WEBSITES = [
    { key: 'estimado', name: 'Barberia El Estimado', type: 'video', media: 'demo-media/estimado-web.mp4', url: 'https://www.barberiaelestimado.com/', cat: 'client' },
    { key: 'vals', name: 'VALS', type: 'video', media: 'demo-media/vals.mp4', url: 'https://vals-xi.vercel.app/', cat: 'client' },
    { key: 'megasur', name: 'MEGASUR Tenerife', type: 'video', media: 'demo-media/megasur.mp4', url: 'https://megasur-tenerife-demo.vercel.app/', cat: 'client' },
    { key: 'insurance', name: 'AI Insurance Assistant', type: 'placeholder', media: '', url: '', cat: 'coming', soon: true },
    { key: 'elecsafety', name: 'Electrical Safety Chatbot', type: 'image', media: 'demo-media/chatbot-es.png', url: '', cat: 'coming', soon: true },
    { key: 'resume', name: 'Resume Analyzer AI', type: 'placeholder', media: '', url: '', cat: 'coming', soon: true },
    { key: 'autodash', name: 'Business Automation Dashboard', type: 'placeholder', media: '', url: '', cat: 'coming', soon: true },
    { key: 'onfleek', name: 'On Fleek', type: 'video', media: 'demo-media/onfleek.mp4', url: 'https://on-fleek-ten.vercel.app/' },
    { key: 'suehtam', name: 'SUEHTAM', type: 'video', media: 'demo-media/suehtam.mp4', url: 'https://suehtam.vercel.app/' },
    { key: 'urban', name: 'El Estimado Urban', type: 'image', media: 'demo-media/elestimado.jpg', url: 'https://barber-templates.vercel.app/urban' },
    { key: 'burgur', name: 'BURGUR', type: 'video', media: 'demo-media/burgur.mp4', url: 'https://restaurant-templates-rosy.vercel.app/burger.html' },
    { key: 'sakana', name: 'SAKANA', type: 'video', media: 'demo-media/sakana.mp4', url: 'https://restaurant-templates-rosy.vercel.app/sushi.html' },
    { key: 'tours', name: 'Tenerife Tours', type: 'video', media: 'demo-media/tenerife-tours.mp4', url: 'https://tenerife-tours.vercel.app/' },
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
      role: 'creo webs, herramientas de IA y automatizaciones que puedo llevar a proyectos reales',
      aboutTitle: 'Sobre mi',
      about: 'Soy Santi, creador de SantiPulse. Este portfolio enseña webs reales para clientes, proyectos de IA que estoy preparando y demos que muestran mi forma de construir. Busco convertir esta experiencia en oportunidades de trabajo, colaboraciones y nuevos clientes.',
      projectsTitle: 'Proyectos',
      projectsIntro: 'Primero, tres webs reales de clientes. Después, proyectos que iré añadiendo poco a poco.',
      contact: 'Trabajar conmigo',
      finalTitle: 'Trabajemos juntos',
      preview: 'Vista rapida',
      open: 'Ver proyecto',
      count: 'demos en vivo',
      normalTitle: 'Webs normales',
      threeDTitle: 'Webs 3D',
      sectionCount: 'proyectos',
      category3d: 'Web 3D',
      categoryRental: 'Alquiler de lujo',
      categoryPortfolio: 'Portfolio',
      categoryWeb: 'Web real',
      clientsTitle: 'Webs de clientes',
      comingTitle: 'Próximos proyectos',
      websitesTitle: 'Webs & Plantillas',
      categoryClient: 'Cliente real',
      categoryComing: 'En desarrollo',
      soon: 'Próximamente'
    },
    en: {
      navAbout: 'About',
      navProjects: 'Projects',
      navContact: 'Contact',
      hero: "Hi, i'm Santi",
      role: 'i build websites, AI tools and automation projects that can ship into real work',
      aboutTitle: 'About me',
      about: "I'm Santi, the creator behind SantiPulse. This portfolio shows real client websites, AI projects I am preparing and demos that show how I build. I want this site to open doors to work, collaborations and new clients.",
      projectsTitle: 'Projects',
      projectsIntro: 'First, three real client websites. Then, projects I will keep adding over time.',
      contact: 'Work with me',
      finalTitle: 'Work with me',
      preview: 'Quick view',
      open: 'Live project',
      count: 'live demos',
      normalTitle: 'Normal websites',
      threeDTitle: '3D websites',
      sectionCount: 'projects',
      category3d: '3D Web',
      categoryRental: 'Luxury rental',
      categoryPortfolio: 'Portfolio',
      categoryWeb: 'Real website',
      clientsTitle: 'Client Websites',
      comingTitle: 'Coming Next',
      websitesTitle: 'Websites & Templates',
      categoryClient: 'Real client',
      categoryComing: 'In development',
      soon: 'Coming soon'
    },
    fr: {
      navAbout: 'A propos',
      navProjects: 'Projets',
      navContact: 'Contact',
      hero: 'Salut, je suis Santi',
      role: 'je cree des sites, outils IA et automatisations prets pour de vrais projets',
      aboutTitle: 'A propos',
      about: 'Je suis Santi, le createur de SantiPulse. Ce portfolio presente des sites reels pour clients, des projets IA en preparation et des demos qui montrent ma facon de construire.',
      projectsTitle: 'Projets',
      projectsIntro: 'D abord, trois vrais sites clients. Ensuite, les projets que j ajouterai petit a petit.',
      contact: 'Travailler avec moi',
      finalTitle: 'Travaillons ensemble',
      preview: 'Apercu',
      open: 'Voir le projet',
      count: 'demos en direct',
      normalTitle: 'Sites classiques',
      threeDTitle: 'Sites 3D',
      sectionCount: 'projets',
      category3d: 'Web 3D',
      categoryRental: 'Location luxe',
      categoryPortfolio: 'Portfolio',
      categoryWeb: 'Site reel',
      clientsTitle: 'Sites clients',
      comingTitle: 'Prochains projets',
      websitesTitle: 'Sites & Modeles',
      categoryClient: 'Client reel',
      categoryComing: 'En developpement',
      soon: 'Bientot'
    },
    de: {
      navAbout: 'Uber mich',
      navProjects: 'Projekte',
      navContact: 'Kontakt',
      hero: 'Hi, ich bin Santi',
      role: 'ich baue Websites, KI-Tools und Automationen fuer echte Projekte',
      aboutTitle: 'Uber mich',
      about: 'Ich bin Santi, der Creator hinter SantiPulse. Dieses Portfolio zeigt echte Kunden-Websites, KI-Projekte in Vorbereitung und Demos, die zeigen, wie ich baue.',
      projectsTitle: 'Projekte',
      projectsIntro: 'Zuerst drei echte Kunden-Websites. Danach Projekte, die ich Schritt fuer Schritt ergaenze.',
      contact: 'Mit mir arbeiten',
      finalTitle: 'Lass uns arbeiten',
      preview: 'Vorschau',
      open: 'Projekt ansehen',
      count: 'Live-Demos',
      normalTitle: 'Normale Websites',
      threeDTitle: '3D-Websites',
      sectionCount: 'Projekte',
      category3d: '3D Web',
      categoryRental: 'Luxus-Miete',
      categoryPortfolio: 'Portfolio',
      categoryWeb: 'Echte Website',
      clientsTitle: 'Kunden-Websites',
      comingTitle: 'Als Naechstes',
      websitesTitle: 'Websites & Vorlagen',
      categoryClient: 'Echter Kunde',
      categoryComing: 'In Entwicklung',
      soon: 'Demnaechst'
    },
    it: {
      navAbout: 'Chi sono',
      navProjects: 'Progetti',
      navContact: 'Contatto',
      hero: 'Ciao, sono Santi',
      role: 'creo siti, strumenti IA e automazioni pronti per progetti reali',
      aboutTitle: 'Chi sono',
      about: 'Sono Santi, il creator dietro SantiPulse. Questo portfolio mostra siti reali per clienti, progetti IA in preparazione e demo che raccontano come costruisco.',
      projectsTitle: 'Progetti',
      projectsIntro: 'Prima, tre siti reali per clienti. Poi, progetti che aggiungero poco a poco.',
      contact: 'Lavora con me',
      finalTitle: 'Lavoriamo insieme',
      preview: 'Anteprima',
      open: 'Vedi progetto',
      count: 'demo live',
      normalTitle: 'Siti normali',
      threeDTitle: 'Siti 3D',
      sectionCount: 'progetti',
      category3d: 'Web 3D',
      categoryRental: 'Affitto luxury',
      categoryPortfolio: 'Portfolio',
      categoryWeb: 'Sito reale',
      clientsTitle: 'Siti clienti',
      comingTitle: 'Prossimi progetti',
      websitesTitle: 'Siti & Template',
      categoryClient: 'Cliente reale',
      categoryComing: 'In sviluppo',
      soon: 'Prossimamente'
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
    if (w.cat === 'client') return P.categoryClient;
    if (w.cat === 'coming') return P.categoryComing;
    if (w.cat === '3d') return P.category3d;
    return P.categoryWeb;
  }

  function placeholderTile(w, className) {
    return '<div class="ai-tile ' + className + '"><span class="ai-tile-name">' + esc(w.name) + '</span></div>';
  }

  function mediaHtml(w, className, extra) {
    className = className || '';
    extra = extra || '';
    if (w.type === 'placeholder' || !w.media) return placeholderTile(w, className);
    if (w.type === 'image') return '<img class="' + className + '" src="' + prefix + w.media + '" alt="" loading="lazy" ' + extra + '/>';
    return '<video class="' + className + '" src="' + prefix + w.media + '#t=0.5" muted loop playsinline preload="metadata" ' + extra + '></video>';
  }

  function renderPortfolioMarquee() {
    var a = document.getElementById('portfolio-marquee-a');
    var b = document.getElementById('portfolio-marquee-b');
    if (!a || !b) return;
    var withMedia = DISPLAY_WEBSITES.filter(function (w) { return w.type !== 'placeholder' && w.media; });
    var first = withMedia.slice(0, Math.ceil(withMedia.length / 2));
    var second = withMedia.slice(Math.ceil(withMedia.length / 2));
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
    if (count) {
      var live = DISPLAY_WEBSITES.filter(function (w) { return !w.soon; }).length;
      count.textContent = live + ' ' + P.count;
    }

    var indexed = DISPLAY_WEBSITES.map(function (w, i) { return { w: w, i: i }; });
    var clients = indexed.filter(function (item) { return item.w.cat === 'client'; });
    var coming = indexed.filter(function (item) { return item.w.cat === 'coming'; });
    var normal = indexed.filter(function (item) { return item.w.cat !== '3d' && item.w.cat !== 'client' && item.w.cat !== 'coming'; });
    var threeD = indexed.filter(function (item) { return item.w.cat === '3d'; });

    function card(item, cardIndex) {
      var w = item.w;
      var i = item.i;
      var n = String(cardIndex + 1).padStart(2, '0');
      var desc = D[w.key] || '';
      var url = w.url ? demoUrl(w) : '';
      var external = /^(https?:)?\/\//.test(url);
      var open = url
        ? '<a class="outline-btn" href="' + esc(url) + '"' + (external ? ' target="_blank" rel="noopener"' : '') + '>' + esc(P.open) + '</a>'
        : '<span class="outline-btn is-disabled">' + esc(P.soon) + '</span>';
      return '<article class="portfolio-card is-in" data-demo-card="' + i + '" style="z-index:' + (cardIndex + 1) + ';--pop-delay:' + Math.min(cardIndex * 55, 700) + 'ms">' +
        '<div class="portfolio-media">' + mediaHtml(w, '', 'autoplay') + (w.soon ? '<span class="soon-badge">' + esc(P.soon) + '</span>' : '') + '</div>' +
        '<div class="portfolio-info">' +
          '<div>' +
            '<div class="portfolio-num">' + n + '</div>' +
            '<p class="portfolio-cat">' + esc(categoryFor(w)) + '</p>' +
            '<h3 class="portfolio-name">' + esc(w.name) + '</h3>' +
            '<p class="portfolio-desc">' + esc(desc) + '</p>' +
          '</div>' +
          '<div class="portfolio-actions">' +
            '<button class="outline-btn" type="button" data-preview="' + i + '">' + esc(P.preview) + '</button>' +
            open +
          '</div>' +
        '</div>' +
      '</article>';
    }

    function section(title, items, offset, kind) {
      if (!items.length) return '';
      return '<section class="portfolio-section portfolio-section-' + esc(kind) + '">' +
        '<div class="portfolio-section-head">' +
          '<h3 class="portfolio-section-title">' + esc(title) + '</h3>' +
          '<p class="portfolio-section-count">' + items.length + ' ' + esc(P.sectionCount) + '</p>' +
        '</div>' +
        '<div class="portfolio-grid">' + items.map(function (item, index) { return card(item, offset + index); }).join('') + '</div>' +
      '</section>';
    }

    target.innerHTML =
      section(P.clientsTitle, clients, 0, 'client') +
      section(P.comingTitle, coming, clients.length, 'coming') +
      section(P.websitesTitle, normal, clients.length + coming.length, 'normal') +
      section(P.threeDTitle, threeD, clients.length + coming.length + normal.length, '3d');

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
    if (w.url) {
      play.href = demoUrl(w);
      play.textContent = P.open;
      play.hidden = false;
    } else {
      play.hidden = true;
    }
    var mw = modal.querySelector('.exp-media-wrap');
    mw.innerHTML = (w.type === 'placeholder' || !w.media)
      ? '<div class="ai-tile exp-media"><span class="ai-tile-name">' + esc(w.name) + '</span></div>'
      : (w.type === 'video'
        ? '<video class="exp-media" src="' + prefix + w.media + '#t=0.5" autoplay loop muted playsinline></video>'
        : '<img class="exp-media" src="' + prefix + w.media + '" alt="" />');
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
