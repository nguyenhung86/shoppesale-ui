function referralEvent() {
  return `
    <div class="event-single-view">
      <header class="event-single-intro">
        <span>SỰ KIỆN ĐANG DIỄN RA</span>
        <h1>Giới thiệu bạn mới,<br><em>nhận thưởng song hành</em></h1>
        <p>Chia sẻ Hoàn Tiền Mua Sắm với bạn bè để cùng nhận thêm phần thưởng từ những đơn mua hợp lệ.</p>
      </header>

      <section class="event-single-card">
        <div class="event-single-copy">
          <small>CHƯƠNG TRÌNH THÀNH VIÊN</small>
          <h2>Giới thiệu bạn mới,<br><em>nhận thưởng song hành</em></h2>
          <p>Mỗi thành viên mới hoàn thành đơn mua đầu tiên sẽ giúp bạn nhận thưởng nóng. Càng nhiều bạn mới hoạt động, mức thưởng tháng càng cao.</p>
          <span class="event-single-date">Hiệu lực từ 01/07/2026 · Áp dụng hằng tháng</span>
          <ul>
            <li><b>10.000đ</b> thưởng nóng cho mỗi thành viên mới hợp lệ.</li>
            <li>Thưởng thêm từ <b>5% đến 20%</b> theo mốc giới thiệu tháng.</li>
            <li>Người mới được tính mốc khi có tối thiểu <b>03 đơn hợp lệ</b> trong tháng đăng ký.</li>
          </ul>
          <a class="button" href="#referrals">Tham gia giới thiệu <span>→</span></a>
        </div>
        <aside class="event-single-summary" aria-hidden="true">
          <img src="assets/commission-gift-v2.png" alt="">
          <div class="event-single-amount"><small>THƯỞNG NÓNG</small><b>10.000đ</b><span>/ thành viên mới</span></div>
          <div class="event-single-tier"><span>Mốc thưởng tháng</span><b>+5% → +20%</b></div>
        </aside>
      </section>

      <section class="event-single-details">
        <header><span>QUYỀN LỢI &amp; ĐIỀU KIỆN</span><h2>Tham gia càng nhiều, thưởng càng cao</h2><p>Thông tin chương trình được trình bày rõ ràng để bạn dễ theo dõi.</p></header>
        <div class="event-detail-grid">
          <article class="event-detail-hot"><small>THƯỞNG NÓNG</small><b>10.000đ</b><strong>/ thành viên mới</strong><p>Nhận khi người được giới thiệu hoàn thành đơn mua đầu tiên hợp lệ.</p></article>
          <article><span>01</span><h3>Thưởng mốc tháng</h3><b>+5% → +20%</b><p>Thưởng thêm theo số thành viên mới hoạt động trong tháng.</p></article>
          <article><span>02</span><h3>Điều kiện ghi nhận</h3><b>Từ 03 đơn hợp lệ</b><p>Mỗi thành viên mới cần có tối thiểu 03 đơn trong tháng đăng ký.</p></article>
        </div>
        <a class="button event-detail-cta" href="#referrals">Tham gia giới thiệu <span>→</span></a>
      </section>
    </div>
  `;
}

pages.events = referralEvent;

if ((location.hash.slice(1) || location.pathname.slice(1) || 'dashboard') === 'events') render();
