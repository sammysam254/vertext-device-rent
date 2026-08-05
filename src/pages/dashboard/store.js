/**
 * Device Store page
 * Displays available cloud devices (CellGods API + Admin manual devices).
 * Enforces strict rules:
 * - Daily, Weekly, and Monthly rental plans (calculates daily/weekly admin markup division).
 * - Fixes undefined platform filter & badge.
 * - Ensures rent buttons are clickable and user/wallet balance context is preserved across filters.
 * - Single occupancy: disables trial button if device is currently being tested.
 * - Admin pricing overrides all devices.
 */

import { renderDashboardLayout } from './layout.js';
import { getInventory, activateDevice, startTrial } from '../../api.js';
import { toast } from '../../components/toast.js';
import { openModal, closeModal } from '../../components/modal.js';
import { setButtonLoading } from '../../components/loader.js';
import { navigate } from '../../router.js';
import { supabase } from '../../supabase.js';

let allDevices = [];
let currentFilter = 'all';
let pricingMap = {};
let currentUser = null;
let currentWalletBalance = 0;
let currentDefaultPricing = { one_time_fee_cents: 999, monthly_fee_cents: 2999 };

export async function renderStore() {
  await renderDashboardLayout('store', renderStoreContent);
}

async function renderStoreContent(container, user, profile, walletBalance) {
  currentUser = user;
  currentWalletBalance = walletBalance || 0;

  container.innerHTML = `
    <div class="page-header">
      <h2>Device Store</h2>
      <span class="text-sm text-muted">Browse, test with a 5-minute free trial, and rent cloud devices (Daily, Weekly & Monthly)</span>
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
  await loadInventory();
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

async function loadInventory() {
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
        else if (p.model) pricingMap[`model_${p.model.toLowerCase()}`] = p;
      });
    }

    // Get global default admin pricing
    const globalRes = await supabase.from('admin_settings').select('value').eq('key', 'default_pricing').single();
    if (globalRes.data?.value) {
      currentDefaultPricing = globalRes.data.value;
    }

    renderDevices();
  } catch (err) {
    document.getElementById('device-grid').innerHTML = `
      <div class="empty-state animate-fade" style="grid-column:1/-1;padding:48px 24px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-xl);text-align:center">
        <div style="font-size:3.5rem;margin-bottom:12px">📱</div>
        <h3 style="font-size:1.4rem;font-weight:800;margin-bottom:10px;color:var(--text-primary)">No Devices Currently Available</h3>
        <p style="color:var(--text-secondary);max-width:460px;margin:0 auto 24px;line-height:1.6;font-size:0.95rem">
          We could not fetch active devices right now. Need a custom device or immediate access? Contact our team directly.
        </p>
        <a href="mailto:admin@vertext.site?subject=Cloud%20Device%20Inquiry" class="btn btn-primary btn-lg" style="display:inline-flex;align-items:center;gap:10px;text-decoration:none;padding:12px 28px;font-size:1rem;box-shadow:var(--shadow-glow)">
          ✉️ Contact Us (admin@vertext.site)
        </a>
      </div>
    `;
  }
}

function getNormalizedPlatform(device) {
  const rawP = String(device.platform || '').toLowerCase();
  const rawM = String(device.model || '').toLowerCase();
  if (rawP.includes('iphone') || rawP.includes('ios') || rawM.includes('iphone') || rawM.includes('ipad')) {
    return 'iphone';
  }
  return 'android';
}

function getDevicePricing(device) {
  if (device.one_time_fee_cents > 0 || device.monthly_fee_cents > 0) {
    return {
      one_time_fee_cents: device.one_time_fee_cents || currentDefaultPricing.one_time_fee_cents,
      monthly_fee_cents: device.monthly_fee_cents || currentDefaultPricing.monthly_fee_cents,
    };
  }

  if (device.phone_id && pricingMap[device.phone_id]) {
    return pricingMap[device.phone_id];
  }

  if (device.model && pricingMap[`model_${device.model.toLowerCase()}`]) {
    return pricingMap[`model_${device.model.toLowerCase()}`];
  }

  const cleanModel = device.model ? device.model.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase() : '';
  if (cleanModel && pricingMap[`model_${cleanModel}`]) {
    return pricingMap[`model_${cleanModel}`];
  }

  const matchedKey = Object.keys(pricingMap).find(k => {
    if (!k.startsWith('model_')) return false;
    const modelName = k.replace('model_', '').toLowerCase();
    return device.model.toLowerCase().includes(modelName);
  });
  if (matchedKey) return pricingMap[matchedKey];

  return currentDefaultPricing;
}

function renderDevices() {
  const filtered = currentFilter === 'all'
    ? allDevices
    : allDevices.filter(d => getNormalizedPlatform(d) === currentFilter);

  const grid = document.getElementById('device-grid');

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="empty-state animate-fade" style="grid-column:1/-1;padding:48px 24px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-xl);text-align:center">
        <div style="font-size:3.5rem;margin-bottom:12px">📱</div>
        <h3 style="font-size:1.4rem;font-weight:800;margin-bottom:10px;color:var(--text-primary)">No Devices Currently Available</h3>
        <p style="color:var(--text-secondary);max-width:460px;margin:0 auto 24px;line-height:1.6;font-size:0.95rem">
          All cloud devices are currently rented or in maintenance. Need a custom device or immediate access? Contact us directly and we'll setup one for you.
        </p>
        <a href="mailto:admin@vertext.site?subject=Cloud%20Device%20Inquiry" class="btn btn-primary btn-lg" style="display:inline-flex;align-items:center;gap:10px;text-decoration:none;padding:12px 28px;font-size:1rem;box-shadow:var(--shadow-glow)">
          ✉️ Contact Us (admin@vertext.site)
        </a>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(device => {
    const pricing = getDevicePricing(device);
    const monthlyFee = pricing.monthly_fee_cents || pricing.one_time_fee_cents || 9000;
    const baseFee = monthlyFee;
    
    // Daily ($10), Weekly ($40), Monthly ($90)
    const dailyFee = Math.ceil(monthlyFee * (10 / 90));
    const weeklyFee = Math.ceil(monthlyFee * (40 / 90));

    const minAfford = currentWalletBalance >= dailyFee;
    const platformKey = getNormalizedPlatform(device);
    const isIphone = platformKey === 'iphone';
    const platformLabel = isIphone ? 'iPhone' : 'Android';

    const isManualAdmin = device.is_manual_admin === true || device.source === 'admin_custom';
    const isTrialBusy = device.is_trial_busy === true;

    let trialBtnHtml = '';
    if (isManualAdmin) {
      if (isTrialBusy) {
        trialBtnHtml = `
          <button class="btn btn-ghost btn-full" disabled style="opacity:0.6;cursor:not-allowed;border:1px solid var(--border)">
            ⏳ Trial in Use
          </button>
        `;
      } else {
        trialBtnHtml = `
          <button class="btn btn-ghost btn-full try-free-btn"
            data-phone-id="${device.phone_id || ''}"
            data-model="${device.model || 'Cloud Device'}"
            data-platform="${platformKey}"
            style="border:1px solid var(--purple);color:var(--purple-light)">
            Try Free (5 Mins)
          </button>
        `;
      }
    }

    return `
      <div class="device-card animate-fade">
        <div class="device-card-header" style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div class="device-card-icon ${platformKey}" style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:12px">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
              <line x1="12" y1="18" x2="12.01" y2="18"></line>
            </svg>
          </div>
          <div class="device-card-info" style="flex:1;min-width:0">
            <div class="device-card-model" style="font-size:1.05rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${device.model}</div>
            <div class="device-card-meta" style="display:flex;gap:6px;margin-top:4px">
              <span class="badge ${isManualAdmin ? 'badge-pool' : 'badge-shared'}">
                ${isManualAdmin ? 'Featured Device' : 'Standard'}
              </span>
              <span class="badge ${isIphone ? 'badge-iphone' : 'badge-android'}">${platformLabel}</span>
            </div>
          </div>
        </div>
        <div class="device-card-body">
          <div class="device-card-price" style="background:var(--bg-input);padding:10px 14px;border-radius:10px;display:flex;flex-direction:column;gap:4px">
            <div class="price-row" style="display:flex;justify-content:space-between;font-size:0.85rem">
              <span class="price-label" style="color:var(--text-muted)">Daily plan</span>
              <span class="price-value" style="font-weight:700;color:var(--cyan)">$${(dailyFee / 100).toFixed(2)} / day</span>
            </div>
            <div class="price-row" style="display:flex;justify-content:space-between;font-size:0.85rem">
              <span class="price-label" style="color:var(--text-muted)">Weekly plan</span>
              <span class="price-value" style="font-weight:700;color:var(--purple-light)">$${(weeklyFee / 100).toFixed(2)} / wk</span>
            </div>
            <div class="price-row" style="display:flex;justify-content:space-between;font-size:0.85rem">
              <span class="price-label" style="color:var(--text-muted)">Monthly plan</span>
              <span class="price-value highlight" style="font-weight:700;color:var(--emerald)">$${(monthlyFee / 100).toFixed(2)} / mo</span>
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
            ${trialBtnHtml}

            <button class="btn ${minAfford ? 'btn-primary' : 'btn-secondary'} btn-full purchase-btn"
              data-phone-id="${device.phone_id || ''}"
              data-model="${device.model || 'Cloud Device'}"
              data-platform="${platformKey}"
              data-base-fee="${baseFee}">
              ${minAfford ? 'Rent Device' : 'Top Up to Rent'}
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
        navigate(`/stream/${trialResult.stream_token}?trial=true`);
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
      const baseFee = parseInt(btn.dataset.baseFee) || 9000;

      const device = allDevices.find(d => String(d.phone_id) === String(phoneId)) || {
        phone_id: phoneId,
        model,
        platform,
      };

      openPurchaseModal(device, baseFee);
    });
  });
}

