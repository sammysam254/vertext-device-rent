/**
 * Admin Pricing page — set one-time fee and monthly renewal per device/global
 */

import { renderAdminLayout } from './layout.js';
import { adminSetPricing } from '../../api.js';
import { supabase } from '../../supabase.js';
import { toast } from '../../components/toast.js';
import { setButtonLoading } from '../../components/loader.js';

export async function renderAdminPricing() {
  await renderAdminLayout('pricing', renderPricingContent);
}

async function renderPricingContent(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>💵 Pricing Settings</h2>
      <span class="text-sm text-muted">Set one-time & monthly fees for devices</span>
    </div>

    <!-- Global Default Pricing -->
    <div class="pricing-card">
      <div class="pricing-card-title">
        🌐 Global Default Pricing
        <span class="badge badge-shared" style="font-size:0.7rem">Applied to all devices without specific pricing</span>
      </div>
      <div class="price-input-row">
        <div class="form-group">
          <label class="form-label">One-Time Activation Fee (USD)</label>
          <div class="price-input-wrapper">
            <span class="price-input-prefix">$</span>
            <input type="number" class="form-input" id="global-one-time"
              placeholder="9.99" min="0" step="0.01">
          </div>
          <p class="text-xs text-muted" style="margin-top:4px">Charged once when customer purchases the device</p>
        </div>
        <div class="form-group">
          <label class="form-label">Monthly Renewal Fee (USD)</label>
          <div class="price-input-wrapper">
            <span class="price-input-prefix">$</span>
            <input type="number" class="form-input" id="global-monthly"
              placeholder="29.99" min="0" step="0.01">
          </div>
          <p class="text-xs text-muted" style="margin-top:4px">Charged every 30 days to keep the device active</p>
        </div>
      </div>
      <button class="btn btn-primary" id="save-global-btn">💾 Save Global Pricing</button>
    </div>

    <!-- Per-Model Pricing -->
    <div class="pricing-card">
      <div class="pricing-card-title">📱 Add Model-Specific Pricing</div>
      <div class="form-group">
        <label class="form-label">Device Model Name</label>
        <input type="text" class="form-input" id="model-name" placeholder="e.g. iPhone 15 Pro">
      </div>
      <div class="price-input-row">
        <div class="form-group">
          <label class="form-label">One-Time Fee (USD)</label>
          <div class="price-input-wrapper">
            <span class="price-input-prefix">$</span>
            <input type="number" class="form-input" id="model-one-time" placeholder="14.99" min="0" step="0.01">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Monthly Fee (USD)</label>
          <div class="price-input-wrapper">
            <span class="price-input-prefix">$</span>
            <input type="number" class="form-input" id="model-monthly" placeholder="39.99" min="0" step="0.01">
          </div>
        </div>
      </div>
      <button class="btn btn-primary" id="save-model-btn">+ Add Model Pricing</button>
    </div>

    <!-- Existing Pricing Table -->
    <div class="pricing-card">
      <div class="pricing-card-title">📋 Current Pricing Rules</div>
      <div class="table-wrapper" id="pricing-table">
        <div class="empty-state" style="padding:30px">
          <div class="skeleton" style="width:100%;height:200px;border-radius:10px"></div>
        </div>
      </div>
    </div>
  `;

  loadPricingData();
  attachPricingListeners();
}

async function loadPricingData() {
  // Load global default
  const [globalRes, modelsRes] = await Promise.all([
    supabase.from('admin_settings').select('value').eq('key', 'default_pricing').single(),
    supabase.from('device_pricing').select('*').eq('is_active', true).order('created_at', { ascending: false }),
  ]);

  if (globalRes.data?.value) {
    const { one_time_fee_cents, monthly_fee_cents } = globalRes.data.value;
    document.getElementById('global-one-time').value = (one_time_fee_cents / 100).toFixed(2);
    document.getElementById('global-monthly').value = (monthly_fee_cents / 100).toFixed(2);
  }

  renderPricingTable(modelsRes.data || []);
}

function renderPricingTable(rules) {
  const wrapper = document.getElementById('pricing-table');
  if (!rules.length) {
    wrapper.innerHTML = `
      <div class="empty-state" style="padding:30px">
        <div class="empty-state-icon">💵</div>
        <h3>No model-specific pricing</h3>
        <p>Global default pricing applies to all devices.</p>
      </div>
    `;
    return;
  }

  wrapper.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Model / Phone ID</th>
          <th>One-Time Fee</th>
          <th>Monthly Fee</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rules.map(r => `
          <tr>
            <td>${r.model || r.phone_id || '—'}</td>
            <td style="color:var(--text-accent);font-weight:700">$${(r.one_time_fee_cents/100).toFixed(2)}</td>
            <td style="font-weight:600">$${(r.monthly_fee_cents/100).toFixed(2)}/mo</td>
            <td class="text-sm text-muted">${formatDate(r.created_at)}</td>
            <td>
              <button class="btn btn-danger btn-sm deactivate-pricing-btn"
                data-id="${r.id}">Remove</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  wrapper.querySelectorAll('.deactivate-pricing-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      setButtonLoading(btn, true, 'Removing...');
      await supabase.from('device_pricing').update({ is_active: false }).eq('id', btn.dataset.id);
      toast.success('Pricing rule removed.');
      loadPricingData();
    });
  });
}

function attachPricingListeners() {
  document.getElementById('save-global-btn').addEventListener('click', async () => {
    const btn = document.getElementById('save-global-btn');
    const oneTime = parseFloat(document.getElementById('global-one-time').value);
    const monthly = parseFloat(document.getElementById('global-monthly').value);

    if (isNaN(oneTime) || isNaN(monthly) || oneTime < 0 || monthly < 0) {
      toast.error('Enter valid prices.');
      return;
    }

    setButtonLoading(btn, true, 'Saving...');
    try {
      await adminSetPricing({
        type: 'global',
        one_time_fee_cents: Math.round(oneTime * 100),
        monthly_fee_cents: Math.round(monthly * 100),
      });
      toast.success('Global pricing updated!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setButtonLoading(btn, false, '💾 Save Global Pricing');
    }
  });

  document.getElementById('save-model-btn').addEventListener('click', async () => {
    const btn = document.getElementById('save-model-btn');
    const model = document.getElementById('model-name').value.trim();
    const oneTime = parseFloat(document.getElementById('model-one-time').value);
    const monthly = parseFloat(document.getElementById('model-monthly').value);

    if (!model) { toast.error('Enter a device model name.'); return; }
    if (isNaN(oneTime) || isNaN(monthly)) { toast.error('Enter valid prices.'); return; }

    setButtonLoading(btn, true, 'Saving...');
    try {
      await adminSetPricing({
        type: 'model',
        model,
        one_time_fee_cents: Math.round(oneTime * 100),
        monthly_fee_cents: Math.round(monthly * 100),
      });
      toast.success(`Pricing set for ${model}`);
      document.getElementById('model-name').value = '';
      document.getElementById('model-one-time').value = '';
      document.getElementById('model-monthly').value = '';
      loadPricingData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setButtonLoading(btn, false, '+ Add Model Pricing');
    }
  });
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
