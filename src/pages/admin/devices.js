/**
 * Admin Devices & Streams page
 * Admin can add/update stream links for devices, system auto-generates stream tokens
 */

import { renderAdminLayout } from './layout.js';
import { adminUpdateStream } from '../../api.js';
import { supabase } from '../../supabase.js';
import { toast } from '../../components/toast.js';
import { openModal, closeModal } from '../../components/modal.js';
import { setButtonLoading } from '../../components/loader.js';

export async function renderAdminDevices() {
  await renderAdminLayout('devices', renderDevicesAdminContent);
}

async function renderDevicesAdminContent(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>📱 Devices & Stream Links</h2>
      <span class="text-sm text-muted">Manage stream URLs and access tokens</span>
    </div>

    <!-- Info box -->
    <div class="stream-info-box" style="margin-bottom:24px;background:rgba(245,158,11,0.08);border-color:rgba(245,158,11,0.25)">
      <p class="text-sm" style="color:var(--amber)">
        ⚠️ <strong>Auto-provisioning fallback:</strong> When CellGods auto-provisioning fails,
        use this page to manually set the stream URL for a device. A new 6-digit token is
        automatically generated and assigned to the customer.
      </p>
    </div>

    <!-- Filter -->
    <div class="filter-tabs" id="device-admin-filters">
      <button class="filter-tab active" data-filter="all">All Devices</button>
      <button class="filter-tab" data-filter="active">Active</button>
      <button class="filter-tab" data-filter="no_stream">Missing Stream URL</button>
    </div>

    <div class="table-wrapper" id="admin-devices-table">
      ${skeletonTable(6, 6)}
    </div>
  `;

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
      <div class="empty-state"><div class="empty-state-icon">😕</div>
      <h3>Failed to load devices</h3><p>${err.message}</p></div>
    `;
  }
}

function renderDevicesTable(devices) {
  const wrapper = document.getElementById('admin-devices-table');

  if (!devices.length) {
    wrapper.innerHTML = `
      <div class="empty-state" style="padding:40px">
        <div class="empty-state-icon">📭</div>
        <h3>No devices found</h3>
        <p>Devices will appear here when customers purchase them.</p>
      </div>
    `;
    return;
  }

  wrapper.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Customer</th>
          <th>Device</th>
          <th>Status</th>
          <th>Stream Token</th>
          <th>Stream URL</th>
          <th>Expires</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${devices.map(d => `
          <tr>
            <td>
              <div style="font-size:0.85rem">${d.profiles?.full_name || '—'}</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">${d.profiles?.email || '—'}</div>
            </td>
            <td>
              <div style="font-weight:600">${d.model}</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">${d.platform}</div>
            </td>
            <td><span class="badge badge-${d.status}">${d.status}</span></td>
            <td>
              <div class="stream-link-token">${d.stream_token || '—'}</div>
            </td>
            <td>
              ${d.stream_url
                ? `<div style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.75rem;color:var(--emerald)">✓ Set</div>`
                : `<span style="color:var(--amber);font-size:0.8rem">⚠ Not set</span>`
              }
            </td>
            <td class="text-sm text-muted">${formatDate(d.expires_at)}</td>
            <td>
              <button class="btn btn-primary btn-sm update-stream-btn"
                data-id="${d.id}"
                data-model="${d.model}"
                data-email="${d.profiles?.email || ''}"
                data-token="${d.stream_token || ''}">
                ${d.stream_url ? '✏ Update URL' : '+ Set URL'}
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  wrapper.querySelectorAll('.update-stream-btn').forEach(btn => {
    btn.addEventListener('click', () => openStreamModal(btn.dataset));
  });
}

function openStreamModal(data) {
  openModal({
    title: `${data.stream_url ? '✏ Update' : '+ Set'} Stream URL`,
    size: 'lg',
    body: `
      <div style="margin-bottom:20px">
        <div class="flex gap-12" style="margin-bottom:12px">
          <span class="badge badge-pool">📱 ${data.model}</span>
          <span class="text-sm text-muted">${data.email}</span>
        </div>
        ${data.token ? `
          <div style="margin-bottom:16px">
            <div class="text-xs text-muted" style="margin-bottom:4px;text-transform:uppercase;letter-spacing:0.06em;font-weight:700">Current Token</div>
            <div class="stream-link-token" style="font-size:1.2rem">${data.token}</div>
          </div>
        ` : ''}
      </div>
      <div class="form-group">
        <label class="form-label">Stream URL (from CellGods or your stream provider)</label>
        <input type="url" class="form-input" id="new-stream-url"
          placeholder="https://iphone-stream.cellgods.com/test/phone.html?phone=...">
        <p class="text-xs text-muted" style="margin-top:4px">
          Paste the full stream URL. A new 6-digit access token will be generated automatically
          and the customer can see it in their dashboard.
        </p>
      </div>
      <div class="stream-info-box">
        <p class="text-sm text-secondary">
          🔐 The customer will <strong>never see</strong> this URL.
          They'll only see their branded token and the vertext.site redirect.
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
      if (filter === 'active') filtered = allAdminDevices.filter(d => d.status === 'active');
      if (filter === 'no_stream') filtered = allAdminDevices.filter(d => !d.stream_url);
      renderDevicesTable(filtered);
    });
  });
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function skeletonTable(rows, cols) {
  return `<table><thead><tr>${Array.from({length:cols},()=>`<th><div class="skeleton" style="height:12px;border-radius:4px"></div></th>`).join('')}</tr></thead>
  <tbody>${Array.from({length:rows},()=>`<tr>${Array.from({length:cols},()=>`<td><div class="skeleton" style="height:14px;border-radius:4px"></div></td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
