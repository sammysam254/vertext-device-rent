/** GET wallet transactions with auto-expiry for 20min+ pending transactions */
import { verifyAuth, ok, err, supabase } from './auth-check.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  try {
    const user = await verifyAuth(req);

    // 1. Auto-fail any pending transactions created more than 20 minutes ago
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    await supabase
      .from('wallet_transactions')
      .update({ status: 'failed' })
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .lt('created_at', twentyMinsAgo);

    // 2. Return user's transaction history
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return ok(data || []);
  } catch (e) {
    return err(e.message, e.message === 'Unauthorized' ? 401 : 500);
  }
};
