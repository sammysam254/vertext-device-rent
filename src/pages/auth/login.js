/**
 * Login page — Email & Password authentication with Forgot Password reset
 */

import { supabase } from '../../supabase.js';
import { navigate } from '../../router.js';
import { toast } from '../../components/toast.js';
import { openModal, closeModal } from '../../components/modal.js';
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

            <form id="login-form">
              <div id="login-msg"></div>

              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input type="email" class="form-input" id="login-email"
                  placeholder="you@example.com" autocomplete="email" required>
              </div>

              <div class="form-group">
                <div class="flex-between" style="margin-bottom:6px">
                  <label class="form-label" style="margin-bottom:0">Password</label>
                  <a href="#" id="forgot-pw-link" class="text-xs text-accent" style="text-decoration:none">Forgot password?</a>
                </div>
                <div style="position:relative">
                  <input type="password" class="form-input" id="login-password"
                    placeholder="Enter your password" autocomplete="current-password" required style="padding-right:45px">
                  <button type="button" class="btn btn-ghost btn-sm" id="toggle-pw-l"
                    style="position:absolute;right:8px;top:50%;transform:translateY(-50%);padding:4px 8px;font-size:0.8rem">
                    👁️
                  </button>
                </div>
              </div>

              <button type="submit" class="btn btn-primary btn-full" id="login-submit-btn">
                Sign In
              </button>
            </form>

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

  attachLoginListeners();
}

function attachLoginListeners() {
  const form = document.getElementById('login-form');
  const togglePw = document.getElementById('toggle-pw-l');

  togglePw.addEventListener('click', () => {
    const pwInput = document.getElementById('login-password');
    pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
  });

  form.addEventListener('submit', handleLoginSubmit);

  document.getElementById('forgot-pw-link').addEventListener('click', (e) => {
    e.preventDefault();
    openForgotPasswordModal();
  });

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

async function handleLoginSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('login-submit-btn');
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const msgEl = document.getElementById('login-msg');

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
    setButtonLoading(btn, false, 'Sign In');
  }
}

function openForgotPasswordModal() {
  const currentEmail = document.getElementById('login-email').value.trim();

  openModal({
    title: '🔑 Reset Password',
    body: `
      <p class="text-secondary text-sm" style="margin-bottom:16px">
        Enter your email address and we'll send you a link to reset your password.
      </p>
      <div class="form-group">
        <label class="form-label">Email Address</label>
        <input type="email" class="form-input" id="reset-email-input" value="${currentEmail}" placeholder="you@example.com">
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" id="cancel-reset-btn">Cancel</button>
      <button class="btn btn-primary" id="send-reset-btn">Send Reset Link</button>
    `,
  });

  setTimeout(() => {
    document.getElementById('cancel-reset-btn')?.addEventListener('click', closeModal);
    document.getElementById('send-reset-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('send-reset-btn');
      const email = document.getElementById('reset-email-input').value.trim();
      if (!email || !/\S+@\S+\.\S+/.test(email)) {
        toast.error('Please enter a valid email.');
        return;
      }

      setButtonLoading(btn, true, 'Sending...');
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/#/login',
        });
        if (error) throw error;
        toast.success('Password reset link sent to your email!');
        closeModal();
      } catch (err) {
        toast.error(err.message);
        setButtonLoading(btn, false, 'Send Reset Link');
      }
    });
  }, 50);
}

async function redirectAfterLogin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  navigate(profile?.role === 'admin' ? '/admin' : '/dashboard/store');
}
