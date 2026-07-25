/**
 * Stream Viewer page — validates token and renders stream in iframe
 * URL: vertext.site/stream/{token}
 */

import { lookupStream } from '../../api.js';

export async function renderStreamViewer(token) {
  const app = document.getElementById('app');

  if (!token) {
    renderStreamEntry(app);
    return;
  }

  // Show loading screen
  app.innerHTML = `
    <div class="stream-page">
      <div class="stream-topbar">
        <span class="stream-brand">Vertext Devices</span>
        <div class="stream-status">
          <div class="stream-status-dot"></div>
          Connecting...
        </div>
      </div>
      <div class="stream-iframe-wrapper">
        <div class="stream-loading-overlay" id="stream-loading">
          <div class="stream-loading-logo">Vertext Devices</div>
          <div class="stream-spinner"></div>
          <p class="stream-loading-text">Verifying access token...</p>
        </div>
        <iframe id="stream-iframe" class="stream-iframe" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
      </div>
    </div>
  `;

  try {
    const result = await lookupStream(token);

    if (!result || !result.stream_url) {
      throw new Error('Stream URL not available.');
    }

    // Update status
    const statusEl = document.querySelector('.stream-status');
    if (statusEl) {
      statusEl.innerHTML = `<div class="stream-status-dot"></div> Live · ${result.model || 'Device'}`;
    }

    // Load iframe
    const iframe = document.getElementById('stream-iframe');
    iframe.src = result.stream_url;

    // Fade out loader when iframe loads
    iframe.addEventListener('load', () => {
      const loader = document.getElementById('stream-loading');
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 300);
      }
    });

    // Safety timeout — remove loader after 10s regardless
    setTimeout(() => {
      const loader = document.getElementById('stream-loading');
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 300);
      }
    }, 10000);

  } catch (err) {
    app.innerHTML = `
      <div class="stream-entry-page">
        <div class="stream-entry-box">
          <div class="stream-entry-icon">❌</div>
          <h2 class="stream-entry-title">Access Denied</h2>
          <p class="stream-entry-sub">${getErrorMessage(err.message)}</p>
          <button class="btn btn-primary" id="back-to-stream-btn" style="margin-top:20px">
            Try Another Token
          </button>
          <button class="btn btn-ghost" id="back-to-dash-btn" style="margin-top:8px">
            Go to Dashboard
          </button>
        </div>
      </div>
    `;
    document.getElementById('back-to-stream-btn')?.addEventListener('click', () => {
      import('../../router.js').then(({ navigate }) => navigate('/dashboard/stream'));
    });
    document.getElementById('back-to-dash-btn')?.addEventListener('click', () => {
      import('../../router.js').then(({ navigate }) => navigate('/dashboard/store'));
    });
  }
}

function renderStreamEntry(app) {
  // Token entry for direct access via vertext.site/stream
  app.innerHTML = `
    <div class="stream-entry-page">
      <div class="stream-entry-box">
        <div class="stream-entry-icon">📡</div>
        <h1 class="stream-entry-title gradient-text" style="font-size:1.6rem">Vertext Devices</h1>
        <p class="stream-entry-sub">
          Enter your 6-digit device access token to start streaming.
          Your token is available in your Vertext Devices dashboard.
        </p>

        <div id="stream-entry-msg"></div>

        <div class="form-group" style="margin-top:8px">
          <input type="text" class="form-input" id="stream-entry-input"
            placeholder="000000"
            maxlength="6"
            inputmode="numeric"
            autocomplete="off"
            style="text-align:center;font-family:var(--font-mono);font-size:2rem;font-weight:700;letter-spacing:0.2em;padding:20px">
        </div>
        <button class="btn btn-primary btn-full btn-lg" id="stream-entry-btn">
          ▶ Launch Stream
        </button>
        <div style="margin-top:16px;font-size:0.8rem;color:var(--text-muted)">
          Don't have a token?
          <a href="#/signup" style="color:var(--text-accent)">Create an account →</a>
        </div>
      </div>
    </div>
  `;

  const input = document.getElementById('stream-entry-input');
  const btn = document.getElementById('stream-entry-btn');

  input.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });

  btn.addEventListener('click', async () => {
    const token = input.value.trim();
    const msgEl = document.getElementById('stream-entry-msg');
    if (token.length !== 6) {
      msgEl.innerHTML = `<div class="auth-error" style="margin-bottom:12px">Please enter a valid 6-digit token.</div>`;
      return;
    }
    msgEl.innerHTML = '';
    import('../../router.js').then(({ navigate }) => navigate(`/stream/${token}`));
  });
}

function getErrorMessage(msg) {
  if (!msg) return 'Invalid or expired token.';
  if (msg.includes('expired')) return 'This device subscription has expired. Please renew it in your dashboard.';
  if (msg.includes('inactive') || msg.includes('cancelled')) return 'This device is no longer active.';
  if (msg.includes('not found')) return 'Token not found. Check your token in My Devices.';
  return msg;
}
