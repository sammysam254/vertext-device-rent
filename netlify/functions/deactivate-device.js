/**
 * POST deactivate-device — cancel via CellGods, update DB
 */
import { verifyAuth, ok, err, supabase } from './auth-check.js';

const CELLGODS_URL = 'https://api.cellgods.com/api/reseller';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return err('Method not allowed', 405);
  try {
    const user = await verifyAuth(req);
    const { order_id } = await req.json();
    if (!order_id) return err('order_id is required');

    // Verify ownership
    const { data: device } = await supabase
      .from('devices').select('id').eq('order_id', order_id).eq('user_id', user.id).single();
    if (!device) return err('Device not found', 404);

    // Call CellGods
    await fetch(`${CELLGODS_URL}/deactivate`, {
      method: 'POST',
      headers: { 'X-API-Key': process.env.CELLGODS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id }),
    });

    // Update DB
    await supabase.from('devices')
      .update({ status: 'cancelled' })
      .eq('order_id', order_id).eq('user_id', user.id);

    return ok({ order_id, status: 'cancelled' });
  } catch (e) {
    return err(e.message, e.message === 'Unauthorized' ? 401 : 500);
  }
};
