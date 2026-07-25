/**
 * GET get-inventory proxy
 * Combines CellGods API inventory + Admin manually added devices flagged with show_to_customers = true.
 */

import { verifyAuth, ok, err, supabase } from './auth-check.js';

const CELLGODS_URL = 'https://api.cellgods.com/api/reseller';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });

  try {
    await verifyAuth(req);

    // 1. Fetch CellGods API inventory (with graceful fallback if API is unreachable)
    let apiInventory = [];
    try {
      const res = await fetch(`${CELLGODS_URL}/inventory`, {
        headers: { 'X-API-Key': process.env.CELLGODS_API_KEY },
      });
      const data = await res.json();
      if (data && data.success && Array.isArray(data.data)) {
        apiInventory = data.data;
      }
    } catch (_) {
      // CellGods API fallback
    }

    // 2. Fetch admin manual devices configured with show_to_customers = true
    const { data: manualDevices } = await supabase
      .from('devices')
      .select('*')
      .eq('show_to_customers', true);

    const formattedManual = (manualDevices || []).map(d => ({
      phone_id: d.phone_id,
      model: d.model,
      platform: d.platform.toLowerCase(),
      assignable: d.status === 'active',
      source: 'admin_custom',
      stream_token: d.stream_token,
      is_manual_admin: true,
    }));

    // Combine both lists
    const combined = [...formattedManual, ...apiInventory];

    return ok(combined);
  } catch (e) {
    return err(e.message, e.message === 'Unauthorized' ? 401 : 500);
  }
};
