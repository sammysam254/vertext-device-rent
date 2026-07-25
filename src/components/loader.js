/**
 * Global page loader
 */

let loaderEl = null;
let count = 0;

export function showLoader(text = 'Loading...') {
  count++;
  if (!loaderEl) {
    loaderEl = document.createElement('div');
    loaderEl.className = 'loader-overlay';
    loaderEl.innerHTML = `
      <div class="loader-spinner"></div>
      <p class="loader-text">${text}</p>
    `;
    document.body.appendChild(loaderEl);
  }
}

export function hideLoader() {
  count = Math.max(0, count - 1);
  if (count === 0 && loaderEl) {
    loaderEl.remove();
    loaderEl = null;
  }
}

/** Inline button spinner */
export function setButtonLoading(btn, loading, originalText) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> ${originalText || 'Loading...'}`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || originalText || 'Submit';
  }
}
