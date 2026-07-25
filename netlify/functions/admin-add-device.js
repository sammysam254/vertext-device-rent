/**
 * POST admin-add-device
 * Admin manually creates a standalone device & stream link.
 * System auto-generates a unique 6-digit stream token.
 * Option: show_to_customers (boolean) allows device to appear in Customer Store for rental & 5-min free trial.
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
      client_reference = '',
      model = 'Cloud Device',
      platform = 'iphone',
      stream_url,
      duration_days = 30,
      show_to_customers = false,
    } = body;

    if (!stream_url) return err('Stream URL is required');

    const stream_token = await generateUniqueToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + duration_days * 24 * 60 * 60 * 1000).toISOString();
    const orderId = `manual_ord_${Date.now()}`;
    const phoneId = `manual_phone_${Date.now()}`;

    const { data: newDevice, error } = await supabase
      .from('devices')
      .insert({
        user_id: admin.id,
        phone_id: phoneId,
        order_id: orderId,
        model: client_reference ? `${model} (${client_reference})` : model,
        platform: platform.toLowerCase(),
        status: 'active',
        stream_url,
        stream_token,
        show_to_customers: !!show_to_customers,
        purchased_at: now.toISOString(),
        expires_at: expiresAt,
        next_renewal_at: expiresAt,
      })
      .select('*')
      .single();

    if (error) throw error;

    return ok({
      id: newDevice.id,
      client_reference,
      model,
      platform,
      stream_token,
      stream_url,
      show_to_customers: !!show_to_customers,
      expires_at: expiresAt,
    });
  } catch (e) {
    return err(e.message, e.message === 'Admin access required' ? 403 : 500);
  }
};
