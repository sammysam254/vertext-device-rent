/**
 * Login page — Password Sign In + Email OTP Sign In
 */

import { supabase } from '../../supabase.js';
import { navigate } from '../../router.js';
import { toast } from '../../components/toast.js';
import { setButtonLoading } from '../../components/loader.js';
import { getTheme, toggleTheme } from '../../theme.js';

export function renderLogin() {
  const app = document.getElementById('app');
  const theme = getTheme();

  app.innerHTML = `
    <div class="auth-root">
      <!-- Decorative panel -->
      <div class="auth-panel">
        <div class="auth-panel-content">
          <div class="auth-panel-logo">Vertext Devices</div>
          <p class="auth-panel-tagline">Your premium cloud device streaming platform. Anywhere, anytime.</p>
          <div class="auth-panel-features">
            ${[
              ['🔐', 'Secure token-based streaming'],
              ['📱', 'iOS & Android devices'],
              ['💳', 'Card & crypto payments'],
              ['⚡', 'Instant activation'],
            ].map(([icon, text]) => `
              <div class="auth-feature-item">
                <div class="auth-feature-icon">${icon}</div>
                <span>${text}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Form -->
      <div class="auth-form-side">
        <div class="auth-form-wrapper">
          <div class="auth-brand">
            <span class="auth-brand-logo">Vertext Devices</span>
            <span class="auth-brand-sub">Cloud Device Platform</span>
          </div>

          <div class="auth-box">
            <h2 class="auth-title">Welcome back</h2>
            <p class="auth-subtitle">Sign in to access your devices</p>

            <!-- Mode selector tabs -->
            <div class="auth-tabs">
              <button class="auth-tab active" id="tab-pw">🔑 Password</button>
              <button class="auth-tab" id="tab-otp">📧 6-Digit Code</button>
            </div>

            <!-- Panel 1: Password Login -->
            <div id="panel-pw">
              <div id="pw-login-msg"></div>
              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input type="email" class="form-input" id="pw-email"
                  placeholder="you@example.com" autocomplete="email">
              </div>
              <div class="form-group">
                <label class="form-label">Password</label>
                <div style="position:relative">
                  <input type="password" class="form-input" id="pw-password"
                    placeholder="Enter your password" autocomplete="current-password" style="padding-right:45px">
                  <button type="button" class="btn btn-ghost btn-sm" id="toggle-pw-l"
                    style="position:absolute;right:8px;top:50%;transform:translateY(-50%);padding:4px 8px;font-size:0.8rem">
                    👁️
                  </button>
                </div>
              </div>
              <button class="btn btn-primary btn-full" id="pw-login-btn">
                Sign In with Password
              </button>
            </div>

            <!-- Panel 2: Email OTP Login -->
            <div id="panel-otp" class="hidden">
              <div id="otp-login-step-1">
                <div id="otp-login-msg"></div>
                <div class="form-group">
                  <label class="form-label">Email Address</label>
                  <input type="email" class="form-input" id="otp-email"
                    placeholder="you@example.com" autocomplete="email">
                </div>
                <button class="btn btn-primary btn-full" id="send-otp-btn">
                  📧 Send 6-Digit Code
                </button>
              </div>

              <div id="otp-login-step-2" class="hidden">
                <div class="auth-success">
                  ✓ Code sent to <strong id="otp-email-sent"></strong>
                </div>
                <div class="form-group" style="margin-top:16px">
                  <label class="form-label" style="text-align:center;display:block">
                    Enter the 6-digit code
                  </label>
                  <div class="otp-inputs" id="login-otp-inputs">
                    ${[0,1,2,3,4,5].map(i =>
                      `<input type="text" class="otp-input" maxlength="1"
                        data-index="${i}" inputmode="numeric" autocomplete="one-time-code">`
                    ).join('')}
                  </div>
                </div>
                <button class="btn btn-primary btn-full" id="verify-otp-btn">
                  ✓ Verify Code & Sign In
                </button>
                <button class="btn btn-ghost btn-full" id="resend-otp-btn"
                  style="font-size:0.8rem;margin-top:8px">
                  Resend code
                </button>
              </div>
            </div>

            <div class="auth-footer">
              Don't have an account?
              <a href="#" id="goto-signup">Create one →</a>
            </div>
          </div>

          <div style="text-align:center;margin-top:16px">
            <button class="btn btn-ghost btn-sm" id="auth-theme-toggle">
              ${theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode'}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  setupOtpInputs('login-otp-inputs');
  attachLoginListeners();
}

function attachLoginListeners() {
  // Tabs
  const tabPw = document.getElementById('tab-pw');
  const tabOtp = document.getElementById('tab-otp');
  const panelPw = document.getElementById('panel-pw');
  const panelOtp = document.getElementById('panel-otp');

  tabPw.addEventListener('click', () => {
    tabPw.classList.add('active');
    tabOtp.classList.remove('active');
    panelPw.classList.remove('hidden');
    panelOtp.classList.add('hidden');
  });

  tabOtp.addEventListener('click', () => {
    tabOtp.classList.add('active');
    tabPw.classList.remove('active');
    panelOtp.classList.remove('hidden');
    panelPw.classList.add('hidden');
  });

  // Password toggle
  document.getElementById('toggle-pw-l').addEventListener('click', () => {
    const pwInput = document.getElementById('pw-password');
    pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
  });

  // Password Login
  document.getElementById('pw-login-btn').addEventListener('click', handlePasswordLogin);
  document.getElementById('pw-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handlePasswordLogin();
  });

  // OTP Login
  document.getElementById('send-otp-btn').addEventListener('click', handleSendOtp);
  document.getElementById('resend-otp-btn').addEventListener('click', handleSendOtp);
  document.getElementById('verify-otp-btn').addEventListener('click', handleVerifyOtp);

  // Navigation & Theme
  document.getElementById('goto-signup').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/signup');
  });

  document.getElementById('auth-theme-toggle').addEventListener('click', () => {
    const t = toggleTheme();
    document.getElementById('auth-theme-toggle').textContent =
      t === 'dark' ? '☀️ Light mode' : '🌙 Dark mode';
  });
}

