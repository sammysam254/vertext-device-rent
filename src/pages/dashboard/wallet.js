/**
 * Wallet page — balance, deposit (Paystack + Crypto), transaction history
 */

import { renderDashboardLayout } from './layout.js';
import { getWallet, getTransactions, depositPaystack, depositCrypto } from '../../api.js';
import { toast } from '../../components/toast.js';
import { openModal, closeModal, updateModalBody } from '../../components/modal.js';
import { setButtonLoading } from '../../components/loader.js';

export async function renderWallet() {
  await renderDashboardLayout('wallet', renderWalletContent);
}

async function renderWalletContent(container, user) {
  container.innerHTML = `
    <div class="page-header">
      <h2>💰 Wallet</h2>
      <button class="btn btn-primary" id="open-deposit-btn">+ Deposit Funds</button>
    </div>

    <!-- Balance Card -->
    <div class="wallet-balance-card" id="wallet-balance-section">
      <div class="wallet-balance-label">Available Balance</div>
      <div class="wallet-balance-amount" id="balance-display">
        <span class="spinner-purple" style="display:inline-block;width:24px;height:24px;border:3px solid rgba(124,58,237,0.2);border-top-color:var(--purple);border-radius:50%;animation:spin 0.8s linear infinite"></span>
      </div>
      <div class="wallet-balance-sub">USD · Updates in real-time</div>
    </div>

    <!-- Transaction History -->
    <div style="margin-top:24px">
      <div class="flex-between mb-16">
        <h3 style="font-size:1rem;font-weight:700">Transaction History</h3>
      </div>
      <div class="tx-list" id="tx-list">
        ${skeletonTx()}
      </div>
    </div>
  `;

  document.getElementById('open-deposit-btn')?.addEventListener('click', () => openDepositModal(user));

  // Load data
  try {
    const [wallet, txData] = await Promise.all([getWallet(), getTransactions()]);
    document.getElementById('balance-display').innerHTML = `$${(wallet.balance_cents / 100).toFixed(2)}`;
    renderTransactions(txData || []);
  } catch (err) {
    document.getElementById('balance-display').innerHTML = '$0.00';
    toast.error('Failed to load wallet data.');
    document.getElementById('tx-list').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h3>No transactions yet</h3>
        <p>Deposit funds to get started.</p>
      </div>
    `;
  }
}

function renderTransactions(txs) {
  const list = document.getElementById('tx-list');
  if (!txs.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <h3>No transactions yet</h3>
        <p>Your deposit and purchase history will appear here.</p>
      </div>
    `;
    return;
  }

  const iconMap = { deposit: '↑', purchase: '↓', renewal: '↓' };
  const labelMap = { deposit: 'Deposit', purchase: 'Device Purchase', renewal: 'Monthly Renewal' };

  list.innerHTML = txs.map(tx => `
    <div class="tx-item animate-fade">
      <div class="tx-icon ${tx.type}">
        ${iconMap[tx.type] || '•'}
      </div>
      <div class="tx-info">
        <div class="tx-type">${labelMap[tx.type] || tx.type}</div>
        <div class="tx-date">${formatDateTime(tx.created_at)} · ${tx.provider || ''}</div>
      </div>
      <div>
        <div class="tx-amount ${tx.amount_cents > 0 ? 'positive' : 'negative'}">
          ${tx.amount_cents > 0 ? '+' : ''}$${Math.abs(tx.amount_cents / 100).toFixed(2)}
        </div>
        <div class="tx-balance">Balance: $${(tx.balance_after_cents / 100).toFixed(2)}</div>
      </div>
    </div>
  `).join('');
}

function openDepositModal(user) {
  openModal({
    title: '💰 Deposit Funds',
    body: `
      <p class="text-secondary text-sm" style="margin-bottom:20px">
        Add funds to your wallet to purchase and renew devices.
      </p>
      <div class="deposit-options">
        <div class="deposit-option-card" id="choose-card">
          <div class="deposit-option-icon">💳</div>
          <div class="deposit-option-title">Card Payment</div>
          <div class="deposit-option-desc">Visa, Mastercard via Paystack. Instant credit.</div>
        </div>
        <div class="deposit-option-card" id="choose-crypto">
          <div class="deposit-option-icon">₿</div>
          <div class="deposit-option-title">Crypto (USDT)</div>
          <div class="deposit-option-desc">USDT via TRC-20, ERC-20, BEP-20, Polygon</div>
        </div>
      </div>
    `,
  });

  setTimeout(() => {
    document.getElementById('choose-card')?.addEventListener('click', () => showAmountForm('card', user));
    document.getElementById('choose-crypto')?.addEventListener('click', () => showAmountForm('crypto', user));
  }, 50);
}

