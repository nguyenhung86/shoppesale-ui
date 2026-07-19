(() => {
  let modal;

  function closeModal() {
    modal?.remove();
    modal = null;
  }

  function openModal() {
    window.openLogoutModal = openModal;
    if (modal) return;
    modal = document.createElement('div');
    modal.className = 'logout-modal';
    modal.setAttribute('role', 'presentation');
    modal.innerHTML = '<div class="logout-dialog" role="dialog" aria-modal="true" aria-labelledby="logout-title"><div class="logout-dialog-heading"><span class="logout-dialog-icon" aria-hidden="true">△</span><h2 id="logout-title">Đăng xuất?</h2></div><p>Bạn sẽ cần đăng nhập lại để tiếp tục.</p><div class="logout-dialog-actions"><button class="logout-stay" type="button">Ở lại</button><button class="logout-confirm" type="button">Đăng xuất</button></div></div>';
    document.body.append(modal);
    modal.addEventListener('click', event => {
      if (event.target === modal || event.target.closest('.logout-stay')) closeModal();
      if (event.target.closest('.logout-confirm')) closeModal();
    });
    modal.querySelector('.logout-stay')?.focus();
  }

  document.querySelector('.topbar-logout')?.addEventListener('click', event => {
    event.preventDefault();
    openModal();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeModal();
  });
})();
