/**
 * POST activate-device
 * Deducts wallet balance, assigns/activates device (CellGods or Admin manual device),
 * stores device ownership + returns stream access token.
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

    // 2. Check if this is an Admin manual device
    const isManualDevice = phone_id.startsWith('manual_');

    const days = Math.max(1, parseInt(duration_days) || 30);

    if (isManualDevice) {
      // Fetch manual device record
      const { data: manualDevice } = await supabase
        .from('devices')
        .select('*')
        .eq('phone_id', phone_id)
        .maybeSingle();

      if (!manualDevice) return err('Device not found', 404);

      // Get pricing
      const { data: globalSetting } = await supabase
        .from('admin_settings').select('value').eq('key', 'default_pricing').maybeSingle();
      const defaultPricing = globalSetting?.value || { one_time_fee_cents: 999, monthly_fee_cents: 2999 };

      const baseFee = manualDevice.monthly_fee_cents || manualDevice.one_time_fee_cents || defaultPricing.monthly_fee_cents || 9000;
      const monthly_fee_cents = baseFee;

      // Divide admin markup fee: Daily = $10 (1000c), Weekly = $40 (4000c), Monthly = $90 (9000c)
      let charged_fee_cents = baseFee;
      if (days === 1) {
        charged_fee_cents = Math.ceil(baseFee * (10 / 90));
      } else if (days === 7) {
        charged_fee_cents = Math.ceil(baseFee * (40 / 90));
      } else if (days !== 30) {
        charged_fee_cents = Math.ceil((baseFee * days) / 30);
      }

      // Check balance
      if (wallet.balance_cents < charged_fee_cents) {
        return err(`Insufficient balance. Need $${(charged_fee_cents/100).toFixed(2)}, have $${(wallet.balance_cents/100).toFixed(2)}`, 402);
      }

      const newBalance = wallet.balance_cents - charged_fee_cents;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

      // Transfer ownership to customer & update wallet
      await Promise.all([
        supabase.from('wallets')
          .update({ balance_cents: newBalance })
          .eq('user_id', user.id),

        supabase.from('devices')
          .update({
            user_id: user.id, // Assign ownership to customer
            show_to_customers: false, // Unpublish from available store
            status: 'active',
            one_time_fee_cents: charged_fee_cents,
            monthly_fee_cents,
            purchased_at: now.toISOString(),
            expires_at: expiresAt,
            next_renewal_at: expiresAt,
          })
          .eq('phone_id', phone_id),

        supabase.from('wallet_transactions').insert({
          user_id: user.id,
          type: 'purchase',
          amount_cents: -charged_fee_cents,
          balance_after_cents: newBalance,
          reference: manualDevice.order_id || `manual_ord_${Date.now()}`,
          provider: 'vertext',
          status: 'completed',
        }),
      ]);

      return ok({
        order_id: manualDevice.order_id,
        model: manualDevice.model,
        platform: manualDevice.platform,
        stream_token: manualDevice.stream_token,
        expires_at: expiresAt,
        balance_after_cents: newBalance,
      });
    }

    // 3. CellGods API Device Activation
    // Get pricing safely without invalid UUID PostgREST syntax
    const { data: pricingData } = await supabase
      .from('device_pricing')
      .select('*')
      .eq('phone_id', phone_id)
      .eq('is_active', true)
      .maybeSingle();

    const { data: globalSetting } = await supabase
      .from('admin_settings').select('value').eq('key', 'default_pricing').maybeSingle();

    const pricing = pricingData || globalSetting?.value || { one_time_fee_cents: 9000, monthly_fee_cents: 9000 };
    const baseFee = pricing.monthly_fee_cents || pricing.one_time_fee_cents || 9000;
    const monthly_fee_cents = baseFee;

    // Divide admin markup fee: Daily = $10 (1000c), Weekly = $40 (4000c), Monthly = $90 (9000c)
    let charged_fee_cents = baseFee;
    if (days === 1) {
      charged_fee_cents = Math.ceil(baseFee * (10 / 90));
    } else if (days === 7) {
      charged_fee_cents = Math.ceil(baseFee * (40 / 90));
    } else if (days !== 30) {
      charged_fee_cents = Math.ceil((baseFee * days) / 30);
    }

    // Check balance
    if (wallet.balance_cents < charged_fee_cents) {
      return err(`Insufficient balance. Need $${(charged_fee_cents/100).toFixed(2)}, have $${(wallet.balance_cents/100).toFixed(2)}`, 402);
    }

    let order_id = `cg_ord_${Date.now()}`;
    let pin = null;
    let stream_url = null;
    let cgExpires = null;
    let model = 'Cloud Device';
    let platform = 'android';
    let provider = 'vertext';

    // Get inventory details for model name
    try {
      const invRes = await fetch(`${CELLGODS_URL}/inventory`, {
        headers: { 'X-API-Key': process.env.CELLGODS_API_KEY },
      });
      const invData = await invRes.json();
      const found = invData.data?.find(d => String(d.phone_id) === String(phone_id));
      if (found) {
        model = found.model || 'Cloud Device';
        const p = String(found.platform || '').toLowerCase();
        const m = String(found.model || '').toLowerCase();
        if (p.includes('iphone') || p.includes('ios') || m.includes('iphone') || m.includes('ipad')) {
          platform = 'iphone';
        } else {
          platform = 'android';
        }
      }
    } catch (_) {}

    // Call CellGods API with fallback for missing wholesale price
    try {
      const cgRes = await fetch(`${CELLGODS_URL}/activate`, {
        method: 'POST',
        headers: {
          'X-API-Key': process.env.CELLGODS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_id,
          customer_email: user.email || `user_${user.id}@vertext.site`,
          duration_days: days,
        }),
      });
      const cgData = await cgRes.json();

      if (cgData && cgData.success && cgData.data) {
        order_id = cgData.data.order_id || order_id;
        pin = cgData.data.pin || null;
        stream_url = cgData.data.stream_url || null;
        cgExpires = cgData.data.expires_at || null;
        provider = 'cellgods';
      }
    } catch (_) {
      // Internal fallback provisioning when CellGods API lacks wholesale config
    }

    const now = new Date();
    const calculatedExpires = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    const finalExpiresAt = cgExpires || calculatedExpires;

    // Generate unique stream token
    const stream_token = await ensureUniqueToken();
    const newBalance = wallet.balance_cents - charged_fee_cents;

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
        one_time_fee_cents: charged_fee_cents,
        monthly_fee_cents,
        purchased_at: now.toISOString(),
        expires_at: finalExpiresAt,
        next_renewal_at: finalExpiresAt,
      }),

      supabase.from('wallet_transactions').insert({
        user_id: user.id,
        type: 'purchase',
        amount_cents: -charged_fee_cents,
        balance_after_cents: newBalance,
        reference: order_id,
        provider,
        status: 'completed',
      }),
    ]);

    return ok({
      order_id,
      model,
      platform,
      stream_token,
      pin,
      expires_at: finalExpiresAt,
      balance_after_cents: newBalance,
    });

  } catch (e) {
    return err(e.message, e.message === 'Unauthorized' ? 401 : 500);
  }
};
