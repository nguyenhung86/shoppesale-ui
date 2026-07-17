// Biến lưu trữ bộ nhớ đệm (Cache) đơn hàng tránh load đi load lại nhiều lần
let cachedOrders = null;
let cachedZaloId = null;

function getPlatform(orderId) {
  if (!orderId) return "Shopee";
  const cleaned = String(orderId).trim();
  if (!/^\d+$/.test(cleaned)) {
    return "Shopee";
  }
  if (cleaned.length === 18 || cleaned.length === 19) {
    return "TikTok";
  }
  if (cleaned.length === 15 || cleaned.length === 16) {
    return "Lazada";
  }
  return "Shopee";
}

function getOrderCategory(status) {
  if (!status) return "pending";
  const cleaned = status.toLowerCase();
  if (cleaned.includes("hoàn thành") || cleaned.includes("completed")) {
    return "completed";
  }
  if (cleaned.includes("hủy") || cleaned.includes("invalid") || cleaned.includes("đơn hủy")) {
    return "cancelled";
  }
  return "pending";
}

function renderOrders(filteredOrders, formatVND) {
  const listContainer = document.querySelector('.order-list');
  if (!listContainer) return;
  
  if (filteredOrders.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align:center; padding:40px 20px; border:1px solid #e7e9ee; border-radius:18px; background:#fff; box-shadow:0 4px 10px rgba(0,0,0,0.02);">
        <p style="color:#8490a3; font-size:13px; font-weight: 500;">Không có đơn hàng nào trong mục này.</p>
      </div>
    `;
    return;
  }
  
  listContainer.innerHTML = filteredOrders.map(o => {
    const platform = getPlatform(o.orderId);
    const category = getOrderCategory(o.orderStatus);
    
    let borderLeftColor = '#18ad60'; // completed
    let statusText = 'ĐÃ HOÀN TẤT';
    let badgeStyle = 'border: 1px solid #bfead0; background: #eafaf1; color: #19a45c;';
    
    if (category === 'pending') {
      borderLeftColor = '#e89616';
      statusText = 'ĐANG GIAO';
      badgeStyle = 'border: 1px solid #f6e1a1; background: #fffdf3; color: #e89616;';
    } else if (category === 'cancelled') {
      borderLeftColor = '#d93838';
      statusText = 'ĐÃ HỦY';
      badgeStyle = 'border: 1px solid #f8d7da; background: #fdf3f4; color: #d93838;';
    }
    
    let platformStyle = 'border: 1px solid #ffd5c8; background: #fff3ef; color: #f45a25;'; // Shopee
    if (platform === 'Lazada') {
      platformStyle = 'border: 1px solid #d6e2ff; background: #f3f7ff; color: #2864de;';
    } else if (platform === 'TikTok') {
      platformStyle = 'border: 1px solid #e1e3e8; background: #f4f5f8; color: #111111;';
    }
    
    const cashbackAmount = formatVND(o.commission);
    const dateStr = o.orderDate || 'Không rõ ngày';
    const itemName = o.itemName || 'Sản phẩm hoàn tiền';
    const payStatusText = o.paymentStatus === 'Đã TT' ? '✓ Đã thanh toán' : '⏳ Chờ thanh toán';
    
    return `
      <article style="border-left: 4px solid ${borderLeftColor}; padding: 16px 18px; border-top: 1px solid #e7e9ee; border-right: 1px solid #e7e9ee; border-bottom: 1px solid #e7e9ee; border-radius: 16px; background: #fff; box-shadow: 0 3px 8px rgba(23,32,51,0.04); margin-bottom: 12px;">
        <div class="order-badges" style="display: flex; gap: 7px;">
          <span style="${badgeStyle} padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; font-style: normal;">${statusText}</span>
          <em style="${platformStyle} padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; font-style: normal;">${platform}</em>
        </div>
        <h3 style="margin: 12px 0 6px; font-size: 14px; line-height: 1.45; font-weight: 600; color: #243149;">${itemName}</h3>
        <p style="margin: 0; color: #8490a3; font-size: 11px;">Mã đơn: ${o.orderId}</p>
        <footer style="display: flex; align-items: center; gap: 15px; margin-top: 13px; padding-top: 12px; border-top: 1px solid #e8ebf0; color: #6e7e94; font-size: 12px;">
          <span>▣　${dateStr}</span>
          <b style="margin-left: auto; color: ${category === 'cancelled' ? '#8490a3' : '#18ad60'}; font-size: 15px; font-weight: 700;">+${cashbackAmount}</b>
          <em style="padding: 4px 8px; border-radius: 12px; font-size: 10px; font-style: normal; font-weight: 600; background: ${o.paymentStatus === 'Đã TT' ? '#e9faef' : '#fff3e0'}; color: ${o.paymentStatus === 'Đã TT' ? '#159b51' : '#ef6c00'};">${payStatusText}</em>
        </footer>
      </article>
    `;
  }).join('');
}

function performSearch(query, forceRefresh = false) {
  const formatVND = val => Math.round(Number(val) || 0).toLocaleString("vi-VN") + " đ";
  
  // 1. Sử dụng dữ liệu đệm nếu có và không yêu cầu tải lại cưỡng bức
  if (!forceRefresh && cachedOrders && cachedZaloId === query) {
    renderDashboard(cachedOrders, query, formatVND);
    return;
  }

  const app = document.querySelector('#app');
  if (app) {
    app.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px;">
        <div class="loader" style="display: block; width: 40px; height: 40px; border: 4px solid rgba(242, 83, 35, 0.1); border-radius: 50%; border-top-color: #f25323; animation: spin 1s linear infinite;"></div>
        <p style="margin-top: 15px; color: #7787a0; font-size: 14px; font-weight: 500;">Đang đồng bộ dữ liệu đơn hàng...</p>
      </div>
      <style>
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    `;
  }
  
  const url = CONFIG.API_URL + "?action=unifiedSearch&query=" + encodeURIComponent(query);
  fetch(url)
    .then(res => res.json())
    .then(response => {
      // CHỐT CHẶN BẢO VỆ: Nếu người dùng đã chuyển tab khác trong lúc đang tải dữ liệu thì không ghi đè giao diện nữa
      if ((location.hash.slice(1) || location.pathname.slice(1) || 'dashboard') !== 'orders') return;

      if (response.success) {
        // Lưu trữ vào bộ nhớ đệm
        cachedOrders = response;
        window.cachedOrders = response; // Xuất ra window cho biểu đồ
        cachedZaloId = query;
        
        renderDashboard(response, query, formatVND);
      } else {
        if (app) {
          app.innerHTML = `<div style="max-width:600px; margin:50px auto; padding:20px; text-align:center; color:#d93838; font-weight:600;">Lỗi: ${response.error || 'Không thể đồng bộ dữ liệu.'}</div>`;
        }
      }
    })
    .catch(err => {
      console.error(err);
      if ((location.hash.slice(1) || location.pathname.slice(1) || 'dashboard') !== 'orders') return;
      if (app) {
        app.innerHTML = `<div style="max-width:600px; margin:50px auto; padding:20px; text-align:center; color:#d93838; font-weight:600;">Lỗi kết nối máy chủ. Vui lòng thử lại sau.</div>`;
      }
    });
}

