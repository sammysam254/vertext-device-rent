/**
 * POST admin-set-pricing
 */
import { verifyAdmin, ok, err, supabase } from './auth-check.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return err('Method not allowed', 405);

  try {
    await verifyAdmin(req);
    const body = await req.json();
    const { type, model, phone_id, one_time_fee_cents, monthly_fee_cents } = body;

    if (type === 'global') {
      await supabase.from('admin_settings').upsert({
        key: 'default_pricing',
        value: { one_time_fee_cents, monthly_fee_cents },
      });
      return ok({ type: 'global', one_time_fee_cents, monthly_fee_cents });
    }

    // Model or phone-specific
    const { error } = await supabase.from('device_pricing').insert({
      model: model || null,
      phone_id: phone_id || null,
      one_time_fee_cents,
      monthly_fee_cents,
      is_active: true,
    });
    if (error) throw error;
    return ok({ type, model, one_time_fee_cents, monthly_fee_cents });
  } catch (e) {
    return err(e.message, e.message === 'Admin access required' ? 403 : 500);
  }
};
