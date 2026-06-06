import { adminAuth } from '../../_lib/auth.js';

/**
 * AI Receptionist & Leads Hub Package Handler
 * Consolidates all voice, WhatsApp, and lead management logic.
 */
export default async function handler(req, res) {
    const user = await adminAuth(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    const route = pathname.split('/api/admin/receptionist/')[1];

    // Route: GET /api/admin/receptionist/leads
    if (route === 'leads' && req.method === 'GET') {
        try {
            // Placeholder: In production, fetch from Supabase
            const leads = [
                { id: 1, name: 'Juan García', phone: '+34 612 345 678', source: 'voice_call', status: 'qualified', createdAt: '2026-06-05' },
                { id: 2, name: 'María López', phone: '+34 698 765 432', source: 'whatsapp', status: 'pending', createdAt: '2026-06-04' }
            ];
            return res.status(200).json({ success: true, leads });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // Route: POST /api/admin/receptionist/create-lead
    if (route === 'create-lead' && req.method === 'POST') {
        const { name, phone, source } = req.body;
        try {
            // Placeholder: In production, save to Supabase
            return res.status(200).json({ 
                success: true, 
                leadId: 'lead_' + Date.now(),
                name,
                phone,
                source
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // Route: GET /api/admin/receptionist/calendar
    if (route === 'calendar' && req.method === 'GET') {
        try {
            const slots = [
                { time: '09:00', available: true },
                { time: '10:00', available: false },
                { time: '11:00', available: true },
                { time: '14:00', available: true }
            ];
            return res.status(200).json({ success: true, slots });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // Route: POST /api/admin/receptionist/book-slot
    if (route === 'book-slot' && req.method === 'POST') {
        const { leadId, time } = req.body;
        try {
            return res.status(200).json({ 
                success: true, 
                message: `Lead booked for ${time}`,
                leadId,
                time
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // Route: POST /api/admin/receptionist/human-sos
    if (route === 'human-sos' && req.method === 'POST') {
        const { leadId, reason } = req.body;
        try {
            // Placeholder: In production, trigger a notification to the admin
            return res.status(200).json({ 
                success: true, 
                message: 'Human SOS triggered. Admin notified.',
                leadId,
                reason
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(404).json({ error: 'Route not found' });
}
