/**
 * Admin Overview — stats dashboard
 */

import { renderAdminLayout } from './layout.js';
import { adminGetStats } from '../../api.js';

export async function renderAdminOverview() {
  await renderAdminLayout('overview', renderOverviewContent);
}

async function renderOverviewContent(container) {
  container.innerHTML = `
    <div class="admin-stats-grid" id="admin-stats">
      ${Array.from({ length: 4 }, () => `
        <div class="admin-stat-card">
          <div class="skeleton" style="width:36px;height:36px;border-radius:8px;margin-bottom:10px"></div>
          <div class="skeleton" style="width:60%;height:28px;margin-bottom:6px"></div>
          <div class="skeleton" style="width:40%;height:12px"></div>
        </div>
      `).join('')}
    </div>
    <div class="grid-2">
      <div class="glass-card p-24" id="recent-orders-card">
        <h3 style="font-size:1rem;font-weight:700;margin-bottom:16px">📋 Recent Orders</h3>
        <div id="recent-orders-list">${skeletonActivity()}</div>
      </div>
      <div class="glass-card p-24" id="recent-tx-card">
        <h3 style="font-size:1rem;font-weight:700;margin-bottom:16px">💰 Recent Transactions</h3>
        <div id="recent-tx-list">${skeletonActivity()}</div>
      </div>
    </div>
  `;

  try {
    const stats = await adminGetStats();
    renderStats(stats);
    renderRecentOrders(stats.recent_orders || []);
    renderRecentTransactions(stats.recent_transactions || []);
  } catch (err) {
    document.getElementById('admin-stats').innerHTML = `
      <div style="grid-column:1/-1;color:var(--red)">Failed to load stats: ${err.message}</div>
    `;
  }
}

function renderStats(stats) {
  const statsGrid = document.getElementById('admin-stats');
  const cards = [
    { icon: '👥', label: 'Total Users', value: stats.total_users || 0, color: 'purple', change: null },
    { icon: '📱', label: 'Active Devices', value: stats.active_devices || 0, color: 'cyan', change: null },
    { icon: '💵', label: 'Total Revenue', value: `$${((stats.total_revenue_cents || 0) / 100).toFixed(0)}`, color: 'green', change: null },
    { icon: '💰', label: 'Wallet Balances', value: `$${((stats.total_wallet_cents || 0) / 100).toFixed(0)}`, color: 'red', change: null },
  ];

  statsGrid.innerHTML = cards.map(c => `
    <div class="admin-stat-card ${c.color} animate-fade">
      <div class="admin-stat-icon">${c.icon}</div>
      <div class="admin-stat-value">${c.value}</div>
      <div class="admin-stat-label">${c.label}</div>
    </div>
  `).join('');
}

function renderRecentOrders(orders) {
  const list = document.getElementById('recent-orders-list');
  if (!orders.length) {
    list.innerHTML = `<p class="text-sm text-muted">No orders yet.</p>`;
    return;
  }
  list.innerHTML = `<div class="activity-feed">${orders.map(o => `
    <div class="activity-item">
      <div class="activity-dot"></div>
      <div class="activity-content">
        <div class="activity-text">
          <strong>${o.customer_email}</strong> rented <strong>${o.model || 'a device'}</strong>
        </div>
        <div class="activity-time">${formatRelative(o.created_at)} · <span class="badge ${o.status === 'active' ? 'badge-active' : 'badge-expired'}">${o.status}</span></div>
      </div>
    </div>
  `).join('')}</div>`;
}

function renderRecentTransactions(txs) {
  const list = document.getElementById('recent-tx-list');
  if (!txs.length) {
    list.innerHTML = `<p class="text-sm text-muted">No transactions yet.</p>`;
    return;
  }
  list.innerHTML = `<div class="activity-feed">${txs.map(tx => `
    <div class="activity-item">
      <div class="activity-dot" style="background:${tx.amount_cents > 0 ? 'var(--emerald)' : 'var(--red)'}"></div>
      <div class="activity-content">
        <div class="activity-text">
          ${tx.amount_cents > 0
            ? `<strong>+$${(tx.amount_cents/100).toFixed(2)}</strong> deposited via ${tx.provider}`
            : `<strong>-$${Math.abs(tx.amount_cents/100).toFixed(2)}</strong> spent on ${tx.type}`}
        </div>
        <div class="activity-time">${formatRelative(tx.created_at)}</div>
      </div>
    </div>
  `).join('')}</div>`;
}

function formatRelative(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function skeletonActivity() {
  return Array.from({ length: 4 }, () => `
    <div class="activity-item">
      <div class="skeleton" style="width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:6px"></div>
      <div style="flex:1">
        <div class="skeleton" style="width:80%;height:13px;margin-bottom:6px"></div>
        <div class="skeleton" style="width:40%;height:10px"></div>
      </div>
    </div>
  `).join('');
}
