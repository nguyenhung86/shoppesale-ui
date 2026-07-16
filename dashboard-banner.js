(() => {
  function mountDashboardBanner() {
    const dashboard = document.querySelector('.dashboard-view');
    if (!dashboard || dashboard.querySelector('.dashboard-commission-banner')) return;

    const banner = document.createElement('section');
    banner.className = 'dashboard-commission-banner';
    banner.innerHTML = `
      <img class="commission-banner-gift" src="assets/commission-gift-v2.png" alt="">
      <div class="commission-banner-copy">
        <small>ƯU ĐÃI ĐẶC BIỆT</small>
        <strong>Nhận ngay <em>80%</em> hoa hồng</strong>
        <span>Khi xác nhận đơn hàng thành công</span>
      </div>
      <span class="commission-banner-coin" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
    `;
    dashboard.append(banner);
  }

  function mountOrdersButton() {
    const button = document.querySelector('.dashboard-view .wallet-actions button');
    if (!button || button.dataset.page === 'orders') return;

    button.dataset.page = 'orders';
    button.innerHTML = '▣ Đơn hàng';
    button.addEventListener('click', () => {
      location.hash = 'orders';
    });
  }

  function mountReferralsButton() {
    const button = document.querySelectorAll('.dashboard-view .wallet-actions button')[1];
    if (!button || button.dataset.page === 'referrals') return;

    button.dataset.page = 'referrals';
    button.addEventListener('click', () => {
      location.hash = 'referrals';
    });
  }

  function enhanceDashboard() {
    mountDashboardBanner();
    mountOrdersButton();
    mountReferralsButton();
  }

  enhanceDashboard();
  window.addEventListener('hashchange', () => requestAnimationFrame(enhanceDashboard));
})();
