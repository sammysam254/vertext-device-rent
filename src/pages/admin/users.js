/**
 * Admin Users page
 * Displays registered users with active device count & wallet balances.
 * Features Admin Credit Wallet functionality to manually add USD funds to any user's balance.
 */

import { renderAdminLayout } from './layout.js';
import { adminGetUsers, adminCreditUserWallet } from '../../api.js';
import { toast } from '../../components/toast.js';
import { openModal, closeModal } from '../../components/modal.js';
import { setButtonLoading } from '../../components/loader.js';

export async function renderAdminUsers() {
  await renderAdminLayout('users', renderUsersContent);
}

async function renderUsersContent(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>User Management</h2>
    </div>
    <div class="action-row">
      <div class="search-bar" style="flex:1;max-width:400px;margin-bottom:0">
        <input type="text" class="form-input" id="user-search" placeholder="Search by email or name...">
      </div>
    </div>
    <div class="table-wrapper" id="users-table">
      ${skeletonTable(5, 7)}
    </div>
  `;

  document.getElementById('user-search')?.addEventListener('input', (e) => {
    filterUsers(e.target.value);
  });

  await loadUsersList();
}

let allUsers = [];

async function loadUsersList() {
  try {
    const users = await adminGetUsers();
    renderUsersTable(users || []);
  } catch (err) {
    document.getElementById('users-table').innerHTML = `
      <div class="empty-state">
        <h3>Failed to load users</h3><p>${err.message}</p>
      </div>
    `;
  }
}

function renderUsersTable(users) {
  allUsers = users;
  const wrapper = document.getElementById('users-table');

  if (!users.length) {
    wrapper.innerHTML = `
      <div class="empty-state">
        <h3>No users yet</h3>
        <p>Users will appear here after signing up.</p>
      </div>
    `;
    return;
  }

  wrapper.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>User</th>
          <th>Email</th>
          <th>Role</th>
          <th>Wallet Balance</th>
          <th>Active Devices</th>
          <th>Joined</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="users-tbody">
        ${users.map(u => renderUserRow(u)).join('')}
      </tbody>
    </table>
  `;

  attachUserActionListeners();
}

function renderUserRow(u) {
  const initials = (u.full_name || u.email || '?').split(' ')
    .slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
  return `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="user-avatar-small">${initials}</div>
          <span style="font-weight:600">${u.full_name || '—'}</span>
        </div>
      </td>
      <td>${u.email || '—'}</td>
      <td><span class="badge ${u.role === 'admin' ? 'badge-pool' : 'badge-shared'}">${u.role || 'customer'}</span></td>
      <td style="color:var(--emerald);font-weight:700">$${((u.balance_cents || 0) / 100).toFixed(2)}</td>
      <td>${u.active_devices || 0}</td>
      <td class="text-muted text-sm">${formatDate(u.created_at)}</td>
      <td>
        <button class="btn btn-primary btn-sm credit-wallet-btn"
          data-id="${u.id}"
          data-email="${u.email || ''}"
          data-name="${u.full_name || 'User'}"
          data-balance="${((u.balance_cents || 0) / 100).toFixed(2)}">
          + Credit Wallet
        </button>
      </td>
    </tr>
  `;
}

function attachUserActionListeners() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;

  tbody.querySelectorAll('.credit-wallet-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openCreditWalletModal(btn.dataset);
    });
  });
}

function openCreditWalletModal(user) {
  openModal({
    title: '+ Credit Customer Wallet',
    body: `
      <div style="margin-bottom:16px">
        <div class="badge badge-shared" style="font-weight:600;margin-bottom:8px;display:inline-flex">
          ${user.name} (${user.email})
        </div>
        <p class="text-sm text-secondary">
          Current Balance: <strong style="color:var(--emerald)">$${user.balance} USD</strong>
        </p>
      </div>

      <div class="form-group">
        <label class="form-label">Amount to Credit (USD)</label>
        <div class="price-input-wrapper">
          <span class="price-input-prefix">$</span>
          <input type="number" class="form-input" id="credit-amount-input" placeholder="50.00" min="0.01" step="0.01" style="padding-left:30px" required>
        </div>
      </div>

      <div class="form-group" style="margin-top:12px">
        <label class="form-label">Reason / Admin Note (Optional)</label>
        <input type="text" class="form-input" id="credit-note-input" placeholder="e.g. Admin manual bonus / Goodwill topup">
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" id="cancel-credit-modal">Cancel</button>
      <button class="btn btn-primary" id="confirm-credit-btn">+ Add Funds to Wallet</button>
    `,
  });

  setTimeout(() => {
    document.getElementById('cancel-credit-modal')?.addEventListener('click', closeModal);
    document.getElementById('confirm-credit-btn')?.addEventListener('click', async () => {
      const confirmBtn = document.getElementById('confirm-credit-btn');
      const amountInput = document.getElementById('credit-amount-input');
      const noteInput = document.getElementById('credit-note-input');

      const amount = parseFloat(amountInput.value);
      const note = noteInput.value.trim() || 'Admin manual credit';

      if (!amount || amount <= 0) {
        toast.error('Please enter a valid deposit amount.');
        return;
      }

      const amount_cents = Math.round(amount * 100);
      setButtonLoading(confirmBtn, true, 'Crediting Wallet...');

      try {
        const result = await adminCreditUserWallet({
          user_id: user.id,
          amount_cents,
          note,
        });

        toast.success(`Credited $${(amount_cents / 100).toFixed(2)} to ${user.email}!`);
        closeModal();
        await loadUsersList();
      } catch (err) {
        toast.error(err.message || 'Failed to credit wallet.');
        setButtonLoading(confirmBtn, false, '+ Add Funds to Wallet');
      }
    });
  }, 50);
}

function filterUsers(query) {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  const q = query.toLowerCase();
  const filtered = allUsers.filter(u =>
    (u.email || '').toLowerCase().includes(q) ||
    (u.full_name || '').toLowerCase().includes(q)
  );
  tbody.innerHTML = filtered.map(u => renderUserRow(u)).join('');
  attachUserActionListeners();
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function skeletonTable(rows, cols) {
  return `<table><thead><tr>${Array.from({length:cols},()=>`<th><div class="skeleton" style="height:12px;border-radius:4px"></div></th>`).join('')}</tr></thead><tbody>
    ${Array.from({length:rows},()=>`<tr>${Array.from({length:cols},()=>`<td><div class="skeleton" style="height:14px;border-radius:4px"></div></td>`).join('')}</tr>`).join('')}
  </tbody></table>`;
}
