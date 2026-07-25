/**
 * Admin Devices & Streams page
 * Admin can manually add standalone devices, set stream URLs, auto-generate 6-digit access tokens,
 * and toggle whether manual devices appear in the Customer Store for rental & 5-minute free trial testing.
 */

import { renderAdminLayout } from './layout.js';
import { adminUpdateStream, adminAddDevice, adminToggleVisibility, deactivateDevice } from '../../api.js';
import { supabase } from '../../supabase.js';
import { toast } from '../../components/toast.js';
import { openModal, closeModal } from '../../components/modal.js';
import { setButtonLoading } from '../../components/loader.js';

export async function renderAdminDevices() {
  await renderAdminLayout('devices', renderDevicesAdminContent);
}

async function renderDevicesAdminContent(container) {
  container.innerHTML = `
    <div class="page-header flex-between">
      <div>
        <h2>Devices & Stream Links</h2>
        <span class="text-sm text-muted">Manage stream URLs, access tokens & manual device provisions</span>
      </div>
      <button class="btn btn-primary" id="add-manual-device-btn">
        + Add New Device & Stream
      </button>
    </div>

    <!-- Info box -->
    <div class="stream-info-box" style="margin-bottom:24px;background:rgba(124,58,237,0.08);border-color:rgba(124,58,237,0.25)">
      <p class="text-sm" style="color:var(--text-primary)">
        <strong>Manual Device Controls:</strong> Devices added by admin can either be kept <strong>Private (Admin Only)</strong> or toggled <strong>Published to Customer Store</strong> so customers can view, try a 5-minute free trial, and rent them.
      </p>
    </div>

    <!-- Filter -->
    <div class="filter-tabs" id="device-admin-filters">
      <button class="filter-tab active" data-filter="all">All Devices</button>
      <button class="filter-tab" data-filter="manual">Manual Admin Devices</button>
      <button class="filter-tab" data-filter="purchased">Customer Purchased</button>
    </div>

    <div class="table-wrapper" id="admin-devices-table">
      ${skeletonTable(6, 7)}
    </div>
  `;

  document.getElementById('add-manual-device-btn')?.addEventListener('click', () => openAddDeviceModal());
  attachFilterListeners();
  await loadAdminDevices();
}

let allAdminDevices = [];

async function loadAdminDevices() {
  try {
    const { data, error } = await supabase
      .from('devices')
      .select('*, profiles(email, full_name)')
      .order('purchased_at', { ascending: false });

    if (error) throw error;
    allAdminDevices = data || [];
    renderDevicesTable(allAdminDevices);
  } catch (err) {
    document.getElementById('admin-devices-table').innerHTML = `
      <div class="empty-state">
        <h3>Failed to load devices</h3><p>${err.message}</p>
      </div>
    `;
  }
}

