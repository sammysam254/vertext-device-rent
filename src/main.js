/**
 * Main app entry — router setup, auth guard, page rendering
 */

import './styles/index.css';
import './styles/auth.css';
import './styles/dashboard.css';
import './styles/admin.css';
import './styles/stream.css';

import { initTheme } from './theme.js';
import { addRoute, beforeEach, initRouter, navigate } from './router.js';
import { supabase } from './supabase.js';

// ---- Init theme ----
initTheme();

// ---- Lazy page imports ----
const pages = {
  landing:        () => import('./pages/landing.js').then(m => m.renderLanding),
  login:          () => import('./pages/auth/login.js').then(m => m.renderLogin),
  signup:         () => import('./pages/auth/signup.js').then(m => m.renderSignup),
  resetPassword:  () => import('./pages/auth/reset-password.js').then(m => m.renderResetPassword),
  store:          () => import('./pages/dashboard/store.js').then(m => m.renderStore),
  myDevices:      () => import('./pages/dashboard/my-devices.js').then(m => m.renderMyDevices),
  stream:         () => import('./pages/dashboard/stream-access.js').then(m => m.renderStreamAccess),
  wallet:         () => import('./pages/dashboard/wallet.js').then(m => m.renderWallet),
  streamView:     (p) => import('./pages/stream/viewer.js').then(m => () => m.renderStreamViewer(p.token)),
  adminHome:      () => import('./pages/admin/overview.js').then(m => m.renderAdminOverview),
  adminUsers:     () => import('./pages/admin/users.js').then(m => m.renderAdminUsers),
  adminDevices:   () => import('./pages/admin/devices.js').then(m => m.renderAdminDevices),
  adminPricing:   () => import('./pages/admin/pricing.js').then(m => m.renderAdminPricing),
  adminOrders:    () => import('./pages/admin/orders.js').then(m => m.renderAdminOrders),
};

// ---- Auth guard ----
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/stream', '/reset-password'];

beforeEach(async (path) => {
  const { data: { session } } = await supabase.auth.getSession();

  const isPublic = PUBLIC_ROUTES.some(r => path === r || path.startsWith('/stream') || path.startsWith('/reset-password'));
  if (!session && !isPublic) {
    navigate('/login');
    return false;
  }
  return true;
});

// Listen for Supabase password recovery event from email link
supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') {
    navigate('/reset-password');
  }
});

// ---- Routes ----
addRoute('/', async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    navigate('/dashboard/store');
  } else {
    const render = await pages.landing();
    render();
  }
});

addRoute('/login', async () => {
  const render = await pages.login();
  render();
});

addRoute('/signup', async () => {
  const render = await pages.signup();
  render();
});

addRoute('/reset-password', async () => {
  const render = await pages.resetPassword();
  render();
});

addRoute('/dashboard/store', async () => {
  const render = await pages.store();
  render();
});

addRoute('/dashboard/devices', async () => {
  const render = await pages.myDevices();
  render();
});

addRoute('/dashboard/stream', async () => {
  const render = await pages.stream();
  render();
});

addRoute('/dashboard/wallet', async () => {
  const render = await pages.wallet();
  render();
});

addRoute('/stream', async () => {
  // Stream entry — no token in URL
  const render = await pages.streamView({});
  render();
});

addRoute('/stream/:token', async (params) => {
  const render = await pages.streamView(params);
  render();
});

addRoute('/admin', async () => {
  const render = await pages.adminHome();
  render();
});

addRoute('/admin/users', async () => {
  const render = await pages.adminUsers();
  render();
});

addRoute('/admin/devices', async () => {
  const render = await pages.adminDevices();
  render();
});

addRoute('/admin/pricing', async () => {
  const render = await pages.adminPricing();
  render();
});

addRoute('/admin/orders', async () => {
  const render = await pages.adminOrders();
  render();
});

// 404 fallback
addRoute('*', async () => {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:40px">
      <div>
        <div style="font-size:4rem;margin-bottom:16px">404</div>
        <h2 style="margin-bottom:8px">Page not found</h2>
        <p style="color:var(--text-secondary);margin-bottom:24px">The page you're looking for doesn't exist.</p>
        <button class="btn btn-primary" onclick="navigate('/')">Go Home</button>
      </div>
    </div>
  `;
});

// ---- Handle Paystack callback (topup=success in URL) ----
window.addEventListener('load', () => {
  const url = new URL(window.location.href);
  if (url.searchParams.get('topup') === 'success') {
    import('./components/toast.js').then(({ toast }) => {
      toast.success('💰 Deposit successful! Your wallet has been credited.');
    });
  }
});

// ---- Start router ----
initRouter();
