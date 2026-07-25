/**
 * POST stream-lookup — validate 6-digit token, return stream URL (server-side only)
 * The actual URL is never sent to the browser for public access —
 * the iframe src is set only via this function.
 * Evaluates 5-minute free trial expiration timestamps.
 */
import { ok, err, supabase } from './auth-check.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return err('Method not allowed', 405);

  try {
    const { token } = await req.json();
    if (!token || token.length !== 6) return err('Invalid token format');

    const { data: device, error } = await supabase
      .from('devices')
      .select('id, model, platform, status, stream_url, stream_token, expires_at')
      .eq('stream_token', token)
      .single();

    if (error || !device) return err('Token not found', 404);
    if (device.status !== 'active') return err(`Device is ${device.status}`, 403);
    if (!device.stream_url) return err('Stream not yet provisioned. Please contact support.', 503);

    // Check if this token has an active 5-minute trial session record
    const { data: trialData } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', `trial_session_${token}`)
      .single();

    let isTrial = false;
    let trialExpiresAt = null;
    let remainingSeconds = null;

    if (trialData && trialData.value && trialData.value.expires_at) {
      isTrial = true;
      trialExpiresAt = trialData.value.expires_at;
      const remainingMs = new Date(trialExpiresAt).getTime() - Date.now();

      if (remainingMs <= 0) {
        return err('This 5-minute free trial has expired.', 403);
      }
      remainingSeconds = Math.floor(remainingMs / 1000);
    } else {
      // Normal purchased subscription check
      if (new Date(device.expires_at) < new Date()) {
        return err('Device subscription has expired', 403);
      }
    }

    return ok({
      model: device.model,
      platform: device.platform,
      stream_url: device.stream_url,
      is_trial: isTrial,
      trial_expires_at: trialExpiresAt,
      remaining_seconds: remainingSeconds,
    });
  } catch (e) {
    return err(e.message);
  }
};
