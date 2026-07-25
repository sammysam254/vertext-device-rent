/** GET admin-get-orders?status=active */
import { verifyAdmin, ok, err, supabase } from './auth-check.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  try {
    await verifyAdmin(req);
    const url = new URL(req.url);
    const status = url.searchParams.get('status');

    let query = supabase
      .from('devices')
      .select('*, profiles(email, full_name)')
      .order('purchased_at', { ascending: false })
      .limit(200);

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    const orders = (data || []).map(d => ({
      ...d,
      customer_email: d.profiles?.email,
      customer_name: d.profiles?.full_name,
    }));

    return ok(orders);
  } catch (e) {
    return err(e.message, e.message === 'Admin access required' ? 403 : 500);
  }
};
