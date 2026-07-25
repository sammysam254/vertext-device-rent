/** GET admin-get-users */
import { verifyAdmin, ok, err, supabase } from './auth-check.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  try {
    await verifyAdmin(req);

    const { data: profiles } = await supabase
      .from('profiles').select('*').order('created_at', { ascending: false });

    const { data: wallets } = await supabase.from('wallets').select('user_id, balance_cents');
    const { data: devices } = await supabase
      .from('devices').select('user_id, status').eq('status', 'active');

    const walletMap = {};
    (wallets || []).forEach(w => { walletMap[w.user_id] = w.balance_cents; });

    const deviceCount = {};
    (devices || []).forEach(d => {
      deviceCount[d.user_id] = (deviceCount[d.user_id] || 0) + 1;
    });

    const users = (profiles || []).map(p => ({
      ...p,
      balance_cents: walletMap[p.id] || 0,
      active_devices: deviceCount[p.id] || 0,
    }));

    return ok(users);
  } catch (e) {
    return err(e.message, e.message === 'Admin access required' ? 403 : 500);
  }
};
