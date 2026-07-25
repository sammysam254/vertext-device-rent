/**
 * Admin utility to set/update a user's password directly in Supabase
 * Usage: node scripts/set-password.js <email> <new-password>
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envText = fs.readFileSync('.env', 'utf-8');
const env = {};
envText.split('\n').forEach(line => {
  const parts = line.split('=');
  const k = parts[0]?.trim();
  const v = parts.slice(1).join('=').trim();
  if (k && v) env[k] = v;
});

const email = process.argv[2] || env.ADMIN_EMAIL;
const password = process.argv[3];

if (!password) {
  console.log('Usage: node scripts/set-password.js <email> <new-password>');
  console.log('Example: node scripts/set-password.js sammyseth260@gmail.com MySecretPass123');
  process.exit(1);
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function setPassword() {
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('Failed to list users:', listErr.message);
    process.exit(1);
  }

  const user = users.find(u => u.email === email);
  if (!user) {
    console.error(`User with email ${email} not found in Supabase Auth.`);
    process.exit(1);
  }

  const { data, error } = await supabase.auth.admin.updateUserById(user.id, { password });
  if (error) {
    console.error('Failed to update password:', error.message);
    process.exit(1);
  }

  console.log(`✅ Successfully updated password for ${email}! You can now sign in with your password.`);
}

setPassword();
