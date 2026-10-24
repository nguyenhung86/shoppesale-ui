function accountRedesignedPage() {
  const user = (typeof getLoggedUser === 'function' ? getLoggedUser() : null) || {};
  const userEmail = user.email || 'Chưa cập nhật email';
  const savedPhone = localStorage.getItem('shoppesale_phone') || '';
  const joinDate = (typeof getJoinDate === 'function' ? getJoinDate() : null) || localStorage.getItem('shoppesale_join_date') || '11/07/2026';

  return `
    <div class="account-view dashboard-view">
      <section class="dashboard-intro">
        <div class="intro-copy">
          <h1>Bấm nhận hàng<br>để <em>nhận hoàn tiền</em></h1>
          <p>Tra cứu đơn hàng và theo dõi hoa hồng<br>của bạn chỉ trong vài giây.</p>
          <div class="intro-markets">
            <span class="market-shopee">S</span><b>Shopee</b>
            <span class="market-lazada">◆</span><b>Lazada</b>
            <span class="market-tiktok">♪</span><b>TikTok Shop</b>
          </div>
        </div>
        <img src="assets/hero-illustration-v3.png" alt="Minh họa hoàn tiền mua sắm">
        <div class="intro-phone-ui"><span class="phone-check">✓</span><b>Hoàn tiền</b><i></i><i></i><i></i></div>
      </section>

      <section class="dashboard-wallet">
        <div class="wallet-top">
          <div class="wallet-user">
            <span class="avatar account-avatar">HV</span>
            <span>Xin chào,<strong>Hồng Vinh</strong><small>▣ Từ 11/07/2026</small></span>
          </div>
          <div class="wallet-top-actions">
            <button type="button" class="wallet-top-btn account-payment-summary payment-history" title="Xem lịch sử thanh toán & Bill">
              <span>◷</span> Lịch sử TT
            </button>
            <button type="button" class="wallet-top-btn account-edit-top-btn" title="Chỉnh sửa hồ sơ cá nhân">
              <span>✎</span> Sửa hồ sơ
            </button>
          </div>
          <span class="wallet-tier">♕ Kim Cương</span>
        </div>

        <div class="wallet-balance">
          <span class="wallet-art">◴</span>
          <small>TỔNG HOA HỒNG</small>
          <strong>0đ</strong>
          <em>hoantienonline.io.vn</em>
        </div>

        <div class="wallet-stats wallet-status-stats">
          <div class="status-processing"><span>◷</span><small>ĐANG CHỜ XỬ LÝ</small><b>0đ</b></div>
          <div class="status-completed"><span>✓</span><small>ĐÃ HOÀN THÀNH</small><b>0đ</b></div>
          <div class="status-received"><span>₫</span><small>ĐÃ NHẬN</small><b>0đ</b></div>
        </div>

        <div class="wallet-actions">
          <a href="#convert">↪ Chuyển đổi</a>
          <button type="button" data-page="orders">▣ Đơn hàng</button>
          <button type="button" data-page="referrals">♧ Giới thiệu</button>
          <button type="button" class="wallet-action-history payment-history">◷ Lịch sử nhận tiền</button>
        </div>
      </section>

      <div class="dashboard-counters">
        <div><span>◇</span><p>Tổng đơn hàng<b>0</b></p></div>
        <div><span>♧</span><p>Bạn đã mời<b>0</b></p></div>
      </div>

      <section class="dashboard-chart commission-chart-card">
        <div class="commission-chart-head">
          <div>
            <span>↗</span>
            <div>
              <small>THEO DÕI HOA HỒNG</small>
              <h2>Biểu đồ tiền hoa hồng theo tháng</h2>
            </div>
          </div>
          <b>0đ</b>
        </div>
        <div class="commission-chart-visual">
          <div class="commission-chart-y"><i>600k</i><i>450k</i><i>300k</i><i>150k</i><i>0</i></div>
          <div class="commission-chart-canvas">
            <svg viewBox="0 0 1000 220" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="commissionFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stop-color="#ff6b25" stop-opacity=".28"/>
                  <stop offset="100%" stop-color="#ff6b25" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <g stroke="#edf0f4" stroke-width="1">
                <path d="M0 18H1000"/><path d="M0 67H1000"/><path d="M0 116H1000"/><path d="M0 165H1000"/><path d="M0 214H1000"/>
              </g>
            </svg>
            <span class="commission-chart-dot"></span>
            <span class="commission-chart-label"><b>0đ</b><small>T7/26</small></span>
          </div>
          <div class="commission-chart-months">
            <span>T8/25</span><span>T9/25</span><span>T10/25</span><span>T11/25</span><span>T12/25</span><span>T1/26</span><span>T2/26</span><span>T3/26</span><span>T4/26</span><span>T5/26</span><span>T6/26</span><span>T7/26</span>
          </div>
        </div>
      </section>

      <div class="account-unified-grid">
        <section class="account-panel account-profile-panel">
          <div class="account-panel-heading">
            <div><span class="account-section-icon">♙</span><div><small>THÔNG TIN CÁ NHÂN</small><h2>Hồ sơ của bạn</h2></div></div>
            <button class="account-edit-all" type="button">✎ Chỉnh sửa</button>
          </div>
          <div class="account-info-list">
            <button class="account-info-item" type="button">
              <span class="account-info-icon">♙</span>
              <span><small>Tên hiển thị</small><b>Hồng Vinh</b></span>
              <i>›</i>
            </button>
            <button class="account-info-item" type="button">
              <span class="account-info-icon">⌕</span>
              <span><small>Số điện thoại</small><b class="${savedPhone ? '' : 'is-empty'}">${savedPhone || 'Thêm số điện thoại'}</b></span>
              <i>›</i>
            </button>
            <div class="account-info-item is-readonly">
              <span class="account-info-icon">✉</span>
              <span><small>Email Google</small><b class="account-email-val">${userEmail}</b></span>
            </div>
            <div class="account-info-item is-readonly">
              <span class="account-info-icon">▣</span>
              <span><small>Ngày tham gia</small><b class="account-joindate-val">${joinDate}</b></span>
            </div>
          </div>
          <div class="account-tip"><b>✓</b><span>Hoàn thiện số điện thoại để bảo vệ tài khoản và hỗ trợ đối soát rút tiền nhanh hơn.</span></div>
        </section>

        <section class="account-panel account-connections-panel">
          <div class="account-panel-heading">
            <div><span class="account-section-icon">⌘</span><div><small>ĐỒNG BỘ & THANH TOÁN</small><h2>Liên kết nhận tiền</h2></div></div>
          </div>
          <div class="account-setting-grid">
            <button class="account-setting zalo" type="button">
              <span class="account-setting-icon">Z</span>
              <span>
                <small>ZALO</small>
                <b>Đồng bộ với tài khoản Zalo</b>
                <em>Chưa liên kết</em>
              </span>
              <i>›</i>
            </button>
            <button class="account-setting payment-history" type="button">
              <span class="account-setting-icon">₫</span>
              <span>
                <small>LỊCH SỬ CHI TRẢ</small>
                <b>Lịch sử chuyển khoản & Bill</b>
                <em style="color:#18ad60; background:#eafaf1;">Xem biên lai nhận tiền</em>
              </span>
              <i>›</i>
            </button>
          </div>
          <div class="account-tip" style="margin-top:14px; background:#fff7ed; border-color:#fed7aa; color:#9a3412;">
            <b style="color:#ea580c;">💡</b>
            <span>Nhắn riêng cho Bot Zalo cú pháp <b>/stk [Tên_Ngân_Hàng] [Số_Tài_Khoản]</b> để tự động nhận tiền hoàn mỗi ngày.</span>
          </div>
        </section>
      </div>

      <section class="dashboard-commission-banner">
        <img class="commission-banner-gift" src="assets/commission-gift-v2.png" alt="">
        <div class="commission-banner-copy">
          <small>ƯU ĐÃI ĐẶC BIỆT</small>
          <strong>Nhận ngay <em>80%</em> hoa hồng</strong>
          <span>Khi xác nhận đơn hàng thành công</span>
        </div>
        <span class="commission-banner-coin" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
      </section>
    </div>
  `;
}

