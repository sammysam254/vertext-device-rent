/**
 * Stream Access page — enter 6-digit token to launch stream
 */

import { renderDashboardLayout } from './layout.js';
import { lookupStream } from '../../api.js';
import { toast } from '../../components/toast.js';
import { setButtonLoading } from '../../components/loader.js';
import { navigate } from '../../router.js';

export async function renderStreamAccess() {
  await renderDashboardLayout('stream', renderStreamContent);
}

function renderStreamContent(container) {
  container.innerHTML = `
    <div class="stream-access-container">
      <div class="page-header" style="flex-direction:column;align-items:center;text-align:center;margin-bottom:0">
        <div style="font-size:3rem;margin-bottom:12px;filter:drop-shadow(0 0 20px rgba(124,58,237,0.5))">📡</div>
        <h2>Stream Access</h2>
        <p class="text-secondary" style="margin-top:8px">Enter your 6-digit device token to launch your stream</p>
      </div>

      <div class="glass-card" style="padding:32px;margin-top:32px">
        <div id="stream-msg"></div>

        <div class="form-group">
          <label class="form-label" style="text-align:center;display:block">Device Token</label>
          <input
            type="text"
            class="stream-token-input form-input"
            id="stream-token-input"
            placeholder="000000"
            maxlength="6"
            inputmode="numeric"
            autocomplete="off"
            style="text-align:center;font-family:var(--font-mono);font-size:2rem;font-weight:700;letter-spacing:0.2em;padding:20px"
          >
        </div>

        <button class="btn btn-primary btn-full btn-lg" id="launch-stream-btn">
          ▶ Launch Stream
        </button>

        <div class="stream-info-box" style="margin-top:20px">
          <p style="font-size:0.875rem;color:var(--text-secondary);line-height:1.6">
            🔐 Your token is shown in <strong style="color:var(--text-primary)">My Devices</strong> next to each active device.
            The stream will open in a new tab under our secure branded link.
          </p>
        </div>
      </div>

      <!-- Recent devices shortcut -->
      <div id="recent-devices-section" style="margin-top:28px">
        <div class="text-xs text-muted" style="text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;font-weight:700">
          Quick access — your active devices
        </div>
        <div id="recent-tokens-list"></div>
      </div>
    </div>
  `;

  attachStreamListeners();
  loadRecentDevices();
}

function attachStreamListeners() {
  const input = document.getElementById('stream-token-input');
  const btn = document.getElementById('launch-stream-btn');

  // Auto-format: digits only
  input.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
  });

  // Enter key
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btn.click();
  });

  btn.addEventListener('click', async () => {
    const token = input.value.trim();
    const msgEl = document.getElementById('stream-msg');

    if (token.length !== 6) {
      msgEl.innerHTML = `<div class="auth-error">Please enter a valid 6-digit token.</div>`;
      return;
    }

    setButtonLoading(btn, true, 'Verifying...');
    msgEl.innerHTML = '';

    try {
      const result = await lookupStream(token);
      // Redirect to stream viewer
      navigate(`/stream/${token}`);
    } catch (err) {
      if (err.message.includes('expired') || err.message.includes('inactive')) {
        msgEl.innerHTML = `<div class="auth-error">❌ Device is expired or inactive. Renew your subscription to continue streaming.</div>`;
      } else if (err.message.includes('not found')) {
        msgEl.innerHTML = `<div class="auth-error">❌ Token not found. Check your token in My Devices.</div>`;
      } else {
        msgEl.innerHTML = `<div class="auth-error">${err.message}</div>`;
      }
    } finally {
      setButtonLoading(btn, false, '▶ Launch Stream');
    }
  });
}

async function loadRecentDevices() {
  try {
    const { getMyDevices } = await import('../../api.js');
    const devices = await getMyDevices();
    const active = (devices || []).filter(d => d.status === 'active').slice(0, 3);
    const container = document.getElementById('recent-tokens-list');

    if (!active.length) {
      document.getElementById('recent-devices-section').style.display = 'none';
      return;
    }

    container.innerHTML = active.map(d => `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;
           background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);
           margin-bottom:8px;cursor:pointer;transition:var(--transition)"
           class="quick-token-row" data-token="${d.stream_token}">
        <span style="font-size:1.2rem">${d.platform === 'iphone' ? '📱' : '🤖'}</span>
        <div style="flex:1">
          <div style="font-size:0.875rem;font-weight:600;color:var(--text-primary)">${d.model}</div>
          <div style="font-family:var(--font-mono);font-size:0.8rem;color:var(--text-accent);letter-spacing:0.12em">${d.stream_token}</div>
        </div>
        <span style="font-size:0.75rem;color:var(--text-muted)">▶ Launch</span>
      </div>
    `).join('');

    container.querySelectorAll('.quick-token-row').forEach(row => {
      row.addEventListener('click', () => {
        navigate(`/stream/${row.dataset.token}`);
      });
      row.addEventListener('mouseenter', () => row.style.borderColor = 'var(--border-accent)');
      row.addEventListener('mouseleave', () => row.style.borderColor = 'var(--border)');
    });
  } catch {
    document.getElementById('recent-devices-section').style.display = 'none';
  }
}
