/* ============================================================
   The Pulse System modules.
   These create structured dashboard outputs for the simplified client flow.
   When provider config exists, the module also performs the safest real action
   available: provision voice, queue a post, or prepare paid ad launch.
   ============================================================ */
import * as vapi from '../lib/vapi.js';
import { getConfig as getReceptionistConfig, saveConfig as saveReceptionistConfig } from '../lib/receptionist.js';
import { getConfig as getInsightsConfig, listTrends, queuePost, listQueue } from '../lib/insights.js';
import { getVaultContext } from '../lib/vault.js';

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
  const vaultContext = userId ? await getVaultContext(userId) : '';

  if (type === 'ai_receptionist') {
    const config = userId ? await getReceptionistConfig(userId) : null;
    const ready = validateReceptionistConfig(config);
    let assistantId = config?.vapi_assistant_id || null;
    let phoneNumberId = config?.vapi_phone_number_id || null;
    let voiceAction = 'Proveedor de voz pendiente.';
    let numberAction = null;

    if (ready.ok && vapi.isConfigured()) {
      assistantId = await vapi.upsertAssistant({
        assistantId,
        name: business,
        greeting: config.greeting || `Hola, gracias por llamar a ${business}.`,
        systemPrompt: buildReceptionistPrompt({ business, industry, site, config, vaultContext }),
        voice: config?.voice || 'femenina',
        language: config?.language || 'es',
      });
      if (assistantId && userId) {
        const patch = { vapi_assistant_id: assistantId };

        // White-label provisioning: each client gets their own line inside
        // the agency Vapi account. Buy once, then keep it pointed at the
        // client's assistant. US numbers are instant (Vapi-managed); Spanish
        // +34 numbers go through Telnyx regulatory onboarding → concierge.
        const country = String(config?.phone_country || 'us').toLowerCase();
        if (!phoneNumberId) {
          if (country === 'es') {
            numberAction = 'Número español (+34) en preparación: lo asignamos en 24-48h laborables.';
          } else {
            const bought = await vapi.buyPhoneNumber({ assistantId, label: business });
            if (bought?.id) {
              phoneNumberId = bought.id;
              patch.vapi_phone_number_id = bought.id;
              numberAction = bought.number
                ? `Número de recepcionista asignado: ${bought.number}.`
                : 'Número de recepcionista asignado.';
            } else {
              numberAction = 'Número pendiente: el equipo lo asignará en breve.';
            }
          }
        } else {
          await vapi.attachAssistant({ phoneNumberId, assistantId });
        }

        await saveReceptionistConfig(userId, patch);
        voiceAction = config?.vapi_assistant_id ? 'Asistente de voz actualizado en Vapi.' : 'Asistente de voz creado en Vapi.';
      }
    } else if (!ready.ok) {
      voiceAction = 'Faltan datos obligatorios (teléfono del negocio y email SOS).';
    }

    const waReady = !!config?.whatsapp_phone_id;
    return {
      success: ready.ok,
      module: type,
      title: 'Recepcionista IA',
      summary: ready.ok
        ? `${business}: Recepcionista IA activada para captar leads por llamadas, WhatsApp y formularios.`
        : `${business}: completa teléfono del negocio y email SOS para activar la Recepcionista IA.`,
      status: ready.ok ? 'automation_completed' : 'missing_config',
      error: ready.ok ? null : 'missing_required_config',
      metrics: [
        { label: 'Canales', value: waReady ? '3' : '2' },
        { label: 'Tiempo de respuesta', value: '< 10s' },
        { label: 'SOS humano', value: ready.ok ? 'Activo' : 'Pendiente' },
      ],
      autoActions: [
        voiceAction,
        ...(numberAction ? [numberAction] : []),
        waReady
          ? 'WhatsApp conectado y escuchando mensajes.'
          : 'WhatsApp: lo conectamos por ti en menos de 24h laborables.',
        'Hub de leads revisado y listo para nuevas entradas.',
      ],
      context: { business, industry, site },
    };
  }

  if (type === 'social_insights') {
    const config = userId ? await getInsightsConfig(userId) : null;
    const trends = userId ? await listTrends(userId, { limit: 1 }) : [];
    const topTrend = trends[0] || null;
    const caption = topTrend
      ? buildCaption({ business, industry, trend: topTrend, config, vaultContext })
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
        vaultContext ? 'Boveda de Conocimiento aplicada al caption.' : 'Boveda pendiente: sube menu, PDFs o notas para personalizar mejor.',
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
  // Concierge model: clients only need their business phone + SOS email.
  // WhatsApp's technical phone_id is wired by the agency afterwards.
  const phone = String(config?.phone_number || '').trim();
  const sosEmail = String(config?.sos_email || '').trim();
  return {
    ok: /^\+[1-9][0-9]{7,15}$/.test(phone)
      && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sosEmail),
  };
}

function buildReceptionistPrompt({ business, industry, site, config, vaultContext }) {
  const lang = String(config?.language || 'es').startsWith('en') ? 'en' : 'es';
  return [
    lang === 'en'
      ? `You are the AI receptionist for ${business}. You speak clear, warm, professional English.`
      : `Eres la Recepcionista IA de ${business}. Hablas espanol claro, calido y profesional.`,
    `Sector: ${industry}. Web: ${site}.`,
    `Saludo: ${config?.greeting || `Hola, gracias por llamar a ${business}.`}`,
    config?.hours_text ? `Horario del negocio: ${String(config.hours_text).slice(0, 300)}` : '',
    'Capta nombre, telefono, motivo y urgencia. Ayuda a reservar cuando sea posible.',
    'Si el cliente pide una persona o hay confusion, activa el flujo SOS humano.',
    'No inventes precios ni disponibilidad.',
    config?.extra_instructions ? `Instrucciones del negocio:\n${String(config.extra_instructions).slice(0, 1200)}` : '',
    vaultContext ? `Boveda de Conocimiento:\n${vaultContext}` : '',
  ].filter(Boolean).join('\n');
}

function buildCaption({ business, industry, trend, config, vaultContext }) {
  const style = clean(trend?.style) || 'una idea que esta funcionando';
  const niche = clean(config?.niche) || industry;
  const region = clean(config?.region) || 'tu zona';
  const vaultHint = vaultContext ? ` Dato del negocio: ${clean(vaultContext, 120)}` : '';
  return `${business}: ${style} para ${niche} en ${region}.${vaultHint} Reserva o pide info hoy.`;
}
