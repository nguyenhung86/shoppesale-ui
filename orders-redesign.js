function renderOrderSearch() {
  if ((location.hash.slice(1) || location.pathname.slice(1) || 'dashboard') !== 'orders') return;
  const app = document.querySelector('#app');
  if (app.querySelector('.order-search-view')) return;
  app.innerHTML = `<div class="order-search-view"><section class="order-search-card"><h1>Tra cứu đơn hàng</h1><p>Tra cứu nhanh hoa hồng theo Mã đơn hàng hoặc Tên Zalo của bạn.</p><label for="order-lookup">MÃ ĐƠN HÀNG HOẶC TÊN ZALO NHẬN HOÀN TIỀN</label><input id="order-lookup" value="" placeholder="Nhập mã đơn hàng hoặc tên Zalo" /><button id="order-search-button">Tra cứu ngay</button><div class="order-result" role="status"></div><div class="order-history"><b>LỊCH SỬ TÌM KIẾM GẦN ĐÂY:</b><div><button data-query="quyết ngọc">♟　quyết ngọc　×</button><button data-query="Kim Ngọc">♟　Kim Ngọc　×</button></div></div></section><section class="order-benefits"><article><span class="shield">♢</span><h2>An toàn bảo mật</h2><p>Thông tin tra cứu riêng tư</p></article><article><span class="lightning">ϟ</span><h2>Tra cứu nhanh</h2><p>Kiểm tra trong vài giây</p></article><article><span class="money-icon">$</span><h2>Hoàn tiền rõ ràng</h2><p>Hiển thị số tiền khách nhận</p></article></section></div>`;
  const input = app.querySelector('#order-lookup');
  const result = app.querySelector('.order-result');
  const lookup = () => { result.textContent = input.value.trim() ? `Đang tra cứu “${input.value.trim()}”. Kết quả sẽ hiển thị khi kết nối dữ liệu đơn hàng.` : 'Vui lòng nhập mã đơn hàng hoặc tên Zalo.'; };
  app.querySelector('#order-search-button').addEventListener('click', lookup);
  input.addEventListener('keydown', event => { if (event.key === 'Enter') lookup(); });
  app.querySelectorAll('[data-query]').forEach(button => button.addEventListener('click', () => { input.value = button.dataset.query; input.focus(); }));
}
window.addEventListener('hashchange', renderOrderSearch);
renderOrderSearch();
