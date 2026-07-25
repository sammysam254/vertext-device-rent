/**
 * POST deposit-crypto — creates NOWPayments invoice
 * Correct NOWPayments USDT ticker symbols:
 * - usdttrc20 (Tron TRC-20)
 * - usdtbsc (BNB Smart Chain BEP-20)
 * - usdterc20 (Ethereum ERC-20)
 * - usdtmatic (Polygon)
 * - usdtsol (Solana)
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
      return err('Minimum deposit for Crypto is $5.00 (500 cents)');
    }

    // Correct NOWPayments ticker map
    const TICKER_MAP = {
      usdttrc20: 'usdttrc20',
      usdtbep20: 'usdtbsc',   // NOWPayments ticker for BSC is usdtbsc
      usdtbsc: 'usdtbsc',
      usdterc20: 'usdterc20',
      usdtpolygon: 'usdtmatic', // NOWPayments ticker for Polygon is usdtmatic
      usdtmatic: 'usdtmatic',
      usdtsol: 'usdtsol',
    };

    const validTicker = TICKER_MAP[currency.toLowerCase()];
    if (!validTicker) {
      return err(`Unsupported crypto network. Supported: TRC-20 (usdttrc20), BEP-20 (usdtbsc), ERC-20 (usdterc20), Polygon (usdtmatic), Solana (usdtsol)`);
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
        pay_currency: validTicker,
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
      throw new Error(npData.message || 'NOWPayments API error');
    }

    // Force HTTPS on checkout URL to prevent browser Mixed Content block
    const checkout_url = npData.invoice_url.replace(/^http:\/\//i, 'https://');

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
      checkout_url,
      invoice_id: npData.id,
      order_id,
      amount_cents,
      currency: validTicker,
    });

  } catch (e) {
    return err(e.message, e.message === 'Unauthorized' ? 401 : 500);
  }
};
