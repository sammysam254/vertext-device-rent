/**
 * My Devices page
 */

import { renderDashboardLayout } from './layout.js';
import { getMyDevices, deactivateDevice } from '../../api.js';
import { toast } from '../../components/toast.js';
import { openModal, closeModal } from '../../components/modal.js';
import { setButtonLoading } from '../../components/loader.js';
import { navigate } from '../../router.js';

export async function renderMyDevices() {
  await renderDashboardLayout('devices', renderDevicesContent);
}

async function renderDevicesContent(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>📱 My Devices</h2>
      <button class="btn btn-primary btn-sm" id="go-store-btn">+ Rent a Device</button>
    </div>
    <div id="my-devices-list">
      ${skeletonList()}
    </div>
  `;

  document.getElementById('go-store-btn')?.addEventListener('click', () => navigate('/dashboard/store'));

  try {
    const devices = await getMyDevices();
    renderList(devices, container);
  } catch (err) {
    document.getElementById('my-devices-list').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">😕</div>
        <h3>Could not load devices</h3>
        <p>${err.message}</p>
      </div>
    `;
  }
}

function renderList(devices) {
  const list = document.getElementById('my-devices-list');

  if (!devices || !devices.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h3>No active devices</h3>
        <p>Head to the Device Store to rent your first cloud device.</p>
        <button class="btn btn-primary mt-16" id="go-store-empty">Browse Devices →</button>
      </div>
    `;
    document.getElementById('go-store-empty')?.addEventListener('click', () => navigate('/dashboard/store'));
    return;
  }

  list.innerHTML = `
    <div class="device-grid">
      ${devices.map(device => renderDeviceCard(device)).join('')}
    </div>
  `;

  // Attach listeners
  devices.forEach(device => {
    const copyTokenBtn = document.getElementById(`copy-token-${device.id}`);
    copyTokenBtn?.addEventListener('click', () => copyToClipboard(device.stream_token, copyTokenBtn, 'Token'));

    const streamLink = `${window.location.origin}/#/stream/${device.stream_token}`;
    const copyLinkBtn = document.getElementById(`copy-link-${device.id}`);
    copyLinkBtn?.addEventListener('click', () => copyToClipboard(streamLink, copyLinkBtn, 'Link'));

    const cancelBtn = document.getElementById(`cancel-device-${device.id}`);
    cancelBtn?.addEventListener('click', () => confirmCancel(device));

    const streamBtn = document.getElementById(`stream-device-${device.id}`);
    streamBtn?.addEventListener('click', () => {
      if (!device.stream_url) {
        toast.info('⏳ Stream setup in progress. Our admin team is attaching the stream link for your device.');
        return;
      }
      navigate(`/stream/${device.stream_token}`);
    });
  });
}