function renderDashboard(response, query, formatVND) {
  const app = document.querySelector('#app');
  if (!app) return;

  const ordersList = response.data || [];
  
  // Sắp xếp đơn hàng từ mới nhất đến cũ nhất theo ngày (DD/MM/YYYY)
  const parseOrderDate = (dateVal) => {
    if (!dateVal) return 0;
    const dateStr = String(dateVal).trim();
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day).getTime();
    }
    const parsed = Date.parse(dateStr);
    return isNaN(parsed) ? 0 : parsed;
  };
  ordersList.sort((a, b) => parseOrderDate(b.orderDate) - parseOrderDate(a.orderDate));
  
  if (ordersList.length === 0) {
    app.innerHTML = `
      <div style="max-width: 600px; margin: 50px auto; padding: 40px 20px; text-align: center; background: #fff; border-radius: 20px; box-shadow: 0 10px 24px rgba(23,32,51,0.05); border: 1px solid #e8e9ef;">
        <div style="font-size: 40px; margin-bottom: 15px;">📦</div>
        <h2 style="font-size: 20px; font-weight: 800; color: #15233a; margin-bottom: 8px;">Chưa có đơn hàng nào</h2>
        <p style="color: #7787a0; font-size: 14px; margin-bottom: 20px; line-height: 1.5;">Tài khoản Zalo của bạn chưa phát sinh đơn hàng hoàn tiền nào.</p>
        <a href="#convert" style="display: inline-block; padding: 12px 24px; background: #ff5722; color: #fff; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 14px;">Chuyển link mua ngay</a>
      </div>
    `;
    return;
  }
  
  // Tính toán số liệu thống kê
  let totalCommission = 0;
  let totalPending = 0;
  let totalCompleted = 0;
  let totalReceived = 0;
  
  let completedCount = 0;
  let pendingCount = 0;
  let cancelledCount = 0;
  
  ordersList.forEach(o => {
    const cat = getOrderCategory(o.orderStatus);
    const commission = Number(o.commission) || 0;
    const isPaid = o.paymentStatus === 'Đã TT';
    
    if (cat === 'completed') completedCount++;
    else if (cat === 'pending') pendingCount++;
    else if (cat === 'cancelled') cancelledCount++;
    
    if (cat !== 'cancelled') {
      totalCommission += commission;
      if (isPaid) {
        totalReceived += commission;
      } else {
        if (cat === 'pending') {
          totalPending += commission;
        } else if (cat === 'completed') {
          totalCompleted += commission;
        }
      }
    }
  });
  
  app.innerHTML = `
    <div class="order-results" style="width: 100%; max-width: 1016px; margin: 0 auto; padding-top: 20px;">
      <article class="commission-summary" style="margin-bottom: 20px; padding: 20px; border-radius: 20px; background: #fff; box-shadow: 0 10px 24px rgba(25,35,52,0.06); border: 1px solid #f6d3c0; background: linear-gradient(135deg, #fff 0%, #fffaf6 100%);">
        <h2 style="display: flex; align-items: center; gap: 9px; min-height: 31px; padding-left: 11px; border-left: 3px solid #ff762d; font-size: 16px; font-weight: 700; margin: 0 0 16px;">
          <span class="order-summary-title-text" style="color: #17233b; font-size: 17px; font-weight: 800;">Tổng quan hoa hồng</span>
          <button id="refresh-orders-btn" title="Cập nhật dữ liệu mới" style="margin-left: auto; background: transparent; border: 0; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px; color: #ff5722; padding: 6px 12px; border-radius: 8px; font-weight: bold; border: 1px solid #ffebe5; transition: all 0.2s;" onmouseover="this.style.background='#fff0eb'" onmouseout="this.style.background='transparent'">
            🔄 Làm mới
          </button>
        </h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 15px;">
          <span class="total" style="display: block; padding: 13px 15px; border: 1px solid #ffd9cd; border-radius: 14px; background: #fff7f4; box-shadow: inset 0 3px 0 #ff6a38, 0 3px 8px rgba(25,35,52,0.04);"><small style="display: block; color: #8590a2; font-size: 10px; font-weight: 800; letter-spacing: 0.02em;">TỔNG HOA HỒNG</small><b style="display: block; margin-top: 4px; font-size: 21px; color: #f24f25; letter-spacing: -0.4px;">${formatVND(totalCommission)}</b></span>
          <span class="pending" style="display: block; padding: 13px 15px; border: 1px solid #f6e1a1; border-radius: 14px; background: #fffdf3; box-shadow: inset 0 3px 0 #f4ad28, 0 3px 8px rgba(25,35,52,0.04);"><small style="display: block; color: #8590a2; font-size: 10px; font-weight: 800; letter-spacing: 0.02em;">ĐANG CHỜ XỬ LÝ</small><b style="display: block; margin-top: 4px; font-size: 21px; color: #e89616; letter-spacing: -0.4px;">${formatVND(totalPending)}</b></span>
          <span class="done" style="display: block; padding: 13px 15px; border: 1px solid #d3eee0; border-radius: 14px; background: #f2fbf6; box-shadow: inset 0 3px 0 #21b565, 0 3px 8px rgba(25,35,52,0.04);"><small style="display: block; color: #8590a2; font-size: 10px; font-weight: 800; letter-spacing: 0.02em;">ĐÃ HOÀN THÀNH</small><b style="display: block; margin-top: 4px; font-size: 21px; color: #18a45b; letter-spacing: -0.4px;">${formatVND(totalCompleted)}</b></span>
          <span class="received" style="display: block; padding: 13px 15px; border: 1px solid #d6e2ff; border-radius: 14px; background: #f3f7ff; box-shadow: inset 0 3px 0 #3975ea, 0 3px 8px rgba(25,35,52,0.04);"><small style="display: block; color: #8590a2; font-size: 10px; font-weight: 800; letter-spacing: 0.02em;">ĐÃ NHẬN</small><b style="display: block; margin-top: 4px; font-size: 21px; color: #2864de; letter-spacing: -0.4px;">${formatVND(totalReceived)}</b></span>
        </div>
      </article>
      
      <h2 class="order-list-title" style="margin: 24px 0 11px; font-size: 18px; font-weight: 800; color: #172033; display: flex; align-items: center; gap: 9px; padding-left: 12px; border-left: 4px solid #ff5d1d; letter-spacing: -0.2px;">Danh sách đơn hàng của bạn</h2>
      
      <div class="order-tabs" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 4px; border-radius: 12px; background: #ececf3; border: 1px solid #f0e5df; background: #fff8f4;">
        <button class="tab-btn" data-tab="completed" style="padding: 10px; border: 0; border-radius: 9px; background: transparent; color: #3c4960; font: 700 12px 'Be Vietnam Pro', sans-serif; cursor: pointer;">Hoàn tất <b style="margin-left: 5px; padding: 2px 6px; border-radius: 10px; background: #f1f1f5; font-size: 10px;">${completedCount}</b></button>
        <button class="tab-btn" data-tab="pending" style="padding: 10px; border: 0; border-radius: 9px; background: transparent; color: #3c4960; font: 700 12px 'Be Vietnam Pro', sans-serif; cursor: pointer;">Đang giao <b style="margin-left: 5px; padding: 2px 6px; border-radius: 10px; background: #f1f1f5; font-size: 10px;">${pendingCount}</b></button>
        <button class="tab-btn" data-tab="cancelled" style="padding: 10px; border: 0; border-radius: 9px; background: transparent; color: #3c4960; font: 700 12px 'Be Vietnam Pro', sans-serif; cursor: pointer;">Đã hủy <b style="margin-left: 5px; padding: 2px 6px; border-radius: 10px; background: #f1f1f5; font-size: 10px;">${cancelledCount}</b></button>
      </div>
      <div class="order-list" style="display: grid; gap: 12px; margin-top: 16px;"></div>
    </div>
  `;
  
  // Liên kết sự kiện click đổi tab đơn hàng
  const tabs = app.querySelectorAll('.order-tabs button');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active');
        t.style.background = 'transparent';
        t.style.color = '#3c4960';
        t.style.boxShadow = 'none';
        const badge = t.querySelector('b');
        if (badge) badge.style.background = '#f1f1f5';
      });
      
      tab.classList.add('active');
      tab.style.background = '#fff';
      tab.style.color = '#f25323';
      tab.style.boxShadow = '0 3px 9px rgba(233,91,34,0.12)';
      const activeBadge = tab.querySelector('b');
      if (activeBadge) activeBadge.style.background = '#fff0eb';
      
      const tabName = tab.dataset.tab;
      const filtered = ordersList.filter(o => getOrderCategory(o.orderStatus) === tabName);
      renderOrders(filtered, formatVND);
    });
  });
  
  // Gắn sự kiện cho nút Làm mới
  const refreshBtn = app.querySelector('#refresh-orders-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      performSearch(query, true); // Bắt buộc tải lại (không dùng cache)
    });
  }
  
  // Xác định tab hiển thị mặc định
  let initialTab = 'completed';
  if (completedCount === 0) {
    if (pendingCount > 0) initialTab = 'pending';
    else if (cancelledCount > 0) initialTab = 'cancelled';
  }
  
  tabs.forEach(t => {
    if (t.dataset.tab === initialTab) {
      t.classList.add('active');
      t.style.background = '#fff';
      t.style.color = '#f25323';
      t.style.boxShadow = '0 3px 9px rgba(233,91,34,0.12)';
      const badge = t.querySelector('b');
      if (badge) badge.style.background = '#fff0eb';
    } else {
      t.classList.remove('active');
      t.style.background = 'transparent';
      t.style.color = '#3c4960';
      t.style.boxShadow = 'none';
      const badge = t.querySelector('b');
      if (badge) badge.style.background = '#f1f1f5';
    }
  });
  
  const initialFiltered = ordersList.filter(o => getOrderCategory(o.orderStatus) === initialTab);
  renderOrders(initialFiltered, formatVND);
}

