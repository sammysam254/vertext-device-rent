/**
 * Stream Viewer page — validates token and renders stream in iframe.
 * Handles dedicated 5-Minute Free Trial tokens with server-synced countdown timer,
 * auto-invalidation upon trial expiry, and trial revoked / trial used screen.
 */

import { lookupStream } from '../../api.js';

export async function renderStreamViewer(token) {
  const app = document.getElementById('app');

  if (!token) {
    renderStreamEntry(app);
    return;
  }

  const isTrialUrl = window.location.hash.includes('trial=true') || window.location.search.includes('trial=true');

  // Show loading screen & layout shell
  app.innerHTML = `
    <div class="stream-page">
      <div class="stream-topbar">
        <div class="stream-topbar-left">
          <button class="btn btn-ghost btn-sm" id="stream-back-btn" style="padding:4px 10px;font-size:0.8rem">
            ← Dashboard
          </button>
          <span class="stream-brand">Vertext Devices</span>
        </div>
        <div class="stream-status" id="stream-status-bar">
          <div class="stream-status-dot"></div>
          <span>Connecting...</span>
        </div>
      </div>

      <div class="stream-viewport-wrapper">
        <div class="stream-phone-container" id="stream-container">
          <div class="stream-loading-overlay" id="stream-loading">
            <div class="stream-loading-logo">Vertext Devices</div>
            <div class="stream-spinner"></div>
            <p class="stream-loading-text">Connecting low-latency stream...</p>
          </div>
          <iframe
            id="stream-iframe"
            class="stream-iframe"
            allow="fullscreen; autoplay; clipboard-read; clipboard-write; camera; microphone; pointer-lock; display-capture; gamepad; accelerometer; gyroscope"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-pointer-lock allow-downloads"
            loading="eager"
          ></iframe>
        </div>
      </div>
    </div>
  `;

  // Attach back button
  document.getElementById('stream-back-btn')?.addEventListener('click', () => {
    import('../../router.js').then(({ navigate }) => navigate('/dashboard/store'));
  });

  try {
    const result = await lookupStream(token);

    if (!result || !result.stream_url) {
      throw new Error('Stream URL not available.');
    }

    // Update status
    const statusEl = document.getElementById('stream-status-bar');
    if (statusEl) {
      statusEl.innerHTML = `
        <div class="stream-status-dot"></div>
        <span>Live · ${result.model || 'Device'}</span>
      `;
    }

    const iframe = document.getElementById('stream-iframe');
    const isTrial = isTrialUrl || result.is_trial;

    // Server-synced trial countdown & auto-invalidation handler
    if (isTrial) {
      const streamPage = document.querySelector('.stream-page');
      if (streamPage && !document.getElementById('trial-banner')) {
        const banner = document.createElement('div');
        banner.id = 'trial-banner';
        banner.style.cssText = 'background:linear-gradient(90deg, #7c3aed, #06b6d4);color:#fff;padding:8px 16px;text-align:center;font-size:0.85rem;font-weight:700;display:flex;align-items:center;justify-content:center;gap:12px;box-shadow:var(--shadow-sm);z-index:10';
        banner.innerHTML = `
          <span>⚡ 5-Minute Free Trial</span>
          <span style="background:rgba(0,0,0,0.3);padding:2px 8px;border-radius:12px;font-family:var(--font-mono)">
            Time Remaining: <span id="trial-countdown">05:00</span>
          </span>
        `;
        streamPage.insertBefore(banner, document.querySelector('.stream-viewport-wrapper'));
      }

      const expiresAtMs = result.trial_expires_at
        ? new Date(result.trial_expires_at).getTime()
        : Date.now() + (result.remaining_seconds ? result.remaining_seconds * 1000 : 300000);

      let secondsLeft = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
      const countdownEl = document.getElementById('trial-countdown');

      const updateDisplay = () => {
        const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
        const secs = String(secondsLeft % 60).padStart(2, '0');
        if (countdownEl) countdownEl.textContent = `${mins}:${secs}`;
      };

      updateDisplay();

      if (secondsLeft <= 0) {
        if (iframe) iframe.src = 'about:blank';
        renderTrialUsedScreen(app, result.model);
        return;
      }

      // 1-second interval timer
      const trialTimer = setInterval(() => {
        const currentRemaining = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
        secondsLeft = currentRemaining;

        if (secondsLeft <= 0) {
          clearInterval(trialTimer);
          if (countdownEl) countdownEl.textContent = '00:00';
          if (iframe) iframe.src = 'about:blank';
          renderTrialUsedScreen(app, result.model);
          return;
        }

        updateDisplay();
      }, 1000);
    }

    // Load stream URL into iframe
    iframe.src = result.stream_url;

    // Fade out loader when iframe loads
    iframe.addEventListener('load', () => {
      const loader = document.getElementById('stream-loading');
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 300);
      }
    });

    // Safety timeout
    setTimeout(() => {
      const loader = document.getElementById('stream-loading');
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 300);
      }
    }, 6000);

  } catch (err) {
    if (err.message.includes('Trial Used') || err.message.includes('trial has ended')) {
      renderTrialUsedScreen(app, 'Device');
      return;
    }

    app.innerHTML = `
      <div class="stream-entry-page">
        <div class="stream-entry-box">
          <h2 class="stream-entry-title">Access Denied</h2>
          <p class="stream-entry-sub">${getErrorMessage(err.message)}</p>
          <button class="btn btn-primary" id="back-to-stream-btn" style="margin-top:20px">
            Try Another Token
          </button>
          <button class="btn btn-ghost" id="back-to-dash-btn" style="margin-top:8px">
            Go to Store
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

function renderTrialUsedScreen(container, modelName = 'Device') {
  container.innerHTML = `
    <div class="stream-entry-page">
      <div class="stream-entry-box" style="max-width:440px;text-align:center">
        <div style="font-size:3rem;margin-bottom:12px">⌛</div>
        <h2 class="stream-entry-title" style="color:var(--amber)">Trial Used</h2>
        <p class="stream-entry-sub" style="margin-bottom:20px">
          Your 5-minute free trial for <strong>${modelName}</strong> has ended and this trial access link has been revoked.
          <br>Rent this device to get full, uninterrupted access.
        </p>

        <button class="btn btn-primary btn-full btn-lg" id="rent-device-trial-btn">
          🚀 Rent Device Now
        </button>

        <button class="btn btn-ghost btn-full mt-12" id="back-store-trial-btn">
          Return to Device Store
        </button>
      </div>
    </div>
  `;

  document.getElementById('rent-device-trial-btn')?.addEventListener('click', () => {
    import('../../router.js').then(({ navigate }) => navigate('/dashboard/store'));
  });

  document.getElementById('back-store-trial-btn')?.addEventListener('click', () => {
    import('../../router.js').then(({ navigate }) => navigate('/dashboard/store'));
  });
}

function renderStreamEntry(app) {
  app.innerHTML = `
    <div class="stream-entry-page">
      <div class="stream-entry-box">
        <h1 class="stream-entry-title gradient-text" style="font-size:1.6rem">Vertext Devices</h1>
        <p class="stream-entry-sub">
          Enter your 6-digit device access token to start streaming.
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
          Launch Stream
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
