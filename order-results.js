// Biến lưu trữ bộ nhớ đệm (Cache) đơn hàng & bill chuyển khoản tránh load đi load lại nhiều lần
let cachedOrders = null;
let cachedZaloId = null;
let cachedTransfers = null;

try {
  const initZaloId = localStorage.getItem('shoppesale_zalo_id');
  if (initZaloId) {
    const cleanId = String(initZaloId).trim().toLowerCase();
    const localCacheKey = "v2_orders_cache_" + cleanId;
    const cachedDataStr = localStorage.getItem(localCacheKey);
    if (cachedDataStr) {
      const parsed = JSON.parse(cachedDataStr);
      if (parsed && parsed.success && Array.isArray(parsed.data)) {
        cachedOrders = parsed;
        window.cachedOrders = parsed;
        cachedZaloId = initZaloId;
      }
    }
    const localTransfersKey = "v2_transfers_cache_" + cleanId;
    const cachedTransfersStr = localStorage.getItem(localTransfersKey);
    if (cachedTransfersStr) {
      const parsedT = JSON.parse(cachedTransfersStr);
      if (Array.isArray(parsedT)) {
        cachedTransfers = parsedT;
        window.cachedTransfers = parsedT;
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
  let rawStatus = status;
  let rawPayment = paymentStatus;
  if (status && typeof status === 'object') {
    rawPayment = status.paymentStatus;
    rawStatus = status.status || status.orderStatus || status.checkout_status;
  }
  
  const payClean = String(rawPayment || '').trim().toLowerCase();
  if (payClean === "đã tt" || payClean.includes("thanh toán") || payClean.includes("paid")) {
    return "completed";
  }

  if (!rawStatus) return "pending";
  const cleaned = String(rawStatus).trim().toLowerCase();
  
  if (cleaned.includes("hủy") || cleaned.includes("invalid") || cleaned.includes("cancelled") || cleaned.includes("canceled") || cleaned.includes("không đủ điều kiện") || cleaned.includes("đơn hủy")) {
    return "cancelled";
  }
  if (cleaned.includes("hoàn thành") || cleaned.includes("completed") || cleaned.includes("waiting for payment") || cleaned.includes("waiting_for_payment") || cleaned.includes("thưởng gt") || cleaned.includes("thành công") || cleaned.includes("hoàn tất")) {
    return "completed";
  }
  if (cleaned === "pending" || cleaned.includes("đang giao") || cleaned.includes("chờ giao") || cleaned.includes("đang xử lý") || cleaned.includes("processing") || cleaned.includes("shipping") || cleaned.includes("chờ")) {
    return "pending";
  }
  return "pending";
}

function parseOrderDateObj(dateVal) {
  if (!dateVal) return null;
  const str = String(dateVal).trim();
  const spaceParts = str.split(' ');
  const datePart = spaceParts[0];
  const timePart = spaceParts[1] || '';
  let hours = 0, minutes = 0, seconds = 0;
  if (timePart && timePart.includes(':')) {
    const tParts = timePart.split(':');
    hours = parseInt(tParts[0], 10) || 0;
    minutes = parseInt(tParts[1], 10) || 0;
    seconds = parseInt(tParts[2], 10) || 0;
  }

  if (datePart.includes('/')) {
    const parts = datePart.split('/');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10), hours, minutes, seconds);
    }
  }
  if (datePart.includes('-')) {
    const parts = datePart.split('T')[0].split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), hours, minutes, seconds);
      } else if (parts[2].length === 4) {
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10), hours, minutes, seconds);
      }
    }
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

// Tính toán dãy số phân trang (Tối đa 5 nút số, chuẩn mẫu giao diện)
function getPaginationRange(current, total) {
  if (total <= 1) return [];
  const maxButtons = 5;
  let start = Math.max(1, current - Math.floor(maxButtons / 2));
  let end = start + maxButtons - 1;
  if (end > total) {
    end = total;
    start = Math.max(1, end - maxButtons + 1);
  }
  const pages = [];
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
}

// Render thanh phân trang chuẩn theo ảnh mẫu
function renderOrderPagination(currentPage, totalPages, totalItems) {
  const paginationContainer = document.querySelector('#order-pagination');
  if (!paginationContainer) return;

  if (totalPages <= 1 || totalItems <= 10) {
    paginationContainer.innerHTML = '';
    return;
  }

  const pages = getPaginationRange(currentPage, totalPages);
  const isFirst = currentPage === 1;
  const isLast = currentPage === totalPages;

  let html = `
    <div class="deals-pagination-bar" role="navigation" aria-label="Phân trang đơn hàng">
      <button 
        type="button" 
        class="deals-page-btn nav-btn ${isFirst ? 'disabled' : ''}" 
        ${isFirst ? 'disabled' : ''} 
        onclick="${isFirst ? 'return false;' : `window.goToOrderPage(${currentPage - 1})`}"
        aria-label="Trang trước"
      >
        « Trước
      </button>
  `;

  pages.forEach(p => {
    const isActive = p === currentPage;
    html += `
      <button 
        type="button" 
        class="deals-page-btn ${isActive ? 'active' : ''}" 
        onclick="window.goToOrderPage(${p})"
        aria-label="Trang ${p}"
        ${isActive ? 'aria-current="page"' : ''}
      >
        ${p}
      </button>
    `;
  });

  html += `
      <button 
        type="button" 
        class="deals-page-btn nav-btn ${isLast ? 'disabled' : ''}" 
        ${isLast ? 'disabled' : ''} 
        onclick="${isLast ? 'return false;' : `window.goToOrderPage(${currentPage + 1})`}"
        aria-label="Trang sau"
      >
        Sau »
      </button>
    </div>
  `;

  paginationContainer.innerHTML = html;
}

