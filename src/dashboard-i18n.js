/* Dashboard translation (CSP-safe, no markup changes). Walks text nodes inside
   #app and swaps known Spanish strings to the language stored in 'sp_lang'.
   Re-runnable: window.SantiDashI18n.apply(lang) (used by the topbar switcher).
   Originals are cached on each node so switching back to ES restores them. */
(function () {
  'use strict';
  function clean(l) { return /^(es|en|fr|de|it)$/.test(l) ? l : 'es'; }
  function lng() { var l = 'es'; try { l = localStorage.getItem('sp_lang') || 'es'; } catch (e) {} return clean(l); }
  var IDX = { en: 0, fr: 1, de: 2, it: 3 };

  // Spanish -> [en, fr, de, it]
  var D = {
    'Cliente': ['Client', 'Client', 'Kunde', 'Cliente'],
    'Cuenta': ['Account', 'Compte', 'Konto', 'Account'],
    'Inicio': ['Home', 'Accueil', 'Start', 'Home'],
    'Métricas': ['Metrics', 'Métriques', 'Kennzahlen', 'Metriche'],
    'Soporte': ['Support', 'Support', 'Support', 'Supporto'],
    'Suscripción': ['Subscription', 'Abonnement', 'Abo', 'Abbonamento'],
    'Historial': ['History', 'Historique', 'Verlauf', 'Cronologia'],
    'Panel simple': ['Simple panel', 'Panneau simple', 'Einfaches Panel', 'Pannello semplice'],
    'El cliente ve estado, acciones y resultados. Las API keys se quedan detrás.': ['The client sees status, actions and results. API keys stay behind the scenes.', "Le client voit l'état, les actions et les résultats. Les clés API restent en coulisses.", 'Der Kunde sieht Status, Aktionen und Ergebnisse. API-Keys bleiben im Hintergrund.', 'Il cliente vede stato, azioni e risultati. Le API key restano dietro le quinte.'],
    'Ver planes': ['View plans', 'Voir les plans', 'Pläne ansehen', 'Vedi i piani'],
    'Salir': ['Log out', 'Déconnexion', 'Abmelden', 'Esci'],
    'Cargando plan': ['Loading plan', 'Chargement du plan', 'Plan wird geladen', 'Caricamento piano'],
    'Hola,': ['Hi,', 'Salut,', 'Hallo,', 'Ciao,'],
    'Soy': ["I'm", 'Je suis', 'Ich bin', 'Sono'],
    ', tu guía de automatización. Hoy tu sistema está al': [', your automation guide. Today your system is at', ', ton guide d\'automatisation. Aujourd\'hui ton système est à', ', dein Automatisierungs-Guide. Heute ist dein System auf', ', la tua guida all\'automazione. Oggi il tuo sistema è al'],
    'Sistema operativo': ['System online', 'Système opérationnel', 'System aktiv', 'Sistema operativo'],
    'Tu agencia IA en un panel simple.': ['Your AI agency in one simple panel.', 'Ton agence IA dans un panneau simple.', 'Deine KI-Agentur in einem einfachen Panel.', 'La tua agenzia IA in un pannello semplice.'],
    'Recepcionista IA, Social Media IA y Gestor de Ads trabajan juntos para captar leads, publicar con contexto y enseñar ROI sin que toques configuraciones técnicas.': ['AI Receptionist, Social Media AI and Ads Manager work together to capture leads, post with context and show ROI without touching technical settings.', 'Réceptionniste IA, Réseaux sociaux IA et Gestion de pub travaillent ensemble pour capter des leads, publier avec contexte et montrer le ROI sans réglages techniques.', 'KI-Rezeption, Social Media KI und Ads-Manager arbeiten zusammen, um Leads zu gewinnen, mit Kontext zu posten und ROI zu zeigen — ohne technische Einstellungen.', 'Receptionist IA, Social Media IA e Gestore Ads lavorano insieme per acquisire lead, pubblicare con contesto e mostrare il ROI senza toccare impostazioni tecniche.'],
    'Ver Service Hub': ['Open Service Hub', 'Ouvrir le Service Hub', 'Service Hub öffnen', 'Apri Service Hub'],
    'Pedir ayuda': ['Get help', 'Demander de l\'aide', 'Hilfe holen', 'Chiedi aiuto'],
    'Estado actual': ['Current status', 'État actuel', 'Aktueller Status', 'Stato attuale'],
    'Servicios visibles, ingredientes ocultos.': ['Services visible, ingredients hidden.', 'Services visibles, ingrédients cachés.', 'Dienste sichtbar, Zutaten verborgen.', 'Servizi visibili, ingredienti nascosti.'],
    'Las integraciones se gestionan desde la vista admin. Tú solo ves qué está listo, qué falta y qué acción tomar.': ['Integrations are managed from the admin view. You only see what is ready, what is missing and what to do.', 'Les intégrations sont gérées depuis la vue admin. Tu vois seulement ce qui est prêt, ce qui manque et quoi faire.', 'Integrationen werden in der Admin-Ansicht verwaltet. Du siehst nur, was bereit ist, was fehlt und was zu tun ist.', 'Le integrazioni si gestiscono dalla vista admin. Vedi solo cosa è pronto, cosa manca e cosa fare.'],
    'módulos Pulse': ['Pulse modules', 'modules Pulse', 'Pulse-Module', 'moduli Pulse'],
    'captación IA': ['AI capture', 'captation IA', 'KI-Erfassung', 'acquisizione IA'],
    'en directo': ['live', 'en direct', 'live', 'in diretta'],
    'humano': ['human', 'humain', 'menschlich', 'umano'],
    'Atiende llamadas, WhatsApp y reservas con contexto.': ['Handles calls, WhatsApp and bookings with context.', 'Gère appels, WhatsApp et réservations avec contexte.', 'Beantwortet Anrufe, WhatsApp und Buchungen mit Kontext.', 'Gestisce chiamate, WhatsApp e prenotazioni con contesto.'],
    'Tendencias y captions listos para publicar.': ['Trends and captions ready to post.', 'Tendances et légendes prêtes à publier.', 'Trends und Captions bereit zum Posten.', 'Tendenze e didascalie pronte da pubblicare.'],
    'Post, presupuesto y ROI en una vista simple.': ['Post, budget and ROI in one simple view.', 'Post, budget et ROI dans une vue simple.', 'Post, Budget und ROI in einer einfachen Ansicht.', 'Post, budget e ROI in una vista semplice.'],
    'Cargando': ['Loading', 'Chargement', 'Lädt', 'Caricamento'],
    'Conecta tu primer módulo y empezaré a medir tu ROI en directo. Cuanto más contexto cargues en la Bóveda, mejores serán las decisiones automáticas.': ['Connect your first module and I\'ll start measuring your ROI live. The more context you load into the Vault, the better the automatic decisions.', 'Connecte ton premier module et je mesurerai ton ROI en direct. Plus tu charges de contexte dans le Coffre, meilleures sont les décisions automatiques.', 'Verbinde dein erstes Modul und ich messe deinen ROI live. Je mehr Kontext du im Vault lädst, desto besser die automatischen Entscheidungen.', 'Collega il tuo primo modulo e inizierò a misurare il ROI in diretta. Più contesto carichi nel Vault, migliori saranno le decisioni automatiche.'],
    'Todo el sistema en una sola vista, con acciones simples.': ['The whole system in one view, with simple actions.', 'Tout le système en une vue, avec des actions simples.', 'Das ganze System in einer Ansicht, mit einfachen Aktionen.', 'Tutto il sistema in una vista, con azioni semplici.'],
    'Automatizar ahora': ['Automate now', 'Automatiser maintenant', 'Jetzt automatisieren', 'Automatizza ora'],
    'Tres acciones claras para ejecutar trabajo real sin enseñar los pasos técnicos.': ['Three clear actions to run real work without showing the technical steps.', 'Trois actions claires pour exécuter un vrai travail sans montrer les étapes techniques.', 'Drei klare Aktionen für echte Arbeit ohne technische Schritte.', 'Tre azioni chiare per eseguire lavoro reale senza mostrare i passaggi tecnici.'],
    'Capta leads, responde y activa SOS humano si hace falta.': ['Captures leads, replies and triggers human SOS if needed.', 'Capte des leads, répond et déclenche le SOS humain si besoin.', 'Erfasst Leads, antwortet und löst bei Bedarf den Menschen-SOS aus.', 'Acquisisce lead, risponde e attiva l\'SOS umano se serve.'],
    'Detecta tendencias y prepara captions con contexto.': ['Detects trends and prepares captions with context.', 'Détecte les tendances et prépare des légendes avec contexte.', 'Erkennt Trends und erstellt Captions mit Kontext.', 'Rileva tendenze e prepara didascalie con contesto.'],
    'Lanza o revisa campañas simples con foco en ROI.': ['Launch or review simple campaigns focused on ROI.', 'Lance ou révise des campagnes simples axées ROI.', 'Starte oder prüfe einfache Kampagnen mit ROI-Fokus.', 'Lancia o rivedi campagne semplici orientate al ROI.'],
    'Activar': ['Activate', 'Activer', 'Aktivieren', 'Attiva'],
    'La información mínima para entrenar la Bóveda de Conocimiento y personalizar las acciones.': ['The minimum info to train the Knowledge Vault and personalize actions.', 'Le minimum d\'infos pour entraîner le Coffre de connaissances et personnaliser les actions.', 'Die Mindestinfos, um den Wissens-Vault zu trainieren und Aktionen zu personalisieren.', 'Le info minime per addestrare il Vault della Conoscenza e personalizzare le azioni.'],
    'Nombre del negocio': ['Business name', 'Nom de l\'entreprise', 'Firmenname', 'Nome dell\'attività'],
    'Sitio web': ['Website', 'Site web', 'Webseite', 'Sito web'],
    'Sector': ['Industry', 'Secteur', 'Branche', 'Settore'],
    'Persona de contacto': ['Contact person', 'Personne de contact', 'Ansprechpartner', 'Persona di contatto'],
    'Cliente ideal / zona': ['Ideal client / area', 'Client idéal / zone', 'Idealkunde / Gebiet', 'Cliente ideale / zona'],
    'Guardar contexto': ['Save context', 'Enregistrer le contexte', 'Kontext speichern', 'Salva contesto'],
    'Contexto guardado.': ['Context saved.', 'Contexte enregistré.', 'Kontext gespeichert.', 'Contesto salvato.'],
    'Gasto, ingresos y beneficio estimado en directo.': ['Spend, revenue and estimated profit, live.', 'Dépenses, revenus et profit estimé, en direct.', 'Ausgaben, Umsatz und geschätzter Gewinn, live.', 'Spesa, ricavi e profitto stimato, in diretta.'],
    'Sincronizando': ['Syncing', 'Synchronisation', 'Synchronisiert', 'Sincronizzazione'],
    'Profit vs. Spend en directo.': ['Profit vs. Spend, live.', 'Profit vs. Dépenses, en direct.', 'Gewinn vs. Ausgaben, live.', 'Profitto vs. Spesa, in diretta.'],
    'Gasto': ['Spend', 'Dépenses', 'Ausgaben', 'Spesa'],
    'Ingresos': ['Revenue', 'Revenus', 'Umsatz', 'Ricavi'],
    'Atribuido': ['Attributed', 'Attribué', 'Zugeordnet', 'Attribuito'],
    'Retorno': ['Return', 'Retour', 'Rendite', 'Ritorno'],
    'Beneficio': ['Profit', 'Profit', 'Gewinn', 'Profitto'],
    'Estimado': ['Estimated', 'Estimé', 'Geschätzt', 'Stimato'],
    'Soporte directo': ['Direct support', 'Support direct', 'Direkter Support', 'Supporto diretto'],
    'Si una automatización falla o necesitas una persona, el SOS humano queda a mano.': ['If an automation fails or you need a person, human SOS is one click away.', 'Si une automatisation échoue ou tu as besoin d\'une personne, le SOS humain est à portée.', 'Wenn eine Automatisierung fehlschlägt oder du eine Person brauchst, ist der Menschen-SOS griffbereit.', 'Se un\'automazione fallisce o ti serve una persona, l\'SOS umano è a portata.'],
    'SOS humano': ['Human SOS', 'SOS humain', 'Menschen-SOS', 'SOS umano'],
    'Registra una alerta manual para que una persona revise la situación.': ['Log a manual alert so a person reviews the situation.', 'Enregistre une alerte manuelle pour qu\'une personne examine la situation.', 'Erfasse eine manuelle Warnung, damit eine Person die Lage prüft.', 'Registra un avviso manuale così una persona controlla la situazione.'],
    'Activar SOS humano': ['Trigger human SOS', 'Déclencher le SOS humain', 'Menschen-SOS auslösen', 'Attiva SOS umano'],
    'Bóveda de Conocimiento': ['Knowledge Vault', 'Coffre de connaissances', 'Wissens-Vault', 'Vault della Conoscenza'],
    'Sube menús, PDFs, notas y FAQs para que la IA responda con el negocio en mente.': ['Upload menus, PDFs, notes and FAQs so the AI answers with your business in mind.', 'Téléverse menus, PDF, notes et FAQ pour que l\'IA réponde avec ton activité en tête.', 'Lade Menüs, PDFs, Notizen und FAQs hoch, damit die KI mit deinem Geschäft im Kopf antwortet.', 'Carica menu, PDF, note e FAQ così l\'IA risponde pensando alla tua attività.'],
    'Contacto prioritario': ['Priority contact', 'Contact prioritaire', 'Prioritärer Kontakt', 'Contatto prioritario'],
    'Si algo no encaja, usa este panel como punto de entrada para soporte y revisión manual.': ['If something is off, use this panel as the entry point for support and manual review.', 'Si quelque chose cloche, utilise ce panneau comme point d\'entrée pour le support et la révision manuelle.', 'Wenn etwas nicht passt, nutze dieses Panel als Einstieg für Support und manuelle Prüfung.', 'Se qualcosa non torna, usa questo pannello come punto d\'ingresso per supporto e revisione manuale.'],
    'Planes claros para activar acceso y ejecuciones Pulse.': ['Clear plans to unlock access and Pulse runs.', 'Des plans clairs pour activer l\'accès et les exécutions Pulse.', 'Klare Pläne, um Zugang und Pulse-Läufe freizuschalten.', 'Piani chiari per attivare accesso ed esecuzioni Pulse.'],
    'Ver página pública →': ['View public page →', 'Voir la page publique →', 'Öffentliche Seite ansehen →', 'Vedi pagina pubblica →'],
    'Gestionar suscripción': ['Manage subscription', 'Gérer l\'abonnement', 'Abo verwalten', 'Gestisci abbonamento'],
    '/ mes': ['/ mo', '/ mois', '/ Mon.', '/ mese'],
    'Hub de Leads': ['Leads Hub', 'Hub de leads', 'Leads-Hub', 'Hub Lead'],
    'Bóveda básica': ['Basic Vault', 'Coffre de base', 'Basis-Vault', 'Vault base'],
    'Soporte por email': ['Email support', 'Support par email', 'E-Mail-Support', 'Supporto email'],
    'Elegir Starter': ['Choose Starter', 'Choisir Starter', 'Starter wählen', 'Scegli Starter'],
    'Popular': ['Popular', 'Populaire', 'Beliebt', 'Popolare'],
    'Soporte prioritario': ['Priority support', 'Support prioritaire', 'Prioritäts-Support', 'Supporto prioritario'],
    'Elegir Pro': ['Choose Pro', 'Choisir Pro', 'Pro wählen', 'Scegli Pro'],
    'Módulos ilimitados': ['Unlimited modules', 'Modules illimités', 'Unbegrenzte Module', 'Moduli illimitati'],
    'Multi-cuenta': ['Multi-account', 'Multi-compte', 'Multi-Konto', 'Multi-account'],
    'Informes white-label': ['White-label reports', 'Rapports white-label', 'White-Label-Berichte', 'Report white-label'],
    'Soporte dedicado': ['Dedicated support', 'Support dédié', 'Dedizierter Support', 'Supporto dedicato'],
    'Elegir Agency': ['Choose Agency', 'Choisir Agency', 'Agency wählen', 'Scegli Agency'],
    'Cada ejecución queda registrada para demostrar trabajo y valor.': ['Every run is logged to prove work and value.', 'Chaque exécution est enregistrée pour prouver le travail et la valeur.', 'Jeder Lauf wird protokolliert, um Arbeit und Wert zu belegen.', 'Ogni esecuzione è registrata per dimostrare lavoro e valore.'],
    'Todavía no hay ejecuciones.': ['No runs yet.', 'Pas encore d\'exécutions.', 'Noch keine Läufe.', 'Ancora nessuna esecuzione.'],
    'Tipo': ['Type', 'Type', 'Typ', 'Tipo'],
    'Estado': ['Status', 'Statut', 'Status', 'Stato'],
    'Fecha': ['Date', 'Date', 'Datum', 'Data'],
    'Re-verificar': ['Re-check', 'Revérifier', 'Erneut prüfen', 'Ri-verifica'],
    'Vista admin: estado de proveedores y variables, sin exponer valores secretos.': ['Admin view: provider and variable status, without exposing secret values.', 'Vue admin : état des fournisseurs et variables, sans exposer les valeurs secrètes.', 'Admin-Ansicht: Anbieter- und Variablenstatus, ohne Geheimwerte preiszugeben.', 'Vista admin: stato di provider e variabili, senza esporre valori segreti.'],
    'Comprobando...': ['Checking...', 'Vérification...', 'Wird geprüft...', 'Controllo...'],
  };

  function tr(es, lang) {
    var e = D[es];
    if (!e) return es;
    return e[IDX[lang]] || es;
  }

  function apply(lang) {
    lang = clean(lang);
    var root = document.getElementById('app') || document.body;
    if (!root) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [], n;
    while ((n = w.nextNode())) nodes.push(n);
    nodes.forEach(function (node) {
      var p = node.parentNode;
      if (p && (p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE')) return;
      if (node.__es == null) {
        var key = node.nodeValue.trim();
        if (!key || !D[key]) return;
        node.__es = key;
        node.__raw = node.nodeValue;   // cache Spanish original (with whitespace)
      }
      var es = node.__es;
      node.nodeValue = (lang === 'es') ? node.__raw : node.__raw.replace(es, tr(es, lang));
    });
    // placeholder(s)
    var search = document.getElementById('searchInput');
    if (search) {
      var SP = { es: 'Buscar servicio, métrica o soporte', en: 'Search service, metric or support', fr: 'Rechercher un service, une métrique...', de: 'Service, Metrik oder Support suchen', it: 'Cerca servizio, metrica o supporto' };
      search.placeholder = SP[lang] || SP.es;
    }
    document.documentElement.lang = lang;
  }

  window.SantiDashI18n = { apply: apply };

  function run() { apply(lng()); }
  run();
  // Re-apply for content injected by dashboard.js (status pills, etc.).
  setTimeout(run, 1200);
  setTimeout(run, 3000);
})();
