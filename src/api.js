/**
 * API helpers — calls Netlify Functions
 */

import { supabase } from './supabase.js';

const BASE = '/.netlify/functions';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return {};
  return { 'Authorization': `Bearer ${session.access_token}` };
}

async function request(path, options = {}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE}/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Request failed');
  return data.data;
}

// ---- Inventory ----
export const getInventory = () => request('get-inventory');

// ---- Devices ----
export const activateDevice = (body) =>
  request('activate-device', { method: 'POST', body: JSON.stringify(body) });

export const getMyDevices = () => request('get-my-devices');

export const deactivateDevice = (orderId) =>
  request('deactivate-device', { method: 'POST', body: JSON.stringify({ order_id: orderId }) });

export const renewDevice = (deviceId) =>
  request('renew-device', { method: 'POST', body: JSON.stringify({ device_id: deviceId }) });

// ---- Stream & Trial ----
export const lookupStream = (token) =>
  request('stream-lookup', { method: 'POST', body: JSON.stringify({ token }) });

export const startTrial = (body) =>
  request('start-trial', { method: 'POST', body: JSON.stringify(body) });

// ---- Wallet ----
export const getWallet = () => request('get-wallet');
export const getTransactions = () => request('get-transactions');

// ---- Deposits ----
export const depositPaystack = (body) =>
  request('deposit-paystack', { method: 'POST', body: JSON.stringify(body) });

export const depositCrypto = (body) =>
  request('deposit-crypto', { method: 'POST', body: JSON.stringify(body) });

// ---- Admin ----
export const adminGetStats = () => request('admin-get-stats');
export const adminGetUsers = () => request('admin-get-users');
export const adminGetOrders = (params = '') => request(`admin-get-orders${params}`);
export const adminUpdateStream = (body) =>
  request('admin-update-stream', { method: 'POST', body: JSON.stringify(body) });
export const adminAddDevice = (body) =>
  request('admin-add-device', { method: 'POST', body: JSON.stringify(body) });
export const adminToggleVisibility = (body) =>
  request('admin-toggle-visibility', { method: 'POST', body: JSON.stringify(body) });
export const adminSetPricing = (body) =>
  request('admin-set-pricing', { method: 'POST', body: JSON.stringify(body) });
export const adminCreditUserWallet = (body) =>
  request('admin-credit-user-wallet', { method: 'POST', body: JSON.stringify(body) });