function setupOrderResults() {
  if ((location.hash.slice(1) || location.pathname.slice(1) || 'dashboard') !== 'orders') return;
  
  const savedZaloId = localStorage.getItem('shoppesale_zalo_id');
  if (savedZaloId && savedZaloId !== 'null' && savedZaloId !== 'undefined' && savedZaloId.trim() !== '') {
    performSearch(savedZaloId);
  } else {
    const app = document.querySelector('#app');
    if (app) {
      app.innerHTML = `
        <div class="empty">
          <div class="empty-icon" style="filter: drop-shadow(0 4px 10px rgba(242, 83, 35, 0.15)); font-size: 48px; margin-bottom: 15px;">⚡</div>
          <h2>Kết Nối Tài Khoản Zalo</h2>
          <p class="subtitle" style="max-width: 480px; margin: 8px auto 20px; line-height: 1.6;">Để bắt đầu tích lũy hoa hồng, vui lòng liên kết Zalo ID cá nhân giúp hệ thống tự động đồng bộ danh sách đơn hàng và thông tin hoàn tiền của bạn.</p>
          <a class="button" href="#account">Liên kết Zalo ngay</a>
        </div>
      `;
    }
  }
}

window.addEventListener('hashchange', setupOrderResults);

window.addEventListener('zalo_id_synced', (e) => {
  // Xóa cache khi ID Zalo thay đổi
  cachedOrders = null;
  cachedZaloId = null;
  if ((location.hash.slice(1) || location.pathname.slice(1) || 'dashboard') === 'orders') {
    performSearch(e.detail, true);
  }
});