function renderDeviceCard(device) {
  const isActive = device.status === 'active';
  const isIphone = device.platform === 'iphone';
  const expiresAt = new Date(device.expires_at);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));
  const isExpiringSoon = daysLeft <= 5 && isActive;
  const isPendingStream = isActive && !device.stream_url;
  const streamViewerUrl = `${window.location.origin}/#/stream/${device.stream_token}`;

  return `
    <div class="my-device-card animate-fade">
      <div class="my-device-header">
        <div class="my-device-status-dot ${isActive ? 'active' : 'expired'}"></div>
        <div style="font-size:1.5rem">${isIphone ? '📱' : '🤖'}</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:0.95rem">${device.model}</div>
          <div style="display:flex;gap:6px;margin-top:4px">
            <span class="badge ${isActive ? 'badge-active' : 'badge-expired'}">${device.status}</span>
            <span class="badge ${isIphone ? 'badge-iphone' : 'badge-android'}">${device.platform}</span>
          </div>
        </div>
        ${isExpiringSoon ? `<span class="badge badge-pending">⚠ ${daysLeft}d left</span>` : ''}
      </div>

      <div class="my-device-dates">
        <div class="my-device-date-item">
          <span class="my-device-date-label">Activated</span>
          <span class="my-device-date-value">${formatDate(device.purchased_at)}</span>
        </div>
        <div class="my-device-date-item">
          <span class="my-device-date-label">Expires</span>
          <span class="my-device-date-value" style="${isExpiringSoon ? 'color:var(--amber)' : ''}">${formatDate(device.expires_at)}</span>
        </div>
      </div>

      ${isPendingStream ? `
        <div style="background:rgba(245,158,11,0.12);color:var(--amber);border:1px solid rgba(245,158,11,0.3);padding:8px 12px;border-radius:8px;font-size:0.78rem;font-weight:600;text-align:center;margin:10px 0">
          ⏳ Stream setup in progress — Admin is attaching your stream link
        </div>
      ` : ''}

      <!-- Stream Token & Direct Link -->
      ${isActive ? `
        <div class="my-device-token-section">
          <div class="token-section-label">Stream Access Token</div>
          <div class="token-display">
            <span class="token-code">${device.stream_token}</span>
            <button class="copy-btn" id="copy-token-${device.id}">
              📋 Copy Token
            </button>
          </div>

          <div class="token-section-label" style="margin-top:12px">Direct Stream Link</div>
          <div class="token-display">
            <a href="${streamViewerUrl}" target="_blank" class="token-link-text" style="color:var(--cyan);text-decoration:underline;font-size:0.75rem;font-family:var(--font-mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1" title="${streamViewerUrl}">
              ${streamViewerUrl}
            </a>
            <button class="copy-btn" id="copy-link-${device.id}">
              🔗 Copy Link
            </button>
          </div>
        </div>
      ` : ''}

      <div class="my-device-actions">
        ${isActive ? `
          <button class="btn ${isPendingStream ? 'btn-secondary' : 'btn-primary'} btn-sm" id="stream-device-${device.id}" style="flex:1">
            ${isPendingStream ? '⏳ Setup Pending' : '▶ Stream Now'}
          </button>
          <button class="btn btn-danger btn-sm" id="cancel-device-${device.id}">
            ✕ Cancel
          </button>
        ` : `
          <div class="badge badge-cancelled" style="width:100%;justify-content:center;padding:10px">Device cancelled or expired</div>
        `}
      </div>
    </div>
  `;
}

function confirmCancel(device) {
  openModal({
    title: '⚠ Cancel Device',
    body: `
      <div style="text-align:center;padding:8px 0 20px">
        <div style="font-size:3rem;margin-bottom:12px">⚠️</div>
        <h3 style="margin-bottom:8px">Cancel ${device.model}?</h3>
        <p class="text-secondary" style="font-size:0.875rem">
          This will immediately end your access to this device.
          <strong>No refund will be issued.</strong>
        </p>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" id="cancel-modal-no">Keep Device</button>
      <button class="btn btn-danger" id="cancel-modal-yes">Yes, Cancel Device</button>
    `,
  });

  setTimeout(() => {
    document.getElementById('cancel-modal-no')?.addEventListener('click', closeModal);
    document.getElementById('cancel-modal-yes')?.addEventListener('click', async () => {
      const btn = document.getElementById('cancel-modal-yes');
      setButtonLoading(btn, true, 'Cancelling...');
      try {
        await deactivateDevice({ order_id: device.order_id, device_id: device.id });
        closeModal();
        toast.success('Device cancelled.');
        // Reload
        const content = document.getElementById('my-devices-list');
        content.innerHTML = skeletonList();
        const devices = await getMyDevices();
        renderList(devices);
      } catch (err) {
        toast.error(err.message);
        setButtonLoading(btn, false, 'Yes, Cancel Device');
      }
    });
  }, 50);
}

function copyToClipboard(text, btn, type = 'Token') {
  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add('copied');
    btn.textContent = '✓ Copied!';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.textContent = type === 'Link' ? '🔗 Copy Link' : '📋 Copy Token';
    }, 2000);
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function skeletonList() {
  return `<div class="device-grid">${Array.from({ length: 3 }, () => `
    <div class="my-device-card">
      <div style="display:flex;gap:14px;margin-bottom:16px;align-items:center">
        <div class="skeleton" style="width:8px;height:8px;border-radius:50%"></div>
        <div class="skeleton" style="width:36px;height:36px;border-radius:8px"></div>
        <div style="flex:1">
          <div class="skeleton" style="width:60%;height:14px;margin-bottom:8px"></div>
          <div class="skeleton" style="width:40%;height:10px"></div>
        </div>
      </div>
      <div class="skeleton" style="height:70px;border-radius:10px;margin-bottom:14px"></div>
      <div class="skeleton" style="height:50px;border-radius:10px;margin-bottom:14px"></div>
      <div class="skeleton" style="height:36px;border-radius:10px"></div>
    </div>
  `).join('')}</div>`;
}
