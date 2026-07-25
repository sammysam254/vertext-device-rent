/**
 * Wallet page — balance, deposit (Card + Crypto), transaction history
 * Clean, professional UI without emoji clutter.
 * White-labeled: Paystack Card deposits open in-website via PaystackPop Inline Overlay.
 * Crypto deposits open in-website via Native Crypto Deposit Modal with QR code & copy buttons.
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
  if (window.location.href.includes('topup=success')) {
    toast.success('Deposit successful! Your wallet balance has been updated.');
    window.history.replaceState({}, document.title, window.location.pathname + '#/dashboard/wallet');
  }

  container.innerHTML = `
    <div class="page-header">
      <h2>Wallet</h2>
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
        <button class="btn btn-ghost btn-sm" id="refresh-wallet-btn" title="Refresh balance & transactions">Refresh</button>
      </div>
      <div class="tx-list" id="tx-list">
        ${skeletonTx()}
      </div>
    </div>
  `;

  document.getElementById('open-deposit-btn')?.addEventListener('click', () => openDepositModal(user));
  document.getElementById('refresh-wallet-btn')?.addEventListener('click', () => loadWalletData());

  await loadWalletData();
}

async function loadWalletData() {
  try {
    const [wallet, txData] = await Promise.all([getWallet(), getTransactions()]);
    const balanceEl = document.getElementById('balance-display');
    if (balanceEl) balanceEl.innerHTML = `$${(wallet.balance_cents / 100).toFixed(2)}`;
    renderTransactions(txData || []);
  } catch (err) {
    const balanceEl = document.getElementById('balance-display');
    if (balanceEl) balanceEl.innerHTML = '$0.00';
    toast.error('Failed to load wallet data.');
    const txList = document.getElementById('tx-list');
    if (txList) {
      txList.innerHTML = `
        <div class="empty-state">
          <h3>No transactions yet</h3>
          <p>Deposit funds to get started.</p>
        </div>
      `;
    }
  }
}

function renderTransactions(txs) {
  const list = document.getElementById('tx-list');
  if (!list) return;

  if (!txs.length) {
    list.innerHTML = `
      <div class="empty-state">
        <h3>No transactions yet</h3>
        <p>Your deposit and purchase history will appear here.</p>
      </div>
    `;
    return;
  }

  const iconMap = { deposit: '↑', purchase: '↓', renewal: '↓' };
  const labelMap = { deposit: 'Deposit', purchase: 'Device Purchase', renewal: 'Monthly Renewal' };
  const statusBadgeMap = {
    completed: `<span class="badge badge-active" style="font-size:0.7rem;padding:2px 8px">Success</span>`,
    pending: `<span class="badge badge-shared" style="font-size:0.7rem;padding:2px 8px;background:rgba(245,158,11,0.15);color:var(--amber);border-color:rgba(245,158,11,0.3)">Pending</span>`,
    failed: `<span class="badge badge-cancelled" style="font-size:0.7rem;padding:2px 8px">Failed</span>`,
  };

  list.innerHTML = txs.map(tx => {
    const statusKey = tx.status || (tx.balance_after_cents > 0 ? 'completed' : 'pending');
    const badgeHtml = statusBadgeMap[statusKey] || statusBadgeMap.pending;

    return `
      <div class="tx-item animate-fade">
        <div class="tx-icon ${tx.type}">
          ${iconMap[tx.type] || '•'}
        </div>
        <div class="tx-info" style="flex:1">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="tx-type">${labelMap[tx.type] || tx.type}</span>
            ${badgeHtml}
          </div>
          <div class="tx-date">${formatDateTime(tx.created_at)}</div>
        </div>
        <div style="text-align:right">
          <div class="tx-amount ${tx.amount_cents > 0 ? 'positive' : 'negative'}">
            ${tx.amount_cents > 0 ? '+' : ''}$${Math.abs(tx.amount_cents / 100).toFixed(2)}
          </div>
          <div class="tx-balance">Balance: $${(tx.balance_after_cents / 100).toFixed(2)}</div>
        </div>
      </div>
    `;
  }).join('');
}

function openDepositModal(user) {
  openModal({
    title: 'Deposit Funds',
    body: `
      <p class="text-secondary text-sm" style="margin-bottom:20px">
        Add funds to your wallet to purchase and renew devices.
      </p>
      <div class="deposit-options">
        <div class="deposit-option-card" id="choose-card">
          <div class="deposit-option-title" style="font-weight:700;font-size:1.05rem;margin-bottom:4px">Card Payment</div>
          <div class="deposit-option-desc">Visa, Mastercard & American Express. Instant credit.</div>
        </div>
        <div class="deposit-option-card" id="choose-crypto">
          <div class="deposit-option-title" style="font-weight:700;font-size:1.05rem;margin-bottom:4px">Crypto (USDT)</div>
          <div class="deposit-option-desc">USDT via TRC-20, BEP-20, ERC-20, Polygon, Solana</div>
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

  updateModalBody(`
    <div style="margin-bottom:16px">
      <button class="btn btn-ghost btn-sm" id="back-deposit-btn">← Back</button>
    </div>
    <div style="text-align:center;margin-bottom:20px">
      <h3 style="font-size:1.3rem;font-weight:700">${isCard ? 'Card Payment' : 'Crypto Deposit (USDT)'}</h3>
      ${isCard ? `
        <div class="badge badge-shared" style="margin-top:8px;display:inline-flex">
          Visa & Mastercard Card Payment
        </div>
      ` : ''}
      ${!isCard ? `
        <div style="margin-top:8px">
          <div class="form-group">
            <label class="form-label">Select USDT Network</label>
            <select class="form-select" id="crypto-network">
              <option value="usdttrc20">TRC-20 (Tron) — Recommended (Fastest & Lowest Fees)</option>
              <option value="usdtbsc">BEP-20 (BNB Smart Chain)</option>
              <option value="usdterc20">ERC-20 (Ethereum)</option>
              <option value="usdtmatic">Polygon (MATIC)</option>
              <option value="usdtsol">Solana (SOL)</option>
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
          placeholder="${isCard ? '10.00' : '50.00'}" min="${isCard ? '0.1' : '5'}" step="0.1" style="padding-left:30px">
      </div>
      <p class="text-xs text-muted" style="margin-top:4px">
        ${isCard ? 'Instant credit to your USD wallet balance' : 'Minimum deposit: $5.00 (Crypto requirement)'}
      </p>
    </div>
    <div class="stream-info-box" style="margin-bottom:16px">
      <p class="text-sm text-secondary">
        Deposit opens safely inside this window. Your wallet balance updates automatically upon completion.
      </p>
    </div>
    <button class="btn btn-primary btn-full" id="confirm-deposit-btn">
      ${isCard ? 'Pay with Card' : 'Generate Crypto Deposit Details'}
    </button>
  `);

  document.getElementById('back-deposit-btn')?.addEventListener('click', () => openDepositModal(user));

  document.getElementById('confirm-deposit-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('confirm-deposit-btn');
    const amountInput = document.getElementById('deposit-amount');
    const amount = parseFloat(amountInput.value);

    if (isCard) {
      if (!amount || amount <= 0) {
        toast.error('Please enter a valid deposit amount.');
        return;
      }
    } else {
      if (!amount || amount < 5) {
        toast.error('Minimum deposit for Crypto is $5.00.');
        return;
      }
    }

    const amount_cents = Math.round(amount * 100);
    setButtonLoading(btn, true, isCard ? 'Opening Card Checkout...' : 'Generating Wallet Address...');

    try {
      if (isCard) {
        const result = await depositPaystack({ amount_cents, email: user.email });
        const publicKey = result.paystack_public_key || (import.meta && import.meta.env && import.meta.env.VITE_PAYSTACK_PUBLIC_KEY);

        if (window.PaystackPop && (result.access_code || publicKey)) {
          closeModal();
          const handler = window.PaystackPop.setup({
            key: publicKey,
            access_code: result.access_code,
            email: user.email,
            amount: result.paystack_amount,
            currency: 'KES',
            ref: result.reference,
            channels: ['card'],
            onClose: function() {
              toast.info('Payment window closed');
            },
            callback: function() {
              toast.success('Deposit successful! Wallet credited.');
              setTimeout(loadWalletData, 1000);
            }
          });
          handler.openIframe();
        } else if (result && result.checkout_url) {
          window.location.href = result.checkout_url.replace(/^http:\/\//i, 'https://');
        } else {
          throw new Error('Failed to initialize card payment.');
        }
      } else {
        const network = document.getElementById('crypto-network').value;
        const result = await depositCrypto({ amount_cents, currency: network });

        closeModal();
        openCryptoDepositModal(result);
      }
    } catch (err) {
      toast.error(err.message);
      setButtonLoading(btn, false, isCard ? 'Pay with Card' : 'Generate Crypto Deposit Details');
    }
  });
}

function openCryptoDepositModal(data) {
  const networkNameMap = {
    usdttrc20: 'USDT (TRC-20 Tron)',
    usdtbsc: 'USDT (BEP-20 BNB Smart Chain)',
    usdterc20: 'USDT (ERC-20 Ethereum)',
    usdtmatic: 'USDT (Polygon MATIC)',
    usdtsol: 'USDT (Solana)',
  };

  const networkName = networkNameMap[data.pay_currency] || data.pay_currency.toUpperCase();
  const address = data.pay_address || '';
  const amountToPay = data.pay_amount || data.usd_amount;

  openModal({
    title: 'Crypto Deposit (USDT)',
    size: 'lg',
    body: `
      <div style="text-align:center;margin-bottom:20px">
        <div class="badge badge-shared" style="font-weight:700;padding:6px 14px;font-size:0.85rem;margin-bottom:12px;display:inline-flex">
          ${networkName}
        </div>
        <p class="text-sm text-secondary">
          Send exactly <strong>${amountToPay} USDT</strong> to the wallet address below.
        </p>
      </div>

      ${data.qr_code_url ? `
        <div style="text-align:center;margin-bottom:20px">
          <div style="display:inline-block;padding:12px;background:#fff;border-radius:12px;box-shadow:var(--shadow-md)">
            <img src="${data.qr_code_url}" alt="Deposit QR Code" style="width:180px;height:180px;display:block">
          </div>
        </div>
      ` : ''}

      ${address ? `
        <div class="form-group">
          <label class="form-label">Deposit Wallet Address (${data.pay_currency.toUpperCase()})</label>
          <div style="display:flex;gap:8px">
            <input type="text" class="form-input" id="crypto-address-input" value="${address}" readonly style="font-family:var(--font-mono);font-size:0.85rem;font-weight:600">
            <button class="btn btn-primary btn-sm" id="copy-address-btn" style="flex-shrink:0">Copy Address</button>
          </div>
        </div>
      ` : ''}

      <div class="form-group" style="margin-top:12px">
        <label class="form-label">Amount to Send</label>
        <div style="display:flex;gap:8px">
          <input type="text" class="form-input" id="crypto-amount-input" value="${amountToPay} USDT" readonly style="font-family:var(--font-mono);font-weight:700">
          <button class="btn btn-ghost btn-sm" id="copy-amount-btn" style="flex-shrink:0">Copy Amount</button>
        </div>
      </div>

      <div class="stream-info-box" style="margin-top:16px;background:rgba(245,158,11,0.08);border-color:rgba(245,158,11,0.25)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="text-xs" style="color:var(--amber);font-weight:600">
            Time remaining: <span id="crypto-timer">20:00</span>
          </span>
          <span class="text-xs text-muted">
            ● Waiting for transfer
          </span>
        </div>
      </div>

      ${data.checkout_url ? `
        <div style="text-align:center;margin-top:12px">
          <a href="${data.checkout_url}" target="_blank" rel="noopener" class="text-xs text-accent" style="text-decoration:none">
            Need NOWPayments Web Page? Click here →
          </a>
        </div>
      ` : ''}
    `,
    footer: `
      <button class="btn btn-primary btn-full" id="confirm-sent-btn">
        I Have Sent Payment
      </button>
    `,
  });

  setTimeout(() => {
    document.getElementById('copy-address-btn')?.addEventListener('click', () => {
      if (address) {
        navigator.clipboard.writeText(address);
        toast.success('Wallet address copied to clipboard!');
      }
    });

    document.getElementById('copy-amount-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(String(amountToPay));
      toast.success('Amount copied to clipboard!');
    });

    document.getElementById('confirm-sent-btn')?.addEventListener('click', async () => {
      closeModal();
      toast.success('Payment recorded! Wallet will update automatically once confirmed on-chain.');
      await loadWalletData();
    });

    let secondsLeft = 20 * 60;
    const timerEl = document.getElementById('crypto-timer');
    const interval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) {
        clearInterval(interval);
        if (timerEl) timerEl.textContent = 'Expired';
        return;
      }
      const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
      const secs = String(secondsLeft % 60).padStart(2, '0');
      if (timerEl) timerEl.textContent = `${mins}:${secs}`;
    }, 1000);

  }, 50);
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
