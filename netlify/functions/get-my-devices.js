/**
 * GET my devices
 * Returns only devices purchased by the customer.
 * Manual admin-created devices are excluded from customer dashboards.
 */
import { verifyAuth, ok, err, supabase } from './auth-check.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  try {
    const user = await verifyAuth(req);
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', user.id)
      .not('phone_id', 'like', 'manual_%') // Exclude manual admin-added devices
      .order('purchased_at', { ascending: false });

    if (error) throw error;
    return ok(data || []);
  } catch (e) {
    return err(e.message, e.message === 'Unauthorized' ? 401 : 500);
  }
};
