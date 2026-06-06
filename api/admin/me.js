import { requireUser } from '../_lib/auth.js';
import { send } from '../_lib/adminHttp.js';

export default async function handler(req, res) {
  const user = await requireUser(req, res); if (!user) return;
  send(res, 200, {
    user: { id: user.id, email: user.email },
    packages: [
      { id: 'receptionist-leads', name: 'The Receptionist & Leads Leadership Hub' },
      { id: 'social-insights-autoposter', name: 'The Social Media Insights & Auto-Poster' },
      { id: 'auto-ad-manager', name: 'Auto-Ad Manager' }
    ]
  });
}
