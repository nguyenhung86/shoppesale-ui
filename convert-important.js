function addImportantPanel() {
  if ((location.hash.slice(1) || location.pathname.slice(1) || 'dashboard') !== 'convert' || document.querySelector('.important-panel')) return;
  const notice = document.querySelector('#app .notice');
  if (!notice) return;
  const panel = document.createElement('details');
  panel.className = 'important-panel';
  panel.innerHTML = `<summary><span class="important-icon">ⓘ</span><span><b>Quan trọng</b><small>Đọc kỹ để đảm bảo sàn ghi nhận đơn</small></span><span class="important-arrow">⌃</span></summary><div class="important-content"><article><span>1</span><div><h3>Xóa sản phẩm trùng trong giỏ</h3><p>Trước khi bấm link, bỏ sản phẩm tương tự đã có sẵn trong giỏ hàng.</p></div></article><article><span>2</span><div><h3>Lưu mã trước khi chuyển và bấm link</h3><p>Lưu mã giảm giá trước khi chuyển và bấm link. Sau khi bỏ giỏ hàng, không bấm link lạ nào khác để tránh mất nguồn hoa hồng.</p></div></article><article><span>3</span><div><h3>Không bấm link khác</h3><p>Không mở livestream, video hoặc quảng cáo trước và sau khi bấm link hoàn tiền.</p></div></article><article><span>4</span><div><h3>Không mua kèm sản phẩm chưa chuyển link</h3><p>Mua nhiều món cần chuyển link đúng thứ tự theo từng shop.</p><div class="important-tips"><span><b>Cùng shop:</b> chuyển link sản phẩm đầu tiên.</span><span><b>Khác shop:</b> chuyển link sản phẩm đầu tiên của mỗi shop.</span></div></div></article><article><span>5</span><div><h3>Sàn quyết định ghi nhận hoa hồng</h3><p>Hoa hồng được ghi nhận theo kết quả đối soát từ đối tác sàn thương mại điện tử.</p></div></article></div>`;
  notice.replaceWith(panel);
}
window.addEventListener('hashchange', addImportantPanel);
addImportantPanel();
