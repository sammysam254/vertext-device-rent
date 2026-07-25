/**
 * POST admin-credit-user-wallet
 * Allows Admin to credit funds directly to any customer's USD wallet.
 */
import { verifyAdmin, ok, err, supabase } from './auth-check.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return err('Method not allowed', 405);

  try {
    await verifyAdmin(req);
    const { user_id, amount_cents, note = 'Admin manual credit' } = await req.json();

    if (!user_id) return err('User ID is required');
    if (!amount_cents || amount_cents <= 0) {
      return err('Please enter a valid positive credit amount in USD');
    }

    // 1. Fetch target user's current wallet balance
    const { data: wallet, error: walletErr } = await supabase
      .from('wallets')
      .select('balance_cents')
      .eq('user_id', user_id)
      .single();

    let currentBalance = wallet?.balance_cents || 0;
    const newBalance = currentBalance + amount_cents;

    // 2. Update wallet balance
    const { error: updateErr } = await supabase
      .from('wallets')
      .upsert({
        user_id,
        balance_cents: newBalance,
        currency: 'usd',
        updated_at: new Date().toISOString(),
      });

    if (updateErr) throw updateErr;

    // 3. Log completed transaction
    const reference = `admin_credit_${Date.now()}`;
    await supabase.from('wallet_transactions').insert({
      user_id,
      type: 'deposit',
      amount_cents,
      balance_after_cents: newBalance,
      reference,
      provider: 'admin_credit',
      status: 'completed',
    });

    return ok({
      success: true,
      user_id,
      amount_cents,
      new_balance: newBalance,
      note,
    });

  } catch (e) {
    return err(e.message, e.message === 'Admin access required' ? 403 : 500);
  }
};
