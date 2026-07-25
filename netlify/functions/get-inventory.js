/**
 * GET /api/reseller/inventory proxy
 */

import { verifyAuth, ok, err } from './auth-check.js';

const CELLGODS_URL = 'https://api.cellgods.com/api/reseller';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });

  try {
    await verifyAuth(req);

    const res = await fetch(`${CELLGODS_URL}/inventory`, {
      headers: { 'X-API-Key': process.env.CELLGODS_API_KEY },
    });
    const data = await res.json();

    if (!data.success) throw new Error(data.error || 'CellGods API error');
    return ok(data.data);
  } catch (e) {
    return err(e.message, e.message === 'Unauthorized' ? 401 : 500);
  }
};
