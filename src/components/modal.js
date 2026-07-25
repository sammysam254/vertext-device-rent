/**
 * Modal component
 */

let activeModal = null;

export function openModal({ title, body, footer = '', size = 'md', onClose }) {
  closeModal();

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" style="max-width: ${size === 'lg' ? '640px' : '480px'}">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" id="modal-close-btn">✕</button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    </div>
  `;

  document.body.appendChild(backdrop);
  activeModal = backdrop;

  // Close on backdrop click
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) { closeModal(); if (onClose) onClose(); }
  });

  // Close button
  backdrop.querySelector('#modal-close-btn').addEventListener('click', () => {
    closeModal();
    if (onClose) onClose();
  });

  // Close on Escape
  const escHandler = (e) => {
    if (e.key === 'Escape') { closeModal(); if (onClose) onClose(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);

  return backdrop;
}

export function closeModal() {
  if (activeModal) {
    activeModal.remove();
    activeModal = null;
  }
}

export function updateModalBody(html) {
  if (activeModal) {
    activeModal.querySelector('.modal-body').innerHTML = html;
  }
}
