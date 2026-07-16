function guideRedesignedPage() {
  const tips = [
    'Xóa sản phẩm trùng trong giỏ trước khi mở link hoàn tiền.',
    'Lưu mã giảm giá trước, sau đó quay lại đây để chuyển link.',
    'Sau khi mở link, đợi khoảng 10 giây rồi mới mua hàng.',
    'Không bấm quảng cáo hoặc link khác trong lúc đang mua.'
  ];

  const steps = [
    ['01', 'Sao chép link sản phẩm', 'Mở sản phẩm trên sàn và sao chép liên kết chia sẻ.', '⌁'],
    ['02', 'Dán link để chuyển đổi', 'Dán link vào trang chuyển đổi để tạo link mua riêng.', '↪'],
    ['03', 'Mua bằng link vừa tạo', 'Mở link mới rồi đặt hàng như bình thường.', '▣'],
    ['04', 'Theo dõi đơn & nhận hoàn', 'Tiền hoàn được cộng vào số dư sau khi đối soát.', '✦']
  ];

  return `
    <div class="guide-view">
      <section class="guide-hero-new">
        <div class="guide-hero-copy">
          <span class="guide-kicker"><i>✦</i> HƯỚNG DẪN NHẬN HOÀN</span>
          <h1>Mua đúng link,<br><em>nhận hoàn tiền</em> dễ dàng</h1>
          <p>Chỉ cần chuyển link trước khi mua. Hệ thống sẽ ghi nhận đơn hợp lệ và cộng tiền hoàn vào số dư của bạn.</p>
          <div class="guide-hero-actions">
            <a href="#convert">Chuyển đổi link <span>→</span></a>
            <a href="#orders">Theo dõi đơn hàng</a>
          </div>
        </div>
        <div class="guide-hero-visual" aria-hidden="true">
          <span class="guide-visual-link">↪</span>
          <span class="guide-visual-cart">▣</span>
          <span class="guide-visual-coin one">₫</span>
          <span class="guide-visual-coin two">₫</span>
          <div class="guide-visual-phone"><i>✓</i><b>Hoàn tiền</b><em></em><em></em><em></em></div>
          <div class="guide-visual-orbit"></div>
        </div>
      </section>

      <section class="guide-intro-new">
        <div class="guide-section-heading">
          <div><span>⌁</span><div><small>HIỂU NHANH VỀ HOÀN TIỀN</small><h2>Chỉ 3 điều cần nhớ</h2></div></div>
          <p>Mua trên sàn như bình thường, Hoàn Tiền Mua Sắm giúp ghi nhận đơn và quản lý số dư.</p>
        </div>
        <div class="guide-concept-grid">
          <article><span class="guide-concept-icon">₫</span><b>Hoàn tiền là gì?</b><p>Đây là phần hoa hồng hợp lệ từ sàn được chia lại cho bạn.</p></article>
          <article><span class="guide-concept-icon">↪</span><b>Làm thế nào để nhận?</b><p>Chuyển link sản phẩm trước khi mua để tạo dấu vết ghi nhận.</p></article>
          <article><span class="guide-concept-icon">▣</span><b>Tiền về đâu?</b><p>Sau đối soát, tiền được cộng vào số dư Hoàn Tiền Mua Sắm.</p></article>
        </div>
      </section>

      <section class="guide-process-new">
        <div class="guide-section-heading">
          <div><span>01</span><div><small>QUY TRÌNH MUA HOÀN TIỀN</small><h2>Thực hiện theo 4 bước</h2></div></div>
          <p>Làm đúng thứ tự để giảm rủi ro không ghi nhận được hoa hồng.</p>
        </div>
        <div class="guide-step-list">
          ${steps.map((step, index) => `
            <article class="guide-step-new">
              <span class="guide-step-number">${step[0]}</span>
              <span class="guide-step-icon">${step[3]}</span>
              <div><b>${step[1]}</b><p>${step[2]}</p></div>
              ${index < steps.length - 1 ? '<i class="guide-step-line"></i>' : ''}
            </article>
          `).join('')}
        </div>
      </section>

      <section class="guide-payout-new">
        <div class="guide-payout-copy">
          <span class="guide-payout-kicker"><i>₫</i> THANH TOÁN TỰ ĐỘNG</span>
          <h2>Tiền hoàn về ví<br><em>mỗi ngày</em></h2>
          <p>Hệ thống tự động thanh toán hoa hồng hằng ngày khi ví của bạn đáp ứng một trong các điều kiện sau.</p>
        </div>
        <div class="guide-payout-conditions">
          <div class="guide-payout-title"><span>✓</span><b>Điều kiện thanh toán</b></div>
          <article><span>01</span><p>Hoa hồng từ các đơn <b>đã hoàn tất</b> đạt trên <strong>10.000đ</strong>.</p></article>
          <div class="guide-payout-or">HOẶC</div>
          <article><span>02</span><p>Ví có từ <strong>2.000đ</strong> trở lên và không còn đơn nào đang <b>Đang/Chờ xử lý</b>.</p></article>
        </div>
      </section>

      <section class="guide-tips-new">
        <div class="guide-tips-head"><span>!</span><div><small>LƯU Ý QUAN TRỌNG</small><h2>Để không bỏ lỡ tiền hoàn</h2></div></div>
        <div class="guide-tips-grid">${tips.map((tip, index) => `<div><span>0${index + 1}</span><p>${tip}</p></div>`).join('')}</div>
        <a href="#convert">Tôi đã sẵn sàng chuyển link <span>→</span></a>
      </section>
    </div>
  `;
}

pages.guide = guideRedesignedPage;

if ((location.hash.slice(1) || location.pathname.slice(1) || 'dashboard') === 'guide') render();