setupOrderResults();

// Tự động tải ngầm đơn hàng khi tải trang ở các tab ngoài tab Đơn hàng (như Tổng quan)
const initialZaloId = localStorage.getItem('shoppesale_zalo_id');
if (initialZaloId && initialZaloId !== 'null' && initialZaloId !== 'undefined' && initialZaloId.trim() !== '') {
  if ((location.hash.slice(1) || location.pathname.slice(1) || 'dashboard') !== 'orders') {
    fetchOrdersInBackground(initialZaloId);
  }
}
// Kiểm tra định kỳ để ghi đè giao diện mẫu khi chuyển tab
let checkInterval = setInterval(() => {
  if ((location.hash.slice(1) || location.pathname.slice(1) || 'dashboard') === 'orders') {
    const resultsContainer = document.querySelector('.order-results');
    const noticeContainer = document.querySelector('.empty');
    const loaderContainer = document.querySelector('.loader');
    if (!resultsContainer && !noticeContainer && !loaderContainer) {
      setupOrderResults();
    }
  }
}, 300);

// ĐỒNG BỘ DỮ LIỆU ĐƠN HÀNG THẬT SANG TẤT CẢ CÁC TAB KHÁC
function getJoinDate() {
  let date = localStorage.getItem('shoppesale_join_date');
  if (!date) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    date = `${day}/${month}/${year}`;
    localStorage.setItem('shoppesale_join_date', date);
  }
  return date;
}

