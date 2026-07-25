/**
 * Auth middleware helper — verifies Supabase JWT from Authorization header
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function verifyAuth(req) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) throw new Error('Unauthorized');

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) throw new Error('Invalid token');
  return user;
}

export async function verifyAdmin(req) {
  const user = await verifyAuth(req);
  const adminEmail = process.env.ADMIN_EMAIL || 'sammyseth260@gmail.com';
  if (user.email !== adminEmail) throw new Error('Admin access required');
  return user;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

export function err(message, status = 400) {
  return json({ success: false, error: message }, status);
}

export function ok(data) {
  return json({ success: true, data });
}

export const supabase = supabaseAdmin;
