/**
 * Reset Password page — Allows users coming from password reset email link to enter their new password.
 * Updates password in Supabase Auth so it becomes their new login password.
 */

import { supabase } from '../../supabase.js';
import { toast } from '../../components/toast.js';
import { navigate } from '../../router.js';
import { setButtonLoading } from '../../components/loader.js';

export function renderResetPassword() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="auth-wrapper animate-fade">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-logo">Vertext Devices</div>
          <h2>Set New Password</h2>
          <p class="text-secondary text-sm" style="margin-top:6px">
            Enter a new secure password for your account.
          </p>
        </div>

        <form class="auth-form" id="reset-password-form">
          <div class="form-group">
            <label class="form-label">New Password</label>
            <div style="position:relative">
              <input
                type="password"
                class="form-input"
                id="new-password"
                placeholder="Enter new password (min 6 chars)"
                required
                minlength="6"
              >
              <button type="button" id="toggle-p1-btn" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:0.9rem">
                👁️
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Confirm New Password</label>
            <div style="position:relative">
              <input
                type="password"
                class="form-input"
                id="confirm-password"
                placeholder="Confirm new password"
                required
                minlength="6"
              >
              <button type="button" id="toggle-p2-btn" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:0.9rem">
                👁️
              </button>
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-full" id="submit-reset-btn" style="margin-top:8px">
            ✓ Update Password
          </button>
        </form>

        <div style="text-align:center;margin-top:20px">
          <a href="#/login" class="text-sm text-accent" style="text-decoration:none">
            ← Back to Sign In
          </a>
        </div>
      </div>
    </div>
  `;

  // Password Visibility Toggles
  const p1 = document.getElementById('new-password');
  const p2 = document.getElementById('confirm-password');

  document.getElementById('toggle-p1-btn')?.addEventListener('click', () => {
    p1.type = p1.type === 'password' ? 'text' : 'password';
  });

  document.getElementById('toggle-p2-btn')?.addEventListener('click', () => {
    p2.type = p2.type === 'password' ? 'text' : 'password';
  });

  // Form Submit
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
      const { error } = await supabase.auth.updateUser({ password: newPass });

      if (error) throw error;

      toast.success('🎉 Password updated successfully! Please log in with your new password.');

      // Sign out recovery session and navigate to login
      await supabase.auth.signOut();
      setTimeout(() => {
        navigate('/login');
      }, 1200);

    } catch (err) {
      toast.error(err.message || 'Failed to update password. Link may have expired.');
      setButtonLoading(submitBtn, false, '✓ Update Password');
    }
  });
}
