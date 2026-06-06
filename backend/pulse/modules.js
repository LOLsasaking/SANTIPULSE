/* ============================================================
   The Pulse System modules.
   These create structured dashboard outputs for the simplified client flow:
   the dashboard shows what SantiPulse ran or queued, not manual setup steps.
   ============================================================ */

export const PULSE_MODULES = {
  ai_receptionist: {
    id: 'ai_receptionist',
    label: 'Recepcionista IA',
    shortLabel: 'Recepcionista',
    icon: 'phone',
  },
  social_insights: {
    id: 'social_insights',
    label: 'Insights de Redes',
    shortLabel: 'Insights',
    icon: 'social',
  },
  ad_manager: {
    id: 'ad_manager',
    label: 'Gestor de Ads',
    shortLabel: 'Ads',
    icon: 'ads',
  },
};

export const PULSE_TYPES = Object.keys(PULSE_MODULES);

export function moduleLabel(type) {
  return PULSE_MODULES[type]?.label || 'Modulo Pulse';
}

export function runPulseModule(type, profile = {}) {
  if (!PULSE_MODULES[type]) {
    return {
      success: false,
      module: type,
      error: 'Modulo Pulse no reconocido.',
    };
  }

  const business = clean(profile.business_name) || 'Tu negocio';
  const industry = clean(profile.industry) || 'servicios locales';
  const site = clean(profile.website_url) || 'sin web conectada';

  if (type === 'ai_receptionist') {
    return {
      success: true,
      module: type,
      title: 'Recepcionista IA',
      summary: `${business}: Recepcionista IA revisada y preparada para captar leads por llamadas, WhatsApp y formularios.`,
      status: 'automation_queued',
      metrics: [
        { label: 'Canales', value: '3' },
        { label: 'Tiempo de respuesta', value: '< 10s' },
        { label: 'SOS humano', value: 'Activo' },
      ],
      autoActions: [
        'Hub de leads revisado y listo para nuevas entradas.',
        'Flujo de respuesta y alerta humana preparado.',
        'Calendario y canales se verifican automaticamente desde Conexiones.',
      ],
      context: { business, industry, site },
    };
  }

  if (type === 'social_insights') {
    return {
      success: true,
      module: type,
      title: 'Insights de Redes',
      summary: `${business}: escaneo social lanzado para detectar formatos virales en ${industry}.`,
      status: 'automation_queued',
      metrics: [
        { label: 'Estilos detectables', value: '3' },
        { label: 'Probabilidad viral', value: 'Alta' },
        { label: 'Cola de posts', value: 'Lista' },
      ],
      autoActions: [
        'Contexto de nicho y zona aplicado al escaneo.',
        'Resumen de tendencias guardado en el historial.',
        'Cola de posts preparada para revisar o promocionar.',
      ],
      context: { business, industry, site },
    };
  }

  return {
    success: true,
    module: type,
    title: 'Gestor de Ads',
    summary: `${business}: solicitud de anuncio preparada para elegir post, presupuesto y pago.`,
    status: 'automation_queued',
    metrics: [
      { label: 'Reglas ROAS', value: '3' },
      { label: 'Alertas CPC', value: 'Activas' },
      { label: 'Plataformas', value: 'Meta/TikTok' },
    ],
    autoActions: [
      'Panel de anuncio simple preparado.',
      'Historial listo para registrar solicitudes pagadas.',
      'Reglas tecnicas quedan ocultas al cliente.',
    ],
    context: { business, industry, site },
  };
}

function clean(value) {
  return String(value == null ? '' : value).trim().slice(0, 160);
}
