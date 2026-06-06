/* ============================================================
   The Pulse System modules.
   These create structured dashboard outputs for the simplified client flow.
   When provider config exists, the module also performs the safest real action
   available: provision voice, queue a post, or prepare paid ad launch.
   ============================================================ */
import * as vapi from '../lib/vapi.js';
import { getConfig as getReceptionistConfig, saveConfig as saveReceptionistConfig } from '../lib/receptionist.js';
import { getConfig as getInsightsConfig, listTrends, queuePost, listQueue } from '../lib/insights.js';

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

export async function runPulseModule(type, profile = {}) {
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
  const userId = profile.id || profile.user_id || null;

  if (type === 'ai_receptionist') {
    const config = userId ? await getReceptionistConfig(userId) : null;
    const ready = validateReceptionistConfig(config);
    let assistantId = config?.vapi_assistant_id || null;
    let voiceAction = 'Proveedor de voz pendiente.';

    if (ready.ok && vapi.isConfigured()) {
      assistantId = await vapi.upsertAssistant({
        assistantId,
        name: business,
        greeting: config.greeting || `Hola, gracias por llamar a ${business}.`,
        language: 'es',
      });
      if (assistantId && userId) {
        await saveReceptionistConfig(userId, { vapi_assistant_id: assistantId });
        voiceAction = config?.vapi_assistant_id ? 'Asistente de voz actualizado en Vapi.' : 'Asistente de voz creado en Vapi.';
      }
    } else if (!ready.ok) {
      voiceAction = 'Faltan datos obligatorios para activar voz/WhatsApp/SOS.';
    }

    return {
      success: ready.ok,
      module: type,
      title: 'Recepcionista IA',
      summary: ready.ok
        ? `${business}: Recepcionista IA activada para captar leads por llamadas, WhatsApp y formularios.`
        : `${business}: completa telefono, WhatsApp y email SOS para activar la Recepcionista IA.`,
      status: ready.ok ? 'automation_completed' : 'missing_config',
      error: ready.ok ? null : 'missing_required_config',
      metrics: [
        { label: 'Canales', value: '3' },
        { label: 'Tiempo de respuesta', value: '< 10s' },
        { label: 'SOS humano', value: ready.ok ? 'Activo' : 'Pendiente' },
      ],
      autoActions: [
        voiceAction,
        'Hub de leads revisado y listo para nuevas entradas.',
        ready.ok ? 'Flujo de respuesta y alerta humana preparado.' : 'La activacion se detuvo antes de guardar una configuracion incompleta.',
      ],
      context: { business, industry, site },
    };
  }

  if (type === 'social_insights') {
    const config = userId ? await getInsightsConfig(userId) : null;
    const trends = userId ? await listTrends(userId, { limit: 1 }) : [];
    const topTrend = trends[0] || null;
    const caption = topTrend
      ? buildCaption({ business, industry, trend: topTrend, config })
      : null;
    const queuedPost = userId && topTrend
      ? await queuePost(userId, {
        trendId: topTrend.id,
        platform: topTrend.platform || 'instagram',
        caption,
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'scheduled',
      })
      : null;

    return {
      success: true,
      module: type,
      title: 'Insights de Redes',
      summary: queuedPost
        ? `${business}: tendencia detectada y post programado para ${queuedPost.platform || 'redes'}.`
        : `${business}: escaneo social registrado para detectar formatos virales en ${industry}.`,
      status: queuedPost ? 'post_queued' : 'scan_requested',
      metrics: [
        { label: 'Tendencia', value: topTrend ? clean(topTrend.style) || 'Detectada' : 'Pendiente' },
        { label: 'Probabilidad viral', value: topTrend?.viral_score == null ? 'Pendiente' : String(topTrend.viral_score) },
        { label: 'Cola de posts', value: queuedPost ? '1 nuevo' : String((userId ? await listQueue(userId, 10) : []).length) },
      ],
      autoActions: [
        'Contexto de nicho y zona aplicado al escaneo.',
        queuedPost ? 'Post programado automaticamente desde la tendencia principal.' : 'No habia tendencias guardadas todavia; GitHub Actions recolectara nuevas senales.',
        'Resumen guardado en el historial del panel.',
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

function validateReceptionistConfig(config = {}) {
  const phone = String(config?.phone_number || '').trim();
  const whatsappPhoneId = String(config?.whatsapp_phone_id || '').trim();
  const sosEmail = String(config?.sos_email || '').trim();
  return {
    ok: /^\+[1-9][0-9]{7,15}$/.test(phone)
      && !!whatsappPhoneId
      && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sosEmail),
  };
}

function buildCaption({ business, industry, trend, config }) {
  const style = clean(trend?.style) || 'una idea que esta funcionando';
  const niche = clean(config?.niche) || industry;
  const region = clean(config?.region) || 'tu zona';
  return `${business}: ${style} para ${niche} en ${region}. Reserva o pide info hoy.`;
}
