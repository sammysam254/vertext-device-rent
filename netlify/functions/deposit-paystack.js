/**
 * POST deposit-paystack
 * Charges in KES (Kenya Shillings). Wallet maintained in USD.
 * Restricts Paystack checkout to CARD payment ONLY (channels: ['card']).
 * No minimum deposit limit for Paystack.
 */
import { verifyAuth, ok, err, supabase } from './auth-check.js';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const APP_URL = process.env.VITE_APP_URL || 'https://vertext.site';

// KES to USD rate (configurable via admin_settings or env)
// 1 USD = KES_RATE KES
const DEFAULT_KES_RATE = 130;

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return err('Method not allowed', 405);

  try {
    const user = await verifyAuth(req);
    const { amount_cents, email } = await req.json();

    if (!amount_cents || amount_cents <= 0) {
      return err('Please enter a valid deposit amount');
    }

    // Get KES rate from admin settings or use default
    const { data: rateSetting } = await supabase
      .from('admin_settings').select('value').eq('key', 'kes_usd_rate').single();
    const kesRate = rateSetting?.value?.rate || DEFAULT_KES_RATE;

    // Convert USD cents → KES (Paystack amount in smallest unit for KES = 100 * KES amount)
    const usd_amount = amount_cents / 100;
    const kes_amount = Math.max(1, Math.round(usd_amount * kesRate)); // Ensure at least 1 KES
    const paystack_amount = kes_amount * 100; // Paystack KES in kobo-equivalent

    const reference = `vd_${user.id.slice(0, 8)}_${Date.now()}`;

    // Create pending transaction record
    await supabase.from('wallet_transactions').insert({
      user_id: user.id,
      type: 'deposit',
      amount_cents,          // USD cents to be credited
      balance_after_cents: 0, // updated by webhook
      reference,
      provider: 'paystack',
      status: 'pending',
    });

    // Initialize Paystack transaction (KES, CARD ONLY)
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email || user.email,
        amount: paystack_amount,
        currency: 'KES',
        channels: ['card'], // Restrict to Card Payment ONLY
        reference,
        callback_url: `${APP_URL}/#/dashboard/wallet?topup=success`,
        metadata: {
          user_id: user.id,
          usd_cents: amount_cents,
          kes_amount,
          kes_rate: kesRate,
        },
      }),
    });

    const psData = await paystackRes.json();
    if (!psData.status) throw new Error(psData.message || 'Paystack error');

    return ok({
      checkout_url: psData.data.authorization_url,
      reference,
      kes_amount,
      usd_cents: amount_cents,
      currency: 'KES',
    });

  } catch (e) {
    return err(e.message, e.message === 'Unauthorized' ? 401 : 500);
  }
};
