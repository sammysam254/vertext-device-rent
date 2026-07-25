/**
 * Admin Orders page
 */

import { renderAdminLayout } from './layout.js';
import { adminGetOrders } from '../../api.js';

export async function renderAdminOrders() {
  await renderAdminLayout('orders', renderOrdersContent);
}

async function renderOrdersContent(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>📋 All Orders</h2>
    </div>
    <div class="filter-tabs" id="orders-filters">
      <button class="filter-tab active" data-filter="">All</button>
      <button class="filter-tab" data-filter="active">Active</button>
      <button class="filter-tab" data-filter="expired">Expired</button>
      <button class="filter-tab" data-filter="cancelled">Cancelled</button>
    </div>
    <div class="table-wrapper" id="orders-table">
      ${skeletonTable(5, 6)}
    </div>
  `;

  document.getElementById('orders-filters').querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      document.querySelectorAll('#orders-filters .filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('orders-table').innerHTML = skeletonTable(5, 6);
      const orders = await adminGetOrders(tab.dataset.filter ? `?status=${tab.dataset.filter}` : '');
      renderOrdersTable(orders || []);
    });
  });

  try {
    const orders = await adminGetOrders();
    renderOrdersTable(orders || []);
  } catch (err) {
    document.getElementById('orders-table').innerHTML = `
      <div class="empty-state"><div class="empty-state-icon">😕</div>
      <h3>Failed to load orders</h3><p>${err.message}</p></div>
    `;
  }
}

function renderOrdersTable(orders) {
  const wrapper = document.getElementById('orders-table');
  if (!orders.length) {
    wrapper.innerHTML = `
      <div class="empty-state" style="padding:40px">
        <div class="empty-state-icon">📭</div>
        <h3>No orders found</h3>
      </div>
    `;
    return;
  }

  wrapper.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Customer</th>
          <th>Device</th>
          <th>Status</th>
          <th>One-Time Fee</th>
          <th>Monthly</th>
          <th>Expires</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(o => `
          <tr>
            <td>${o.customer_email || '—'}</td>
            <td>
              <div style="font-weight:600">${o.model || '—'}</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">${o.order_id || ''}</div>
            </td>
            <td><span class="badge badge-${o.status}">${o.status}</span></td>
            <td>$${((o.one_time_fee_cents||0)/100).toFixed(2)}</td>
            <td>$${((o.monthly_fee_cents||0)/100).toFixed(2)}/mo</td>
            <td class="text-sm text-muted">${formatDate(o.expires_at)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function skeletonTable(rows, cols) {
  return `<table><thead><tr>${Array.from({length:cols},()=>`<th><div class="skeleton" style="height:12px"></div></th>`).join('')}</tr></thead>
  <tbody>${Array.from({length:rows},()=>`<tr>${Array.from({length:cols},()=>`<td><div class="skeleton" style="height:14px"></div></td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