function renderOrders(filteredOrders, formatVND) {
  const listContainer = document.querySelector('.order-list');
  if (!listContainer) return;
  
  if (filteredOrders.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align:center; padding:36px 20px; border:1px solid #e7e9ee; border-radius:18px; background:#fff; box-shadow:0 4px 10px rgba(0,0,0,0.02);">
        <div style="font-size: 28px; margin-bottom: 8px;">📦</div>
        <p style="color:#1e293b; font-size:14px; font-weight: 700; margin: 0 0 4px;">Không có đơn hàng nào</p>
        <p style="color:#8490a3; font-size:12px; margin: 0 0 14px;">Không tìm thấy đơn hàng nào trong mốc thời gian và trạng thái đang chọn.</p>
        <button class="btn-reset-order-filters" style="padding: 7px 16px; border-radius: 9px; border: 1px solid #ffd9cd; background: #fff0eb; color: #ff5d1d; font: 700 12px 'Be Vietnam Pro', sans-serif; cursor: pointer; transition: all 0.2s;">Xem tất cả đơn</button>
      </div>
    `;
    const resetBtn = listContainer.querySelector('.btn-reset-order-filters');
    if (resetBtn && window._resetOrderFilter) {
      resetBtn.addEventListener('click', window._resetOrderFilter);
    }
    return;
  }
  
  listContainer.innerHTML = filteredOrders.map(o => {
    const platform = getPlatform(o.orderId);
    const category = getOrderCategory(o.status || o.orderStatus, o.paymentStatus);
    
    let borderLeftColor = '#18ad60'; // completed
    let statusText = 'Đã hoàn tất';
    let badgeStyle = 'border: 1px solid #bfead0; background: #eafaf1; color: #19a45c;';
    
    if (category === 'pending') {
      borderLeftColor = '#2563eb';
      statusText = 'Đang giao';
      badgeStyle = 'border: 1px solid #bfdbfe; background: #ebf5ff; color: #1d4ed8;';
    } else if (category === 'cancelled') {
      borderLeftColor = '#d93838';
      statusText = 'Đã hủy';
      badgeStyle = 'border: 1px solid #f8d7da; background: #fdf3f4; color: #d93838;';
    }
    
    let platformStyle = 'border: 1px solid #ffd5c8; background: #fff3ef; color: #f45a25; margin-left: auto;'; // Shopee
    if (platform === 'Lazada') {
      platformStyle = 'border: 1px solid #d6e2ff; background: #f3f7ff; color: #2864de; margin-left: auto;';
    } else if (platform === 'TikTok') {
      platformStyle = 'border: 1px solid #e1e3e8; background: #f4f5f8; color: #111111; margin-left: auto;';
    }
    
    const cashbackAmount = formatVND(o.commission);
    let rawDate = o.orderDate || '';
    let dateStr = 'Không rõ ngày';
    if (rawDate) {
      const d = parseOrderDateObj(rawDate);
      if (d) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        dateStr = `${dd}/${mm}/${yyyy}`;
      } else {
        dateStr = String(rawDate);
      }
    }
    const itemName = o.itemName || 'Sản phẩm hoàn tiền';
    const payStatusText = o.paymentStatus === 'Đã TT' ? '✓ Đã thanh toán' : '⏳ Chưa thanh toán';
    
    const isShopee = platform === 'Shopee';
    const tipHtml = (isShopee && category !== 'cancelled') ? `
      <div class="order-fast-tip" style="margin-top: 11px; background: linear-gradient(135deg, #fffdf2 0%, #fff9e6 100%); border: 1.5px dashed #f6cf7a; border-radius: 12px; padding: 9px 15px; display: flex !important; align-items: center; gap: 9px; font-size: 13px; line-height: 1.5; color: #854d0e; text-align: left; box-sizing: border-box;">
        <span style="font-size: 16px; line-height: 1; flex-shrink: 0;">💡</span>
        <div style="flex: 1; min-width: 0;">
          <strong style="color: #713f12; font-weight: 700;">Mẹo duyệt tiền nhanh:</strong> Khi nhận được đồ, hãy bấm <strong style="color: #713f12; font-weight: 700;">"Đã nhận hàng"</strong> trên app để đơn sớm được duyệt hoa hồng nhé!
        </div>
      </div>
    ` : '';

    return `
      <article style="border-left: 4px solid ${borderLeftColor}; padding: 16px 18px; border-top: 1px solid #e7e9ee; border-right: 1px solid #e7e9ee; border-bottom: 1px solid #e7e9ee; border-radius: 16px; background: #fff; box-shadow: 0 3px 8px rgba(23,32,51,0.04); margin-bottom: 12px;">
        <div class="order-badges" style="display: flex; align-items: center; gap: 7px;">
          <span style="${badgeStyle} padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; font-style: normal;">${statusText}</span>
          <em style="${platformStyle} padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; font-style: normal;">${platform}</em>
        </div>
        <h3 style="margin: 12px 0 6px; font-size: 14px; line-height: 1.45; font-weight: 600; color: #243149;">${itemName}</h3>
        <p style="margin: 0; color: #8490a3; font-size: 11px; display: flex; align-items: center; gap: 4px;">Mã đơn: <b style="color: #334155; font-weight: 700;">${o.orderId}</b> <span style="cursor: pointer; font-size: 13px;" title="Sao chép mã đơn" onclick="if(navigator.clipboard){navigator.clipboard.writeText('${o.orderId}');const el=this;el.textContent='✅';setTimeout(()=>el.textContent='📋',1200);}">📋</span></p>
        <footer style="display: flex; align-items: center; gap: 15px; margin-top: 13px; padding-top: 12px; border-top: 1px solid #e8ebf0; color: #6e7e94; font-size: 12px;">
          <span>🗓️　${dateStr}</span>
          <b style="margin-left: auto; color: ${category === 'cancelled' ? '#8490a3' : '#f24f25'}; font-size: 15px; font-weight: 700;">+${cashbackAmount}</b>
          <em style="padding: 4px 8px; border-radius: 12px; font-size: 10px; font-style: normal; font-weight: 600; background: ${o.paymentStatus === 'Đã TT' ? '#e9faef' : '#fff9e6'}; color: ${o.paymentStatus === 'Đã TT' ? '#159b51' : '#b45309'}; border: 1px solid ${o.paymentStatus === 'Đã TT' ? '#bfead0' : '#fef08a'};">${payStatusText}</em>
        </footer>
        ${tipHtml}
      </article>
    `;
  }).join('');
}

// Cửa sổ nhỏ (Modal) xem ảnh bill chuyển khoản trực tiếp trên trang
function openBillModal(imageUrl, amountStr, dateStr) {
  if (!imageUrl) return;
  document.querySelector('.bill-preview-modal-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'bill-preview-modal-overlay';
  overlay.style = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(15, 23, 42, 0.78);
    backdrop-filter: blur(4px);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
  `;

  overlay.innerHTML = `
    <div class="bill-preview-card" style="position: relative; background: #ffffff; border-radius: 20px; width: 100%; max-width: 440px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4); overflow: hidden;">
      <header style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #f1f5f9; background: #fafafa;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">🧾</span>
          <div>
            <h3 style="margin: 0; font-size: 14.5px; font-weight: 700; color: #1e293b;">Chứng từ chuyển tiền</h3>
            <small style="color: #64748b; font-size: 11px;">${dateStr || ''} ${amountStr ? '• ' + amountStr : ''}</small>
          </div>
        </div>
        <button type="button" class="btn-close-bill" aria-label="Đóng" style="width: 32px; height: 32px; border: 0; border-radius: 50%; background: #f1f5f9; color: #64748b; font-size: 18px; font-weight: bold; cursor: pointer; display: grid; place-items: center; transition: all 0.15s;">✕</button>
      </header>

      <div style="flex: 1; overflow: auto; padding: 12px; background: #0b1120; display: flex; align-items: center; justify-content: center; min-height: 280px; position: relative;">
        <div class="bill-loader" style="position: absolute; width: 34px; height: 34px; border: 3px solid rgba(255,255,255,0.2); border-top-color: #ff5d1d; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        <img src="${imageUrl}" alt="Ảnh bill chuyển khoản" style="max-width: 100%; max-height: 68vh; object-fit: contain; border-radius: 10px; display: block; position: relative; z-index: 1;" onload="const l=this.previousElementSibling; if(l) l.style.display='none';" onerror="const l=this.previousElementSibling; if(l) l.style.display='none'; this.parentElement.innerHTML='<div style=\\'color:#fff; text-align:center; padding:30px; font-size:13px;\\'>⚠️ Không thể tải trước ảnh bill.<br><a href=\\'${imageUrl}\\' target=\\'_blank\\' style=\\'color:#38bdf8; font-weight:bold; text-decoration:underline; display:inline-block; margin-top:10px;\\'>Bấm để mở ảnh trong tab mới ↗</a></div>';" />
      </div>

      <footer style="padding: 12px 18px; background: #fafafa; border-top: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
        <span style="font-size: 12px; color: #16a34a; font-weight: 700; display: flex; align-items: center; gap: 4px;">✓ Chuyển khoản thành công</span>
        <a href="${imageUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 12px; color: #0284c7; font-weight: 600; text-decoration: none; padding: 6px 12px; border-radius: 8px; background: #f0f9ff; border: 1px solid #bae6fd;">Mở ảnh gốc ↗</a>
      </footer>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('.btn-close-bill')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  window.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') {
      close();
      window.removeEventListener('keydown', onEsc);
    }
  });
}
window.openBillModal = openBillModal;

// Render danh sách bill chuyển tiền (Lịch sử bill)
function renderTransfers(filteredTransfers, formatVND) {
  const listContainer = document.querySelector('.order-list');
  if (!listContainer) return;

  if (filteredTransfers.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align:center; padding:36px 20px; border:1px solid #e7e9ee; border-radius:18px; background:#fff; box-shadow:0 4px 10px rgba(0,0,0,0.02);">
        <div style="font-size: 32px; margin-bottom: 8px;">🧾</div>
        <p style="color:#1e293b; font-size:14px; font-weight: 700; margin: 0 0 4px;">Chưa có lịch sử bill thanh toán</p>
        <p style="color:#8490a3; font-size:12px; margin: 0 0 14px; max-width: 440px; margin-left: auto; margin-right: auto; line-height: 1.5;">Hệ thống tự động đối soát và chuyển khoản mỗi ngày khi số dư đạt từ 10.000đ. Sau khi chuyển, ảnh bill sẽ xuất hiện tại đây.</p>
        <button class="btn-reset-order-filters" style="padding: 7px 16px; border-radius: 9px; border: 1px solid #ffd9cd; background: #fff0eb; color: #ff5d1d; font: 700 12px 'Be Vietnam Pro', sans-serif; cursor: pointer; transition: all 0.2s;">Xem tất cả kỳ</button>
      </div>
    `;
    const resetBtn = listContainer.querySelector('.btn-reset-order-filters');
    if (resetBtn && window._resetOrderFilter) {
      resetBtn.addEventListener('click', window._resetOrderFilter);
    }
    return;
  }

  listContainer.innerHTML = filteredTransfers.map(t => {
    const rawDate = t.date || t.transferredAt || '';
    let dateStr = rawDate || 'Gần đây';
    const amountStr = formatVND(t.amount || 0);
    const billUrl = [t.billUrl, t.billImageUrl, t.paymentProofUrl]
      .map(v => String(v || '').trim()).find(v => /^https?:\/\//i.test(v));

    return `
      <article class="order-transfer-card" style="border-left: 4px solid #18ad60; padding: 16px 18px; border-top: 1px solid #e7e9ee; border-right: 1px solid #e7e9ee; border-bottom: 1px solid #e7e9ee; border-radius: 16px; background: #fff; box-shadow: 0 3px 8px rgba(23,32,51,0.04); margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="border: 1px solid #bfead0; background: #eafaf1; color: #19a45c; padding: 4px 9px; border-radius: 6px; font-size: 10.5px; font-weight: 800; font-style: normal;">✓ Chuyển khoản thành công</span>
        </div>
        <h3 style="margin: 12px 0 6px; font-size: 14.5px; line-height: 1.45; font-weight: 700; color: #243149;">
          Thanh toán hoa hồng rút ví về tài khoản
        </h3>
        <p style="margin: 0; color: #8490a3; font-size: 11.5px; display: flex; align-items: center; gap: 4px;">
          <span>Hình thức:</span> <b style="color: #334155; font-weight: 600;">Chuyển khoản tự động qua STK đã đăng ký</b>
        </p>
        <footer style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 13px; padding-top: 12px; border-top: 1px solid #e8ebf0; color: #6e7e94; font-size: 12px; flex-wrap: wrap;">
          <span style="font-weight: 500;">🗓️ ${dateStr}</span>
          <div style="display: flex; align-items: center; gap: 10px; margin-left: auto;">
            <b style="color: #18ad60; font-size: 16.5px; font-weight: 800;">+${amountStr}</b>
            ${billUrl ? `
              <button type="button" class="btn-open-bill-modal" onclick="openBillModal('${billUrl}', '+${amountStr}', '${dateStr}')" style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 13px; border-radius: 9px; background: #fff2ed; color: #ff5d1d; font-weight: 700; font-size: 12px; border: 1px solid #ffd8cc; box-shadow: 0 2px 4px rgba(255,93,29,0.08); cursor: pointer; transition: all 0.2s; outline: none;">
                👁️ Xem ảnh bill ↗
              </button>
            ` : `
              <span style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 11px; border-radius: 8px; background: #eafbf2; color: #12a061; font-weight: 700; font-size: 11.5px; border: 1px solid #bfead0;">
                ✓ Tiền đã về tài khoản
              </span>
            `}
          </div>
        </footer>
      </article>
    `;
  }).join('');
}

// Nạp lịch sử bill chuyển khoản từ VPS / Google Sheet CSV / Fallback
async function loadPaymentTransfers(zaloId, onLoaded) {
  if (!zaloId) return [];
  const cleanId = String(zaloId).trim();
  const localCacheKey = "v2_transfers_cache_" + cleanId.toLowerCase();

  // 1. Kiểm tra cache RAM
  if (cachedTransfers && Array.isArray(cachedTransfers) && cachedTransfers.length > 0) {
    if (typeof onLoaded === 'function') onLoaded(cachedTransfers);
  }

  // 2. Kiểm tra cache localStorage
  try {
    const cachedStr = localStorage.getItem(localCacheKey);
    if (cachedStr) {
      const parsed = JSON.parse(cachedStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedTransfers = parsed;
        window.cachedTransfers = parsed;
        if (typeof onLoaded === 'function') onLoaded(parsed);
      }
    }
  } catch(e) {}

  let data = [];
  // 3. Gọi API VPS
  try {
    const url = CONFIG.API_URL + '?action=getPaymentHistory&zaloId=' + encodeURIComponent(cleanId) + '&_t=' + Date.now();
    const response = await fetch(url).then(r => r.json());
    if (response && response.success && Array.isArray(response.data) && response.data.length > 0) {
      data = response.data.filter(item => item && (item.amount || item.transferAmount || item.paidAmount));
    }
  } catch(e) {}

  // 4. Fallback Google Sheet CSV tab Lịch sử thanh toán gid=800356243
  if (!data.length) {
    try {
      const sheetCsvUrl = "https://docs.google.com/spreadsheets/d/1hnhrRHjTxLRnJatcyTuRFPOC7es3LoHawAOpZfOIcuo/export?format=csv&gid=800356243";
      const csvRes = await fetch(sheetCsvUrl);
      if (csvRes.ok) {
        const csvText = await csvRes.text();
        const lines = csvText.split('\n');
        const targetId = cleanId.replace(/['"\r]/g, '');
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;
          const parts = line.split(',');
          const rowId = String(parts[0] || '').trim().replace(/['"\r]/g, '');
          if (rowId === targetId) {
            data.push({
              amount: Number(parts[1]) || 0,
              date: String(parts[2] || '').trim(),
              billUrl: String(parts[3] || '').trim().replace(/\r/g, '')
            });
          }
        }
      }
    } catch(eCsv) {}
  }

  // 5. Fallback từ đơn hàng đã thanh toán nếu chưa có bill trên bảng
  if (!data.length && cachedOrders && cachedOrders.data) {
    try {
      const paidOrders = cachedOrders.data.filter(o => o && (o.paymentStatus === 'Đã TT' || o.paymentStatus === 'Đã thanh toán'));
      if (paidOrders.length > 0) {
        const groups = {};
        paidOrders.forEach(o => {
          const m = (o.orderDate || '').slice(0, 7) || 'Gần đây';
          if (!groups[m]) groups[m] = { amount: 0, count: 0, date: o.orderDate };
          groups[m].amount += Number(o.commission || 0);
          groups[m].count += 1;
        });

        data = Object.keys(groups).sort().reverse().map(k => ({
          amount: Math.round(groups[k].amount),
          date: 'Thanh toán ' + (k.startsWith('202') ? 'tháng ' + k.slice(5) + '/' + k.slice(0, 4) : k) + ' (' + groups[k].count + ' đơn)',
          transferredAt: groups[k].date,
          status: 'Đã hoàn tất'
        }));
      }
    } catch(eFallback) {}
  }

  // Sắp xếp bill chuyển tiền từ MỚI NHẤT đến CŨ NHẤT (Newest to Oldest)
  data.sort((a, b) => {
    const tA = parseOrderDateObj(a.date || a.transferredAt)?.getTime() || 0;
    const tB = parseOrderDateObj(b.date || b.transferredAt)?.getTime() || 0;
    return tB - tA;
  });

  // Lưu cache & kích hoạt cập nhật
  if (data.length > 0) {
    cachedTransfers = data;
    window.cachedTransfers = data;
    try {
      localStorage.setItem(localCacheKey, JSON.stringify(data));
    } catch(e) {}
    if (typeof onLoaded === 'function') onLoaded(data);
  }

  return data;
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

  // Nạp ngầm danh sách bill chuyển khoản song song để sẵn sàng ngay lập tức
  loadPaymentTransfers(query, () => {
    if (typeof window._triggerUpdateOrderView === 'function') {
      window._triggerUpdateOrderView();
    }
  });

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
  
  // Sắp xếp đơn hàng từ mới nhất đến cũ nhất
  const parseOrderDate = (dateVal) => {
    const d = parseOrderDateObj(dateVal);
    return d ? d.getTime() : 0;
  };
  ordersList.sort((a, b) => parseOrderDate(b.orderDate) - parseOrderDate(a.orderDate));
  
  const hasTransfers = cachedTransfers && Array.isArray(cachedTransfers) && cachedTransfers.length > 0;
  if (ordersList.length === 0 && !hasTransfers) {
    app.innerHTML = `
      <div style="max-width: 600px; margin: 50px auto; padding: 40px 20px; text-align: center; background: #fff; border-radius: 20px; box-shadow: 0 10px 24px rgba(23,32,51,0.05); border: 1px solid #e8e9ef;">
        <div style="font-size: 40px; margin-bottom: 15px;">📦</div>
        <h2 style="font-size: 20px; font-weight: 800; color: #15233a; margin-bottom: 8px;">Chưa có đơn hàng nào</h2>
        <p style="color: #7787a0; font-size: 14px; margin-bottom: 20px; line-height: 1.5;">Tài khoản Zalo của bạn chưa phát sinh đơn hàng hoàn tiền nào.</p>
        <aside class="order-fast-tip" style="margin: 0 auto 20px; max-width: 520px; background: #fffbeb; border: 1.5px dashed #fde68a; border-radius: 14px; padding: 12px 16px; display: flex !important; align-items: center; gap: 10px; font-size: 13px; line-height: 1.5; color: #b45309; text-align: left;">
          <span style="font-size: 18px; line-height: 1; flex-shrink: 0;">💡</span>
          <div style="flex: 1;">
            <strong style="color: #92400e; font-weight: 700;">Mẹo duyệt tiền nhanh:</strong> Khi nhận được đồ, hãy bấm <strong style="color: #92400e; font-weight: 700;">"Đã nhận hàng"</strong> trên app để đơn sớm được duyệt hoa hồng nhé!
          </div>
        </aside>
        <a href="#convert" style="display: inline-block; padding: 12px 24px; background: #ff5722; color: #fff; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 14px;">Chuyển link mua ngay</a>
      </div>
    `;
    return;
  }

  // Cấu hình phân trang (10 mục mỗi trang)
  const ITEMS_PER_PAGE = 10;
  let currentOrderPage = 1;

  // --- LOGIC PHÂN LOẠI & LỌC THEO NGÀY THÁNG (PHƯƠNG ÁN 1) ---
  const now = new Date();
  const pad2 = n => String(n).padStart(2, '0');
  const formatYMD = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const formatYM = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

  const todayStr = formatYMD(now);
  const yestDate = new Date(now);
  yestDate.setDate(yestDate.getDate() - 1);
  const yestStr = formatYMD(yestDate);
  const thisMonthStr = formatYM(now);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = formatYM(lastMonthDate);

  // Thu thập danh sách các tháng duy nhất có đơn hàng hoặc bill
  const monthsSet = new Set();
  ordersList.forEach(o => {
    const d = parseOrderDateObj(o.orderDate);
    if (d) monthsSet.add(formatYM(d));
  });
  if (cachedTransfers && Array.isArray(cachedTransfers)) {
    cachedTransfers.forEach(t => {
      const d = parseOrderDateObj(t.date);
      if (d) monthsSet.add(formatYM(d));
    });
  }
  const availableMonths = Array.from(monthsSet).sort().reverse();

  // Hàm kiểm tra khớp bộ lọc thời gian
  const matchDateFilter = (order, filter) => {
    if (!filter || filter === 'all') return true;
    const d = parseOrderDateObj(order.orderDate);
    if (!d) return filter === 'all';
    const dayStr = formatYMD(d);
    const monthStr = formatYM(d);

    if (filter === 'today') return dayStr === todayStr;
    if (filter === 'yesterday') return dayStr === yestStr;
    if (filter === 'this_month') return monthStr === thisMonthStr;
    if (filter === 'last_month') return monthStr === lastMonthStr;
    if (filter.startsWith('month:')) return monthStr === filter.replace('month:', '');
    return true;
  };

  // Trạng thái bộ lọc hiện tại
  let currentDateFilter = 'all';
  let currentStatusTab = 'completed';
  let currentSearchQuery = '';

  // Tính số lượng ban đầu để chọn tab mặc định
  let initCompletedCount = 0;
  let initPendingCount = 0;
  let initCancelledCount = 0;
  ordersList.forEach(o => {
    const cat = getOrderCategory(o.status || o.orderStatus, o.paymentStatus);
    if (cat === 'completed') initCompletedCount++;
    else if (cat === 'pending') initPendingCount++;
    else if (cat === 'cancelled') initCancelledCount++;
  });

  if (initCompletedCount === 0) {
    if (initPendingCount > 0) currentStatusTab = 'pending';
    else if (initCancelledCount > 0) currentStatusTab = 'cancelled';
    else if (hasTransfers) currentStatusTab = 'transfers';
  }

  // Render khung giao diện
  app.innerHTML = `
    <div class="order-results" style="width: 100%; max-width: 1016px; margin: 0 auto; padding-top: 20px;">
      <!-- Khối Tổng quan hoa hồng (Cập nhật động theo mốc thời gian lọc) -->
      <article class="commission-summary" style="margin-bottom: 20px; padding: 20px; border-radius: 20px; background: #fff; box-shadow: 0 10px 24px rgba(25,35,52,0.06); border: 1px solid #f6d3c0; background: linear-gradient(135deg, #fff 0%, #fffaf6 100%);">
        <h2 style="display: flex; align-items: center; gap: 9px; min-height: 31px; padding-left: 11px; border-left: 3px solid #ff762d; font-size: 16px; font-weight: 700; margin: 0 0 16px;">
          <span class="order-summary-title-text" style="color: #17233b; font-size: 17px; font-weight: 800;">Tổng quan hoa hồng</span>
        </h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 5px;">
          <span class="total" style="display: block; padding: 13px 15px; border: 1px solid #ffd9cd; border-radius: 14px; background: #fff7f4; box-shadow: inset 0 3px 0 #ff6a38, 0 3px 8px rgba(25,35,52,0.04);"><small style="display: block; color: #8590a2; font-size: 10px; font-weight: 800; letter-spacing: 0.02em;">TỔNG HOA HỒNG</small><b class="stat-total" style="display: block; margin-top: 4px; font-size: 21px; color: #f24f25; letter-spacing: -0.4px;">0 đ</b></span>
          <span class="pending" style="display: block; padding: 13px 15px; border: 1px solid #f6e1a1; border-radius: 14px; background: #fffdf3; box-shadow: inset 0 3px 0 #f4ad28, 0 3px 8px rgba(25,35,52,0.04);"><small style="display: block; color: #8590a2; font-size: 10px; font-weight: 800; letter-spacing: 0.02em;">ĐANG CHỜ XỬ LÝ</small><b class="stat-pending" style="display: block; margin-top: 4px; font-size: 21px; color: #e89616; letter-spacing: -0.4px;">0 đ</b></span>
          <span class="done" style="display: block; padding: 13px 15px; border: 1px solid #d3eee0; border-radius: 14px; background: #f2fbf6; box-shadow: inset 0 3px 0 #21b565, 0 3px 8px rgba(25,35,52,0.04);"><small style="display: block; color: #8590a2; font-size: 10px; font-weight: 800; letter-spacing: 0.02em;">ĐÃ HOÀN THÀNH</small><b class="stat-done" style="display: block; margin-top: 4px; font-size: 21px; color: #18a45b; letter-spacing: -0.4px;">0 đ</b></span>
          <span class="received" style="display: block; padding: 13px 15px; border: 1px solid #d6e2ff; border-radius: 14px; background: #f3f7ff; box-shadow: inset 0 3px 0 #3975ea, 0 3px 8px rgba(25,35,52,0.04); cursor: pointer; transition: transform 0.15s ease;" title="Bấm để xem danh sách bill chuyển tiền"><small style="display: block; color: #8590a2; font-size: 10px; font-weight: 800; letter-spacing: 0.02em;">ĐÃ NHẬN</small><b class="stat-received" style="display: block; margin-top: 4px; font-size: 21px; color: #2864de; letter-spacing: -0.4px;">0 đ</b></span>
        </div>
      </article>
      
      <!-- Tiêu đề danh sách đơn / bill -->
      <h2 class="order-list-title" style="margin: 24px 0 12px; font-size: 18px; font-weight: 800; color: #172033; display: flex; align-items: center; gap: 9px; padding-left: 12px; border-left: 4px solid #ff5d1d; letter-spacing: -0.2px;">Danh sách đơn hàng của bạn</h2>
      
      <!-- Thanh lọc nhanh thời gian (Quick Filter Chips + Dropdown Chọn tháng) -->
      <div class="order-date-filter-bar" style="background: #fff; padding: 13px 15px; border-radius: 14px; border: 1px solid #f0e5df; box-shadow: 0 2px 7px rgba(25,35,52,0.03); margin-bottom: 12px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;">
          <span style="font-size: 12px; font-weight: 700; color: #475569; display: flex; align-items: center; gap: 6px;">
            <span>📅</span> Lọc theo thời gian:
          </span>
          <div>
            <select class="order-month-select" style="padding: 6px 12px; border-radius: 9px; border: 1px solid #e2e8f0; background: #fff; color: #334155; font: 600 12px 'Be Vietnam Pro', sans-serif; cursor: pointer; outline: none; transition: all 0.2s;">
              <option value="">🗓️ Xem tháng khác...</option>
              ${availableMonths.map(m => {
                const [y, mm] = m.split('-');
                return `<option value="month:${m}">Tháng ${mm}/${y}</option>`;
              }).join('')}
            </select>
          </div>
        </div>
        
        <div class="order-date-chips" style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; -webkit-overflow-scrolling: touch; scrollbar-width: none;">
          <button class="date-chip-btn active" data-date="all">Tất cả</button>
          <button class="date-chip-btn" data-date="today">Hôm nay</button>
          <button class="date-chip-btn" data-date="yesterday">Hôm qua</button>
          <button class="date-chip-btn" data-date="this_month">Tháng này</button>
          <button class="date-chip-btn" data-date="last_month">Tháng trước</button>
        </div>
      </div>

      <!-- Ô tìm kiếm mã đơn hoặc tên sản phẩm / số tiền -->
      <div style="margin-bottom: 12px; position: relative;">
        <input type="text" class="order-search-input" placeholder="Tìm mã đơn hàng, tên sản phẩm hoặc số tiền bill..." style="width: 100%; box-sizing: border-box; padding: 10px 14px 10px 36px; border-radius: 12px; border: 1px solid #e2e8f0; background: #fff; font: 500 13px 'Be Vietnam Pro', sans-serif; color: #1e293b; outline: none; transition: all 0.2s;">
        <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 14px; color: #94a3b8; pointer-events: none;">🔍</span>
      </div>

      <!-- 4 Tab Trạng thái đơn hàng & Lịch sử bill (Vị trí 1) -->
      <div class="order-tabs" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; padding: 4px; border-radius: 12px; background: #fff8f4; border: 1px solid #f0e5df;">
        <button class="tab-btn" data-tab="completed" style="padding: 10px 4px; border: 0; border-radius: 9px; background: transparent; color: #3c4960; font: 700 12px 'Be Vietnam Pro', sans-serif; cursor: pointer; text-align: center;">Hoàn tất <b class="badge-completed" style="margin-left: 4px; padding: 2px 6px; border-radius: 10px; background: #f1f1f5; font-size: 10px;">0</b></button>
        <button class="tab-btn" data-tab="pending" style="padding: 10px 4px; border: 0; border-radius: 9px; background: transparent; color: #3c4960; font: 700 12px 'Be Vietnam Pro', sans-serif; cursor: pointer; text-align: center;">Đang giao <b class="badge-pending" style="margin-left: 4px; padding: 2px 6px; border-radius: 10px; background: #f1f1f5; font-size: 10px;">0</b></button>
        <button class="tab-btn" data-tab="cancelled" style="padding: 10px 4px; border: 0; border-radius: 9px; background: transparent; color: #3c4960; font: 700 12px 'Be Vietnam Pro', sans-serif; cursor: pointer; text-align: center;">Đã hủy <b class="badge-cancelled" style="margin-left: 4px; padding: 2px 6px; border-radius: 10px; background: #f1f1f5; font-size: 10px;">0</b></button>
        <button class="tab-btn" data-tab="transfers" style="padding: 10px 4px; border: 0; border-radius: 9px; background: transparent; color: #3c4960; font: 700 12px 'Be Vietnam Pro', sans-serif; cursor: pointer; text-align: center;">Lịch sử bill <b class="badge-transfers" style="margin-left: 4px; padding: 2px 6px; border-radius: 10px; background: #f1f1f5; font-size: 10px;">0</b></button>
      </div>

      <!-- Danh sách thẻ đơn / bill -->
      <div class="order-list" style="display: grid; gap: 12px; margin-top: 16px;"></div>

      <!-- Thanh Phân trang (Pagination) chuẩn theo ảnh mẫu người dùng yêu cầu -->
      <div id="order-pagination" class="deals-pagination-container"></div>

      <style>
        .date-chip-btn {
          padding: 6px 13px;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          background: #f8fafc;
          color: #475569;
          font: 700 12px 'Be Vietnam Pro', sans-serif;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
          outline: none;
        }
        .date-chip-btn:hover {
          background: #fff0eb;
          color: #ff5d1d;
          border-color: #ffd9cd;
        }
        .date-chip-btn.active {
          border-color: #ff5d1d !important;
          background: #ff5d1d !important;
          color: #ffffff !important;
          box-shadow: 0 2px 6px rgba(255, 93, 29, 0.25) !important;
        }
        .order-search-input:focus {
          border-color: #ff5d1d !important;
          box-shadow: 0 0 0 3px rgba(255, 93, 29, 0.12) !important;
        }
        .order-month-select:focus {
          border-color: #ff5d1d !important;
          box-shadow: 0 0 0 3px rgba(255, 93, 29, 0.12) !important;
        }
        .commission-summary .received:hover {
          transform: translateY(-2px);
          box-shadow: inset 0 3px 0 #3975ea, 0 6px 14px rgba(40, 100, 222, 0.12) !important;
        }
        .order-tabs .tab-btn {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
        }
        .order-tabs .tab-btn:hover:not(.active) {
          background: rgba(255, 255, 255, 0.7) !important;
          color: #ff5d1d !important;
        }
        @media (max-width: 520px) {
          .order-tabs .tab-btn {
            padding: 8px 2px !important;
            font-size: 11px !important;
          }
          .order-tabs .tab-btn b {
            margin-left: 2px !important;
            padding: 1px 4px !important;
            font-size: 9px !important;
          }
        }
        @media (max-width: 380px) {
          .order-tabs .tab-btn {
            font-size: 10px !important;
            padding: 7px 1px !important;
          }
        }

        /* Pagination Styles chuẩn mẫu */
        .deals-pagination-container {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 28px 0 24px;
          width: 100%;
        }
        .deals-pagination-bar {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .deals-page-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 40px;
          height: 40px;
          padding: 0 10px;
          background: #ffffff;
          color: #334155;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14.5px;
          font-weight: 600;
          font-family: 'Be Vietnam Pro', sans-serif;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          user-select: none;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
        }
        .deals-page-btn:hover:not(.active):not(.disabled) {
          border-color: #ff5d1d;
          color: #ff5d1d;
          background: #fff8f6;
        }
        .deals-page-btn.active {
          background: #ee4d2d !important;
          border-color: #ee4d2d !important;
          color: #ffffff !important;
          font-weight: 700 !important;
          box-shadow: 0 4px 14px rgba(238, 77, 45, 0.4) !important;
          cursor: default;
          pointer-events: none;
        }
        .deals-page-btn.nav-btn {
          padding: 0 14px;
          color: #0284c7;
          font-weight: 600;
        }
        .deals-page-btn.disabled,
        .deals-page-btn:disabled {
          background: #fafafa !important;
          border-color: #f1f5f9 !important;
          color: #cbd5e1 !important;
          cursor: not-allowed !important;
          box-shadow: none !important;
          pointer-events: none;
        }
        @media (max-width: 520px) {
          .deals-pagination-bar {
            gap: 5px;
          }
          .deals-page-btn {
            min-width: 36px;
            height: 36px;
            font-size: 13px;
            padding: 0 6px;
            border-radius: 7px;
          }
          .deals-page-btn.nav-btn {
            padding: 0 10px;
            font-size: 12.5px;
          }
        }
      </style>
    </div>
  `;

  // --- HÀM CẬP NHẬT GIAO DIỆN KHI THAY ĐỔI BỘ LỌC HOẶC PHÂN TRANG ---
  const updateOrderView = () => {
    // Cập nhật tiêu đề linh hoạt theo tab
    const listTitle = app.querySelector('.order-list-title');
    if (listTitle) {
      listTitle.textContent = currentStatusTab === 'transfers' 
        ? 'Lịch sử bill chuyển tiền của bạn' 
        : 'Danh sách đơn hàng của bạn';
    }

    // 1. Lọc theo Date Filter
    let dateFiltered = ordersList.filter(o => matchDateFilter(o, currentDateFilter));

    // 2. Lọc tiếp theo Search Query (nếu có)
    const q = currentSearchQuery.trim().toLowerCase();
    if (q) {
      dateFiltered = dateFiltered.filter(o => {
        const idMatch = String(o.orderId || '').toLowerCase().includes(q);
        const nameMatch = String(o.itemName || '').toLowerCase().includes(q);
        return idMatch || nameMatch;
      });
    }

    // 3. Tính toán số liệu thống kê cho dateFiltered
    let subTotalComm = 0;
    let subPendingComm = 0;
    let subDoneComm = 0;
    let subRecComm = 0;

    let subCountCompleted = 0;
    let subCountPending = 0;
    let subCountCancelled = 0;

    dateFiltered.forEach(o => {
      const cat = getOrderCategory(o.status || o.orderStatus, o.paymentStatus);
      const comm = Number(o.commission) || 0;
      const isPaid = o.paymentStatus === 'Đã TT';

      if (cat === 'completed') subCountCompleted++;
      else if (cat === 'pending') subCountPending++;
      else if (cat === 'cancelled') subCountCancelled++;

      if (cat !== 'cancelled') {
        subTotalComm += comm;
        if (isPaid) {
          subRecComm += comm;
        } else {
          if (cat === 'pending') subPendingComm += comm;
          else if (cat === 'completed') subDoneComm += comm;
        }
      }
    });

    // Cập nhật 4 ô thống kê trên đầu
    const elTotal = app.querySelector('.stat-total');
    if (elTotal) elTotal.textContent = formatVND(subTotalComm);

    const elPending = app.querySelector('.stat-pending');
    if (elPending) elPending.textContent = formatVND(subPendingComm);

    const elDone = app.querySelector('.stat-done');
    if (elDone) elDone.textContent = formatVND(subDoneComm);

    const elRec = app.querySelector('.stat-received');
    if (elRec) elRec.textContent = formatVND(subRecComm);

    // Cập nhật số lượng trên các badge
    const bCompleted = app.querySelector('.badge-completed');
    if (bCompleted) bCompleted.textContent = subCountCompleted;

    const bPending = app.querySelector('.badge-pending');
    if (bPending) bPending.textContent = subCountPending;

    const bCancelled = app.querySelector('.badge-cancelled');
    if (bCancelled) bCancelled.textContent = subCountCancelled;

    // Lọc danh sách bill (transfers) theo kỳ thời gian và từ khóa tìm kiếm
    let dateFilteredTransfers = (cachedTransfers && Array.isArray(cachedTransfers)) ? [...cachedTransfers] : [];
    
    // Sắp xếp bill chuyển tiền từ MỚI NHẤT đến CŨ NHẤT (Newest to Oldest)
    dateFilteredTransfers.sort((a, b) => {
      const tA = parseOrderDateObj(a.date || a.transferredAt)?.getTime() || 0;
      const tB = parseOrderDateObj(b.date || b.transferredAt)?.getTime() || 0;
      return tB - tA;
    });

    dateFilteredTransfers = dateFilteredTransfers.filter(t => matchDateFilter({ orderDate: t.date }, currentDateFilter));
    if (q) {
      dateFilteredTransfers = dateFilteredTransfers.filter(t => {
        const amtStr = String(t.amount || '');
        const dateStr = String(t.date || '').toLowerCase();
        return amtStr.includes(q) || dateStr.includes(q);
      });
    }

    const bTransfers = app.querySelector('.badge-transfers');
    if (bTransfers) bTransfers.textContent = dateFilteredTransfers.length;

    // 4. Render danh sách và phân trang theo tab đang chọn
    if (currentStatusTab === 'transfers') {
      const totalPages = Math.ceil(dateFilteredTransfers.length / ITEMS_PER_PAGE) || 1;
      if (currentOrderPage > totalPages) currentOrderPage = 1;
      const pageTransfers = dateFilteredTransfers.slice((currentOrderPage - 1) * ITEMS_PER_PAGE, currentOrderPage * ITEMS_PER_PAGE);
      renderTransfers(pageTransfers, formatVND);
      renderOrderPagination(currentOrderPage, totalPages, dateFilteredTransfers.length);
    } else {
      const finalOrders = dateFiltered.filter(o => getOrderCategory(o.status || o.orderStatus, o.paymentStatus) === currentStatusTab);
      const totalPages = Math.ceil(finalOrders.length / ITEMS_PER_PAGE) || 1;
      if (currentOrderPage > totalPages) currentOrderPage = 1;
      const pageOrders = finalOrders.slice((currentOrderPage - 1) * ITEMS_PER_PAGE, currentOrderPage * ITEMS_PER_PAGE);
      renderOrders(pageOrders, formatVND);
      renderOrderPagination(currentOrderPage, totalPages, finalOrders.length);
    }
  };

  // Đăng ký hàm kích hoạt cập nhật giao diện toàn cục
  window._triggerUpdateOrderView = () => {
    updateOrderView();
  };

  // Chuyển trang và cuộn mượt mà lên đầu danh sách
  window.goToOrderPage = function(page) {
    if (typeof page !== 'number' || isNaN(page)) return;
    if (page < 1 || page === currentOrderPage) return;
    currentOrderPage = page;
    updateOrderView();

    const targetEl = app.querySelector('.order-tabs') || app.querySelector('.order-list-title');
    if (targetEl) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = targetEl.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      window.scrollTo({
        top: Math.max(0, elementPosition - offset),
        behavior: 'smooth'
      });
    }
  };

  // Hàm reset bộ lọc về mặc định
  window._resetOrderFilter = () => {
    currentDateFilter = 'all';
    currentSearchQuery = '';
    currentOrderPage = 1;
    const searchInp = app.querySelector('.order-search-input');
    if (searchInp) searchInp.value = '';
    const select = app.querySelector('.order-month-select');
    if (select) select.value = '';
    app.querySelectorAll('.date-chip-btn').forEach(b => {
      if (b.dataset.date === 'all') b.classList.add('active');
      else b.classList.remove('active');
    });
    updateOrderView();
  };

  // Gắn sự kiện cho các nút Date Chip
  const dateChips = app.querySelectorAll('.date-chip-btn');
  dateChips.forEach(btn => {
    btn.addEventListener('click', () => {
      dateChips.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const select = app.querySelector('.order-month-select');
      if (select) select.value = '';
      currentDateFilter = btn.dataset.date;
      currentOrderPage = 1; // Reset về trang 1
      updateOrderView();
    });
  });

  // Gắn sự kiện cho Dropdown chọn tháng
  const monthSelect = app.querySelector('.order-month-select');
  if (monthSelect) {
    monthSelect.addEventListener('change', () => {
      const val = monthSelect.value;
      if (val) {
        currentDateFilter = val;
        dateChips.forEach(b => b.classList.remove('active'));
      } else {
        currentDateFilter = 'all';
        const allBtn = app.querySelector('.date-chip-btn[data-date="all"]');
        if (allBtn) allBtn.classList.add('active');
      }
      currentOrderPage = 1; // Reset về trang 1
      updateOrderView();
    });
  }

  // Gắn sự kiện cho ô tìm kiếm
  const searchInput = app.querySelector('.order-search-input');
  if (searchInput) {
    let searchTimer = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        currentSearchQuery = e.target.value;
        currentOrderPage = 1; // Reset về trang 1
        updateOrderView();
      }, 150);
    });
  }

  // Gắn sự kiện click vào ô ĐÃ NHẬN ở bảng tổng quan để xem ngay lịch sử bill
  const recStatCard = app.querySelector('.commission-summary .received');
  if (recStatCard) {
    recStatCard.addEventListener('click', () => {
      const transferBtn = app.querySelector('.tab-btn[data-tab="transfers"]');
      if (transferBtn) {
        transferBtn.click();
        const targetEl = app.querySelector('.order-tabs') || app.querySelector('.order-list-title');
        if (targetEl) {
          const offset = 80;
          const bodyRect = document.body.getBoundingClientRect().top;
          const elementRect = targetEl.getBoundingClientRect().top;
          const elementPosition = elementRect - bodyRect;
          window.scrollTo({
            top: Math.max(0, elementPosition - offset),
            behavior: 'smooth'
          });
        }
      }
    });
  }

  // Gắn sự kiện cho 4 Tab Trạng thái & Bill (Vị trí 1)
  const statusTabs = app.querySelectorAll('.order-tabs button');
  statusTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      statusTabs.forEach(t => {
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

      currentStatusTab = tab.dataset.tab;
      currentOrderPage = 1; // Reset về trang 1
      updateOrderView();
    });
  });

  // Thiết lập trạng thái tab mặc định
  statusTabs.forEach(t => {
    if (t.dataset.tab === currentStatusTab) {
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

  // Chạy lần đầu tiên để nạp toàn bộ số liệu và danh sách đơn
  updateOrderView();
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
      const cat = getOrderCategory(o.status || o.orderStatus, o.paymentStatus);
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
