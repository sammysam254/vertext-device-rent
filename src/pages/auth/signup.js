/**
 * Signup page — direct Email & Password account creation
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
            <p class="auth-subtitle">Get started instantly with cloud device streaming</p>

            <form id="signup-form">
              <div id="signup-msg"></div>

              <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" class="form-input" id="signup-name"
                  placeholder="John Doe" autocomplete="name" required>
              </div>

              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input type="email" class="form-input" id="signup-email"
                  placeholder="you@example.com" autocomplete="email" required>
              </div>

              <div class="form-group">
                <label class="form-label">Password</label>
                <div style="position:relative">
                  <input type="password" class="form-input" id="signup-password"
                    placeholder="At least 6 characters" autocomplete="new-password" required style="padding-right:45px">
                  <button type="button" class="btn btn-ghost btn-sm" id="toggle-pw-s"
                    style="position:absolute;right:8px;top:50%;transform:translateY(-50%);padding:4px 8px;font-size:0.8rem">
                    👁️
                  </button>
                </div>
              </div>

              <button type="submit" class="btn btn-primary btn-full" id="signup-submit-btn">
                🚀 Create Account
              </button>
            </form>

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

  attachSignupListeners();
}

function attachSignupListeners() {
  const form = document.getElementById('signup-form');
  const togglePw = document.getElementById('toggle-pw-s');

  togglePw.addEventListener('click', () => {
    const pwInput = document.getElementById('signup-password');
    pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
  });

  form.addEventListener('submit', handleSignupSubmit);

  document.getElementById('goto-login').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/login');
  });

  document.getElementById('auth-theme-toggle-s').addEventListener('click', () => {
    const t = toggleTheme();
    document.getElementById('auth-theme-toggle-s').textContent =
      t === 'dark' ? '☀️ Light mode' : '🌙 Dark mode';
  });
}

async function handleSignupSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('signup-submit-btn');
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const msgEl = document.getElementById('signup-msg');

  if (!name) {
    msgEl.innerHTML = `<div class="auth-error">Please enter your full name.</div>`;
    return;
  }
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    msgEl.innerHTML = `<div class="auth-error">Please enter a valid email address.</div>`;
    return;
  }
  if (!password || password.length < 6) {
    msgEl.innerHTML = `<div class="auth-error">Password must be at least 6 characters long.</div>`;
    return;
  }

  setButtonLoading(btn, true, 'Creating account...');
  msgEl.innerHTML = '';

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    if (error) throw error;

    toast.success('🎉 Account created! Welcome to Vertext Devices.');
    await ensureWallet();
    navigate('/dashboard/store');
  } catch (err) {
    msgEl.innerHTML = `<div class="auth-error">${err.message}</div>`;
  } finally {
    setButtonLoading(btn, false, '🚀 Create Account');
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
