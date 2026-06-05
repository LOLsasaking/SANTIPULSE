/* ============================================================
   POST /api/receptionist/vapi-webhook
   ------------------------------------------------------------
   Vapi server webhook. Receives call lifecycle + transcript events
   for the Recepcionista IA voice agent. We:
     • verify the shared secret (x-vapi-secret)
     • map the call to its owning user via the assistant id → config
     • upsert the lead (by caller number) and the call record
     • on end-of-call: store transcript/summary, and if the agent
       flagged escalation (keywords / structured data), raise a human SOS.

   Public endpoint (Vapi calls it), so auth is the shared secret only.
   ============================================================ */
import { admin } from '../_lib/auth.js';
import { getProfile } from '../_lib/profile.js';
import { isConfigured, verifyWebhook, parseEndOfCall } from '../_lib/vapi.js';
import { upsertLead, upsertCall, raiseSos, shouldEscalate } from '../_lib/receptionist.js';
import { parseBody } from '../_lib/http.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method' }); }
  if (!isConfigured()) return res.status(503).json({ error: 'integration_not_configured' });
  if (!verifyWebhook(req)) return res.status(401).json({ error: 'unauthorized' });

  const sb = admin();
  if (!sb) return res.status(503).json({ error: 'db_not_configured' });

  const body = parseBody(req);
  const message = body?.message || body || {};
  const type = message.type || '';

  // Resolve the owning user from the assistant id on the call.
  const assistantId = message.call?.assistantId || message.assistant?.id || null;
  if (!assistantId) return res.status(200).json({ ok: true, ignored: 'no_assistant' });

  const { data: config } = await sb.from('receptionist_config')
    .select('*').eq('vapi_assistant_id', assistantId).maybeSingle();
  if (!config) return res.status(200).json({ ok: true, ignored: 'unknown_assistant' });
  const userId = config.user_id;

  try {
    if (type === 'end-of-call-report') {
      const c = parseEndOfCall(message);
      const callerNumber = c.direction === 'inbound' ? c.fromNumber : c.toNumber;
      const lead = await upsertLead(userId, {
        name: c.structuredData?.name || null,
        phone: callerNumber,
        email: c.structuredData?.email || null,
        source: 'voice',
        intent: c.structuredData?.intent || null,
        profileData: c.structuredData || null,
      });

      const escalate = shouldEscalate(c.transcript || c.summary, config)
        || c.structuredData?.escalate === true
        || c.endedReason === 'assistant-forwarded-call';

      await upsertCall(userId, {
        lead_id: lead?.id || null,
        provider: 'vapi',
        provider_call_id: c.providerCallId,
        direction: c.direction,
        from_number: c.fromNumber,
        to_number: c.toNumber,
        status: 'completed',
        duration_seconds: c.durationSeconds,
        recording_url: c.recordingUrl,
        transcript: c.transcript,
        summary: c.summary,
        ended_reason: c.endedReason,
        escalated: escalate,
        started_at: c.startedAt,
        ended_at: c.endedAt,
      });

      if (escalate) {
        const profile = await getProfile(userId);
        await raiseSos(userId, config, profile, {
          leadId: lead?.id || null,
          reason: 'Llamada marcada como urgente',
          detail: c.summary || (c.transcript ? c.transcript.slice(0, 500) : ''),
          channel: 'voice',
        });
      }
      return res.status(200).json({ ok: true, stored: 'call' });
    }

    if (type === 'status-update') {
      const callId = message.call?.id || null;
      if (callId) {
        await sb.from('receptionist_calls')
          .update({ status: message.status || 'in_progress' })
          .eq('provider', 'vapi').eq('provider_call_id', callId);
      }
      return res.status(200).json({ ok: true, stored: 'status' });
    }

    // transcript / other event types — acknowledge without storing partials.
    return res.status(200).json({ ok: true, ignored: type || 'unknown' });
  } catch (err) {
    console.error('[vapi-webhook]', err.message);
    // Always 200 so Vapi doesn't retry-storm; we logged the error.
    return res.status(200).json({ ok: false, error: 'handler_error' });
  }
}