async function handlePasswordLogin() {
  const btn = document.getElementById('pw-login-btn');
  const email = document.getElementById('pw-email').value.trim();
  const password = document.getElementById('pw-password').value;
  const msgEl = document.getElementById('pw-login-msg');

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    msgEl.innerHTML = `<div class="auth-error">Please enter a valid email address.</div>`;
    return;
  }
  if (!password) {
    msgEl.innerHTML = `<div class="auth-error">Please enter your password.</div>`;
    return;
  }

  setButtonLoading(btn, true, 'Signing in...');
  msgEl.innerHTML = '';

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    toast.success('Signed in successfully!');
    await redirectAfterLogin();
  } catch (err) {
    msgEl.innerHTML = `<div class="auth-error">${err.message || 'Invalid email or password.'}</div>`;
  } finally {
    setButtonLoading(btn, false, 'Sign In with Password');
  }
}

async function handleSendOtp() {
  const btn = document.getElementById('send-otp-btn');
  const email = document.getElementById('otp-email').value.trim();
  const msgEl = document.getElementById('otp-login-msg');

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    msgEl.innerHTML = `<div class="auth-error">Please enter a valid email address.</div>`;
    return;
  }

  setButtonLoading(btn, true, 'Sending code...');
  msgEl.innerHTML = '';

  try {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;

    document.getElementById('otp-email-sent').textContent = email;
    document.getElementById('otp-login-step-1').classList.add('hidden');
    document.getElementById('otp-login-step-2').classList.remove('hidden');
    document.querySelector('#login-otp-inputs .otp-input')?.focus();
    toast.success('Code sent! Check your inbox.');
  } catch (err) {
    msgEl.innerHTML = `<div class="auth-error">${err.message}</div>`;
  } finally {
    setButtonLoading(btn, false, '📧 Send 6-Digit Code');
  }
}

async function handleVerifyOtp() {
  const btn = document.getElementById('verify-otp-btn');
  const email = document.getElementById('otp-email').value.trim();
  const token = getOtpValue('login-otp-inputs');

  if (token.length !== 6) {
    toast.error('Please enter all 6 digits.');
    return;
  }

  setButtonLoading(btn, true, 'Verifying...');

  try {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) throw error;
    toast.success('Signed in successfully!');
    await redirectAfterLogin();
  } catch (err) {
    toast.error(err.message || 'Invalid or expired code.');
  } finally {
    setButtonLoading(btn, false, '✓ Verify Code & Sign In');
  }
}

async function redirectAfterLogin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  navigate(profile?.role === 'admin' ? '/admin' : '/dashboard/store');
}

function setupOtpInputs(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const inputs = container.querySelectorAll('.otp-input');
  inputs.forEach((input, i) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val.slice(-1);
      if (val && i < inputs.length - 1) inputs[i + 1].focus();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && i > 0) inputs[i - 1].focus();
      if (e.key === 'Enter') document.getElementById('verify-otp-btn')?.click();
    });
    input.addEventListener('paste', (e) => {
      const pasted = (e.clipboardData || window.clipboardData)
        .getData('text').replace(/\D/g, '');
      if (pasted.length >= 6) {
        inputs.forEach((inp, idx) => (inp.value = pasted[idx] || ''));
        inputs[Math.min(5, pasted.length - 1)].focus();
        e.preventDefault();
      }
    });
  });
}

function getOtpValue(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return '';
  return Array.from(container.querySelectorAll('.otp-input'))
    .map(i => i.value).join('');
}
