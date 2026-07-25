/**
 * Reset Password page — Allows users coming from password reset email links to set their new password.
 * Extracts recovery session tokens from hash and updates password in Supabase Auth.
 */

import { supabase } from '../../supabase.js';
import { toast } from '../../components/toast.js';
import { navigate } from '../../router.js';
import { setButtonLoading } from '../../components/loader.js';

export async function renderResetPassword() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="auth-wrapper animate-fade">
      <div class="auth-card">
        <div class="auth-header" style="text-align:center;margin-bottom:24px">
          <div class="auth-brand-logo" style="font-size:1.6rem;font-weight:800;background:var(--grad-primary);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:6px">
            Vertext Devices
          </div>
          <h2 style="font-size:1.4rem;font-weight:700">Set New Password</h2>
          <p class="text-secondary text-sm" style="margin-top:6px;color:var(--text-secondary)">
            Enter a new secure password for your account.
          </p>
        </div>

        <form class="auth-form" id="reset-password-form">
          <div class="form-group" style="margin-bottom:18px">
            <label class="form-label" style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:6px">New Password</label>
            <div style="position:relative">
              <input
                type="password"
                class="form-input"
                id="new-password"
                placeholder="Enter new password (min 6 chars)"
                required
                minlength="6"
                style="width:100%;padding:12px 40px 12px 14px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.95rem"
              >
              <button type="button" id="toggle-p1-btn" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text-muted);cursor:pointer;padding:4px;display:flex;align-items:center" title="Toggle Visibility">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            </div>
          </div>

          <div class="form-group" style="margin-bottom:20px">
            <label class="form-label" style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:6px">Confirm New Password</label>
            <div style="position:relative">
              <input
                type="password"
                class="form-input"
                id="confirm-password"
                placeholder="Confirm new password"
                required
                minlength="6"
                style="width:100%;padding:12px 40px 12px 14px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.95rem"
              >
              <button type="button" id="toggle-p2-btn" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text-muted);cursor:pointer;padding:4px;display:flex;align-items:center" title="Toggle Visibility">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-full" id="submit-reset-btn" style="width:100%;padding:12px;font-weight:600">
            Update Password
          </button>
        </form>

        <div style="text-align:center;margin-top:20px">
          <a href="#/login" class="text-sm text-accent" style="text-decoration:none;color:var(--purple);font-size:0.875rem;font-weight:600">
            ← Back to Sign In
          </a>
        </div>
      </div>
    </div>
  `;

  // Parse recovery tokens from URL hash if present and set session
  try {
    const rawHash = window.location.hash || '';
    const hashContent = rawHash.includes('#') ? rawHash.split('#').pop() : rawHash;
    const params = new URLSearchParams(hashContent);

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }
  } catch (_) {
    // Session setup fallback
  }

  // Password Visibility Toggles
  const p1 = document.getElementById('new-password');
  const p2 = document.getElementById('confirm-password');

  document.getElementById('toggle-p1-btn')?.addEventListener('click', () => {
    p1.type = p1.type === 'password' ? 'text' : 'password';
  });

  document.getElementById('toggle-p2-btn')?.addEventListener('click', () => {
    p2.type = p2.type === 'password' ? 'text' : 'password';
  });

  // Form Submit Handler
  document.getElementById('reset-password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-reset-btn');
    const newPass = p1.value.trim();
    const confirmPass = p2.value.trim();

    if (!newPass || newPass.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    if (newPass !== confirmPass) {
      toast.error('Passwords do not match. Please re-enter.');
      return;
    }

    setButtonLoading(submitBtn, true, 'Updating Password...');

    try {
      // Re-verify session state
      let { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Retry setting session from URL hash if needed
        const rawHash = window.location.hash || '';
        const hashContent = rawHash.includes('#') ? rawHash.split('#').pop() : rawHash;
        const params = new URLSearchParams(hashContent);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          session = data?.session;
          if (error) throw error;
        }
      }

      if (!session) {
        throw new Error('Recovery session expired. Please request a new password reset email.');
      }

      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;

      toast.success('Password updated successfully! Please log in with your new password.');

      // Sign out recovery session & navigate to login
      await supabase.auth.signOut();
      setTimeout(() => {
        navigate('/login');
      }, 1200);

    } catch (err) {
      toast.error(err.message || 'Failed to update password. Link may have expired.');
      setButtonLoading(submitBtn, false, 'Update Password');
    }
  });
}