function syncRealDataToUI() {
  const user = getLoggedUser();
  if (!user) return;
  
  const formatVND = val => Math.round(Number(val) || 0).toLocaleString("vi-VN") + " đ";

  // 1. Cập nhật Tên hiển thị trên toàn trang web (Topbar, Dashboard, Account)
  document.querySelectorAll('.wallet-user strong, .dash-wallet-head small, .profile-banner h1, .info-row b, .account-person h1, .account-info-item b').forEach(el => {
    if (el.textContent.includes("Hồng Vinh")) {
      el.textContent = el.textContent.replace("Hồng Vinh", user.name);
    }
  });

  // 1d. Đồng bộ ảnh đại diện Google (Avatar) vào các khu vực trên trang
  if (user.picture) {
    document.querySelectorAll('.account-avatar, .wallet-user .avatar, .profile-banner .avatar, .user-area .avatar').forEach(el => {
      if (el.tagName === 'IMG') {
        el.src = user.picture;
      } else {
        const style = window.getComputedStyle(el);
        const radius = style.borderRadius || '50%';
        el.innerHTML = `<img src="${user.picture}" alt="${user.name}" style="width:100%; height:100%; object-fit:cover; border-radius:${radius};">`;
        el.style.padding = '0';
        el.style.overflow = 'hidden';
        el.style.display = 'inline-flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.background = 'transparent';
      }
    });
  }

  // 1c. Cập nhật Ngày tham gia hiển thị trên trang Web (Dashboard, Account)
  const joinDate = getJoinDate();
  document.querySelectorAll('.wallet-user small, .account-person p, .dash-member-stats div:nth-child(3) b').forEach(el => {
    if (el.textContent.includes("11/07/2026")) {
      el.textContent = el.textContent.replace("11/07/2026", joinDate);
    }
  });
  
  // Cập nhật thẻ stat Từ ngày trên trang tài khoản cũ
  document.querySelectorAll('.card.summary').forEach(card => {
    const small = card.querySelector('small');
    const strong = card.querySelector('strong');
    if (small && strong && (small.textContent === 'Từ ngày' || small.textContent === 'Từ')) {
      strong.textContent = joinDate;
    }
  });

  // 1b. Cập nhật Số điện thoại hiển thị trên trang Tài khoản
  const savedPhone = localStorage.getItem('shoppesale_phone') || "";
  const phoneValEl = document.querySelector('.account-info-list button:nth-child(2) b, .info-row:nth-child(4) b');
  if (phoneValEl) {
    if (savedPhone) {
      phoneValEl.textContent = savedPhone;
      phoneValEl.classList.remove('is-empty');
      phoneValEl.style.color = '#15233a';
    } else {
      phoneValEl.textContent = 'Thêm số điện thoại';
      phoneValEl.classList.add('is-empty');
      phoneValEl.style.color = '#9aa5b5';
    }
  }
  
  console.log("syncRealDataToUI: Bắt đầu đồng bộ số liệu, cachedOrders:", cachedOrders);
  // 2. Nếu có dữ liệu đơn hàng trong cache, đồng bộ số liệu
  if (cachedOrders && cachedOrders.success) {
    const ordersList = cachedOrders.data || [];
    
    let totalCommission = 0;
    let totalPending = 0;
    let totalCompleted = 0;
    let totalReceived = 0;
    
    ordersList.forEach(o => {
      const cat = getOrderCategory(o.orderStatus);
      const commission = Number(o.commission) || 0;
      const isPaid = o.paymentStatus === 'Đã TT';
      
      if (cat !== 'cancelled') {
        totalCommission += commission;
        if (isPaid) {
          totalReceived += commission;
        } else {
          if (cat === 'pending') {
            totalPending += commission;
          } else if (cat === 'completed') {
            totalCompleted += commission;
          }
        }
      }
    });

    const activeHash = (location.hash.slice(1) || location.pathname.slice(1) || 'dashboard') || 'dashboard';

    // Cập nhật tab TỔNG QUAN (Dashboard)
    if (activeHash === 'dashboard') {
      // 1. Cập nhật cho giao diện Redesign mới (nếu có)
      const totalEl = document.querySelector('.dash-total strong');
      if (totalEl) totalEl.textContent = formatVND(totalCommission);
      
      const processingEl = document.querySelector('.dash-status.processing b');
      if (processingEl) processingEl.textContent = formatVND(totalPending);
      
      const completedEl = document.querySelector('.dash-status.completed b');
      if (completedEl) completedEl.textContent = formatVND(totalCompleted);
      
      const receivedEl = document.querySelector('.dash-status.received b');
      if (receivedEl) receivedEl.textContent = formatVND(totalReceived);
      
      // Số đơn hàng góc phải
      const totalOrdersEl = document.querySelector('.dash-member-stats div:first-child b');
      if (totalOrdersEl) totalOrdersEl.textContent = ordersList.length;

      // 2. Cập nhật cho giao diện gốc cũ (nếu đang hiển thị như trong hình)
      const origTotalEl = document.querySelector('.wallet-balance strong');
      if (origTotalEl) origTotalEl.textContent = formatVND(totalCommission);
      
      const origProcessingEl = document.querySelector('.status-processing b');
      if (origProcessingEl) origProcessingEl.textContent = formatVND(totalPending);
      
      const origCompletedEl = document.querySelector('.status-completed b');
      if (origCompletedEl) origCompletedEl.textContent = formatVND(totalCompleted);
      
      const origReceivedEl = document.querySelector('.status-received b');
      if (origReceivedEl) origReceivedEl.textContent = formatVND(totalReceived);
      
      const origTotalOrdersEl = document.querySelector('.dashboard-counters div:first-child b');
      if (origTotalOrdersEl) origTotalOrdersEl.textContent = ordersList.length;
    }
    
    // Cập nhật tab TÀI KHOẢN (Account)
    if (activeHash === 'account') {
      // 1. Cập nhật cho giao diện Redesign mới (nếu có)
      const balanceEl = document.querySelector('.account-balance-card .account-balance-main strong');
      if (balanceEl) balanceEl.textContent = formatVND(totalCommission);
      
      const quickStats = document.querySelectorAll('.account-quick-stats b');
      if (quickStats.length === 3) {
        quickStats[0].textContent = ordersList.length; // Tổng đơn hàng
        // Đã giới thiệu: giữ nguyên
        quickStats[2].textContent = formatVND(totalPending); // Đang chờ hoàn
      }

      // 2. Cập nhật cho giao diện gốc cũ (nếu đang hiển thị)
      const walletBalanceEl = document.querySelector('.hero-wallet .money');
      if (walletBalanceEl) walletBalanceEl.textContent = formatVND(totalCommission);
      
      const statsGrid = document.querySelector('.hero-wallet + .grid-3');
      if (statsGrid) {
        const orderStatEl = statsGrid.querySelector('article:first-child strong');
        if (orderStatEl) orderStatEl.textContent = ordersList.length + " đơn";
      }

      // 3. Đồng bộ trạng thái liên kết Zalo trên giao diện Account
      const savedZaloId = localStorage.getItem('shoppesale_zalo_id');
      if (typeof updateZaloSyncUI === 'function') {
        updateZaloSyncUI(savedZaloId);
      }
    }

    // Cập nhật tab XẾP HẠNG (Leaderboard)
    if (activeHash === 'ranking') {
      if (typeof enhanceLeaderboard === 'function') {
        enhanceLeaderboard();
      }
    }
    
    // Vẽ lại biểu đồ doanh thu theo tháng bằng dữ liệu thật
    if (typeof window.updateCommissionRange === 'function') {
      window.updateCommissionRange();
    }
  }
}

// Tải ngầm đơn hàng trong nền để lấy số liệu sẵn sàng cho các tab khác
function fetchOrdersInBackground(zaloId) {
  console.log("fetchOrdersInBackground: Bắt đầu tải ngầm đơn hàng cho Zalo ID:", zaloId);
  const url = CONFIG.API_URL + "?action=unifiedSearch&query=" + encodeURIComponent(zaloId);
  fetch(url)
    .then(res => res.json())
    .then(response => {
      console.log("fetchOrdersInBackground: Tải ngầm hoàn tất, phản hồi:", response);
      if (response.success) {
        cachedOrders = response;
        window.cachedOrders = response; // Xuất ra window cho biểu đồ dùng
        cachedZaloId = zaloId;
        syncRealDataToUI(); // Cập nhật giao diện ngay lập tức
      }
    })
    .catch(err => {
      console.error("Lỗi tải ngầm đơn hàng:", err);
    });
}

// Xuất các hàm này ra phạm vi toàn cục (window) để các file khác (auth.js, app.js) gọi được
window.syncRealDataToUI = syncRealDataToUI;
window.fetchOrdersInBackground = fetchOrdersInBackground;
