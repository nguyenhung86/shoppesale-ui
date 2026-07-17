(() => {
  const getCurrentPage = () => {
    const hash = window.location.hash.replace('#', '');
    if (hash) return hash;
    const segment = window.location.pathname.split('/').filter(Boolean).pop();
    return segment || 'dashboard';
  };

  const syncMobileNavigation = () => {
    const currentPage = getCurrentPage();
    document.querySelectorAll('[data-mobile-page]').forEach(link => {
      link.classList.toggle('active', link.dataset.mobilePage === currentPage);
    });
  };

  const moreButton = document.querySelector('.mobile-more-tab');
  moreButton?.addEventListener('click', () => {
    const desktopMenu = document.querySelector('.topbar .nav');
    if (!desktopMenu) return;
    const isOpen = desktopMenu.classList.toggle('open');
    moreButton.classList.toggle('active', isOpen);
    moreButton.setAttribute('aria-expanded', String(isOpen));
  });

  window.addEventListener('hashchange', syncMobileNavigation);
  window.addEventListener('popstate', syncMobileNavigation);
  syncMobileNavigation();
})();
