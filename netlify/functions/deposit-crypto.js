/**
 * POST deposit-crypto — creates NOWPayments direct payment or invoice
 * Returns pay_address, pay_amount, and QR code URL for in-website modal display.
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
      usdtbep20: 'usdtbsc',
      usdtbsc: 'usdtbsc',
      usdterc20: 'usdterc20',
      usdtpolygon: 'usdtmatic',
      usdtmatic: 'usdtmatic',
      usdtsol: 'usdtsol',
    };

    const validTicker = TICKER_MAP[currency.toLowerCase()];
    if (!validTicker) {
      return err(`Unsupported crypto network. Supported: TRC-20, BEP-20, ERC-20, Polygon, Solana`);
    }

    const usd_amount = amount_cents / 100;
    const order_id = `vd_${user.id.slice(0, 8)}_${Date.now()}`;

    // 1. Try creating direct payment first (returns exact pay_address & pay_amount for in-app display)
    let paymentData = null;
    try {
      const npPayRes = await fetch(`${NP_API}/payment`, {
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
          order_description: `Vertext Devices wallet deposit — $${usd_amount.toFixed(2)}`,
          ipn_callback_url: `${APP_URL}/.netlify/functions/nowpay-webhook`,
        }),
      });

      if (npPayRes.ok) {
        paymentData = await npPayRes.json();
      }
    } catch (_) {
      // Fallback to invoice API if direct payment API is unavailable
    }

    // 2. If direct payment failed or returned no address, fallback to invoice API
    let checkout_url = '';
    let pay_address = '';
    let pay_amount = usd_amount;

    if (paymentData && paymentData.pay_address) {
      pay_address = paymentData.pay_address;
      pay_amount = paymentData.pay_amount || usd_amount;
    }

    // Always generate an invoice link as backup
    const npInvRes = await fetch(`${NP_API}/invoice`, {
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
        order_description: `Vertext Devices wallet deposit — $${usd_amount.toFixed(2)}`,
        ipn_callback_url: `${APP_URL}/.netlify/functions/nowpay-webhook`,
        success_url: `${APP_URL}/#/dashboard/wallet?topup=success`,
        cancel_url: `${APP_URL}/#/dashboard/wallet`,
      }),
    });

    const npInvData = await npInvRes.json();
    if (npInvData && npInvData.invoice_url) {
      checkout_url = npInvData.invoice_url.replace(/^http:\/\//i, 'https://');
    }

    // Save pending transaction record
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
      order_id,
      amount_cents,
      usd_amount,
      pay_amount,
      pay_address,
      pay_currency: validTicker,
      checkout_url,
      qr_code_url: pay_address ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pay_address)}` : '',
    });

  } catch (e) {
    return err(e.message, e.message === 'Unauthorized' ? 401 : 500);
  }
};
