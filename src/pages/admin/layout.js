/**
 * Admin layout shell
 */

import { supabase, signOut } from '../../supabase.js';
import { navigate } from '../../router.js';
import { toggleTheme, getTheme } from '../../theme.js';
import { toast } from '../../components/toast.js';

const ADMIN_EMAIL = 'sammyseth260@gmail.com';

const adminNavItems = [
  { icon: '📊', label: 'Overview', route: '/admin', id: 'overview' },
  { icon: '👥', label: 'Users', route: '/admin/users', id: 'users' },
  { icon: '📱', label: 'Devices & Streams', route: '/admin/devices', id: 'devices' },
  { icon: '💵', label: 'Pricing', route: '/admin/pricing', id: 'pricing' },
  { icon: '📋', label: 'Orders', route: '/admin/orders', id: 'orders' },
];

export async function renderAdminLayout(activeId, contentRenderer) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { navigate('/login'); return; }

  // Verify admin
  const email = user.email || '';
  if (email !== ADMIN_EMAIL) {
    navigate('/dashboard/store');
    toast.error('Admin access only.');
    return;
  }

  const theme = getTheme();
  const app = document.getElementById('app');
  const pageTitles = { overview: 'Admin Overview', users: 'User Management', devices: 'Devices & Streams', pricing: 'Pricing Settings', orders: 'All Orders' };

  app.innerHTML = `
    <div class="admin-layout">
      <!-- Admin Sidebar -->
      <aside class="admin-sidebar sidebar" id="admin-sidebar">
        <div class="sidebar-logo">
          <span class="sidebar-logo-text">Vertext Admin</span>
          <div class="admin-badge">⚡ Admin Panel</div>
        </div>
        <nav class="sidebar-nav">
          <div class="sidebar-section">
            <div class="sidebar-section-label">Admin Controls</div>
            ${adminNavItems.map(item => `
              <a class="sidebar-link ${activeId === item.id ? 'active' : ''}"
                 data-route="${item.route}" id="admin-nav-${item.id}">
                <span class="link-icon">${item.icon}</span>
                <span>${item.label}</span>
              </a>
            `).join('')}
          </div>
          <div class="sidebar-section" style="margin-top:16px">
            <div class="sidebar-section-label">Customer View</div>
            <a class="sidebar-link" data-route="/dashboard/store">
              <span class="link-icon">👤</span>
              <span>Customer Dashboard</span>
            </a>
          </div>
        </nav>
        <div class="sidebar-user">
          <div class="sidebar-user-avatar" style="background:linear-gradient(135deg,#ef4444,#dc2626)">A</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">Admin</div>
            <div class="sidebar-user-email">${ADMIN_EMAIL}</div>
          </div>
          <button class="sidebar-logout-btn" id="admin-logout-btn" title="Sign out">⟵</button>
        </div>
      </aside>

      <!-- Overlay -->
      <div class="sidebar-overlay" id="admin-overlay"></div>

      <!-- Admin Main -->
      <main class="admin-main">
        <div class="topbar">
          <div class="topbar-left">
            <button class="hamburger-btn" id="admin-hamburger">
              <span></span><span></span><span></span>
            </button>
            <span class="topbar-page-title">${pageTitles[activeId] || 'Admin'}</span>
          </div>
          <div class="topbar-right">
            <span class="badge" style="background:rgba(239,68,68,0.15);color:#f87171;padding:6px 12px">⚡ Admin</span>
            <button class="theme-toggle" id="admin-theme-btn" title="Toggle theme">
              ${theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        <div class="admin-content" id="admin-content">
          <!-- Rendered by each page -->
        </div>
      </main>
    </div>
  `;

  attachAdminLayoutListeners();
  const content = document.getElementById('admin-content');
  contentRenderer(content, user);
}

function attachAdminLayoutListeners() {
  const hamburger = document.getElementById('admin-hamburger');
  const sidebar = document.getElementById('admin-sidebar');
  const overlay = document.getElementById('admin-overlay');

  hamburger?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('visible');
  });

  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  });

  document.querySelectorAll('.sidebar-link[data-route]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.route);
      sidebar.classList.remove('open');
      overlay.classList.remove('visible');
    });
  });

  document.getElementById('admin-theme-btn')?.addEventListener('click', () => {
    const t = toggleTheme();
    document.getElementById('admin-theme-btn').textContent = t === 'dark' ? '☀️' : '🌙';
  });

  document.getElementById('admin-logout-btn')?.addEventListener('click', async () => {
    await signOut();
    navigate('/');
  });
}
