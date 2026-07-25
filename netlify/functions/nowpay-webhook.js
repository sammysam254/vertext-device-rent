/**
 * POST nowpay-webhook — IPN from NOWPayments
 * Handles 'finished' (completed) as well as 'expired', 'failed', 'refunded' (failed)
 */
import { ok, err, supabase } from './auth-check.js';
import crypto from 'crypto';

export default async (req) => {
  if (req.method !== 'POST') return err('Method not allowed', 405);

  try {
    const body = await req.text();
    const event = JSON.parse(body);

    // Verify IPN signature
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
    if (ipnSecret) {
      const signature = req.headers.get('x-nowpayments-sig') || '';
      const sorted = JSON.stringify(sortObject(event));
      const expected = crypto.createHmac('sha512', ipnSecret).update(sorted).digest('hex');
      if (signature !== expected) return err('Invalid IPN signature', 401);
    }

    const { payment_status, order_id } = event;

    // Check if failed or expired
    if (['expired', 'failed', 'refunded'].includes(payment_status)) {
      await supabase
        .from('wallet_transactions')
        .update({ status: 'failed' })
        .eq('reference', order_id);
      return ok({ received: true, status: payment_status });
    }

    if (payment_status !== 'finished') return ok({ received: true, status: payment_status });

    // Find pending transaction
    const { data: tx } = await supabase
      .from('wallet_transactions')
      .select('*').eq('reference', order_id).single();

    if (!tx || tx.status === 'completed') return ok({ received: true });

    // Credit wallet
    const { data: wallet } = await supabase
      .from('wallets').select('balance_cents').eq('user_id', tx.user_id).single();

    const newBalance = (wallet?.balance_cents || 0) + tx.amount_cents;

    await Promise.all([
      supabase.from('wallets')
        .update({ balance_cents: newBalance })
        .eq('user_id', tx.user_id),
      supabase.from('wallet_transactions')
        .update({ status: 'completed', balance_after_cents: newBalance })
        .eq('reference', order_id),
    ]);

    return ok({ credited: true, amount_cents: tx.amount_cents, new_balance: newBalance });
  } catch (e) {
    return err(e.message, 500);
  }
};

function sortObject(obj) {
  return Object.keys(obj).sort().reduce((result, key) => {
    result[key] = obj[key] !== null && typeof obj[key] === 'object'
      ? sortObject(obj[key]) : obj[key];
    return result;
  }, {});
}
