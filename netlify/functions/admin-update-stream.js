/**
 * POST admin-update-stream
 * Admin sets/updates stream URL for a device — generates new stream token
 */
import { verifyAdmin, ok, err, supabase } from './auth-check.js';

function generateToken() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function uniqueToken() {
  let token, exists;
  do {
    token = generateToken();
    const { data } = await supabase.from('devices').select('id').eq('stream_token', token).single();
    exists = !!data;
  } while (exists);
  return token;
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return err('Method not allowed', 405);

  try {
    await verifyAdmin(req);
    const { device_id, stream_url } = await req.json();

    if (!device_id || !stream_url) return err('device_id and stream_url are required');

    const new_token = await uniqueToken();

    const { error } = await supabase
      .from('devices')
      .update({ stream_url, stream_token: new_token })
      .eq('id', device_id);

    if (error) throw error;
    return ok({ device_id, stream_token: new_token, stream_url });
  } catch (e) {
    return err(e.message, e.message === 'Admin access required' ? 403 : 500);
  }
};