function openPurchaseModal(device, baseFee) {
  const monthlyFee = baseFee;
  const dailyFee = Math.ceil(monthlyFee * (10 / 90));
  const weeklyFee = Math.ceil(monthlyFee * (40 / 90));

  let selectedDays = 1; // Default to Daily plan
  let selectedFee = dailyFee;

  function renderModalBody() {
    const canAffordSelected = currentWalletBalance >= selectedFee;
    const balanceAfter = currentWalletBalance - selectedFee;

    openModal({
      title: '⚡ Choose Rental Plan',
      body: `
        <div style="text-align:center;padding:4px 0 16px">
          <h3 style="margin-bottom:4px;font-size:1.2rem">${device.model}</h3>
          <span class="badge ${device.platform === 'iphone' ? 'badge-iphone' : 'badge-android'}">
            ${device.platform === 'iphone' ? 'iPhone' : 'Android'}
          </span>
        </div>

        <p class="text-xs text-muted" style="margin-bottom:8px;font-weight:600">SELECT RENTAL DURATION:</p>

        <div class="rental-plans-grid" style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;margin-bottom:16px">
          <div class="plan-option ${selectedDays === 1 ? 'selected' : ''}" data-days="1" data-fee="${dailyFee}"
            style="cursor:pointer;border:${selectedDays === 1 ? '2px solid var(--primary)' : '1px solid var(--border)'};border-radius:12px;padding:12px 8px;text-align:center;background:${selectedDays === 1 ? 'rgba(99,102,241,0.12)' : 'var(--bg-input)'};transition:all 0.2s">
            <div style="font-size:0.75rem;color:var(--text-muted);font-weight:700;text-transform:uppercase">Daily</div>
            <div style="font-size:1.15rem;font-weight:800;color:var(--cyan);margin:4px 0">$${(dailyFee/100).toFixed(2)}</div>
            <div style="font-size:0.7rem;color:var(--text-secondary)">1 Day</div>
          </div>

          <div class="plan-option ${selectedDays === 7 ? 'selected' : ''}" data-days="7" data-fee="${weeklyFee}"
            style="cursor:pointer;border:${selectedDays === 7 ? '2px solid var(--primary)' : '1px solid var(--border)'};border-radius:12px;padding:12px 8px;text-align:center;background:${selectedDays === 7 ? 'rgba(99,102,241,0.12)' : 'var(--bg-input)'};transition:all 0.2s">
            <div style="font-size:0.75rem;color:var(--text-muted);font-weight:700;text-transform:uppercase">Weekly</div>
            <div style="font-size:1.15rem;font-weight:800;color:var(--purple-light);margin:4px 0">$${(weeklyFee/100).toFixed(2)}</div>
            <div style="font-size:0.7rem;color:var(--text-secondary)">7 Days</div>
          </div>

          <div class="plan-option ${selectedDays === 30 ? 'selected' : ''}" data-days="30" data-fee="${monthlyFee}"
            style="cursor:pointer;border:${selectedDays === 30 ? '2px solid var(--primary)' : '1px solid var(--border)'};border-radius:12px;padding:12px 8px;text-align:center;background:${selectedDays === 30 ? 'rgba(99,102,241,0.12)' : 'var(--bg-input)'};transition:all 0.2s">
            <div style="font-size:0.75rem;color:var(--text-muted);font-weight:700;text-transform:uppercase">Monthly</div>
            <div style="font-size:1.15rem;font-weight:800;color:var(--emerald);margin:4px 0">$${(monthlyFee/100).toFixed(2)}</div>
            <div style="font-size:0.7rem;color:var(--text-secondary)">30 Days</div>
          </div>
        </div>

        <div style="background:var(--bg-input);border-radius:var(--radius-md);padding:14px;margin-bottom:14px">
          <div class="flex-between mb-8">
            <span class="text-sm text-muted">Plan charge</span>
            <strong>$${(selectedFee/100).toFixed(2)}</strong>
          </div>
          <div class="flex-between mb-8">
            <span class="text-sm text-muted">Your Wallet Balance</span>
            <span>$${(currentWalletBalance/100).toFixed(2)}</span>
          </div>
          <div style="border-top:1px solid var(--border);margin:10px 0"></div>
          <div class="flex-between">
            <span class="text-sm text-muted">Balance After</span>
            <strong style="color:${canAffordSelected ? 'var(--emerald)' : 'var(--red)'}">
              ${canAffordSelected ? `$${(balanceAfter/100).toFixed(2)}` : 'Insufficient Funds'}
            </strong>
          </div>
        </div>

        <p class="text-xs text-muted">Your device will activate immediately upon confirmation. You will receive a 6-digit stream token.</p>
      `,
      footer: `
        <button class="btn btn-ghost" id="cancel-rental-modal-btn">Cancel</button>
        ${canAffordSelected ? `
          <button class="btn btn-primary" id="confirm-rental-modal-btn">
            ✓ Rent for ${selectedDays === 1 ? '1 Day' : selectedDays === 7 ? '7 Days' : '30 Days'} ($${(selectedFee/100).toFixed(2)})
          </button>
        ` : `
          <button class="btn btn-primary" id="topup-wallet-modal-btn">
            💳 Top Up Wallet
          </button>
        `}
      `,
    });

    setTimeout(() => {
      // Plan Selection click handlers
      document.querySelectorAll('.plan-option').forEach(el => {
        el.addEventListener('click', () => {
          selectedDays = parseInt(el.dataset.days);
          selectedFee = parseInt(el.dataset.fee);
          renderModalBody();
        });
      });

      document.getElementById('cancel-rental-modal-btn')?.addEventListener('click', closeModal);

      document.getElementById('topup-wallet-modal-btn')?.addEventListener('click', () => {
        closeModal();
        navigate('/dashboard/wallet');
      });

      document.getElementById('confirm-rental-modal-btn')?.addEventListener('click', async () => {
        const confirmBtn = document.getElementById('confirm-rental-modal-btn');
        setButtonLoading(confirmBtn, true, 'Activating...');
        try {
          await activateDevice({
            phone_id: device.phone_id,
            customer_email: currentUser?.email || '',
            duration_days: selectedDays,
          });
          closeModal();
          toast.success(`Device activated for ${selectedDays} day(s)! Redirecting to My Devices...`);
          navigate('/dashboard/devices');
        } catch (err) {
          toast.error(err.message || 'Activation failed');
          setButtonLoading(confirmBtn, false, `✓ Rent for ${selectedDays} Day(s)`);
        }
      });
    }, 50);
  }

  renderModalBody();
}

function attachFilterListeners() {
  document.getElementById('store-filters')?.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#store-filters .filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      renderDevices();
    });
  });
}
