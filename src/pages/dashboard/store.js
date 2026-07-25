/**
 * Device Store page
 * Displays available cloud devices (CellGods API + Admin manual devices).
 * Features: Admin-set pricing overrides, 5-minute free trial testing, and instant rental.
 */

import { renderDashboardLayout } from './layout.js';
import { getInventory, activateDevice, startTrial } from '../../api.js';
import { toast } from '../../components/toast.js';
import { openModal, closeModal } from '../../components/modal.js';
import { setButtonLoading } from '../../components/loader.js';
import { navigate } from '../../router.js';
import { supabase } from '../../supabase.js';

export async function renderStore() {
  await renderDashboardLayout('store', renderStoreContent);
}

async function renderStoreContent(container, user, profile, walletBalance) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Device Store</h2>
      <span class="text-sm text-muted">Browse, test with a 5-minute free trial, and rent cloud devices</span>
    </div>

    <!-- Filter bar -->
    <div class="filter-tabs" id="store-filters">
      <button class="filter-tab active" data-filter="all">All Devices</button>
      <button class="filter-tab" data-filter="iphone">iPhone</button>
      <button class="filter-tab" data-filter="android">Android</button>
    </div>

    <div class="device-grid" id="device-grid">
      ${skeletonCards(6)}
    </div>
  `;

  attachFilterListeners();
  await loadInventory(user, walletBalance);
}

function skeletonCards(n) {
  return Array.from({ length: n }, () => `
    <div class="device-card">
      <div class="device-card-header">
        <div class="skeleton" style="width:48px;height:48px;border-radius:12px"></div>
        <div style="flex:1">
          <div class="skeleton" style="width:70%;height:16px;margin-bottom:8px"></div>
          <div class="skeleton" style="width:40%;height:12px"></div>
        </div>
      </div>
      <div class="device-card-body">
        <div class="skeleton" style="height:80px;border-radius:10px;margin-bottom:14px"></div>
        <div class="skeleton" style="height:38px;border-radius:10px"></div>
      </div>
    </div>
  `).join('');
}

let allDevices = [];
let currentFilter = 'all';
let pricingMap = {};

async function loadInventory(user, walletBalance) {
  try {
    // Load inventory + pricing in parallel
    const [devices, pricingRes] = await Promise.all([
      getInventory(),
      supabase.from('device_pricing').select('*').eq('is_active', true),
    ]);

    allDevices = devices || [];

    // Build pricing map (Admin set prices)
    pricingMap = {};
    if (pricingRes.data) {
      pricingRes.data.forEach(p => {
        if (p.phone_id) pricingMap[p.phone_id] = p;
        else if (p.model) pricingMap[`model_${p.model}`] = p;
      });
    }

    // Get global default admin pricing
    const globalRes = await supabase.from('admin_settings').select('value').eq('key', 'default_pricing').single();
    const defaultPricing = globalRes.data?.value || { one_time_fee_cents: 999, monthly_fee_cents: 2999 };

    renderDevices(allDevices, user, walletBalance, defaultPricing);
  } catch (err) {
    document.getElementById('device-grid').innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <h3>Failed to load devices</h3>
        <p>${err.message}</p>
        <button class="btn btn-primary mt-16" onclick="location.reload()">Try Again</button>
      </div>
    `;
  }
}

function getDevicePricing(device, defaultPricing) {
  return pricingMap[device.phone_id]
    || pricingMap[`model_${device.model}`]
    || defaultPricing;
}

