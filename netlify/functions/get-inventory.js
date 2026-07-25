/**
 * GET get-inventory proxy
 * Combines CellGods API inventory + Admin manually added devices flagged with show_to_customers = true.
 * Evaluates active 5-minute free trial busy state for admin devices.
 */

import { verifyAuth, ok, err, supabase } from './auth-check.js';

const CELLGODS_URL = 'https://api.cellgods.com/api/reseller';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });

  try {
    await verifyAuth(req);

    // 1. Fetch CellGods API inventory
    let apiInventory = [];
    try {
      const res = await fetch(`${CELLGODS_URL}/inventory`, {
        headers: { 'X-API-Key': process.env.CELLGODS_API_KEY },
      });
      const data = await res.json();
      if (data && data.success && Array.isArray(data.data)) {
        // Explicitly flag API devices as non-manual (is_manual_admin: false)
        apiInventory = data.data.map(d => ({
          ...d,
          is_manual_admin: false,
          source: 'pool',
        }));
      }
    } catch (_) {
      // CellGods API fallback
    }

    // 2. Fetch admin manual devices configured with show_to_customers = true
    const { data: manualDevices } = await supabase
      .from('devices')
      .select('*')
      .eq('show_to_customers', true);

    const now = Date.now();

    // Check active trial busy states
    const formattedManual = await Promise.all((manualDevices || []).map(async (d) => {
      const { data: busyState } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', `trial_active_${d.phone_id}`)
        .single();

      const isBusy = !!(busyState && busyState.value && new Date(busyState.value.expires_at).getTime() > now);

      return {
        phone_id: d.phone_id,
        model: d.model,
        platform: d.platform.toLowerCase(),
        assignable: d.status === 'active',
        source: 'admin_custom',
        stream_token: d.stream_token,
        is_manual_admin: true,
        is_trial_busy: isBusy,
      };
    }));

    // Combine both lists
    const combined = [...formattedManual, ...apiInventory];

    return ok(combined);
  } catch (e) {
    return err(e.message, e.message === 'Unauthorized' ? 401 : 500);
  }
};
