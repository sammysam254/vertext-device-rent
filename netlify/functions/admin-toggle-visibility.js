/**
 * POST admin-toggle-visibility
 * Toggles show_to_customers property on a manually added device.
 */
import { verifyAdmin, ok, err, supabase } from './auth-check.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return err('Method not allowed', 405);

  try {
    await verifyAdmin(req);
    const { device_id, show_to_customers } = await req.json();

    if (!device_id) return err('Device ID is required');

    const { data, error } = await supabase
      .from('devices')
      .update({ show_to_customers: !!show_to_customers })
      .eq('id', device_id)
      .select('*')
      .single();

    if (error) throw error;

    return ok({ success: true, device: data });
  } catch (e) {
    return err(e.message, e.message === 'Admin access required' ? 403 : 500);
  }
};
