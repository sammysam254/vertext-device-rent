/**
 * Dashboard layout — sidebar + topbar shell
 */

import { supabase, signOut } from '../../supabase.js';
import { navigate } from '../../router.js';
import { toggleTheme, getTheme } from '../../theme.js';
import { toast } from '../../components/toast.js';

let currentUser = null;
let currentProfile = null;
let walletBalance = 0;

const navItems = [
  { icon: '🏪', label: 'Device Store', route: '/dashboard/store', id: 'store' },
  { icon: '📱', label: 'My Devices', route: '/dashboard/devices', id: 'devices' },
  { icon: '▶️', label: 'Stream Access', route: '/dashboard/stream', id: 'stream' },
  { icon: '💰', label: 'Wallet', route: '/dashboard/wallet', id: 'wallet' },
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
                <span class="link-icon">${item.icon}</span>
                <span>${item.label}</span>
              </a>
            `).join('')}
          </div>
        </nav>
        <div class="sidebar-user">
          <div class="sidebar-user-avatar">${initials}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${currentProfile.full_name || 'User'}</div>
            <div class="sidebar-user-email">${currentProfile.email || user.phone || ''}</div>
          </div>
          <button class="sidebar-logout-btn" id="logout-btn" title="Sign out">⟵</button>
        </div>
      </aside>

      <!-- Overlay -->
      <div class="sidebar-overlay" id="sidebar-overlay"></div>

      <!-- Main -->
      <main class="dashboard-main">
        <div class="topbar">
          <div class="topbar-left">
            <button class="hamburger-btn" id="hamburger-btn">
              <span></span><span></span><span></span>
            </button>
            <span class="topbar-page-title">${pageTitles[activeId] || 'Dashboard'}</span>
          </div>
          <div class="topbar-right">
            <div class="topbar-wallet" id="topbar-wallet-btn" title="View wallet">
              💰 <span>$${(walletBalance / 100).toFixed(2)}</span>
            </div>
            <button class="theme-toggle" id="dash-theme-btn" title="Toggle theme">
              ${theme === 'dark' ? '☀️' : '🌙'}
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
  // Hamburger
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

  // Wallet pill → wallet page
  document.getElementById('topbar-wallet-btn')?.addEventListener('click', () => navigate('/dashboard/wallet'));

  // Theme toggle
  document.getElementById('dash-theme-btn')?.addEventListener('click', () => {
    const t = toggleTheme();
    document.getElementById('dash-theme-btn').textContent = t === 'dark' ? '☀️' : '🌙';
  });

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    try {
      await signOut();
      toast.success('Signed out.');
      navigate('/');
    } catch {
      toast.error('Sign out failed.');
    }
  });
}

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';
}
