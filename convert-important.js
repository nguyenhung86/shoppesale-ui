function addImportantPanel() {
  if ((location.hash.slice(1) || location.pathname.slice(1) || 'dashboard') !== 'convert') return;
  if (document.querySelector('.important-panel')) return;
  const notice = document.querySelector('#app .notice');
  if (!notice) return;

  const panel = document.createElement('details');
  panel.className = 'important-panel';
  panel.setAttribute('open', '');
  panel.innerHTML = `
  <summary class="important-summary">
    <div class="important-summary-left">
      <div class="important-icon-wrap">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="M12 8v4"/>
          <path d="M12 16h.01"/>
        </svg>
      </div>
      <div class="important-titles">
        <div class="important-title-row">
          <span class="important-title-main">Quy Trình Mua Hàng Chuẩn Để Nhận Hoàn Tiền 100%</span>
          <span class="important-badge-req">BẮT BUỘC ĐỌC</span>
        </div>
        <div class="important-title-sub">Làm đúng các bước dưới đây để Shopee tự động khớp đơn & nhận tiền hoàn vào ví</div>
      </div>
    </div>
    <div class="important-arrow-wrap">
      <svg class="important-arrow-svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
  </summary>

  <div class="important-content">

    <!-- 1. THAO TÁC MUA SẮM TỰ NHIÊN -->
    <div class="imp-card imp-card-natural">
      <div class="imp-card-header">
        <div class="imp-badge imp-badge-orange">01</div>
        <div class="imp-heading">
          <h4>Thao tác mua sắm tự nhiên</h4>
          <span class="imp-tag imp-tag-green">Quy trình chuẩn</span>
        </div>
      </div>
      <div class="imp-card-body">
        <div class="imp-flow-steps">
          <div class="imp-flow-item">
            <span class="imp-step-pill">Bước 1</span>
            <div class="imp-step-text"><b>Thoát hẳn ứng dụng Shopee</b> đang chạy ngầm trên điện thoại trước khi mở link.</div>
          </div>
          <div class="imp-flow-item">
            <span class="imp-step-pill">Bước 2</span>
            <div class="imp-step-text">Bấm nút <b>"Mở link mua hàng"</b> ở trên ➔ Dành <b>15 – 30 giây</b> lướt xem ảnh, mô tả và đánh giá sản phẩm.</div>
          </div>
          <div class="imp-flow-item">
            <span class="imp-step-pill">Bước 3</span>
            <div class="imp-step-text">Bấm <b>Thêm vào giỏ</b> và tiến hành đặt hàng / thanh toán như bình thường.</div>
          </div>
        </div>
        <div class="imp-tip-box">
          <span class="imp-tip-icon">💡</span>
          <div class="imp-tip-text"><b>Mẹo nhận diện:</b> Việc lướt xem tự nhiên giúp hệ thống của sàn nhận diện bạn là khách hàng thực tế (tránh bị nghi ngờ là tool), đảm bảo đơn hàng được ghi nhận hoàn tiền tối đa.</div>
        </div>
      </div>
    </div>

    <!-- 2. TUYỆT ĐỐI KHÔNG MUA QUA LIVE HOẶC VIDEO -->
    <div class="imp-card imp-card-warning">
      <div class="imp-card-header">
        <div class="imp-badge imp-badge-red">02</div>
        <div class="imp-heading">
          <h4 class="text-danger">Tuyệt đối KHÔNG mua qua Livestream hoặc Video</h4>
          <span class="imp-tag imp-tag-red">Lưu ý số 1</span>
        </div>
      </div>
      <div class="imp-card-body">
        <p class="imp-lead-text">Theo cơ chế của sàn (đặc biệt là Shopee), hoa hồng sẽ được <b>ưu tiên tuyệt đối cho người phát Livestream hoặc Video</b> nếu bạn chọn mua tại đó.</p>
        <div class="imp-rule-box">
          <div class="imp-rule-badge">👉 ĐỂ CHẮC CHẮN ĐƯỢC HOÀN TIỀN:</div>
          <div class="imp-rule-desc">Bạn vui lòng đặt mua trực tiếp tại <b>trang sản phẩm thông thường</b> (không mở Live/Video và không bấm vào biểu tượng Live/Video trước khi bấm mua).</div>
        </div>
      </div>
    </div>

    <!-- 3. MẸO LÀM SẠCH GIỎ HÀNG -->
    <div class="imp-card imp-card-clean">
      <div class="imp-card-header">
        <div class="imp-badge imp-badge-amber">03</div>
        <div class="imp-heading">
          <h4>Mẹo "Làm sạch" giỏ hàng (Tránh dính mã cũ)</h4>
          <span class="imp-tag imp-tag-blue">Bí quyết</span>
        </div>
      </div>
      <div class="imp-card-body">
        <p class="imp-lead-text">Nếu bạn đặt nhiều đơn trong ngày hoặc tài khoản thường xuyên rớt đơn, hãy xóa bộ nhớ đệm để làm mới phiên liên kết:</p>
        
        <div class="imp-crumbs-container">
          <div class="imp-crumb">Shopee</div>
          <div class="imp-crumb-sep">➔</div>
          <div class="imp-crumb">Tôi</div>
          <div class="imp-crumb-sep">➔</div>
          <div class="imp-crumb">Cài đặt ⚙️</div>
          <div class="imp-crumb-sep">➔</div>
          <div class="imp-crumb">Giới thiệu</div>
          <div class="imp-crumb-sep">➔</div>
          <div class="imp-crumb imp-crumb-action">Xóa bộ nhớ đệm (2-3 lần)</div>
        </div>

        <div class="imp-sub-note">
          <span class="imp-sub-dot">✓</span>
          <span><b>Mục đích:</b> Reset cookie rác và xóa sạch các liên kết ngầm từ các phiên duyệt trước đó.</span>
        </div>
      </div>
    </div>

    <!-- 4. TỈ LỆ RỦI RO NGOÀI Ý MUỐN -->
    <div class="imp-card imp-card-risk">
      <div class="imp-card-header">
        <div class="imp-badge imp-badge-slate">04</div>
        <div class="imp-heading">
          <h4>Tỉ lệ rủi ro ngoài ý muốn & Cơ chế sàn</h4>
          <span class="imp-tag imp-tag-slate">Minh bạch</span>
        </div>
      </div>
      <div class="imp-card-body">
        <p class="imp-lead-text">Dù làm đúng các bước, trong thực tế vẫn có khoảng 10% đơn bị rớt do các yếu tố kỹ thuật ngoài tầm kiểm soát:</p>
        
        <div class="imp-risk-stats">
          <div class="imp-stat-card stat-success">
            <div class="imp-stat-num">~90%</div>
            <div class="imp-stat-label">Khớp đơn thành công</div>
            <div class="imp-stat-desc">Thao tác chuẩn, tiền hoa hồng nhảy vào tài khoản sau 15–60 phút.</div>
          </div>
          <div class="imp-stat-card stat-warning">
            <div class="imp-stat-num">9%</div>
            <div class="imp-stat-label">App bị giật lag</div>
            <div class="imp-stat-desc">Mạng lag hoặc app Shopee chậm, không kịp nhảy cookie tiếp thị.</div>
          </div>
          <div class="imp-stat-card stat-danger">
            <div class="imp-stat-num">1%</div>
            <div class="imp-stat-label">Shopee "nuốt đơn"</div>
            <div class="imp-stat-desc">Lỗi hy hữu do hệ thống server sàn quá tải giờ cao điểm.</div>
          </div>
        </div>

        <div class="imp-forgive-note">
          <span class="imp-forgive-icon">🥰</span>
          <span>Trường hợp 10% rủi ro ngoài ý muốn này, chúng ta cùng <b>"hoan hỉ" bỏ qua cho anh Pee</b> nhé!</span>
        </div>
      </div>
    </div>

    <!-- KHỐI TÓM TẮT 4 BƯỚC NỔI BẬT -->
    <div class="imp-recap-banner">
      <div class="imp-recap-header">
        <div class="imp-recap-icon">⚡</div>
        <div class="imp-recap-title">TÓM TẮT NHANH 4 BƯỚC ĐỂ ĐƯỢC HOÀN TIỀN</div>
      </div>
      <div class="imp-recap-grid">
        <div class="imp-recap-card">
          <div class="imp-recap-num">1</div>
          <div class="imp-recap-info">
            <div class="imp-recap-step-title">Tắt app Shopee ngầm</div>
            <div class="imp-recap-step-sub">Đóng hẳn ứng dụng đang mở trước khi bấm link</div>
          </div>
        </div>
        <div class="imp-recap-card">
          <div class="imp-recap-num">2</div>
          <div class="imp-recap-info">
            <div class="imp-recap-step-title">Bấm "Mở link mua hàng"</div>
            <div class="imp-recap-step-sub">Mở link mua hàng trực tiếp ở nút bấm phía trên</div>
          </div>
        </div>
        <div class="imp-recap-card">
          <div class="imp-recap-num">3</div>
          <div class="imp-recap-info">
            <div class="imp-recap-step-title">Lướt 20s & Thanh toán thường</div>
            <div class="imp-recap-step-sub">Xem ảnh, đánh giá rồi mua (Tuyệt đối không mua Live/Video)</div>
          </div>
        </div>
        <div class="imp-recap-card">
          <div class="imp-recap-num">4</div>
          <div class="imp-recap-info">
            <div class="imp-recap-step-title">Nhận tiền hoàn tự động</div>
            <div class="imp-recap-step-sub">Hệ thống tự động thông báo ghi nhận hoàn tiền vào tài khoản!</div>
          </div>
        </div>
      </div>
    </div>

  </div>`;

  notice.replaceWith(panel);
}

window.addEventListener('hashchange', addImportantPanel);
window.addEventListener('popstate', () => requestAnimationFrame(addImportantPanel));
setInterval(() => {
  if ((location.hash.slice(1) || location.pathname.slice(1) || 'dashboard') === 'convert') {
    addImportantPanel();
  }
}, 100);
addImportantPanel();
