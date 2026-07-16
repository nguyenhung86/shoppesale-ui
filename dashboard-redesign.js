function dashboardRedesignedPage() {
  return `
    <div class="dashboard-view dashboard-redesign-view">
      <section class="dash-overview-grid">
        <article class="dash-wallet-card">
          <div class="dash-wallet-head">
            <div><span class="dash-welcome-dot">✦</span><small>XIN CHÀO, HỒNG VINH</small></div>
            <span class="dash-tier-badge">♕ Kim Cương</span>
          </div>
          <div class="dash-total">
            <span>TỔNG HOA HỒNG</span>
            <strong>0đ</strong>
            <p>Được tổng hợp từ các đơn hàng hợp lệ của bạn.</p>
          </div>
          <div class="dash-status-grid">
            <div class="dash-status processing"><small>ĐANG CHỜ XỬ LÝ</small><b>0đ</b><i>◷</i></div>
            <div class="dash-status completed"><small>ĐÃ HOÀN THÀNH</small><b>0đ</b><i>✓</i></div>
            <div class="dash-status received"><small>ĐÃ NHẬN</small><b>0đ</b><i>₫</i></div>
          </div>
          <div class="dash-wallet-actions">
            <a href="#convert">↪ Chuyển đổi link</a>
            <button type="button">▣ Đơn hàng</button>
            <button type="button">♧ Giới thiệu</button>
          </div>
          <span class="dash-wallet-glow one"></span><span class="dash-wallet-glow two"></span>
        </article>

        <article class="dash-member-card">
          <div class="dash-member-top">
            <div><span class="dash-member-icon">✦</span><div><small>TIẾN ĐỘ HÔM NAY</small><h2>Sẵn sàng nhận hoàn</h2></div></div>
            <span>0%</span>
          </div>
          <p>Hoàn thành đơn mua qua link để hệ thống ghi nhận hoa hồng cho bạn.</p>
          <div class="dash-member-progress" style="--width:0%;"><span style="width:0%;"></span></div>
          <div class="dash-member-rule"><b>✓</b><span>Đơn hợp lệ sẽ được cập nhật sau đối soát.</span></div>
          <div class="dash-member-stats">
            <div><small>TỔNG ĐƠN</small><b>0</b></div>
            <div><small>ĐÃ GIỚI THIỆU</small><b>0</b></div>
            <div><small>THÀNH VIÊN TỪ</small><b>11/07/2026</b></div>
          </div>
        </article>
      </section>

      <section class="dash-insight-grid">
        <article class="dash-chart-card">
          <div class="dash-card-heading">
            <div><span>↗</span><div><small>THEO DÕI HOA HỒNG</small><h2>Đơn hàng theo tháng</h2></div></div>
            <button type="button">Tháng 7/2026 ▾</button>
          </div>
          <div class="dash-chart-new">
            <div class="dash-y-axis"><i>4</i><i>3</i><i>2</i><i>1</i><i>0</i></div>
            <div class="dash-chart-area"><svg viewBox="0 0 660 156" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="dashLineFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#ff762c" stop-opacity=".26"/><stop offset="100%" stop-color="#ff762c" stop-opacity="0"/></linearGradient></defs><path d="M0 126 C55 120,80 124,125 108 S190 96,238 105 S310 76,362 86 S428 43,476 67 S555 28,660 12 L660 156 L0 156Z" fill="url(#dashLineFill)"/><path d="M0 126 C55 120,80 124,125 108 S190 96,238 105 S310 76,362 86 S428 43,476 67 S555 28,660 12" fill="none" stroke="#ff6420" stroke-linecap="round" stroke-width="4"/></svg></div>
            <div class="dash-months"><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span></div>
          </div>
        </article>

        <article class="dash-next-card">
          <div class="dash-card-heading"><div><span>✦</span><div><small>BẮT ĐẦU NHẬN HOA HỒNG</small><h2>3 bước đơn giản</h2></div></div></div>
          <ol>
            <li><b>01</b><span><strong>Chuyển đổi link</strong><small>Dán link sản phẩm để tạo link riêng.</small></span></li>
            <li><b>02</b><span><strong>Mua qua link</strong><small>Đặt hàng trên cùng phiên duyệt.</small></span></li>
            <li><b>03</b><span><strong>Nhận hoa hồng</strong><small>Tiền được cộng sau đối soát.</small></span></li>
          </ol>
          <a href="#guide">Xem hướng dẫn chi tiết <span>→</span></a>
        </article>
      </section>

      <section class="dashboard-commission-banner">
        <img class="commission-banner-gift" src="assets/commission-gift-v2.png" alt="">
        <div class="commission-banner-copy">
          <small>ƯU ĐÃI ĐẶC BIỆT</small>
          <strong>Nhận ngay <em>80%</em> hoa hồng</strong>
          <span>Khi xác nhận đơn hàng thành công</span>
        </div>
        <span class="commission-banner-coin" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
      </section>
    </div>
  `;
}

pages.dashboard = dashboardRedesignedPage;

function enhanceRedesignedDashboard() {
  const view = document.querySelector('.dashboard-redesign-view');
  if (!view || view.dataset.ready) return;
  view.dataset.ready = 'true';
  const buttons = view.querySelectorAll('.dash-wallet-actions button');
  if (buttons[0]) buttons[0].addEventListener('click', () => { location.hash = 'orders'; });
  if (buttons[1]) buttons[1].addEventListener('click', () => { location.hash = 'referrals'; });
}

if (!location.hash || location.hash.slice(1) === 'dashboard') render();
requestAnimationFrame(enhanceRedesignedDashboard);
window.addEventListener('hashchange', () => requestAnimationFrame(enhanceRedesignedDashboard));
