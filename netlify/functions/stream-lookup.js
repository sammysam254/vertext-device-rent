/**
 * POST stream-lookup — validate 6-digit token, return stream URL (server-side only)
 * Handles both regular device tokens and dedicated 5-minute free trial tokens.
 * Automatically revokes trial tokens after 5 minutes and returns 'Trial Used' error.
 */
import { ok, err, supabase } from './auth-check.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return err('Method not allowed', 405);

  try {
    const { token } = await req.json();
    if (!token || token.length !== 6) return err('Invalid token format');

    const now = Date.now();

    // 1. Check if token is a dedicated 5-minute trial token
    const { data: trialSetting } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', `trial_token_${token}`)
      .maybeSingle();

    if (trialSetting && trialSetting.value) {
      const trial = trialSetting.value;
      const expiresAtMs = new Date(trial.expires_at).getTime();
      const remainingMs = expiresAtMs - now;

      // Revoke trial if expired or previously marked used
      if (remainingMs <= 0 || trial.is_used) {
        if (!trial.is_used) {
          await supabase.from('admin_settings').upsert({
            key: `trial_token_${token}`,
            value: { ...trial, is_used: true },
          });
        }
        return err('Trial Used. Your 5-minute free trial has ended.', 403);
      }

      return ok({
        model: trial.model || 'Cloud Device',
        platform: trial.platform || 'iphone',
        stream_url: trial.stream_url,
        is_trial: true,
        trial_expires_at: trial.expires_at,
        remaining_seconds: Math.floor(remainingMs / 1000),
      });
    }

    // 2. Regular purchased device subscription check
    const { data: device, error } = await supabase
      .from('devices')
      .select('id, model, platform, status, stream_url, stream_token, expires_at')
      .eq('stream_token', token)
      .single();

    if (error || !device) return err('Token not found', 404);
    if (device.status !== 'active') return err(`Device is ${device.status}`, 403);
    if (new Date(device.expires_at) < new Date()) return err('Device subscription has expired', 403);
    if (!device.stream_url) return err('Stream not yet provisioned. Please contact support.', 503);

    return ok({
      model: device.model,
      platform: device.platform,
      stream_url: device.stream_url,
      is_trial: false,
    });
  } catch (e) {
    return err(e.message);
  }
};