function showAmountForm(method, user) {
  const isCard = method === 'card';
  // Default KES rate shown to user (matches server default)
  const KES_RATE = 130;
  updateModalBody(`
    <div style="margin-bottom:16px">
      <button class="btn btn-ghost btn-sm" id="back-deposit-btn">← Back</button>
    </div>
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:2.5rem;margin-bottom:8px">${isCard ? '💳' : '₿'}</div>
      <h3>${isCard ? 'Card Deposit (KES)' : 'Crypto Deposit (USDT)'}</h3>
      ${isCard ? `
        <div class="badge badge-shared" style="margin-top:8px;display:inline-flex">
          Payment charged in Kenya Shillings (KES)
        </div>
      ` : ''}
      ${!isCard ? `
        <div style="margin-top:8px">
          <div class="form-group">
            <label class="form-label">USDT Network</label>
            <select class="form-select" id="crypto-network">
              <option value="usdttrc20">TRC-20 (Tron) — Lowest fees</option>
              <option value="usdtbep20">BEP-20 (BSC)</option>
              <option value="usdterc20">ERC-20 (Ethereum)</option>
              <option value="usdtpolygon">Polygon (MATIC)</option>
            </select>
          </div>
        </div>
      ` : ''}
    </div>
    <div class="form-group">
      <label class="form-label">Amount to deposit (USD)</label>
      <div class="price-input-wrapper">
        <span class="price-input-prefix">$</span>
        <input type="number" class="form-input" id="deposit-amount"
          placeholder="50.00" min="5" step="1" style="padding-left:30px">
      </div>
      <p class="text-xs text-muted" style="margin-top:4px">
        Minimum: $5.00 · Wallet balance shown in USD
        ${isCard ? `<br>Card charged in <strong>KES</strong> (~KES ${KES_RATE} per $1 USD)` : ''}
      </p>
    </div>
    ${isCard ? `
      <div class="stream-info-box" style="margin-bottom:16px;background:rgba(6,182,212,0.05);border-color:rgba(6,182,212,0.2)">
        <p class="text-sm text-secondary">
          🇰🇪 Your card will be charged in <strong>KES</strong> via Paystack.
          The equivalent USD amount is credited to your wallet instantly after payment.
        </p>
      </div>
    ` : `
      <div class="stream-info-box" style="margin-bottom:16px">
        <p class="text-sm text-secondary">You'll be redirected to NOWPayments to pay in USDT.
        Credits are applied after blockchain confirmation (1–3 mins).</p>
      </div>
    `}
    <button class="btn btn-primary btn-full" id="confirm-deposit-btn">
      ${isCard ? '💳 Continue to KES Checkout' : '₿ Generate USDT Invoice'}
    </button>
  `);

  document.getElementById('back-deposit-btn')?.addEventListener('click', () => openDepositModal(user));

  document.getElementById('confirm-deposit-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('confirm-deposit-btn');
    const amountInput = document.getElementById('deposit-amount');
    const amount = parseFloat(amountInput.value);

    if (!amount || amount < 5) {
      toast.error('Minimum deposit is $5.00');
      return;
    }

    const amount_cents = Math.round(amount * 100);
    setButtonLoading(btn, true, 'Processing...');

    try {
      if (isCard) {
        const result = await depositPaystack({ amount_cents, email: user.email });
        window.location.href = result.checkout_url;
      } else {
        const network = document.getElementById('crypto-network').value;
        const result = await depositCrypto({ amount_cents, currency: network });
        window.location.href = result.checkout_url;
      }
    } catch (err) {
      toast.error(err.message);
      setButtonLoading(btn, false, isCard ? '💳 Continue to Checkout' : '₿ Generate Invoice');
    }
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function skeletonTx() {
  return Array.from({ length: 4 }, () => `
    <div class="tx-item">
      <div class="skeleton" style="width:36px;height:36px;border-radius:50%;flex-shrink:0"></div>
      <div style="flex:1">
        <div class="skeleton" style="width:50%;height:13px;margin-bottom:6px"></div>
        <div class="skeleton" style="width:30%;height:10px"></div>
      </div>
      <div>
        <div class="skeleton" style="width:60px;height:14px;margin-bottom:4px"></div>
        <div class="skeleton" style="width:80px;height:10px"></div>
      </div>
    </div>
  `).join('');
}
