/**
 * POST start-trial
 * Generates a 5-minute free trial session for an available store device.
 */
import { verifyAuth, ok, err, supabase } from './auth-check.js';

function generateToken() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return err('Method not allowed', 405);

  try {
    const user = await verifyAuth(req);
    const { phone_id, model = 'Cloud Device', platform = 'iphone' } = await req.json();

    if (!phone_id) return err('Phone ID is required');

    // 1. Check if device is a manual admin device with show_to_customers = true
    const { data: existingDevice } = await supabase
      .from('devices')
      .select('*')
      .eq('phone_id', phone_id)
      .single();

    let streamToken = existingDevice?.stream_token;
    let streamUrl = existingDevice?.stream_url;

    if (!streamToken) {
      streamToken = generateToken();
    }

    const now = Date.now();
    const trialExpiresAt = new Date(now + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Save temporary 5-min trial session under admin_settings or devices
    await supabase.from('admin_settings').upsert({
      key: `trial_${user.id}_${phone_id}`,
      value: {
        user_id: user.id,
        phone_id,
        model,
        platform,
        stream_token: streamToken,
        stream_url,
        expires_at: trialExpiresAt,
      },
    });

    return ok({
      success: true,
      phone_id,
      model,
      platform,
      stream_token: streamToken,
      expires_at: trialExpiresAt,
      duration_seconds: 300,
    });
  } catch (e) {
    return err(e.message, e.message === 'Unauthorized' ? 401 : 500);
  }
};
