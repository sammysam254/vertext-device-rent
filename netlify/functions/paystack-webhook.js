/**
 * POST paystack-webhook
 * Handles charge.success event — credits user wallet in USD
 */
import { ok, err, supabase } from './auth-check.js';
import crypto from 'crypto';

export default async (req) => {
  if (req.method !== 'POST') return err('Method not allowed', 405);

  try {
    const body = await req.text();
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(body)
      .digest('hex');

    const signature = req.headers.get('x-paystack-signature') || '';
    if (hash !== signature) return err('Invalid signature', 401);

    const event = JSON.parse(body);
    if (event.event !== 'charge.success') return ok({ received: true });

    const { reference, metadata, status } = event.data;
    if (status !== 'success') return ok({ received: true });

    const { user_id, usd_cents } = metadata || {};
    if (!user_id || !usd_cents) return err('Missing metadata', 400);

    // Check if already processed
    const { data: tx } = await supabase
      .from('wallet_transactions')
      .select('*').eq('reference', reference).single();

    if (!tx || tx.status === 'completed') return ok({ received: true });

    // Credit wallet
    const { data: wallet } = await supabase
      .from('wallets').select('balance_cents').eq('user_id', user_id).single();

    const newBalance = (wallet?.balance_cents || 0) + parseInt(usd_cents);

    await Promise.all([
      supabase.from('wallets')
        .update({ balance_cents: newBalance })
        .eq('user_id', user_id),
      supabase.from('wallet_transactions')
        .update({ status: 'completed', balance_after_cents: newBalance })
        .eq('reference', reference),
    ]);

    return ok({ credited: true, amount_cents: usd_cents, new_balance: newBalance });
  } catch (e) {
    return err(e.message, 500);
  }
};
