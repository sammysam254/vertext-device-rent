/**
 * POST start-trial
 * Generates a 5-minute free trial session for available manual admin devices.
 * Enforces strict rules:
 * 1. Strictly available ONLY on Admin manually added devices (not CellGods API).
 * 2. Strictly 1 free trial per IP address (network/device IP).
 * 3. Single occupancy: if a trial is active on the device, blocks simultaneous trial usage.
 */

import { verifyAuth, ok, err, supabase } from './auth-check.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return err('Method not allowed', 405);

  try {
    const user = await verifyAuth(req);
    const { phone_id } = await req.json();

    if (!phone_id) return err('Phone ID is required');

    // 1. Rule: Free trial is strictly available on Admin manually added devices ONLY
    const { data: existingDevice } = await supabase
      .from('devices')
      .select('*')
      .eq('phone_id', phone_id)
      .single();

    if (!existingDevice || !existingDevice.show_to_customers) {
      return err('Free trial is strictly available on Featured Admin devices only.');
    }

    // 2. Rule: Strictly 1 trial per IP address (Network + Device IP)
    const clientIp = (
      req.headers.get('x-nf-client-connection-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('client-ip') ||
      '127.0.0.1'
    ).replace(/[^a-fA-F0-9.:]/g, '_');

    const ipKey = `trial_ip_${clientIp}`;
    const { data: existingIpTrial } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', ipKey)
      .single();

    if (existingIpTrial) {
      return err('Free trial limit reached. Strictly 1 free trial allowed per network/device IP address.');
    }

    // 3. Rule: Check if device is currently being tested on an active trial by another user
    const deviceBusyKey = `trial_active_${phone_id}`;
    const { data: busyState } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', deviceBusyKey)
      .single();

    const now = Date.now();
    if (busyState && busyState.value && new Date(busyState.value.expires_at).getTime() > now) {
      return err('This device is currently being tested on a 5-minute trial by another user. Please try again shortly or rent it directly.');
    }

    const trialExpiresAt = new Date(now + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Save active trial for this device & mark IP address as used
    await Promise.all([
      supabase.from('admin_settings').upsert({
        key: deviceBusyKey,
        value: {
          phone_id,
          user_id: user.id,
          expires_at: trialExpiresAt,
        },
      }),
      supabase.from('admin_settings').upsert({
        key: ipKey,
        value: {
          ip: clientIp,
          user_id: user.id,
          used_at: new Date().toISOString(),
        },
      }),
    ]);

    return ok({
      success: true,
      phone_id,
      model: existingDevice.model,
      platform: existingDevice.platform,
      stream_token: existingDevice.stream_token,
      expires_at: trialExpiresAt,
      duration_seconds: 300,
    });

  } catch (e) {
    return err(e.message, e.message === 'Unauthorized' ? 401 : 500);
  }
};
