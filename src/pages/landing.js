/**
 * Landing page
 */

import { navigate } from '../router.js';
import { getTheme, toggleTheme } from '../theme.js';

export function renderLanding() {
  const app = document.getElementById('app');
  const theme = getTheme();

  app.innerHTML = `
    <div class="landing-root">
      <!-- Navbar -->
      <nav class="landing-nav" id="landing-nav">
        <div class="landing-nav-inner">
          <div class="landing-brand">
            <span class="landing-logo">Vertext</span>
            <span class="landing-logo-dot" style="color:var(--cyan)">Devices</span>
          </div>
          <div class="landing-nav-links">
            <a href="#features" class="landing-nav-link">Features</a>
            <a href="#pricing-section" class="landing-nav-link">Pricing</a>
            <button class="theme-toggle" id="landing-theme-btn" title="Toggle theme">
              ${theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button class="btn btn-ghost btn-sm" id="landing-login-btn">Sign In</button>
            <button class="btn btn-primary btn-sm" id="landing-signup-btn">Get Started</button>
          </div>
          <div class="landing-nav-mobile">
            <button class="theme-toggle" id="landing-theme-btn-m" title="Toggle theme">
              ${theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button class="btn btn-primary btn-sm" id="landing-signup-btn-m">Get Started</button>
          </div>
        </div>
      </nav>

      <!-- Hero -->
      <section class="landing-hero">
        <div class="hero-orb hero-orb-1"></div>
        <div class="hero-orb hero-orb-2"></div>
        <div class="hero-orb hero-orb-3"></div>
        <div class="hero-content">
          <div class="hero-badge">
            <span class="hero-badge-dot"></span>
            Phone Rental Made Simple
          </div>
          <h1 class="hero-title">
            Access Premium<br>
            <span class="gradient-text">Cloud Devices</span><br>
            Instantly
          </h1>
          <p class="hero-subtitle">
            Rent iOS and Android devices in the cloud. Stream from anywhere, no hardware needed.
            Pay as you go with flexible monthly plans.
          </p>
          <div class="hero-cta">
            <button class="btn btn-primary btn-lg" id="hero-cta-btn">
              🚀 Start Streaming
            </button>
            <button class="btn btn-ghost btn-lg" id="hero-login-btn">
              Sign In →
            </button>
          </div>
          <div class="hero-stats">
            <div class="hero-stat">
              <span class="hero-stat-value gradient-text">100+</span>
              <span class="hero-stat-label">Devices Available</span>
            </div>
            <div class="hero-stat-divider"></div>
            <div class="hero-stat">
              <span class="hero-stat-value gradient-text">99.9%</span>
              <span class="hero-stat-label">Uptime</span>
            </div>
            <div class="hero-stat-divider"></div>
            <div class="hero-stat">
              <span class="hero-stat-value gradient-text">24/7</span>
              <span class="hero-stat-label">Support</span>
            </div>
          </div>
        </div>

        <!-- Floating device preview cards -->
        <div class="hero-devices">
          <div class="hero-device-card animate-up" style="animation-delay: 0.1s">
            <div class="hero-device-icon">📱</div>
            <div class="hero-device-info">
              <div class="hero-device-model">iPhone 15 Pro</div>
              <div class="hero-device-badge active">● Live</div>
            </div>
            <div class="hero-device-token">
              <span class="text-xs text-muted">Access Token</span>
              <span class="font-mono font-bold" style="color:var(--purple-light)">487392</span>
            </div>
          </div>
          <div class="hero-device-card animate-up" style="animation-delay: 0.2s">
            <div class="hero-device-icon">🤖</div>
            <div class="hero-device-info">
              <div class="hero-device-model">Pixel 8 Pro</div>
              <div class="hero-device-badge active">● Live</div>
            </div>
            <div class="hero-device-token">
              <span class="text-xs text-muted">Access Token</span>
              <span class="font-mono font-bold" style="color:var(--cyan-light)">829104</span>
            </div>
          </div>
          <div class="hero-device-card animate-up" style="animation-delay: 0.3s">
            <div class="hero-device-icon">📱</div>
            <div class="hero-device-info">
              <div class="hero-device-model">iPhone 14</div>
              <div class="hero-device-badge active">● Live</div>
            </div>
            <div class="hero-device-token">
              <span class="text-xs text-muted">Access Token</span>
              <span class="font-mono font-bold" style="color:var(--emerald)">651038</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Features -->
      <section class="landing-section" id="features">
        <div class="section-label">Why Vertext Devices</div>
        <h2 class="section-title">Everything you need to<br><span class="gradient-text">stream & manage</span></h2>
        <div class="features-grid">
          ${[
            { icon: '🔐', title: 'Secure Token Access', desc: 'Each device gets a unique 6-digit access token. Your stream link stays private — users only see your branded URL.' },
            { icon: '⚡', title: 'Instant Activation', desc: 'Purchase a device and start streaming in seconds. Automatic provisioning with CellGods cloud infrastructure.' },
            { icon: '💰', title: 'Flexible Payments', desc: 'Top up your wallet with card (Paystack) or crypto (USDT via multiple networks). Monthly or one-time billing.' },
            { icon: '🌐', title: 'Any Device, Any Platform', desc: 'iOS and Android devices available. Stream remotely from any browser — no app installation required.' },
            { icon: '📊', title: 'Real-Time Dashboard', desc: 'Monitor your active devices, wallet balance, and transaction history from a single clean interface.' },
            { icon: '🛡️', title: 'Privacy First', desc: 'Your actual device stream URL is never exposed. All access goes through our secure branded redirect.' },
          ].map(f => `
            <div class="feature-card glass-card">
              <div class="feature-icon">${f.icon}</div>
              <h3 class="feature-title">${f.title}</h3>
              <p class="feature-desc">${f.desc}</p>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- How it works -->
      <section class="landing-section landing-section-alt">
        <div class="section-label">Simple Process</div>
        <h2 class="section-title">Up and running in <span class="gradient-text">3 steps</span></h2>
        <div class="steps-grid">
          ${[
            { step: '01', icon: '💳', title: 'Deposit Funds', desc: 'Add credits to your wallet via card or crypto. Instantly available.' },
            { step: '02', icon: '📱', title: 'Pick a Device', desc: 'Browse our device store. Choose iOS or Android at flexible pricing.' },
            { step: '03', icon: '▶️', title: 'Start Streaming', desc: 'Get your 6-digit access token and stream through our secure branded link.' },
          ].map(s => `
            <div class="step-card">
              <div class="step-number">${s.step}</div>
              <div class="step-icon">${s.icon}</div>
              <h3 class="step-title">${s.title}</h3>
              <p class="step-desc">${s.desc}</p>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- CTA Section -->
      <section class="landing-cta-section">
        <div class="landing-cta-box">
          <div class="cta-orb"></div>
          <h2 class="cta-title">Ready to start streaming?</h2>
          <p class="cta-sub">Join thousands of users accessing premium cloud devices today.</p>
          <button class="btn btn-primary btn-lg" id="cta-bottom-btn">
            Create Free Account →
          </button>
        </div>
      </section>

      <!-- Footer -->
      <footer class="landing-footer">
        <div class="footer-inner">
          <div class="footer-brand">
            <span class="landing-logo" style="font-size:1.2rem">Vertext</span>
            <span style="color:var(--cyan)">Devices</span>
          </div>
          <p class="footer-copy">© 2025 Vertext Devices. All rights reserved.</p>
          <div class="footer-links">
            <a href="#/login" class="footer-link">Sign In</a>
            <a href="#/signup" class="footer-link">Sign Up</a>
          </div>
        </div>
      </footer>
    </div>
  `;

  injectLandingStyles();
  attachLandingListeners();
}

function attachLandingListeners() {
  const signupBtns = ['landing-signup-btn', 'landing-signup-btn-m', 'hero-cta-btn', 'cta-bottom-btn'];
  signupBtns.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => navigate('/signup'));
  });

  ['landing-login-btn', 'hero-login-btn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => navigate('/login'));
  });

  ['landing-theme-btn', 'landing-theme-btn-m'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => {
      const t = toggleTheme();
      document.querySelectorAll('#landing-theme-btn, #landing-theme-btn-m').forEach(b => {
        b.textContent = t === 'dark' ? '☀️' : '🌙';
      });
    });
  });

  // Navbar scroll effect
  const nav = document.getElementById('landing-nav');
  window.addEventListener('scroll', () => {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

function injectLandingStyles() {
  if (document.getElementById('landing-styles')) return;
  const style = document.createElement('style');
  style.id = 'landing-styles';
  style.textContent = `
    .landing-root { min-height: 100vh; overflow-x: hidden; }

    /* Nav */
    .landing-nav {
      position: fixed; top: 0; left: 0; right: 0;
      z-index: var(--z-navbar);
      transition: var(--transition-slow);
      padding: 0 24px;
    }
    .landing-nav.scrolled {
      background: var(--bg-sidebar);
      border-bottom: 1px solid var(--border);
      backdrop-filter: blur(20px);
    }
    .landing-nav-inner {
      max-width: 1200px;
      margin: 0 auto;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .landing-brand { display: flex; align-items: baseline; gap: 2px; }
    .landing-logo {
      font-size: 1.4rem; font-weight: 900;
      background: var(--grad-primary);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text; letter-spacing: -0.02em;
    }
    .landing-nav-links {
      display: none;
      align-items: center;
      gap: 16px;
    }
    .landing-nav-link {
      font-size: 0.875rem; font-weight: 500;
      color: var(--text-secondary);
      text-decoration: none;
      transition: var(--transition);
    }
    .landing-nav-link:hover { color: var(--text-primary); }
    .landing-nav-mobile { display: flex; align-items: center; gap: 10px; }
    @media (min-width: 768px) {
      .landing-nav-links { display: flex; }
      .landing-nav-mobile { display: none; }
    }

    /* Hero */
    .landing-hero {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 100px 40px 60px;
      max-width: 1200px;
      margin: 0 auto;
      gap: 60px;
      position: relative;
    }
    .hero-orb {
      position: fixed;
      border-radius: 50%;
      pointer-events: none;
      filter: blur(60px);
    }
    .hero-orb-1 {
      width: 500px; height: 500px;
      top: -100px; right: -100px;
      background: radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%);
      animation: float 10s ease-in-out infinite;
    }
    .hero-orb-2 {
      width: 400px; height: 400px;
      bottom: -100px; left: -100px;
      background: radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%);
      animation: float 12s ease-in-out infinite reverse;
    }
    .hero-orb-3 {
      width: 300px; height: 300px;
      top: 40%; left: 40%;
      background: radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%);
      animation: float 8s ease-in-out infinite;
    }
    .hero-content { flex: 1; max-width: 580px; animation: fadeInUp 0.6s ease; }
    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: rgba(124,58,237,0.1);
      border: 1px solid rgba(124,58,237,0.25);
      border-radius: var(--radius-full);
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--purple-light);
      margin-bottom: 24px;
    }
    .hero-badge-dot {
      width: 6px; height: 6px;
      background: var(--purple-light);
      border-radius: 50%;
      animation: pulse-glow 2s ease infinite;
    }
    .hero-title {
      font-size: clamp(2.5rem, 6vw, 4rem);
      font-weight: 900;
      line-height: 1.1;
      margin-bottom: 20px;
      letter-spacing: -0.03em;
    }
    .hero-subtitle {
      font-size: 1.05rem;
      color: var(--text-secondary);
      line-height: 1.7;
      margin-bottom: 32px;
      max-width: 480px;
    }
    .hero-cta { display: flex; gap: 14px; margin-bottom: 40px; flex-wrap: wrap; }
    .hero-stats {
      display: flex;
      align-items: center;
      gap: 24px;
      flex-wrap: wrap;
    }
    .hero-stat { text-align: center; }
    .hero-stat-value { display: block; font-size: 1.8rem; font-weight: 800; letter-spacing: -0.03em; }
    .hero-stat-label { display: block; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 2px; }
    .hero-stat-divider { width: 1px; height: 40px; background: var(--border); }

    /* Device preview cards */
    .hero-devices {
      display: flex;
      flex-direction: column;
      gap: 14px;
      flex-shrink: 0;
      animation: slideInLeft 0.6s ease;
    }
    .hero-device-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 14px;
      backdrop-filter: blur(12px);
      min-width: 280px;
      transition: var(--transition-slow);
    }
    .hero-device-card:hover {
      border-color: var(--border-accent);
      box-shadow: var(--shadow-glow);
      transform: translateX(-4px);
    }
    .hero-device-icon { font-size: 1.8rem; }
    .hero-device-info { flex: 1; }
    .hero-device-model { font-size: 0.9rem; font-weight: 700; color: var(--text-primary); }
    .hero-device-badge { font-size: 0.7rem; color: var(--emerald); margin-top: 3px; font-weight: 600; }
    .hero-device-token { text-align: right; display: flex; flex-direction: column; gap: 2px; align-items: flex-end; }

    /* Sections */
    .landing-section {
      padding: 100px 40px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .landing-section-alt {
      background: none;
    }
    .section-label {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--purple-light);
      margin-bottom: 12px;
    }
    .section-title {
      font-size: clamp(1.8rem, 4vw, 2.8rem);
      font-weight: 800;
      margin-bottom: 48px;
      letter-spacing: -0.02em;
    }

    /* Features grid */
    .features-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    .feature-card { padding: 28px; }
    .feature-icon { font-size: 2rem; margin-bottom: 14px; }
    .feature-title { font-size: 1rem; font-weight: 700; margin-bottom: 8px; }
    .feature-desc { font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; }

    /* Steps */
    .steps-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 30px;
      position: relative;
    }
    .step-card {
      text-align: center;
      padding: 30px 20px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      position: relative;
    }
    .step-number {
      font-size: 0.7rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: var(--text-muted);
      margin-bottom: 16px;
    }
    .step-icon { font-size: 2.5rem; margin-bottom: 14px; }
    .step-title { font-size: 1.05rem; font-weight: 700; margin-bottom: 8px; }
    .step-desc { font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; }

    /* CTA section */
    .landing-cta-section { padding: 60px 40px 100px; }
    .landing-cta-box {
      max-width: 640px;
      margin: 0 auto;
      text-align: center;
      background: linear-gradient(135deg, rgba(124,58,237,0.12), rgba(6,182,212,0.08));
      border: 1px solid rgba(124,58,237,0.2);
      border-radius: var(--radius-xl);
      padding: 60px 40px;
      position: relative;
      overflow: hidden;
    }
    .cta-orb {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%,-50%);
      width: 400px; height: 400px;
      background: radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%);
      pointer-events: none;
    }
    .cta-title {
      font-size: clamp(1.8rem, 4vw, 2.4rem);
      font-weight: 800;
      margin-bottom: 12px;
      position: relative;
      letter-spacing: -0.02em;
    }
    .cta-sub {
      font-size: 1rem;
      color: var(--text-secondary);
      margin-bottom: 28px;
      position: relative;
    }
    #cta-bottom-btn { position: relative; }

    /* Footer */
    .landing-footer {
      border-top: 1px solid var(--border);
      padding: 30px 40px;
    }
    .footer-inner {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
    }
    .footer-brand { display: flex; gap: 3px; align-items: baseline; }
    .footer-copy { font-size: 0.8rem; color: var(--text-muted); }
    .footer-links { display: flex; gap: 20px; }
    .footer-link { font-size: 0.8rem; color: var(--text-secondary); text-decoration: none; }
    .footer-link:hover { color: var(--text-accent); }

    @media (max-width: 768px) {
      .landing-hero { flex-direction: column; text-align: center; padding: 100px 20px 60px; }
      .hero-content { max-width: 100%; }
      .hero-cta { justify-content: center; }
      .hero-stats { justify-content: center; }
      .hero-devices { display: none; }
      .features-grid, .steps-grid { grid-template-columns: 1fr; }
      .landing-section { padding: 60px 20px; }
      .landing-cta-box { padding: 40px 24px; }
    }
    @media (min-width: 769px) and (max-width: 1024px) {
      .features-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `;
  document.head.appendChild(style);
}
