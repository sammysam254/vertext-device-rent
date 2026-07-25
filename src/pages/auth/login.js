/**
 * Login page — email OTP only
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
            <p class="auth-subtitle">Enter your email — we'll send a sign-in code</p>

            <!-- Step 1: Enter email -->
            <div id="login-step-1">
              <div id="auth-msg"></div>
              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input type="email" class="form-input" id="login-email"
                  placeholder="you@example.com" autocomplete="email">
              </div>
              <button class="btn btn-primary btn-full" id="send-otp-btn">
                📧 Send Sign-In Code
              </button>
            </div>

            <!-- Step 2: Enter OTP -->
            <div id="login-step-2" class="hidden">
              <div class="auth-success" id="otp-sent-msg">
                ✓ Code sent to <strong id="email-sent-to"></strong>
              </div>
              <div class="form-group" style="margin-top:16px">
                <label class="form-label" style="text-align:center;display:block">
                  Enter the 6-digit code
                </label>
                <div class="otp-inputs" id="otp-inputs">
                  ${[0,1,2,3,4,5].map(i =>
                    `<input type="text" class="otp-input" maxlength="1"
                      data-index="${i}" inputmode="numeric" autocomplete="one-time-code">`
                  ).join('')}
                </div>
              </div>
              <button class="btn btn-primary btn-full" id="verify-otp-btn">
                ✓ Verify & Sign In
              </button>
              <button class="btn btn-ghost btn-full mt-8" id="resend-btn"
                style="font-size:0.8rem;margin-top:8px">
                Resend code
              </button>
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

  setupOtpInputs('otp-inputs');
  attachLoginListeners();
}

function attachLoginListeners() {
  document.getElementById('send-otp-btn').addEventListener('click', handleSendOtp);
  document.getElementById('resend-btn').addEventListener('click', handleSendOtp);
  document.getElementById('verify-otp-btn').addEventListener('click', handleVerifyOtp);

  document.getElementById('goto-signup').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/signup');
  });

  document.getElementById('auth-theme-toggle').addEventListener('click', () => {
    const t = toggleTheme();
    document.getElementById('auth-theme-toggle').textContent =
      t === 'dark' ? '☀️ Light mode' : '🌙 Dark mode';
  });

  // Enter key on email field
  document.getElementById('login-email').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('send-otp-btn').click();
  });
}

async function handleSendOtp() {
  const btn = document.getElementById('send-otp-btn');
  const email = document.getElementById('login-email').value.trim();
  const msgEl = document.getElementById('auth-msg');

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    msgEl.innerHTML = `<div class="auth-error">Please enter a valid email address.</div>`;
    return;
  }

  setButtonLoading(btn, true, 'Sending...');
  msgEl.innerHTML = '';

  try {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;

    document.getElementById('email-sent-to').textContent = email;
    document.getElementById('login-step-1').classList.add('hidden');
    document.getElementById('login-step-2').classList.remove('hidden');
    // Focus first OTP box
    document.querySelector('#otp-inputs .otp-input')?.focus();
    toast.success('Code sent! Check your inbox.');
  } catch (err) {
    msgEl.innerHTML = `<div class="auth-error">${err.message}</div>`;
  } finally {
    setButtonLoading(btn, false, '📧 Send Sign-In Code');
  }
}

async function handleVerifyOtp() {
  const btn = document.getElementById('verify-otp-btn');
  const email = document.getElementById('login-email').value.trim();
  const token = getOtpValue('otp-inputs');

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
    setButtonLoading(btn, false, '✓ Verify & Sign In');
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
