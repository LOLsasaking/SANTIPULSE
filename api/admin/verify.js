import { adminAuth } from '../_lib/auth.js';

/**
 * API Connection Verification Route
 * Performs real-time health checks on external service integrations.
 */
export default async function handler(req, res) {
    // 1. Authenticate the admin user
    const user = await adminAuth(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const results = {
        vapi: { status: 'disconnected', message: 'No API Key' },
        meta: { status: 'disconnected', message: 'No Access Token' },
        stripe: { status: 'disconnected', message: 'No Secret Key' },
        supabase: { status: 'disconnected', message: 'Connection Failed' }
    };

    try {
        // --- 1. Verify Vapi (AI Voice) ---
        if (process.env.VAPI_API_KEY) {
            const vapiRes = await fetch('https://api.vapi.ai/me', {
                headers: { 'Authorization': `Bearer ${process.env.VAPI_API_KEY}` }
            });
            results.vapi = vapiRes.ok 
                ? { status: 'connected', message: 'Active' } 
                : { status: 'error', message: 'Invalid API Key' };
        }

        // --- 2. Verify Meta (Instagram/Ads) ---
        if (process.env.META_ACCESS_TOKEN) {
            const metaRes = await fetch(`https://graph.facebook.com/me?access_token=${process.env.META_ACCESS_TOKEN}`);
            results.meta = metaRes.ok 
                ? { status: 'connected', message: 'Authenticated' } 
                : { status: 'error', message: 'Token Expired/Invalid' };
        }

        // --- 3. Verify Stripe (Payments) ---
        if (process.env.STRIPE_SECRET_KEY) {
            const stripeRes = await fetch('https://api.stripe.com/v1/accounts', {
                headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` }
            });
            results.stripe = stripeRes.ok 
                ? { status: 'connected', message: 'Active' } 
                : { status: 'error', message: 'Invalid Secret Key' };
        }

        // --- 4. Verify Supabase (Database) ---
        if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            // Simple health check query
            const dbRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/leads?select=count`, {
                headers: { 
                    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
                }
            });
            results.supabase = dbRes.ok 
                ? { status: 'connected', message: 'Database Online' } 
                : { status: 'error', message: 'Table Access Denied' };
        }

        return res.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            integrations: results
        });

    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            error: 'Verification process failed',
            details: error.message 
        });
    }
}
