function addImportantPanel() {
  if ((location.hash.slice(1) || location.pathname.slice(1) || 'dashboard') !== 'convert' || document.querySelector('.important-panel')) return;
  const notice = document.querySelector('#app .notice');
  if (!notice) return;
  const panel = document.createElement('details');
  panel.className = 'important-panel';
  panel.setAttribute('open', '');
  panel.innerHTML = `<summary><span class="important-icon">ⓘ</span><span><b>Quan trọng</b><small>Đọc kỹ để đảm bảo sàn ghi nhận đơn 100%</small></span><span class="important-arrow">⌃</span></summary><div class="important-content">
  <article><span>1</span><div><h3>Thao tác mua sắm tự nhiên</h3><p>• <b>Bước 1:</b> Thoát hẳn ứng dụng Shopee đang chạy ngầm trước khi mở link.<br/>• <b>Bước 2:</b> Bấm <b>"Mở link mua hàng"</b> ở trên ➔ Dành 15 – 30 giây lướt xem ảnh, mô tả và đánh giá sản phẩm.<br/>• <b>Bước 3:</b> Thêm vào giỏ hàng và tiến hành thanh toán như bình thường.</p><p style="margin-top:6px;font-size:12px;color:#64748b;font-style:italic;">💡 Mẹo: Việc lướt xem tự nhiên giúp hệ thống nhận diện khách hàng thực, đảm bảo đơn hàng được ghi nhận hoàn tiền tối đa.</p></div></article>
  <article><span>2</span><div><h3>Tuyệt đối không mua qua Live hoặc Video</h3><p>Theo cơ chế của sàn (đặc biệt là Shopee), hoa hồng sẽ được <b>ưu tiên tuyệt đối cho người phát Livestream hoặc Video</b> nếu bạn chọn mua tại đó.<br/>👉 <b>Để nhận được hoàn tiền:</b> Bạn vui lòng đặt mua trực tiếp tại trang sản phẩm thông thường (không qua Live/Video trước khi bấm mua).</p></div></article>
  <article><span>3</span><div><h3>Mẹo "Làm sạch" giỏ hàng (Tránh dính mã cũ)</h3><p>Nếu bạn đặt nhiều đơn trong ngày hoặc tài khoản thường xuyên rớt đơn, hãy xóa bộ nhớ đệm để làm mới phiên liên kết:</p><div class="important-tips" style="grid-template-columns:1fr;margin-top:6px;"><span>Vào Shopee ➔ <b>Tôi</b> ➔ Cài đặt <b>(⚙️)</b> ➔ <b>Giới thiệu</b> ➔ Bấm <b>Xóa bộ nhớ đệm</b> (2-3 lần).</span></div><p style="margin-top:6px;font-size:12px;color:#64748b;">Mục đích: Reset cookie rác và xóa sạch các liên kết ngầm từ các phiên duyệt trước đó.</p></div></article>
  <article><span>4</span><div><h3>Tỉ lệ rủi ro ngoài ý muốn</h3><p>Dù làm đúng các bước, vẫn có khoảng 10% đơn bị rớt do:<br/>• <b>9%:</b> App bị lag, không kịp nhảy mã tiếp thị.<br/>• <b>1%:</b> Shopee "nuốt đơn" ngẫu nhiên (lỗi hệ thống).<br/>Trường hợp này chúng ta cùng "hoan hỉ" bỏ qua cho anh Pee nhé! 🥰</p></div></article>
  <div class="important-recap"><div class="important-recap-title">⚡ TÓM TẮT 4 BƯỚC ĐỂ ĐƯỢC HOÀN TIỀN:</div><div class="important-recap-step"><span>1</span><span>Thoát hẳn ứng dụng Shopee đang chạy ngầm</span></div><div class="important-recap-step"><span>2</span><span>Bấm nút <b>Mở link mua hàng</b> ở trên</span></div><div class="important-recap-step"><span>3</span><span>Lướt xem ảnh, đánh giá ~20s rồi thanh toán thường (không Live/Video)</span></div><div class="important-recap-step"><span>4</span><span>Hệ thống tự động thông báo ghi nhận hoàn tiền vào tài khoản!</span></div></div>
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
