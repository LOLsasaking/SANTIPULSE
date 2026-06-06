import { handlePulseRoute } from '../backend/handlers/router.js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  return handlePulseRoute(req, res);
}