function renderDevices(devices, user, walletBalance, defaultPricing) {
  const filtered = currentFilter === 'all'
    ? devices
    : devices.filter(d => d.platform === currentFilter);

  const grid = document.getElementById('device-grid');

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <h3>No devices available</h3>
        <p>Check back soon or try a different filter.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(device => {
    // Admin set pricing overrides all devices (including CellGods API)
    const pricing = getDevicePricing(device, defaultPricing);
    const oneTimeFee = pricing.one_time_fee_cents;
    const monthlyFee = pricing.monthly_fee_cents;
    const canAfford = walletBalance >= oneTimeFee;
    const isIphone = device.platform === 'iphone';

    return `
      <div class="device-card animate-fade">
        <div class="device-card-header">
          <div class="device-card-icon ${device.platform}">
            ${isIphone ? 'iPhone' : 'Android'}
          </div>
          <div class="device-card-info">
            <div class="device-card-model">${device.model}</div>
            <div class="device-card-meta">
              <span class="badge ${device.source === 'admin_custom' ? 'badge-pool' : 'badge-shared'}">
                ${device.source === 'admin_custom' ? 'Featured Device' : 'Standard'}
              </span>
              <span class="badge ${isIphone ? 'badge-iphone' : 'badge-android'}">${device.platform}</span>
            </div>
          </div>
        </div>
        <div class="device-card-body">
          <div class="device-card-price">
            <div class="price-row">
              <span class="price-label">One-time fee</span>
              <span class="price-value highlight">$${(oneTimeFee / 100).toFixed(2)}</span>
            </div>
            <div class="price-row">
              <span class="price-label">Monthly renewal</span>
              <span class="price-value">$${(monthlyFee / 100).toFixed(2)}/mo</span>
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
            <button class="btn btn-ghost btn-full try-free-btn"
              data-phone-id="${device.phone_id}"
              data-model="${device.model}"
              data-platform="${device.platform}"
              style="border:1px solid var(--purple);color:var(--purple-light)">
              Try Free (5 Mins)
            </button>

            <button class="btn ${canAfford ? 'btn-primary' : 'btn-secondary'} btn-full purchase-btn"
              data-phone-id="${device.phone_id}"
              data-model="${device.model}"
              data-platform="${device.platform}"
              data-one-time="${oneTimeFee}"
              data-monthly="${monthlyFee}"
              ${!device.assignable ? 'disabled' : ''}>
              ${canAfford ? 'Rent Device' : 'Top Up to Rent'}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // 5-Minute Free Trial Listeners
  grid.querySelectorAll('.try-free-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const phoneId = btn.dataset.phoneId;
      const model = btn.dataset.model;
      const platform = btn.dataset.platform;

      setButtonLoading(btn, true, 'Starting Trial...');

      try {
        const trialResult = await startTrial({ phone_id: phoneId, model, platform });
        toast.success('5-Minute Free Trial launched!');

        // Navigate directly to stream viewer in trial mode
        navigate(`/stream/${trialResult.stream_token}`);
      } catch (err) {
        toast.error(err.message || 'Failed to start free trial.');
        setButtonLoading(btn, false, 'Try Free (5 Mins)');
      }
    });
  });

  // Purchase / Rent Listeners
  grid.querySelectorAll('.purchase-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const phoneId = btn.dataset.phoneId;
      const model = btn.dataset.model;
      const platform = btn.dataset.platform;
      const oneTime = parseInt(btn.dataset.oneTime);
      const monthly = parseInt(btn.dataset.monthly);
      const canAffordNow = walletBalance >= oneTime;

      if (!canAffordNow) {
        openPurchaseModal(null, model, platform, oneTime, monthly, walletBalance, user, false);
      } else {
        openPurchaseModal(phoneId, model, platform, oneTime, monthly, walletBalance, user, true);
      }
    });
  });
}

function openPurchaseModal(phoneId, model, platform, oneTime, monthly, walletBalance, user, canAfford) {
  if (!canAfford) {
    openModal({
      title: 'Insufficient Balance',
      body: `
        <p class="text-secondary" style="margin-bottom:16px">
          You need <strong style="color:var(--text-primary)">$${(oneTime/100).toFixed(2)}</strong> to rent this device,
          but your wallet has <strong style="color:var(--red)">$${(walletBalance/100).toFixed(2)}</strong>.
        </p>
        <p class="text-sm text-muted">Top up your wallet to continue.</p>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="closeModal && closeModal()">Cancel</button>
        <button class="btn btn-primary" id="goto-wallet-btn">Top Up Wallet</button>
      `,
    });
    setTimeout(() => {
      document.getElementById('goto-wallet-btn')?.addEventListener('click', () => {
        closeModal();
        navigate('/dashboard/wallet');
      });
    }, 50);
    return;
  }

  openModal({
    title: 'Confirm Device Rental',
    body: `
      <div style="text-align:center;padding:8px 0 20px">
        <h3 style="margin-bottom:4px">${model}</h3>
        <p class="text-sm text-muted">${platform.charAt(0).toUpperCase() + platform.slice(1)} device</p>
      </div>
      <div style="background:var(--bg-input);border-radius:var(--radius-md);padding:16px;margin-bottom:16px">
        <div class="flex-between mb-8">
          <span class="text-sm text-muted">One-time activation fee</span>
          <strong>$${(oneTime/100).toFixed(2)}</strong>
        </div>
        <div class="flex-between mb-8">
          <span class="text-sm text-muted">Monthly renewal</span>
          <strong>$${(monthly/100).toFixed(2)}/mo</strong>
        </div>
        <div style="border-top:1px solid var(--border);margin:12px 0"></div>
        <div class="flex-between">
          <span class="text-sm text-muted">Your balance after</span>
          <strong style="color:var(--emerald)">$${((walletBalance - oneTime)/100).toFixed(2)}</strong>
        </div>
      </div>
      <p class="text-xs text-muted">Your device will be activated instantly. You'll receive a 6-digit stream access token.</p>
    `,
    footer: `
      <button class="btn btn-ghost" id="cancel-purchase-btn">Cancel</button>
      <button class="btn btn-primary" id="confirm-purchase-btn">✓ Confirm & Activate</button>
    `,
  });

  setTimeout(() => {
    document.getElementById('cancel-purchase-btn')?.addEventListener('click', closeModal);
    document.getElementById('confirm-purchase-btn')?.addEventListener('click', async () => {
      const confirmBtn = document.getElementById('confirm-purchase-btn');
      setButtonLoading(confirmBtn, true, 'Activating...');
      try {
        await activateDevice({
          phone_id: phoneId,
          customer_email: user.email || '',
          duration_days: 30,
        });
        closeModal();
        toast.success('Device activated! Check My Devices for your stream token.');
        navigate('/dashboard/devices');
      } catch (err) {
        toast.error(err.message);
        setButtonLoading(confirmBtn, false, 'Confirm & Activate');
      }
    });
  }, 50);
}

function attachFilterListeners() {
  document.getElementById('store-filters')?.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#store-filters .filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      if (allDevices.length) {
        renderDevices(allDevices, null, 0, { one_time_fee_cents: 999, monthly_fee_cents: 2999 });
      }
    });
  });
}
