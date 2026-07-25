/**
 * Admin Users page
 */

import { renderAdminLayout } from './layout.js';
import { adminGetUsers } from '../../api.js';

export async function renderAdminUsers() {
  await renderAdminLayout('users', renderUsersContent);
}

async function renderUsersContent(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>👥 User Management</h2>
    </div>
    <div class="action-row">
      <div class="search-bar" style="flex:1;max-width:400px;margin-bottom:0">
        <span class="search-bar-icon">🔍</span>
        <input type="text" class="form-input" id="user-search" placeholder="Search by email or name...">
      </div>
    </div>
    <div class="table-wrapper" id="users-table">
      ${skeletonTable(5, 5)}
    </div>
  `;

  document.getElementById('user-search').addEventListener('input', (e) => {
    filterUsers(e.target.value);
  });

  try {
    const users = await adminGetUsers();
    renderUsersTable(users || []);
  } catch (err) {
    document.getElementById('users-table').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">😕</div>
        <h3>Failed to load users</h3><p>${err.message}</p>
      </div>
    `;
  }
}

let allUsers = [];

function renderUsersTable(users) {
  allUsers = users;
  const wrapper = document.getElementById('users-table');

  if (!users.length) {
    wrapper.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">👥</div>
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
        </tr>
      </thead>
      <tbody id="users-tbody">
        ${users.map(u => renderUserRow(u)).join('')}
      </tbody>
    </table>
  `;
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
    </tr>
  `;
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