function renderDevicesTable(devices) {
  const wrapper = document.getElementById('admin-devices-table');

  if (!devices.length) {
    wrapper.innerHTML = `
      <div class="empty-state" style="padding:40px">
        <h3>No devices found</h3>
        <p>Devices will appear here when customers purchase them or when you add them manually.</p>
        <button class="btn btn-primary mt-16" id="empty-add-btn">+ Add Device Now</button>
      </div>
    `;
    document.getElementById('empty-add-btn')?.addEventListener('click', () => openAddDeviceModal());
    return;
  }

  wrapper.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Source / User</th>
          <th>Device</th>
          <th>Status</th>
          <th>Store Access</th>
          <th>Stream Token</th>
          <th>Stream URL</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${devices.map(d => {
          const isManual = d.phone_id?.startsWith('manual_');
          const directLink = `${window.location.origin}/#/stream/${d.stream_token}`;
          const isStoreVisible = !!d.show_to_customers;

          return `
            <tr>
              <td>
                ${isManual ? `
                  <span class="badge badge-pool" style="font-size:0.7rem">Manual Admin</span>
                ` : `
                  <div style="font-weight:600;font-size:0.85rem">${d.profiles?.full_name || 'Customer'}</div>
                  <div style="font-size:0.75rem;color:var(--text-muted)">${d.profiles?.email || '—'}</div>
                `}
              </td>
              <td>
                <div style="font-weight:600">${d.model}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);text-transform:capitalize">${d.platform}</div>
              </td>
              <td><span class="badge badge-${d.status}">${d.status}</span></td>
              <td>
                ${isManual ? `
                  <button class="btn btn-sm toggle-store-btn ${isStoreVisible ? 'btn-primary' : 'btn-ghost'}"
                    data-id="${d.id}"
                    data-current="${isStoreVisible}"
                    style="font-size:0.75rem;padding:4px 10px">
                    ${isStoreVisible ? '✓ Published to Store' : 'Private (Admin Only)'}
                  </button>
                ` : `
                  <span class="badge badge-active" style="font-size:0.7rem">Rented</span>
                `}
              </td>
              <td>
                <div style="display:flex;align-items:center;gap:6px">
                  <span class="stream-link-token" style="font-family:var(--font-mono);letter-spacing:0.12em;font-weight:700">${d.stream_token || '—'}</span>
                  ${d.stream_token ? `
                    <button class="btn btn-ghost btn-sm copy-token-btn" data-token="${d.stream_token}" title="Copy Token" style="padding:2px 6px;font-size:0.75rem">Copy</button>
                    <button class="btn btn-ghost btn-sm copy-link-btn" data-link="${directLink}" title="Copy Direct Stream Link" style="padding:2px 6px;font-size:0.75rem">Link</button>
                  ` : ''}
                </div>
              </td>
              <td>
                ${d.stream_url
                  ? `<div style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.75rem;color:var(--emerald)">✓ Set</div>`
                  : `<span style="color:var(--amber);font-size:0.8rem">Not set</span>`
                }
              </td>
              <td>
                <div style="display:flex;gap:6px">
                  <button class="btn btn-primary btn-sm update-stream-btn"
                    data-id="${d.id}"
                    data-model="${d.model}"
                    data-email="${d.profiles?.email || 'Manual Device'}"
                    data-token="${d.stream_token || ''}">
                    ${d.stream_url ? 'Update Stream' : 'Set Stream'}
                  </button>
                  ${d.status === 'active' ? `
                    <button class="btn btn-danger btn-sm cancel-admin-device-btn"
                      data-id="${d.id}"
                      data-order="${d.order_id || ''}"
                      data-model="${d.model}">
                      ✕ Cancel
                    </button>
                  ` : ''}
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  // Listeners
  wrapper.querySelectorAll('.copy-token-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.token);
      toast.success(`Copied token: ${btn.dataset.token}`);
    });
  });

  wrapper.querySelectorAll('.copy-link-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.link);
      toast.success('Copied direct stream link!');
    });
  });

  wrapper.querySelectorAll('.toggle-store-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const deviceId = btn.dataset.id;
      const currentVal = btn.dataset.current === 'true';
      const newVal = !currentVal;

      try {
        await adminToggleVisibility({ device_id: deviceId, show_to_customers: newVal });
        toast.success(newVal ? 'Device published to Customer Store! Customers can view, try free & rent.' : 'Device set to Private (Admin Only).');
        await loadAdminDevices();
      } catch (err) {
        toast.error(err.message);
      }
    });
  });

  wrapper.querySelectorAll('.update-stream-btn').forEach(btn => {
    btn.addEventListener('click', () => openStreamModal(btn.dataset));
  });

  wrapper.querySelectorAll('.cancel-admin-device-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { id, order, model } = btn.dataset;
      if (!confirm(`Are you sure you want to cancel ${model}? It will immediately be made available for purchase in the Store again.`)) return;
      try {
        await deactivateDevice({ order_id: order, device_id: id });
        toast.success(`${model} cancelled and returned to Store inventory!`);
        await loadAdminDevices();
      } catch (err) {
        toast.error(err.message);
      }
    });
  });
}

