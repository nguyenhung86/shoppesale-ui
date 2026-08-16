// Biến lưu trữ bộ nhớ đệm (Cache) đơn hàng tránh load đi load lại nhiều lần
let cachedOrders = null;
let cachedZaloId = null;

try {
  const initZaloId = localStorage.getItem('shoppesale_zalo_id');
  if (initZaloId) {
    const localCacheKey = "v2_orders_cache_" + String(initZaloId).trim().toLowerCase();
    const cachedDataStr = localStorage.getItem(localCacheKey);
    if (cachedDataStr) {
      const parsed = JSON.parse(cachedDataStr);
      if (parsed && parsed.success && Array.isArray(parsed.data)) {
        cachedOrders = parsed;
        window.cachedOrders = parsed;
        cachedZaloId = initZaloId;
      }
    }
  }
} catch(e) {}

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

function getOrderCategory(status, paymentStatus) {
  if (!status) return "pending";
  const cleaned = String(status).trim().toLowerCase();
  const payClean = String(paymentStatus || '').trim().toLowerCase();
  
  if (payClean === "đã tt" || payClean.includes("thanh toán")) {
    return "completed";
  }
  if (cleaned.includes("hủy") || cleaned.includes("invalid") || cleaned.includes("cancelled") || cleaned.includes("không đủ điều kiện") || cleaned.includes("đơn hủy")) {
    return "cancelled";
  }
  if (cleaned === "pending" || cleaned.includes("đang giao") || cleaned.includes("chờ giao") || cleaned.includes("đang xử lý") || cleaned.includes("processing") || cleaned.includes("shipping")) {
    return "pending";
  }
  if (cleaned.includes("hoàn thành") || cleaned.includes("completed") || cleaned.includes("waiting for payment") || cleaned.includes("thưởng gt")) {
    return "completed";
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
    const category = getOrderCategory(o.orderStatus, o.paymentStatus);
    
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
    let rawDate = o.orderDate || '';
    let dateStr = 'Không rõ ngày';
    if (rawDate) {
      let str = String(rawDate).trim();
      if (str.includes('GMT') || str.includes('T00:') || str.includes('Jan') || str.includes('Feb') || str.includes('Mar') || str.includes('Apr') || str.includes('May') || str.includes('Jun') || str.includes('Jul') || str.includes('Aug') || str.includes('Sep') || str.includes('Oct') || str.includes('Nov') || str.includes('Dec')) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          dateStr = `${yyyy}-${mm}-${dd}`;
        } else {
          dateStr = str;
        }
      } else {
        if (str.includes('T')) str = str.split('T')[0];
        if (str.includes(' ')) str = str.split(' ')[0];
        dateStr = str;
      }
    }
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

function isOrderCacheValid(cachedTimeMs) {
  if (!cachedTimeMs) return false;
  // Cho phép lưu bộ nhớ tạm RAM/Local tối đa 30 giây để mượt mà khi chuyển tab,
  // nhưng sau 30 giây sẽ luôn kết nối máy chủ tải đơn mới nhất tức thì cho khách hàng
  return (Date.now() - Number(cachedTimeMs)) < 30 * 1000;
}

