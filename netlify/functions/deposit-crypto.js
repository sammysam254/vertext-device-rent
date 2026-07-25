/**
 * POST deposit-crypto — creates NOWPayments invoice
 * Supports USDT on: TRC-20, BEP-20, ERC-20, Polygon
 */
import { verifyAuth, ok, err, supabase } from './auth-check.js';

const NP_API = 'https://api.nowpayments.io/v1';
const APP_URL = process.env.VITE_APP_URL || 'https://vertext.site';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return err('Method not allowed', 405);

  try {
    const user = await verifyAuth(req);
    const { amount_cents, currency = 'usdttrc20' } = await req.json();

    if (!amount_cents || amount_cents < 500) {
      return err('Minimum deposit is $5.00 (500 cents)');
    }

    const SUPPORTED = ['usdttrc20', 'usdtbep20', 'usdterc20', 'usdtpolygon'];
    if (!SUPPORTED.includes(currency)) {
      return err(`Unsupported currency. Use one of: ${SUPPORTED.join(', ')}`);
    }

    const usd_amount = amount_cents / 100;
    const order_id = `vd_${user.id.slice(0, 8)}_${Date.now()}`;

    // Create NOWPayments invoice
    const npRes = await fetch(`${NP_API}/invoice`, {
      method: 'POST',
      headers: {
        'x-api-key': process.env.NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: usd_amount,
        price_currency: 'usd',
        pay_currency: currency,
        order_id,
        order_description: `Vertext Devices wallet top-up — $${usd_amount.toFixed(2)}`,
        ipn_callback_url: `${APP_URL}/.netlify/functions/nowpay-webhook`,
        success_url: `${APP_URL}/#/dashboard/wallet?topup=success`,
        cancel_url: `${APP_URL}/#/dashboard/wallet`,
        is_fixed_rate: false,
        is_fee_paid_by_user: false,
      }),
    });

    const npData = await npRes.json();
    if (!npRes.ok || !npData.invoice_url) {
      throw new Error(npData.message || 'NOWPayments error');
    }

    // Save pending transaction
    await supabase.from('wallet_transactions').insert({
      user_id: user.id,
      type: 'deposit',
      amount_cents,
      balance_after_cents: 0,
      reference: order_id,
      provider: 'nowpayments',
      status: 'pending',
    });

    return ok({
      checkout_url: npData.invoice_url,
      invoice_id: npData.id,
      order_id,
      amount_cents,
      currency,
    });

  } catch (e) {
    return err(e.message, e.message === 'Unauthorized' ? 401 : 500);
  }
};