function openAddDeviceModal() {
  openModal({
    title: '+ Add Standalone Device & Stream',
    size: 'lg',
    body: `
      <div style="margin-bottom:16px">
        <p class="text-sm text-secondary">
          Create a standalone device & stream URL. A unique 6-digit access token will be generated.
        </p>
      </div>

      <div class="form-group">
        <label class="form-label">Client Reference / Note (Optional)</label>
        <input type="text" class="form-input" id="manual-client-ref" placeholder="e.g. VIP Client / Test Stream 1">
      </div>

      <div class="grid-2 gap-12">
        <div class="form-group">
          <label class="form-label">Device Model Name</label>
          <input type="text" class="form-input" id="manual-model-name" placeholder="e.g. iPhone 15 Pro" required>
        </div>
        <div class="form-group">
          <label class="form-label">Platform</label>
          <select class="form-select" id="manual-platform">
            <option value="iphone">iPhone (iOS)</option>
            <option value="android">Android</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Stream URL</label>
        <input type="url" class="form-input" id="manual-stream-url" placeholder="https://iphone-stream.cellgods.com/phone.html?id=..." required>
        <p class="text-xs text-muted" style="margin-top:4px">Full stream URL from provider.</p>
      </div>

      <div class="form-group" style="margin:16px 0">
        <label style="display:flex;align-items:center;gap:8px;font-size:0.875rem;font-weight:600;cursor:pointer">
          <input type="checkbox" id="manual-show-store" style="width:18px;height:18px;accent-color:var(--purple)">
          Publish to Customer Store (Allow customers to view, 5-min free trial, and rent this device)
        </label>
      </div>

      <div class="form-group">
        <label class="form-label">Duration (Days)</label>
        <input type="number" class="form-input" id="manual-duration" value="30" min="1" step="1">
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" id="cancel-add-modal">Cancel</button>
      <button class="btn btn-primary" id="save-add-device-btn">Add Device & Generate Token</button>
    `,
  });

  setTimeout(() => {
    document.getElementById('cancel-add-modal')?.addEventListener('click', closeModal);
    document.getElementById('save-add-device-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('save-add-device-btn');
      const client_ref = document.getElementById('manual-client-ref').value.trim();
      const model = document.getElementById('manual-model-name').value.trim();
      const platform = document.getElementById('manual-platform').value;
      const stream_url = document.getElementById('manual-stream-url').value.trim();
      const show_to_customers = document.getElementById('manual-show-store')?.checked || false;
      const duration_days = parseInt(document.getElementById('manual-duration').value) || 30;

      if (!model) {
        toast.error('Please enter a device model name.');
        return;
      }
      if (!stream_url) {
        toast.error('Please enter a stream URL.');
        return;
      }

      setButtonLoading(btn, true, 'Creating Device...');
      try {
        const result = await adminAddDevice({
          client_reference: client_ref,
          model,
          platform,
          stream_url,
          show_to_customers,
          duration_days,
        });

        toast.success(`Device created! Access Token: ${result.stream_token}`);
        closeModal();
        await loadAdminDevices();
      } catch (err) {
        toast.error(err.message);
        setButtonLoading(btn, false, 'Add Device & Generate Token');
      }
    });
  }, 50);
}

function openStreamModal(data) {
  openModal({
    title: `${data.stream_url ? 'Update' : 'Set'} Stream URL`,
    size: 'lg',
    body: `
      <div style="margin-bottom:20px">
        <div class="flex gap-12" style="margin-bottom:12px">
          <span class="badge badge-pool">${data.model}</span>
          <span class="text-sm text-muted">${data.email}</span>
        </div>
        ${data.token ? `
          <div style="margin-bottom:16px">
            <div class="text-xs text-muted" style="margin-bottom:4px;text-transform:uppercase;letter-spacing:0.06em;font-weight:700">Access Token</div>
            <div class="stream-link-token" style="font-size:1.4rem;letter-spacing:0.15em">${data.token}</div>
          </div>
        ` : ''}
      </div>
      <div class="form-group">
        <label class="form-label">Stream URL</label>
        <input type="url" class="form-input" id="new-stream-url"
          placeholder="https://iphone-stream.cellgods.com/phone.html?id=...">
        <p class="text-xs text-muted" style="margin-top:4px">
          Paste the full stream URL. A new 6-digit access token will be generated automatically.
        </p>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" id="cancel-stream-modal">Cancel</button>
      <button class="btn btn-primary" id="save-stream-btn">✓ Save Stream URL</button>
    `,
  });

  setTimeout(() => {
    document.getElementById('cancel-stream-modal')?.addEventListener('click', closeModal);
    document.getElementById('save-stream-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('save-stream-btn');
      const url = document.getElementById('new-stream-url').value.trim();
      if (!url) { toast.error('Please enter a stream URL.'); return; }

      setButtonLoading(btn, true, 'Saving...');
      try {
        await adminUpdateStream({ device_id: data.id, stream_url: url });
        toast.success('Stream URL updated! New token generated.');
        closeModal();
        await loadAdminDevices();
      } catch (err) {
        toast.error(err.message);
        setButtonLoading(btn, false, '✓ Save Stream URL');
      }
    });
  }, 50);
}

function attachFilterListeners() {
  document.getElementById('device-admin-filters')?.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#device-admin-filters .filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.dataset.filter;
      let filtered = allAdminDevices;
      if (filter === 'manual') filtered = allAdminDevices.filter(d => d.phone_id?.startsWith('manual_'));
      if (filter === 'purchased') filtered = allAdminDevices.filter(d => !d.phone_id?.startsWith('manual_'));
      renderDevicesTable(filtered);
    });
  });
}

function skeletonTable(rows, cols) {
  return `<table><thead><tr>${Array.from({length:cols},()=>`<th><div class="skeleton" style="height:12px;border-radius:4px"></div></th>`).join('')}</tr></thead>
  <tbody>${Array.from({length:rows},()=>`<tr>${Array.from({length:cols},()=>`<td><div class="skeleton" style="height:14px;border-radius:4px"></div></td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