function performSearch(query, forceRefresh = false) {
  const formatVND = val => Math.round(Number(val) || 0).toLocaleString("vi-VN") + " đ";
  
  const localCacheKey = "v2_orders_cache_" + String(query).trim().toLowerCase();
  const localTimeKey = "v2_orders_time_" + String(query).trim().toLowerCase();

  // 1. Luôn hiển thị ngay tức thì từ bộ nhớ đệm cache (0ms) để khi F5 không bao giờ bị chập chờn
  const cachedDataStr = localStorage.getItem(localCacheKey);
  let hasRenderedFromCache = false;
  if (cachedDataStr) {
    try {
      const parsedResponse = JSON.parse(cachedDataStr);
      if (parsedResponse && parsedResponse.success && Array.isArray(parsedResponse.data)) {
        cachedOrders = parsedResponse;
        window.cachedOrders = parsedResponse;
        cachedZaloId = query;
        renderDashboard(parsedResponse, query, formatVND);
        hasRenderedFromCache = true;
      }
    } catch(e) {}
  }
  
  // Nếu chưa có cache thì mới hiển thị vòng xoay loader
  if (!hasRenderedFromCache) {
    const app = document.querySelector('#app');
    if (app) {
      app.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px;">
          <div class="loader" style="display: block; width: 40px; height: 40px; border: 4px solid rgba(242, 83, 35, 0.1); border-radius: 50%; border-top-color: #f25323; animation: spin 1s linear infinite;"></div>
          <p style="margin-top: 15px; color: #7787a0; font-size: 14px; font-weight: 500;">Đang đồng bộ dữ liệu đơn hàng mới nhất...</p>
        </div>
        <style>
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
      `;
    }
  }
  
  // 2. Luôn kết nối máy chủ Google Sheets ngầm để lấy đơn hàng mới nhất
  const url = CONFIG.API_URL + "?action=unifiedSearch&query=" + encodeURIComponent(query) + "&_t=" + Date.now();
  fetch(url)
    .then(res => res.json())
    .then(response => {
      const currentPath = (location.hash.slice(1) || location.pathname.slice(1) || 'dashboard');
      if (currentPath !== 'orders') return;

      if (response && response.success) {
        cachedOrders = response;
        window.cachedOrders = response;
        cachedZaloId = query;
        
        try {
          localStorage.setItem(localCacheKey, JSON.stringify(response));
          localStorage.setItem(localTimeKey, String(Date.now()));
        } catch(e) {}
        
        renderDashboard(response, query, formatVND);
      }
    })
    .catch(err => {
      console.warn("Lỗi kết nối máy chủ khi nạp đơn ngầm:", err.message);
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
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day).getTime();
      }
    }
    if (dateStr.includes('-')) {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        return new Date(year, month, day).getTime();
      }
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
    const cat = getOrderCategory(o.orderStatus, o.paymentStatus);
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
      const filtered = ordersList.filter(o => getOrderCategory(o.orderStatus, o.paymentStatus) === tabName);
      renderOrders(filtered, formatVND);
    });
  });
  

  
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
  
  const initialFiltered = ordersList.filter(o => getOrderCategory(o.orderStatus, o.paymentStatus) === initialTab);
  renderOrders(initialFiltered, formatVND);
}

let isOrderResultsMounted = false;

function setupOrderResults(force = false) {
  const currentTab = (location.hash.slice(1) || location.pathname.slice(1) || 'dashboard');
  if (currentTab !== 'orders') {
    isOrderResultsMounted = false;
    return;
  }

  if (isOrderResultsMounted && !force) return;
  isOrderResultsMounted = true;
  
  const savedZaloId = localStorage.getItem('shoppesale_zalo_id');
  if (savedZaloId && savedZaloId !== 'null' && savedZaloId !== 'undefined' && savedZaloId.trim() !== '') {
    performSearch(savedZaloId, force);
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

window.addEventListener('hashchange', () => { isOrderResultsMounted = false; setupOrderResults(); });
window.addEventListener('popstate', () => { isOrderResultsMounted = false; setupOrderResults(); });

window.addEventListener('zalo_id_synced', (e) => {
  // Xóa cache khi ID Zalo thay đổi
  cachedOrders = null;
  cachedZaloId = null;
  isOrderResultsMounted = false;
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
// Kiểm tra định kỳ để ghi đè giao diện mẫu khi chuyển tab đã được chuyển vào syncRealDataToUI
function getJoinDate() {
  let joinDate = localStorage.getItem('shoppesale_join_date');
  if (!joinDate) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    joinDate = `${day}/${month}/${year}`;
    localStorage.setItem('shoppesale_join_date', joinDate);
  }
  return joinDate;
}

function syncRealDataToUI() {
  const user = getLoggedUser();
  if (!user) {
    // Cập nhật giao diện Khách vãng lai
    document.querySelectorAll('.wallet-user strong, .dash-wallet-head small, .profile-banner h1, .info-row b, .account-person h1, .account-info-item b').forEach(el => {
      if (el.tagName === 'SMALL') {
        el.textContent = 'XIN CHÀO, KHÁCH';
      } else {
        el.textContent = 'Khách';
      }
    });
    document.querySelectorAll('.dash-tier-badge, .wallet-tier, .rank').forEach(el => {
      el.textContent = 'Khách vãng lai';
    });
    document.querySelectorAll('.account-avatar, .wallet-user .avatar, .profile-banner .avatar, .user-area .avatar').forEach(el => {
      if (el.tagName === 'IMG') {
        el.src = '';
      } else {
        el.innerHTML = '<span style="font-size:16px;">👤</span>';
        el.style.background = '#e2e8f0';
        el.style.display = 'grid';
        el.style.placeItems = 'center';
      }
    });
    document.querySelectorAll('.dash-total strong, .dash-status b, .wallet-balance strong, .wallet-stats b').forEach(el => {
      el.textContent = '0 đ';
    });
    return;
  }
  
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
  
  const activeHash = (location.hash.slice(1) || location.pathname.slice(1) || 'dashboard') || 'dashboard';
  const savedZaloId = localStorage.getItem('shoppesale_zalo_id');

  // Luôn kích hoạt nạp đơn hàng ngay lập tức khi chuyển sang tab Đơn hàng (chỉ nạp 1 lần)
  if (activeHash === 'orders') {
    if (!isOrderResultsMounted && typeof setupOrderResults === 'function') {
      setupOrderResults();
    }
  } else {
    isOrderResultsMounted = false;
  }

  // Cập nhật trạng thái liên kết Zalo trên tab Tài khoản
  if (activeHash === 'account') {
    if (typeof updateZaloSyncUI === 'function') {
      updateZaloSyncUI(savedZaloId);
    }
  }

  // Tự động nạp dữ liệu từ localStorage vào RAM nếu RAM chưa có
  if (!cachedOrders && savedZaloId) {
    const localCacheKey = "v2_orders_cache_" + String(savedZaloId).trim().toLowerCase();
    const cachedDataStr = localStorage.getItem(localCacheKey);
    if (cachedDataStr) {
      try {
        const parsed = JSON.parse(cachedDataStr);
        if (parsed && parsed.success && Array.isArray(parsed.data)) {
          cachedOrders = parsed;
          window.cachedOrders = parsed;
          cachedZaloId = savedZaloId;
        }
      } catch(e) {}
    } else {
      fetchOrdersInBackground(savedZaloId);
    }
  }

  // 2. Nếu có dữ liệu đơn hàng trong cache, đồng bộ số liệu lên các tab
  if (cachedOrders && cachedOrders.success) {
    const ordersList = cachedOrders.data || [];
    
    let totalCommission = 0;
    let totalPending = 0;
    let totalCompleted = 0;
    let totalReceived = 0;
    
    ordersList.forEach(o => {
      const cat = getOrderCategory(o.orderStatus, o.paymentStatus);
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

    const setIfChanged = (selector, text) => {
      document.querySelectorAll(selector).forEach(el => {
        if (el && el.textContent !== String(text)) el.textContent = String(text);
      });
    };

    // Cập nhật tab TỔNG QUAN (Dashboard)
    if (activeHash === 'dashboard') {
      setIfChanged('.dash-total strong, .wallet-balance strong', formatVND(totalCommission));
      setIfChanged('.dash-status.processing b, .status-processing b', formatVND(totalPending));
      setIfChanged('.dash-status.completed b, .status-completed b', formatVND(totalCompleted));
      setIfChanged('.dash-status.received b, .status-received b', formatVND(totalReceived));
      setIfChanged('.dash-member-stats div:first-child b, .dashboard-counters div:first-child b, .dashboard-counters div:first-child p b', ordersList.length);
    }
    
    // Cập nhật tab TÀI KHOẢN (Account)
    if (activeHash === 'account') {
      setIfChanged('.account-balance-main strong, .hero-wallet .money', formatVND(totalCommission));
      setIfChanged('.account-quick-stats div:nth-child(1) b', ordersList.length);
      setIfChanged('.account-quick-stats div:nth-child(3) b', formatVND(totalPending));
      setIfChanged('.hero-wallet + .grid-3 article:first-child strong', ordersList.length + " đơn");
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

if (typeof pages !== 'undefined') {
  pages.orders = function() {
    setTimeout(() => {
      isOrderResultsMounted = false;
      if (typeof setupOrderResults === 'function') {
        setupOrderResults(true);
      }
    }, 0);
    return `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px;">
        <div class="loader" style="display: block; width: 40px; height: 40px; border: 4px solid rgba(242, 83, 35, 0.1); border-radius: 50%; border-top-color: #f25323; animation: spin 1s linear infinite;"></div>
        <p style="margin-top: 15px; color: #7787a0; font-size: 14px; font-weight: 500;">Đang đồng bộ dữ liệu đơn hàng mới nhất...</p>
      </div>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    `;
  };
}

// Tải ngầm đơn hàng trong nền để lấy số liệu sẵn sàng cho các tab khác
function fetchOrdersInBackground(zaloId) {
  if (!zaloId) return;
  
  const localCacheKey = "v2_orders_cache_" + String(zaloId).trim().toLowerCase();
  const localTimeKey = "v2_orders_time_" + String(zaloId).trim().toLowerCase();
  
  const cachedDataStr = localStorage.getItem(localCacheKey);
  if (cachedDataStr) {
    try {
      const parsedResponse = JSON.parse(cachedDataStr);
      if (parsedResponse && parsedResponse.success && Array.isArray(parsedResponse.data)) {
        cachedOrders = parsedResponse;
        window.cachedOrders = parsedResponse;
        cachedZaloId = zaloId;
        syncRealDataToUI();
      }
    } catch(e) {}
  }

  const url = CONFIG.API_URL + "?action=unifiedSearch&query=" + encodeURIComponent(zaloId) + "&_t=" + Date.now();
  fetch(url)
    .then(res => res.json())
    .then(response => {
      if (response && response.success) {
        cachedOrders = response;
        window.cachedOrders = response;
        cachedZaloId = zaloId;
        
        try {
          localStorage.setItem(localCacheKey, JSON.stringify(response));
          localStorage.setItem(localTimeKey, String(Date.now()));
        } catch(e) {}

        syncRealDataToUI(); // Cập nhật số liệu tức thì lên các tab
      }
    })
    .catch(err => {
      console.warn("Lỗi tải ngầm đơn hàng:", err.message);
    });
}

// Xuất các hàm này ra phạm vi toàn cục (window) để các file khác (auth.js, app.js) gọi được
window.syncRealDataToUI = syncRealDataToUI;
window.fetchOrdersInBackground = fetchOrdersInBackground;

// Kích hoạt đồng bộ số liệu ngay lập tức khi file tải xong
syncRealDataToUI();
window.addEventListener('popstate', syncRealDataToUI);
window.addEventListener('hashchange', syncRealDataToUI);
document.addEventListener('DOMContentLoaded', syncRealDataToUI);
setInterval(syncRealDataToUI, 400);
