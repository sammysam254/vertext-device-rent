/**
 * POST admin-add-device
 * Admin manually creates a device & stream assignment for a customer.
 * System auto-generates a unique 6-digit stream token.
 */
import { verifyAdmin, ok, err, supabase } from './auth-check.js';

function generateToken() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function generateUniqueToken() {
  let token, exists;
  do {
    token = generateToken();
    const { data } = await supabase
      .from('devices')
      .select('id')
      .eq('stream_token', token)
      .single();
    exists = !!data;
  } while (exists);
  return token;
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return err('Method not allowed', 405);

  try {
    const admin = await verifyAdmin(req);
    const body = await req.json();
    const {
      customer_email,
      model = 'Cloud Device',
      platform = 'iphone',
      stream_url,
      duration_days = 30,
    } = body;

    if (!customer_email) return err('Customer email is required');
    if (!stream_url) return err('Stream URL is required');

    // 1. Find profile by email
    let userId = admin.id;
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', customer_email.toLowerCase().trim())
      .single();

    if (profile) {
      userId = profile.id;
    }

    // 2. Generate unique 6-digit token
    const stream_token = await generateUniqueToken();

    // 3. Expiry date calculation
    const now = new Date();
    const expiresAt = new Date(now.getTime() + duration_days * 24 * 60 * 60 * 1000).toISOString();
    const orderId = `manual_ord_${Date.now()}`;
    const phoneId = `manual_phone_${Date.now()}`;

    // 4. Insert device
    const { data: newDevice, error } = await supabase
      .from('devices')
      .insert({
        user_id: userId,
        phone_id: phoneId,
        order_id: orderId,
        model,
        platform: platform.toLowerCase(),
        status: 'active',
        stream_url,
        stream_token,
        purchased_at: now.toISOString(),
        expires_at: expiresAt,
        next_renewal_at: expiresAt,
      })
      .select('*')
      .single();

    if (error) throw error;

    return ok({
      id: newDevice.id,
      customer_email,
      model,
      platform,
      stream_token,
      stream_url,
      expires_at: expiresAt,
    });
  } catch (e) {
    return err(e.message, e.message === 'Admin access required' ? 403 : 500);
  }
};
