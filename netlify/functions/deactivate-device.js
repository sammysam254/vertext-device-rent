/**
 * POST deactivate-device — cancel via CellGods / reset manual device for store availability, update DB
 */
import { verifyAuth, ok, err, supabase } from './auth-check.js';

const CELLGODS_URL = 'https://api.cellgods.com/api/reseller';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return err('Method not allowed', 405);
  try {
    const user = await verifyAuth(req);
    const body = await req.json();
    const targetId = body.device_id || body.order_id;
    if (!targetId) return err('order_id or device_id is required');

    const adminEmail = process.env.ADMIN_EMAIL || 'sammyseth260@gmail.com';
    const isAdmin = user.email === adminEmail;

    // Verify ownership or admin permission
    let query = supabase.from('devices').select('*');
    if (body.device_id) {
      query = query.eq('id', body.device_id);
    } else if (body.order_id) {
      query = query.eq('order_id', body.order_id);
    }

    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    const { data: device, error: findErr } = await query.maybeSingle();
    if (findErr || !device) return err('Device not found or permission denied', 404);

    const isManual = device.phone_id?.startsWith('manual_');

    if (!isManual) {
      // Call CellGods API deactivation if it's a CellGods reseller device
      if (device.order_id) {
        try {
          await fetch(`${CELLGODS_URL}/deactivate`, {
            method: 'POST',
            headers: { 'X-API-Key': process.env.CELLGODS_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: device.order_id }),
          });
        } catch (_) {}
      }

      // Update status in DB
      const { error: updateErr } = await supabase.from('devices')
        .update({ status: 'cancelled', show_to_customers: false })
        .eq('id', device.id);

      if (updateErr) throw updateErr;
    } else {
      // Manual admin device cancelled -> Fetch admin profile id to assign ownership back
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle();

      const resetOwnerId = adminProfile?.id || device.user_id;

      const { error: updateErr } = await supabase.from('devices')
        .update({
          user_id: resetOwnerId,
          status: 'active',
          show_to_customers: true,
          purchased_at: new Date().toISOString(),
          expires_at: null,
        })
        .eq('id', device.id);

      if (updateErr) throw updateErr;
    }

    return ok({ order_id: device.order_id, status: 'cancelled', show_to_customers: true });
  } catch (e) {
    return err(e.message, e.message === 'Unauthorized' ? 401 : 500);
  }
};


