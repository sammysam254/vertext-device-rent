/**
 * Dashboard layout — sidebar + topbar shell
 * Features clean SVG icons, 1-click Admin Dashboard switcher, and mobile Sign Out buttons.
 */

import { supabase, signOut } from '../../supabase.js';
import { navigate } from '../../router.js';
import { toggleTheme, getTheme } from '../../theme.js';
import { toast } from '../../components/toast.js';

let currentUser = null;
let currentProfile = null;
let walletBalance = 0;

const navItems = [
  {
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
    label: 'Device Store',
    route: '/dashboard/store',
    id: 'store'
  },
  {
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>`,
    label: 'My Devices',
    route: '/dashboard/devices',
    id: 'devices'
  },
  {
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
    label: 'Stream Access',
    route: '/dashboard/stream',
    id: 'stream'
  },
  {
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>`,
    label: 'Wallet',
    route: '/dashboard/wallet',
    id: 'wallet'
  },
];

export async function renderDashboardLayout(activeId, contentRenderer) {
  const app = document.getElementById('app');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { navigate('/login'); return; }
  currentUser = user;

  // Load profile and wallet
  const [profileRes, walletRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('wallets').select('balance_cents').eq('user_id', user.id).single(),
  ]);

  currentProfile = profileRes.data || { full_name: user.email, email: user.email };
  walletBalance = walletRes.data?.balance_cents || 0;

  const isAdmin = currentProfile.role === 'admin' || user.email === 'sammyseth260@gmail.com';
  const initials = getInitials(currentProfile.full_name || currentProfile.email);
  const theme = getTheme();
  const pageTitles = { store: 'Device Store', devices: 'My Devices', stream: 'Stream Access', wallet: 'Wallet' };

  app.innerHTML = `
    <div class="dashboard-layout">
      <!-- Sidebar -->
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-logo">
          <span class="sidebar-logo-text">Vertext Devices</span>
          <span class="sidebar-logo-sub">Cloud Device Platform</span>
        </div>

        <nav class="sidebar-nav">
          <div class="sidebar-section">
            <div class="sidebar-section-label">Navigation</div>
            ${navItems.map(item => `
              <a class="sidebar-link ${activeId === item.id ? 'active' : ''}"
                 data-route="${item.route}" id="nav-${item.id}">
                <span class="link-icon" style="display:flex;align-items:center;justify-content:center">${item.icon}</span>
                <span>${item.label}</span>
              </a>
            `).join('')}
          </div>

          ${isAdmin ? `
            <div class="sidebar-section" style="margin-top:16px">
              <div class="sidebar-section-label">Admin Mode</div>
              <a class="sidebar-link" id="sidebar-switch-admin" data-route="/admin" style="background:rgba(124,58,237,0.12);color:var(--purple-light);font-weight:700">
                <span class="link-icon">👑</span>
                <span>Admin Dashboard</span>
              </a>
            </div>
          ` : ''}
        </nav>

        <div class="sidebar-user-wrapper" style="padding:16px">
          <div class="sidebar-user">
            <div class="sidebar-user-avatar">${initials}</div>
            <div class="sidebar-user-info">
              <div class="sidebar-user-name">${currentProfile.full_name || 'User'}</div>
              <div class="sidebar-user-email">${currentProfile.email || user.phone || ''}</div>
            </div>
            <button class="sidebar-logout-btn" id="logout-btn" title="Sign out">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </button>
          </div>
          <!-- Explicit Full Sign Out Button for Mobile Sidebar -->
          <button class="btn btn-secondary btn-full sidebar-signout-full" id="sidebar-signout-full-btn" style="margin-top:12px;font-weight:600;font-size:0.85rem">
            🚪 Sign Out
          </button>
        </div>
      </aside>

      <!-- Overlay -->
      <div class="sidebar-overlay" id="sidebar-overlay"></div>

      <!-- Main -->
      <main class="dashboard-main">
        <div class="topbar">
          <div class="topbar-left">
            <button class="hamburger-btn" id="hamburger-btn" aria-label="Toggle Navigation">
              <span></span><span></span><span></span>
            </button>
            <span class="topbar-page-title">${pageTitles[activeId] || 'Dashboard'}</span>
          </div>
          <div class="topbar-right" style="display:flex;align-items:center;gap:8px">
            ${isAdmin ? `
              <button class="btn btn-sm topbar-admin-switch" id="topbar-switch-admin" style="background:var(--purple);color:#fff;font-weight:700;padding:6px 12px;font-size:0.8rem">
                👑 Admin Panel
              </button>
            ` : ''}

            <div class="topbar-wallet" id="topbar-wallet-btn" title="View wallet">
              <span style="font-weight:700">$${(walletBalance / 100).toFixed(2)}</span>
            </div>

            <button class="theme-toggle" id="dash-theme-btn" title="Toggle theme">
              ${theme === 'dark' ? '☀️' : '🌙'}
            </button>

            <!-- Topbar Mobile Sign Out Button -->
            <button class="btn btn-ghost btn-sm topbar-signout-btn" id="topbar-signout-btn" style="padding:4px 10px;font-size:0.8rem;border:1px solid var(--border)">
              Sign Out
            </button>
          </div>
        </div>

        <div class="dashboard-content" id="dashboard-content">
          <!-- Content rendered here -->
        </div>
      </main>
    </div>
  `;

  attachLayoutListeners();

  // Render page content
  const content = document.getElementById('dashboard-content');
  contentRenderer(content, currentUser, currentProfile, walletBalance);
}

function attachLayoutListeners() {
  const hamburger = document.getElementById('hamburger-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  hamburger?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('visible');
  });

  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  });

  // Nav links
  document.querySelectorAll('.sidebar-link[data-route]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.route);
      sidebar.classList.remove('open');
      overlay.classList.remove('visible');
    });
  });

  // 1-Click Admin Dashboard Switcher
  document.getElementById('topbar-switch-admin')?.addEventListener('click', () => navigate('/admin'));
  document.getElementById('sidebar-switch-admin')?.addEventListener('click', () => navigate('/admin'));

  // Wallet pill → wallet page
  document.getElementById('topbar-wallet-btn')?.addEventListener('click', () => navigate('/dashboard/wallet'));

  // Theme toggle
  document.getElementById('dash-theme-btn')?.addEventListener('click', () => {
    const t = toggleTheme();
    document.getElementById('dash-theme-btn').textContent = t === 'dark' ? '☀️' : '🌙';
  });

  // Sign out handlers
  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Signed out.');
      navigate('/');
    } catch {
      toast.error('Sign out failed.');
    }
  };

  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
  document.getElementById('topbar-signout-btn')?.addEventListener('click', handleLogout);
  document.getElementById('sidebar-signout-full-btn')?.addEventListener('click', handleLogout);
}

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';
}
