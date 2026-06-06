/* ============================================================
   POST /api/stripe/webhook — Stripe event handler
   ------------------------------------------------------------
   Signature-verified, idempotent. Provisions/deprovisions the
   profile's subscription state in Supabase.

   CRITICAL: Stripe signature verification needs the RAW request
   body, so Vercel's body parser is disabled below and the body
   is read from the stream manually.
   ============================================================ */
import { getStripe, alreadyProcessed, recordEvent, updateSubscription, findProfileBySubscription, findProfileByCustomer } from '../lib/stripe.js';
import { planByPriceId } from '../lib/products.js';
import { createJob, finishJob } from '../lib/db.js';

// Disable Vercel's automatic JSON body parsing for this route.
export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method' }); }

  const stripe = await getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return res.status(500).json({ error: 'stripe_not_configured' });

  const sig = req.headers['stripe-signature'];
  const raw = await readRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error('[stripe/webhook] signature failed:', err.message);
    return res.status(400).json({ error: 'bad_signature' });
  }

  // Idempotency: never process the same event twice.
  if (await alreadyProcessed(event.id)) {
    return res.status(200).json({ received: true, skipped: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.user_id;
        if (!userId) { console.error('[webhook] no user_id on session'); break; }

        if (session.mode === 'payment' && session.metadata?.kind === 'ad_launch') {
          const inputParams = {
            platform: session.metadata.platform || 'meta',
            post_id: session.metadata.post_id || null,
            caption: session.metadata.caption || null,
            budget_eur: Number(session.metadata.budget_eur || 0),
            duration_days: Number(session.metadata.duration_days || 0),
            stripe_session_id: session.id,
            paid_amount_total: session.amount_total,
          };
          const jobId = await createJob({
            automationType: 'ad_manager',
            userId,
            isDemo: false,
            inputParams,
          });
          await finishJob({
            jobId,
            status: 'completed',
            result: {
              success: true,
              module: 'ad_manager',
              title: 'Gestor de Ads',
              summary: 'Pago recibido. SantiPulse recibio la orden para lanzar el anuncio.',
              status: 'ad_launch_paid',
              metrics: [
                { label: 'Presupuesto', value: `${inputParams.budget_eur} EUR` },
                { label: 'Duracion', value: `${inputParams.duration_days} dias` },
                { label: 'Plataforma', value: inputParams.platform },
              ],
              autoActions: [
                'Pago confirmado en Stripe.',
                'Solicitud de anuncio registrada en el panel.',
                'El equipo puede lanzar o revisar la campana sin pedirle reglas al cliente.',
              ],
            },
          });
          break;
        }

        if (session.mode !== 'subscription') break;

        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const priceId = subscription.items.data[0]?.price?.id;
        await updateSubscription(userId, {
          status: subscription.status,
          subscriptionId: subscription.id,
          plan: planByPriceId(priceId),
          expiresAt: new Date(subscription.current_period_end * 1000).toISOString(),
          customerId: session.customer,
        });
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const profile = (await findProfileBySubscription(sub.id)) || (await findProfileByCustomer(sub.customer));
        if (!profile) break;
        const priceId = sub.items.data[0]?.price?.id;
        await updateSubscription(profile.id, {
          status: sub.status,
          subscriptionId: sub.id,
          plan: planByPriceId(priceId),
          expiresAt: new Date(sub.current_period_end * 1000).toISOString(),
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const profile = await findProfileBySubscription(sub.id);
        if (!profile) break;
        await updateSubscription(profile.id, {
          status: 'canceled', subscriptionId: sub.id, plan: 'none', expiresAt: null,
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const profile = await findProfileByCustomer(invoice.customer);
        if (!profile) break;
        await updateSubscription(profile.id, {
          status: 'past_due', subscriptionId: profile.subscription_id, plan: profile.plan, expiresAt: profile.plan_expires_at,
        });
        break;
      }

      default:
        // Unhandled — still recorded below so Stripe stops retrying.
        break;
    }

    await recordEvent(event.id, event.type);
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[stripe/webhook] processing error:', err.message);
    // 200 so Stripe doesn't hammer retries; logged for manual review.
    return res.status(200).json({ received: true, error: 'processing_error' });
  }
}
