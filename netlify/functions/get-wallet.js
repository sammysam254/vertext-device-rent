/** GET wallet balance */
import { verifyAuth, ok, err, supabase } from './auth-check.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  try {
    const user = await verifyAuth(req);
    const { data, error } = await supabase
      .from('wallets').select('*').eq('user_id', user.id).single();
    if (error) throw error;
    return ok(data);
  } catch (e) {
    return err(e.message, e.message === 'Unauthorized' ? 401 : 500);
  }
};
