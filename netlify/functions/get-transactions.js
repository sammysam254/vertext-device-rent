/** GET wallet transactions */
import { verifyAuth, ok, err, supabase } from './auth-check.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  try {
    const user = await verifyAuth(req);
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