function formatPaymentHistoryDate(value) {
  if (!value) return 'Đã thanh toán';
  if (typeof value === 'string' && (value.includes('Thanh toán') || value.includes('Đã') || value.includes('Quyết toán'))) {
    return value;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(date);
}

function openPaymentHistoryModal() {
  document.querySelector('.payment-history-modal-overlay')?.remove();

  const modal = document.createElement('div');
  modal.className = 'payment-history-modal-overlay';
  modal.innerHTML = `<section class="payment-history-modal" role="dialog" aria-modal="true" aria-labelledby="payment-history-title">
    <header><div><span>◷</span><div><h2 id="payment-history-title">Lịch sử thanh toán</h2><p>Danh sách hoa hồng đã được thanh toán cho bạn.</p></div></div><button type="button" aria-label="Đóng">×</button></header>
    <div class="payment-history-list"><div class="payment-history-empty" style="text-align:center; padding:30px 20px;"><div class="loader" style="display:inline-block; width:30px; height:30px; border:3px solid rgba(255,87,34,0.15); border-top-color:#ff5722; border-radius:50%; animation:spin 1s linear infinite; margin-bottom:12px;"></div><p style="margin:0; color:#7787a0; font-size:13px; font-weight:600;">Đang tải lịch sử thanh toán...</p></div></div>
  </section>`;
  document.body.appendChild(modal);

  const list = modal.querySelector('.payment-history-list');
  loadPaymentTransferHistory()
    .then(transfers => { if (list) list.innerHTML = renderPaymentTransferRows(transfers); })
    .catch(err => {
      console.error("Lỗi tải lịch sử thanh toán:", err);
      if (list) list.innerHTML = `<div class="payment-history-empty" style="text-align:center; padding:30px 20px;"><span>!</span><b>Chưa tải được lịch sử chuyển khoản</b><p>Vui lòng thử lại sau hoặc liên hệ admin.</p></div>`;
    });

  const close = () => modal.remove();
  modal.querySelector('header button')?.addEventListener('click', close);
  modal.addEventListener('click', event => { if (event.target === modal) close(); });
  window.addEventListener('keydown', function onEscape(event) {
    if (event.key !== 'Escape') return;
    close();
    window.removeEventListener('keydown', onEscape);
  });
}

async function loadPaymentTransferHistory() {
  let zaloId = localStorage.getItem('shoppesale_zalo_id') || window.cachedZaloId || '';
  if (zaloId === 'null' || zaloId === 'undefined') zaloId = '';

  const user = (typeof getLoggedUser === 'function' ? getLoggedUser() : null) || JSON.parse(localStorage.getItem('shoppesale_user') || '{}');

  if (!zaloId && user && user.email) {
    try {
      const uRes = await fetch(CONFIG.API_URL + "?action=getUserInfo&email=" + encodeURIComponent(user.email) + "&_t=" + Date.now()).then(r => r.json());
      if (uRes && uRes.success && uRes.zaloId) {
        zaloId = String(uRes.zaloId);
        localStorage.setItem('shoppesale_zalo_id', zaloId);
        localStorage.setItem('shoppesale_zalo_email', user.email);
      }
    } catch(e) {}
  }

  if (!zaloId) return [];

  let data = [];

  // 1. Thử lấy danh sách bill chuyển khoản từ API VPS
  try {
    const url = CONFIG.API_URL + '?action=getPaymentHistory&zaloId=' + encodeURIComponent(zaloId) + '&_t=' + Date.now();
    const response = await fetch(url).then(result => result.json());
    if (response && response.success && Array.isArray(response.data) && response.data.length > 0) {
      data = response.data.filter(item => item && (item.amount || item.transferAmount || item.paidAmount));
    }
  } catch(e) {}

  // 2. Trực tiếp đọc bảng Google Sheet CSV (tab Lịch sử thanh toán gid=800356243) để đồng bộ 100% thời gian thực
  if (!data.length) {
    try {
      const sheetCsvUrl = "https://docs.google.com/spreadsheets/d/1hnhrRHjTxLRnJatcyTuRFPOC7es3LoHawAOpZfOIcuo/export?format=csv&gid=800356243";
      const csvRes = await fetch(sheetCsvUrl);
      if (csvRes.ok) {
        const csvText = await csvRes.text();
        const lines = csvText.split('\n');
        const targetId = String(zaloId).trim().replace(/['"\r]/g, '');
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

  // 3. Fallback theo đơn hàng đã thanh toán nếu chưa có dòng trong bảng bill
  if (!data.length) {
    try {
      const sRes = await fetch(CONFIG.API_URL + '?action=unifiedSearch&query=' + encodeURIComponent(zaloId) + '&_t=' + Date.now()).then(r => r.json());
      const orders = (sRes && Array.isArray(sRes.data)) ? sRes.data : [];
      const paidOrders = orders.filter(o => o && (o.paymentStatus === 'Đã TT' || o.paymentStatus === 'Đã thanh toán'));

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
    } catch(eSearch) {}
  }

  return data;
}

function renderPaymentTransferRows(transfers) {
  if (!transfers.length) {
    return `<div class="payment-history-empty" style="text-align:center; padding:30px 20px;"><span>◷</span><b>Chưa có lịch sử chuyển khoản</b><p>Khi đơn hàng được đối soát và thanh toán, thông tin sẽ hiển thị tại đây.</p></div>`;
  }

  return transfers.map(transfer => {
    const amount = Math.round(Number(transfer.amount || transfer.transferAmount || transfer.paidAmount) || 0).toLocaleString('vi-VN') + 'đ';
    const date = formatPaymentHistoryDate(transfer.date || transfer.transferredAt || transfer.paymentDate || transfer.createdAt);
    const billUrl = [transfer.billUrl, transfer.billImageUrl, transfer.paymentProofUrl, transfer.transferImage, transfer.receiptUrl]
      .map(value => String(value || '').trim()).find(value => /^https?:\/\//i.test(value));
    const billAction = billUrl
      ? `<a href="${billUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:4px; padding:6px 14px; border-radius:10px; background:#fff2ed; color:#ff5722; font-weight:700; font-size:13px; text-decoration:none; border:1px solid #ffd8cc; box-shadow:0 2px 4px rgba(255,87,34,0.1); transition:all 0.2s;">Xem bill ↗</a>`
      : `<span class="is-unavailable" style="display:inline-flex; align-items:center; gap:4px; padding:6px 12px; border-radius:8px; background:#eafbf2; color:#12a061; font-weight:700; font-size:12px;">✓ Đã chi trả</span>`;
    return `
      <article class="payment-history-row" style="display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border:1px solid #edf0f5; border-radius:14px; margin-bottom:10px; background:#fff; box-shadow:0 2px 6px rgba(23,32,51,0.02);">
        <div>
          <strong style="display:block; font-size:16px; font-weight:800; color:#18ad60;">+${amount}</strong>
          <small style="color:#7787a0; font-size:12px; font-weight:500; margin-top:2px;">${date}</small>
        </div>
        ${billAction}
      </article>
    `;
  }).join('');
}

pages.account = accountRedesignedPage;

function openEditProfileModal() {
  const user = getLoggedUser() || { name: "User" };
  const savedPhone = localStorage.getItem('shoppesale_phone') || "";
  
  const modal = document.createElement('div');
  modal.className = 'edit-profile-modal-overlay';
  modal.style = `
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(23, 32, 51, 0.6);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.25s ease;
  `;
  
  modal.innerHTML = `
    <div class="edit-profile-dialog" style="
      background: #fff;
      width: 90%; max-width: 400px;
      border-radius: 24px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.15);
      border: 1px solid #e8e9ef;
      overflow: hidden;
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    ">
      <div style="padding: 24px 24px 16px; border-bottom: 1px solid #f0f2f5;">
        <h3 style="margin: 0; font-size: 18px; font-weight: 800; color: #15233a;">Chỉnh sửa hồ sơ</h3>
        <p style="margin: 4px 0 0; font-size: 13px; color: #7787a0;">Cập nhật thông tin tài khoản của bạn</p>
      </div>
      
      <form id="edit-profile-form" style="padding: 24px; display: flex; flex-direction: column; gap: 16px; margin: 0;">
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <label style="font-size: 11px; font-weight: 800; color: #4b5b75; letter-spacing: 0.05em;">TÊN HIỂN THỊ</label>
          <input type="text" id="edit-name" value="${user.name}" placeholder="Nhập tên hiển thị..." required style="
            padding: 12px 16px; border-radius: 12px; border: 1px solid #cbd4e1;
            font-size: 14px; color: #15233a; outline: none; transition: all 0.2s;
          " onfocus="this.style.borderColor='#ff5722'; this.style.boxShadow='0 0 0 3px rgba(255,87,34,0.1)';" onblur="this.style.borderColor='#cbd4e1'; this.style.boxShadow='none';">
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <label style="font-size: 11px; font-weight: 800; color: #4b5b75; letter-spacing: 0.05em;">SỐ ĐIỆN THOẠI</label>
          <input type="tel" id="edit-phone" value="${savedPhone}" placeholder="Nhập số điện thoại..." style="
            padding: 12px 16px; border-radius: 12px; border: 1px solid #cbd4e1;
            font-size: 14px; color: #15233a; outline: none; transition: all 0.2s;
          " onfocus="this.style.borderColor='#ff5722'; this.style.boxShadow='0 0 0 3px rgba(255,87,34,0.1)';" onblur="this.style.borderColor='#cbd4e1'; this.style.boxShadow='none';">
        </div>
        
        <div style="display: flex; gap: 12px; margin-top: 8px;">
          <button type="button" id="edit-cancel" style="
            flex: 1; padding: 12px; border-radius: 12px; border: 1px solid #cbd4e1;
            background: #fff; color: #4b5b75; font-weight: bold; cursor: pointer; transition: all 0.2s;
          " onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#fff'">Hủy</button>
          
          <button type="submit" style="
            flex: 1; padding: 12px; border-radius: 12px; border: 0;
            background: #ff5722; color: #fff; font-weight: bold; cursor: pointer; transition: all 0.2s;
            box-shadow: 0 4px 10px rgba(255,87,34,0.2);
          " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">Lưu</button>
        </div>
      </form>
    </div>
    
    <style>
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    </style>
  `;
  
  document.body.appendChild(modal);
  
  const form = modal.querySelector('#edit-profile-form');
  const cancelBtn = modal.querySelector('#edit-cancel');
  
  const closeModal = () => { modal.remove(); };
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const newName = modal.querySelector('#edit-name').value.trim();
    const newPhone = modal.querySelector('#edit-phone').value.trim();
    
    if (!newName) return;
    
    const user = getLoggedUser();
    if (!user) {
      location.reload();
      return;
    }
    
    const submitBtn = form.querySelector('button[type="submit"]') || modal.querySelector('#edit-submit');
    const originalText = submitBtn ? submitBtn.textContent : 'Lưu';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang lưu...';
    }
    
    try {
      // Gửi số điện thoại lên Google Sheet để lưu trữ
      const url = CONFIG.API_URL + '?action=savePhone&email=' + encodeURIComponent(user.email) + '&phone=' + encodeURIComponent(newPhone);
      const response = await fetch(url).then(res => res.json());
      
      if (!response.success) {
        throw new Error(response.error || 'Không thể lưu số điện thoại lên Google Sheet.');
      }
      
      const updatedUser = { ...user, name: newName };
      localStorage.setItem('shoppesale_user', JSON.stringify(updatedUser));
      
      if (newPhone) {
        localStorage.setItem('shoppesale_phone', newPhone);
      } else {
        localStorage.removeItem('shoppesale_phone');
      }
      
      document.querySelectorAll('.wallet-user strong, .account-person h1, .account-info-list button:first-child b').forEach(el => {
        el.textContent = newName;
      });
      
      if (typeof window.syncRealDataToUI === 'function') {
        window.syncRealDataToUI();
      }
      if (typeof updateTopbarUI === 'function') {
        updateTopbarUI(updatedUser);
      }
      
      closeModal();
    } catch (err) {
      console.error('Lỗi khi lưu số điện thoại:', err);
      alert(err.message || 'Lỗi kết nối máy chủ. Vui lòng thử lại!');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });
}

function enhanceAccountPage() {
  const view = document.querySelector('.account-view');
  if (!view || view.dataset.ready) return;
  view.dataset.ready = 'true';
  
  // Gắn sự kiện click mở modal chỉnh sửa hồ sơ
  view.querySelectorAll('.account-edit-all, .account-edit-top-btn, button.account-info-item').forEach(btn => {
    btn.addEventListener('click', openEditProfileModal);
  });

  // Gắn sự kiện click mở modal lịch sử thanh toán & Bill
  view.querySelectorAll('.payment-history').forEach(btn => {
    btn.addEventListener('click', openPaymentHistoryModal);
  });

  // Gắn sự kiện điều hướng nhanh từ các nút trong ví (Đơn hàng, Giới thiệu)
  view.querySelectorAll('.wallet-actions button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      if (page) {
        history.pushState(null, '', '/' + page);
        render();
      }
    });
  });
}

if ((location.hash.slice(1) || location.pathname.slice(1) || 'dashboard') === 'account') render();
requestAnimationFrame(enhanceAccountPage);
window.addEventListener('hashchange', () => requestAnimationFrame(enhanceAccountPage));
window.addEventListener('popstate', () => requestAnimationFrame(enhanceAccountPage));
setInterval(enhanceAccountPage, 100);
