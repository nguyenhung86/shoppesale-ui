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
          <span class="important-title-main">Lưu Ý Quan Trọng Khi Mua Hàng Hoàn Tiền</span>
          <span class="important-badge-req">BẮT BUỘC ĐỌC</span>
        </div>
        <div class="important-title-sub">Đọc kỹ để đảm bảo đơn hàng được sàn ghi nhận hoa hồng 100%</div>
      </div>
    </div>
    <div class="important-arrow-wrap">
      <svg class="important-arrow-svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
  </summary>

  <div class="important-content">

    <!-- 1. THAO TÁC "NHƯ NGƯỜI MUA THẬT" -->
    <div class="imp-card imp-card-natural">
      <div class="imp-card-header">
        <div class="imp-badge imp-badge-orange">01</div>
        <div class="imp-heading">
          <h4>1. Thao tác "NHƯ NGƯỜI MUA THẬT"</h4>
        </div>
      </div>
      <div class="imp-card-body">
        <div class="imp-quote-box">
          <p><i>"Hệ thống AI Shopee rất thông minh, có thể phát hiện ra hành vi bất thường"</i></p>
          <p class="imp-quote-alert"><b>Người mua hàng bình thường không ai click link tiếp thị rồi thanh toán ngay cả!!!</b></p>
        </div>
        <div class="imp-flow-steps">
          <div class="imp-flow-item">
            <span class="imp-step-pill">Nên làm</span>
            <div class="imp-step-text"><b>Thoát hẳn app Shopee</b> trước khi click vào nút <b>"Mở link mua hàng"</b>.</div>
          </div>
          <div class="imp-flow-item">
            <span class="imp-step-pill">Quy trình chuẩn</span>
            <div class="imp-step-text">Bấm vào link ➔ Lướt xem sản phẩm: <b>Ảnh, mô tả, đánh giá sản phẩm</b> ➔ Thêm vào giỏ và tiến hành thanh toán.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. TUYỆT ĐỐI KHÔNG MUA HÀNG TỪ LIVE HOẶC VIDEO -->
    <div class="imp-card imp-card-warning">
      <div class="imp-card-header">
        <div class="imp-badge imp-badge-red">02</div>
        <div class="imp-heading">
          <h4 class="text-danger">2. Tuyệt đối KHÔNG mua hàng từ Live hoặc Video</h4>
        </div>
      </div>
      <div class="imp-card-body">
        <div class="imp-rule-box">
          <div class="imp-rule-badge">LÝ DO:</div>
          <div class="imp-rule-desc">Shopee ưu tiên tính hoa hồng cho người Livestream/Video. Nếu bạn mua tại đó, hệ thống sẽ không tính hoa hồng cho link của mình, dẫn đến việc không có tiền để hoàn lại cho bạn.</div>
        </div>
      </div>
    </div>

    <!-- 3. MẸO "LÀM SẠCH" GIỎ HÀNG (TRÁNH DÍNH MÃ NGẦM) -->
    <div class="imp-card imp-card-clean">
      <div class="imp-card-header">
        <div class="imp-badge imp-badge-amber">03</div>
        <div class="imp-heading">
          <h4>3. Mẹo "Làm sạch" giỏ hàng (Tránh dính mã ngầm)</h4>
        </div>
      </div>
      <div class="imp-card-body">
        <p class="imp-lead-text">Nếu bạn đặt nhiều đơn trong 1 ngày hoặc tài khoản thường xuyên rớt đơn.<br/>Hãy tiến hành <b>XÓA BỘ NHỚ ĐỆM</b> sau mỗi đơn hàng:</p>
        
        <div class="imp-crumbs-container">
          <span class="imp-crumb-label">Cách xử lý:</span>
          <div class="imp-crumb">Vào Shopee</div>
          <div class="imp-crumb-sep">➔</div>
          <div class="imp-crumb">Tôi</div>
          <div class="imp-crumb-sep">➔</div>
          <div class="imp-crumb">Cài đặt (⚙️)</div>
          <div class="imp-crumb-sep">➔</div>
          <div class="imp-crumb">Giới thiệu</div>
          <div class="imp-crumb-sep">➔</div>
          <div class="imp-crumb imp-crumb-action">Bấm Xóa bộ nhớ đệm (2-3 lần)</div>
        </div>

        <div class="imp-sub-note">
          <span class="imp-sub-dot">✓</span>
          <span><b>Mục đích:</b> Thao tác này giúp "reset" lại Cookie và xóa sạch dấu vết của Live/Video trước đó.</span>
        </div>
      </div>
    </div>

    <!-- 4. TÌ LỆ RỦI RO NGOÀI Ý MUỐN -->
    <div class="imp-card imp-card-risk">
      <div class="imp-card-header">
        <div class="imp-badge imp-badge-slate">04</div>
        <div class="imp-heading">
          <h4>4. Tì lệ rủi ro ngoài ý muốn</h4>
        </div>
      </div>
      <div class="imp-card-body">
        <p class="imp-lead-text">Dù làm đúng các bước, vẫn có khoảng 10% đơn bị rớt do:</p>
        
        <div class="imp-risk-stats-2col">
          <div class="imp-stat-card stat-warning">
            <div class="imp-stat-num">9%</div>
            <div class="imp-stat-desc-pure">App bị lag, không kịp nhảy mã tiếp thị.</div>
          </div>
          <div class="imp-stat-card stat-danger">
            <div class="imp-stat-num">1%</div>
            <div class="imp-stat-desc-pure">Shopee "nuốt đơn" ngẫu nhiên (lỗi hệ thống).</div>
          </div>
        </div>

        <div class="imp-forgive-note">
          <span class="imp-forgive-icon">🥰</span>
          <span>Trường hợp này chúng ta cùng <b>"hoan hỉ" bỏ qua cho anh Pee nhé!</b></span>
        </div>
      </div>
    </div>

    <!-- KHỐI TÓM LẠI -->
    <div class="imp-recap-banner">
      <div class="imp-recap-header">
        <div class="imp-recap-icon">💡</div>
        <div class="imp-recap-title">TÓM LẠI:</div>
      </div>
      <div class="imp-recap-grid">
        <div class="imp-recap-card">
          <div class="imp-recap-num">1</div>
          <div class="imp-recap-info">
            <div class="imp-recap-step-title">Dọn sạch giỏ hàng + Tắt app chạy ngầm</div>
          </div>
        </div>
        <div class="imp-recap-card">
          <div class="imp-recap-num">2</div>
          <div class="imp-recap-info">
            <div class="imp-recap-step-title">Click link Mở link mua hàng</div>
          </div>
        </div>
        <div class="imp-recap-card">
          <div class="imp-recap-num">3</div>
          <div class="imp-recap-info">
            <div class="imp-recap-step-title">Lướt xem ảnh, đọc mô tả, đọc đánh giá sản phẩm</div>
          </div>
        </div>
        <div class="imp-recap-card">
          <div class="imp-recap-num">4</div>
          <div class="imp-recap-info">
            <div class="imp-recap-step-title">Đặt hàng thường (không Live/Video)</div>
          </div>
        </div>
      </div>
      <div class="imp-recap-footer">
        🎉 <b>Chúc bạn săn sale thành công!</b>
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
