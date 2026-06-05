/* ============================================================
   The Pulse System modules.
   These are production-safe scaffolds: they create structured dashboard
   outputs without claiming that external Vapi, social, or ads APIs ran.
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
      summary: `${business}: flujo de primera respuesta listo para llamadas, WhatsApp y formularios.`,
      status: 'scaffold_ready',
      metrics: [
        { label: 'Canales', value: '3' },
        { label: 'Tiempo de respuesta', value: '< 10s' },
        { label: 'SOS humano', value: 'Activo' },
      ],
      nextActions: [
        'Conectar numero de Vapi o Bland cuando las credenciales esten listas.',
        'Crear preguntas de calificacion para nuevos leads.',
        'Sincronizar calendario para reservar citas automaticamente.',
      ],
      context: { business, industry, site },
    };
  }

  if (type === 'social_insights') {
    return {
      success: true,
      module: type,
      title: 'Insights de Redes',
      summary: `${business}: tablero preparado para detectar formatos virales en ${industry}.`,
      status: 'scaffold_ready',
      metrics: [
        { label: 'Estilos detectables', value: '3' },
        { label: 'Probabilidad viral', value: 'Alta' },
        { label: 'Cola de posts', value: 'Lista' },
      ],
      nextActions: [
        'Conectar cuentas sociales oficiales.',
        'Definir nicho, zona y competidores de referencia.',
        'Grabar el demo de tendencias y cola de publicacion.',
      ],
      context: { business, industry, site },
    };
  }

  return {
    success: true,
    module: type,
    title: 'Gestor de Ads',
    summary: `${business}: reglas de presupuesto y alertas de rentabilidad preparadas.`,
    status: 'scaffold_ready',
    metrics: [
      { label: 'Reglas ROAS', value: '3' },
      { label: 'Alertas CPC', value: 'Activas' },
      { label: 'Plataformas', value: 'Meta/TikTok' },
    ],
    nextActions: [
      'Conectar cuentas publicitarias Meta y TikTok.',
      'Definir ROAS minimo, CPC maximo y presupuesto diario.',
      'Activar alertas de beneficio antes de escalar campanas.',
    ],
    context: { business, industry, site },
  };
}

function clean(value) {
  return String(value == null ? '' : value).trim().slice(0, 160);
}
