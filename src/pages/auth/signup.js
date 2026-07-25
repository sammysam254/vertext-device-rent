/**
 * Signup page — email OTP only
 */

import { supabase } from '../../supabase.js';
import { navigate } from '../../router.js';
import { toast } from '../../components/toast.js';
import { setButtonLoading } from '../../components/loader.js';
import { getTheme, toggleTheme } from '../../theme.js';

export function renderSignup() {
  const app = document.getElementById('app');
  const theme = getTheme();

  app.innerHTML = `
    <div class="auth-root">
      <!-- Decorative panel -->
      <div class="auth-panel">
        <div class="auth-panel-content">
          <div class="auth-panel-logo">Vertext Devices</div>
          <p class="auth-panel-tagline">Join thousands of users streaming premium cloud devices today.</p>
          <div class="auth-panel-features">
            ${[
              ['🚀', 'Start in under 2 minutes'],
              ['🔒', 'No hardware required'],
              ['🌍', 'Access from anywhere'],
              ['💰', 'Affordable monthly plans'],
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
            <h2 class="auth-title">Create your account</h2>
            <p class="auth-subtitle">Get started with cloud device streaming</p>

            <!-- Step 1: Details + email -->
            <div id="signup-step-1">
              <div id="signup-msg"></div>
              <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" class="form-input" id="signup-name"
                  placeholder="John Doe" autocomplete="name">
              </div>
              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input type="email" class="form-input" id="signup-email"
                  placeholder="you@example.com" autocomplete="email">
              </div>
              <button class="btn btn-primary btn-full" id="signup-send-btn">
                📧 Send Verification Code
              </button>
            </div>

            <!-- Step 2: OTP verify -->
            <div id="signup-step-2" class="hidden">
              <div class="auth-success">
                ✓ Code sent to <strong id="signup-email-sent"></strong>
              </div>
              <p class="text-sm text-secondary" style="margin:12px 0 16px">
                Enter the 6-digit code from your inbox to verify and create your account.
              </p>
              <div class="form-group">
                <label class="form-label" style="text-align:center;display:block">
                  Verification Code
                </label>
                <div class="otp-inputs" id="signup-otp-inputs">
                  ${[0,1,2,3,4,5].map(i =>
                    `<input type="text" class="otp-input" maxlength="1"
                      data-index="${i}" inputmode="numeric" autocomplete="one-time-code">`
                  ).join('')}
                </div>
              </div>
              <button class="btn btn-primary btn-full" id="signup-verify-btn">
                ✓ Create Account
              </button>
              <button class="btn btn-ghost btn-full" id="signup-resend-btn"
                style="font-size:0.8rem;margin-top:8px">
                Resend code
              </button>
            </div>

            <div class="auth-footer">
              Already have an account?
              <a href="#" id="goto-login">Sign In →</a>
            </div>
          </div>

          <div style="text-align:center;margin-top:16px">
            <button class="btn btn-ghost btn-sm" id="auth-theme-toggle-s">
              ${theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode'}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  setupOtpInputs('signup-otp-inputs');
  attachSignupListeners();
}

function attachSignupListeners() {
  document.getElementById('signup-send-btn').addEventListener('click', handleSignupSend);
  document.getElementById('signup-verify-btn').addEventListener('click', handleSignupVerify);
  document.getElementById('signup-resend-btn').addEventListener('click', handleSignupSend);

  document.getElementById('goto-login').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/login');
  });

  document.getElementById('auth-theme-toggle-s').addEventListener('click', () => {
    const t = toggleTheme();
    document.getElementById('auth-theme-toggle-s').textContent =
      t === 'dark' ? '☀️ Light mode' : '🌙 Dark mode';
  });

  document.getElementById('signup-email').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('signup-send-btn').click();
  });
}

async function handleSignupSend() {
  const btn = document.getElementById('signup-send-btn');
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const msgEl = document.getElementById('signup-msg');

  if (!name) {
    msgEl.innerHTML = `<div class="auth-error">Please enter your full name.</div>`;
    return;
  }
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    msgEl.innerHTML = `<div class="auth-error">Please enter a valid email address.</div>`;
    return;
  }

  setButtonLoading(btn, true, 'Sending...');
  msgEl.innerHTML = '';

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { data: { full_name: name } },
    });
    if (error) throw error;

    document.getElementById('signup-email-sent').textContent = email;
    document.getElementById('signup-step-1').classList.add('hidden');
    document.getElementById('signup-step-2').classList.remove('hidden');
    document.querySelector('#signup-otp-inputs .otp-input')?.focus();
    toast.success('Verification code sent! Check your inbox.');
  } catch (err) {
    msgEl.innerHTML = `<div class="auth-error">${err.message}</div>`;
  } finally {
    setButtonLoading(btn, false, '📧 Send Verification Code');
  }
}

async function handleSignupVerify() {
  const btn = document.getElementById('signup-verify-btn');
  const email = document.getElementById('signup-email').value.trim();
  const token = getOtpValue('signup-otp-inputs');

  if (token.length !== 6) {
    toast.error('Please enter all 6 digits.');
    return;
  }

  setButtonLoading(btn, true, 'Creating account...');

  try {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) throw error;

    toast.success('🎉 Welcome to Vertext Devices!');
    await ensureWallet();
    navigate('/dashboard/store');
  } catch (err) {
    toast.error(err.message || 'Invalid or expired code.');
  } finally {
    setButtonLoading(btn, false, '✓ Create Account');
  }
}

async function ensureWallet() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: wallet } = await supabase
    .from('wallets').select('id').eq('user_id', user.id).single();
  if (!wallet) {
    await supabase.from('wallets').insert({
      user_id: user.id,
      balance_cents: 0,
      currency: 'usd',
    });
  }
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
      if (e.key === 'Enter') document.getElementById('signup-verify-btn')?.click();
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
