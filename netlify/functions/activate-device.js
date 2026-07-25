/**
 * POST activate-device
 * Deducts wallet balance, calls CellGods /activate, stores device + generates stream token
 */

import { verifyAuth, ok, err, supabase } from './auth-check.js';

const CELLGODS_URL = 'https://api.cellgods.com/api/reseller';

function generateStreamToken() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function ensureUniqueToken() {
  let token, exists;
  do {
    token = generateStreamToken();
    const { data } = await supabase.from('devices').select('id').eq('stream_token', token).single();
    exists = !!data;
  } while (exists);
  return token;
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return err('Method not allowed', 405);

  try {
    const user = await verifyAuth(req);
    const body = await req.json();
    const { phone_id, duration_days = 30 } = body;

    if (!phone_id) return err('phone_id is required');

    // 1. Get wallet balance
    const { data: wallet, error: walletErr } = await supabase
      .from('wallets').select('*').eq('user_id', user.id).single();
    if (walletErr || !wallet) return err('Wallet not found', 404);

    // 2. Get pricing
    const { data: pricingData } = await supabase
      .from('device_pricing').select('*')
      .or(`phone_id.eq.${phone_id}`)
      .eq('is_active', true).single();

    const { data: globalSetting } = await supabase
      .from('admin_settings').select('value').eq('key', 'default_pricing').single();

    const pricing = pricingData || globalSetting?.value || { one_time_fee_cents: 999, monthly_fee_cents: 2999 };
    const one_time_fee_cents = pricing.one_time_fee_cents;
    const monthly_fee_cents = pricing.monthly_fee_cents;

    // 3. Check balance
    if (wallet.balance_cents < one_time_fee_cents) {
      return err(`Insufficient balance. Need $${(one_time_fee_cents/100).toFixed(2)}, have $${(wallet.balance_cents/100).toFixed(2)}`, 402);
    }

    // 4. Call CellGods
    const cgRes = await fetch(`${CELLGODS_URL}/activate`, {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.CELLGODS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_id,
        customer_email: user.email || `user_${user.id}@vertext.site`,
        duration_days,
      }),
    });
    const cgData = await cgRes.json();

    if (!cgData.success) {
      return err(cgData.error || 'CellGods activation failed', cgRes.status);
    }

    const { order_id, pin, stream_url, expires_at } = cgData.data;

    // 5. Get inventory details for model name
    let model = 'Unknown Device', platform = 'unknown';
    try {
      const invRes = await fetch(`${CELLGODS_URL}/inventory`, {
        headers: { 'X-API-Key': process.env.CELLGODS_API_KEY },
      });
      const invData = await invRes.json();
      const found = invData.data?.find(d => d.phone_id === phone_id);
      if (found) { model = found.model; platform = found.platform; }
    } catch (_) {}

    // 6. Generate unique stream token
    const stream_token = await ensureUniqueToken();

    // 7. Debit wallet + insert device + log transaction (all in one go)
    const newBalance = wallet.balance_cents - one_time_fee_cents;

    await Promise.all([
      supabase.from('wallets')
        .update({ balance_cents: newBalance })
        .eq('user_id', user.id),

      supabase.from('devices').insert({
        user_id: user.id,
        phone_id,
        order_id,
        model,
        platform,
        status: 'active',
        stream_url: stream_url || null,
        stream_token,
        pin,
        one_time_fee_cents,
        monthly_fee_cents,
        purchased_at: new Date().toISOString(),
        expires_at,
        next_renewal_at: expires_at,
      }),

      supabase.from('wallet_transactions').insert({
        user_id: user.id,
        type: 'purchase',
        amount_cents: -one_time_fee_cents,
        balance_after_cents: newBalance,
        reference: order_id,
        provider: 'cellgods',
        status: 'completed',
      }),
    ]);

    return ok({
      order_id,
      model,
      platform,
      stream_token,
      pin,
      expires_at,
      balance_after_cents: newBalance,
    });

  } catch (e) {
    return err(e.message, e.message === 'Unauthorized' ? 401 : 500);
  }
};
