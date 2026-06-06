import Stripe from 'stripe';
import { adminAuth } from '../../_lib/auth.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Stripe Integration Handler
 * Manages subscription checkouts and plan selection.
 */
export default async function handler(req, res) {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    const route = pathname.split('/api/admin/stripe/')[1];

    // Route: POST /api/admin/stripe/create-checkout
    if (route === 'create-checkout' && req.method === 'POST') {
        try {
            const { planId, email } = req.body;
            
            // Map planId to Stripe Price IDs
            const priceMap = {
                'package-1': process.env.STRIPE_PRICE_RECEPTIONIST,
                'package-2': process.env.STRIPE_PRICE_SOCIAL,
                'package-3': process.env.STRIPE_PRICE_ADS
            };

            const priceId = priceMap[planId];
            if (!priceId) return res.status(400).json({ error: 'Invalid plan' });

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: priceId,
                        quantity: 1
                    }
                ],
                mode: 'subscription',
                success_url: `${process.env.DOMAIN}/bienvenida?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.DOMAIN}/precios`,
                customer_email: email
            });

            return res.status(200).json({ success: true, sessionId: session.id, url: session.url });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // Route: GET /api/admin/stripe/session/:sessionId
    if (route.startsWith('session/') && req.method === 'GET') {
        try {
            const sessionId = route.split('session/')[1];
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            return res.status(200).json({ success: true, session });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(404).json({ error: 'Route not found' });
}
