/** GET admin-get-stats */
import { verifyAdmin, ok, err, supabase } from './auth-check.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  try {
    await verifyAdmin(req);

    const [
      profilesRes, activeDevRes, revenueRes, walletRes,
      recentOrdersRes, recentTxRes
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('devices').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('wallet_transactions').select('amount_cents').eq('type', 'purchase').eq('status', 'completed'),
      supabase.from('wallets').select('balance_cents'),
      supabase.from('devices').select('*, profiles(email)').order('purchased_at', { ascending: false }).limit(10),
      supabase.from('wallet_transactions').select('*').order('created_at', { ascending: false }).limit(10),
    ]);

    const total_revenue_cents = (revenueRes.data || []).reduce((sum, r) => sum + Math.abs(r.amount_cents), 0);
    const total_wallet_cents = (walletRes.data || []).reduce((sum, r) => sum + (r.balance_cents || 0), 0);

    return ok({
      total_users: profilesRes.count || 0,
      active_devices: activeDevRes.count || 0,
      total_revenue_cents,
      total_wallet_cents,
      recent_orders: (recentOrdersRes.data || []).map(d => ({
        ...d, customer_email: d.profiles?.email
      })),
      recent_transactions: recentTxRes.data || [],
    });
  } catch (e) {
    return err(e.message, e.message === 'Admin access required' ? 403 : 500);
  }
};
