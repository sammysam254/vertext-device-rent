/**
 * Toast notification system
 */

let container = null;

function getContainer() {
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

const ICONS = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

export function showToast(message, type = 'info', duration = 3500) {
  const c = getContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${ICONS[type] || 'ℹ'}</span>
    <span class="toast-msg">${message}</span>
  `;
  c.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

export const toast = {
  success: (msg, d) => showToast(msg, 'success', d),
  error: (msg, d) => showToast(msg, 'error', d),
  info: (msg, d) => showToast(msg, 'info', d),
  warning: (msg, d) => showToast(msg, 'warning', d),
};
