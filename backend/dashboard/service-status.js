/* GET /api/dashboard/service-status - client-safe Pulse service states. */
import { requireUser } from '../lib/auth.js';
import { getProfile, hasActiveSubscription } from '../lib/profile.js';

function state(status, label, summary, action) {
  return { status, label, summary, action };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const profile = await getProfile(user.id);
  const active = hasActiveSubscription(profile);
  const hasBusinessContext = !!(profile?.business_name && profile?.industry);

  const locked = state('locked', 'Bloqueado', 'Activa un plan para desbloquear este módulo.', 'Ver planes');
  const pendingContext = state('pending', 'Falta contexto', 'Completa el perfil del negocio para que la IA trabaje con precisión.', 'Completar onboarding');

  const services = [
    {
      id: 'ai_receptionist',
      name: 'Recepcionista IA',
      description: 'Atiende llamadas, WhatsApp y reservas con SOS humano si algo se complica.',
      ...(active ? (hasBusinessContext ? state('active', 'Listo', 'Preparada para captar leads y responder con contexto del negocio.', 'Automatizar ahora') : pendingContext) : locked),
    },
    {
      id: 'social_insights',
      name: 'Insights de Redes',
      description: 'Detecta tendencias, redacta captions y prepara publicaciones simples.',
      ...(active ? (hasBusinessContext ? state('active', 'Listo', 'Lista para convertir tendencias en contenido útil.', 'Automatizar ahora') : pendingContext) : locked),
    },
    {
      id: 'ad_manager',
      name: 'Gestor de Ads',
      description: 'Convierte posts en campañas con presupuesto claro y ROI Pulse.',
      ...(active ? state('pending', 'Pendiente de conexión', 'Conecta Meta Ads o usa el flujo de pago para lanzar campañas.', 'Revisar Ads') : locked),
    },
  ];

  return res.status(200).json({
    ok: true,
    subscriptionActive: active,
    services,
  });
}
