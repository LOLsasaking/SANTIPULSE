/* Localizes the login page to the language the visitor picked on the public
   site (stored in localStorage 'sp_lang' by site-chrome.js). CSP-safe. */
(function () {
  'use strict';
  var lang = 'es';
  try { lang = localStorage.getItem('sp_lang') || 'es'; } catch (e) {}
  if (!/^(es|en|fr|de|it)$/.test(lang)) lang = 'es';
  document.documentElement.lang = lang;

  var T = {
    es: { eyebrow: 'Panel · Acceso', title: 'Acceder', subtitle: 'Introduce tu email y te enviamos un enlace de acceso. Sin contraseñas.', emailLabel: 'Email', submit: 'Enviar enlace', ok: 'Revisa tu correo — te enviamos un enlace de acceso. Ábrelo en este dispositivo.', back: '← Volver a santipulse.com', account: 'Cuenta', ph: 'tu@email.com' },
    en: { eyebrow: 'Panel · Access', title: 'Log in', subtitle: "Enter your email and we'll send you a magic link. No passwords.", emailLabel: 'Email', submit: 'Send link', ok: 'Check your inbox — we sent you a magic link. Open it on this device.', back: '← Back to santipulse.com', account: 'Account', ph: 'you@email.com' },
    fr: { eyebrow: 'Panneau · Accès', title: 'Connexion', subtitle: 'Saisis ton email et reçois un lien de connexion. Sans mot de passe.', emailLabel: 'Email', submit: 'Envoyer le lien', ok: 'Vérifie ta boîte mail — lien envoyé. Ouvre-le sur cet appareil.', back: '← Retour à santipulse.com', account: 'Compte', ph: 'toi@email.com' },
    de: { eyebrow: 'Panel · Zugang', title: 'Anmelden', subtitle: 'Gib deine E-Mail ein und erhalte einen Login-Link. Ohne Passwort.', emailLabel: 'E-Mail', submit: 'Link senden', ok: 'Prüfe dein Postfach — Link gesendet. Öffne ihn auf diesem Gerät.', back: '← Zurück zu santipulse.com', account: 'Konto', ph: 'du@email.com' },
    it: { eyebrow: 'Pannello · Accesso', title: 'Accedi', subtitle: 'Inserisci la tua email e ricevi un link di accesso. Senza password.', emailLabel: 'Email', submit: 'Invia link', ok: 'Controlla la tua email — link inviato. Aprilo su questo dispositivo.', back: '← Torna a santipulse.com', account: 'Account', ph: 'tu@email.com' },
  };
  var t = T[lang] || T.es;

  Object.keys(t).forEach(function (k) {
    if (k === 'ph') return;
    document.querySelectorAll('[data-i18n="' + k + '"]').forEach(function (el) { el.textContent = t[k]; });
  });
  var em = document.getElementById('email');
  if (em) em.placeholder = t.ph;
  document.title = t.title + ' · SantiPulse';

  // ── Launch freeze: dashboard login is "Coming soon" for the public, with a
  //    discreet staff bypass so the admin can still test before launch.
  //    Reveal once with /login/?staff=1 (remembered), then log in normally. ──
  var staff = false;
  try {
    if (location.search.indexOf('staff=1') >= 0) localStorage.setItem('sp_staff', '1');
    staff = localStorage.getItem('sp_staff') === '1';
  } catch (e) {}

  if (window.__COMINGSOON && !staff) {
    var SOON = { es: 'Próximamente', en: 'Coming soon', fr: 'Bientôt', de: 'Demnächst', it: 'Prossimamente' };
    var MSG = {
      es: 'El panel de automatización IA abre en septiembre de 2026. La parte de Webs y Demos sigue 100% activa.',
      en: 'The AI automation dashboard opens in September 2026. Websites and Demos stay fully live.',
      fr: "Le tableau de bord d'automatisation IA ouvre en septembre 2026. Sites et démos restent actifs.",
      de: 'Das KI-Automatisierungs-Dashboard öffnet im September 2026. Websites und Demos bleiben aktiv.',
      it: 'Il pannello di automazione IA apre a settembre 2026. Siti e demo restano attivi.',
    };
    var STAFF = { es: 'Acceder como staff', en: 'Staff access', fr: 'Accès staff', de: 'Staff-Zugang', it: 'Accesso staff' };
    var card = document.querySelector('.login-panel .card');
    if (card) {
      card.innerHTML =
        '<div class="brand"><img src="/mascot-favicon.png" alt="" /><span class="nm">SantiPulse<i>.</i></span></div>' +
        '<p class="eyebrow" style="margin:0 0 14px">' + (window.__COMINGSOON_LABEL ? window.__COMINGSOON_LABEL[lang] : 'Coming soon') + '</p>' +
        '<h1 class="headline" style="font-size:40px; margin:0 0 12px">' + (SOON[lang] || SOON.es) + '</h1>' +
        '<p style="color:rgba(255,255,255,.6); font-size:14px; line-height:1.6; margin:0 0 26px">' + (MSG[lang] || MSG.es) + '</p>' +
        '<a class="back" href="/">&larr; santipulse.com</a>' +
        '<button id="staffReveal" style="display:block;margin-top:34px;background:none;border:0;color:rgba(255,255,255,.28);font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;cursor:pointer">' + (STAFF[lang] || STAFF.es) + '</button>';
      var sr = document.getElementById('staffReveal');
      if (sr) sr.addEventListener('click', function () {
        try { localStorage.setItem('sp_staff', '1'); } catch (e) {}
        location.reload();
      });
    }
  }
})();
