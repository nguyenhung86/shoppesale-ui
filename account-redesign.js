function accountRedesignedPage() {
  return `
    <div class="account-view">
      <section class="account-hero">
        <div class="account-hero-copy">
          <div class="account-kicker"><span>✦</span> HỒ SƠ THÀNH VIÊN</div>
          <div class="account-person">
            <span class="account-avatar">HV</span>
            <div>
              <h1>Hồng Vinh</h1>
              <p>Thành viên từ 11/07/2026</p>
            </div>
          </div>
        </div>
        <div class="account-hero-orbit" aria-hidden="true"></div>
      </section>

      <section class="account-balance-card">
        <div class="account-balance-main">
          <span class="account-balance-icon">₫</span>
          <div><small>TỔNG HOA HỒNG</small><strong>0đ</strong><p>Tiền hoàn hợp lệ sẽ được cộng sau đối soát.</p></div>
        </div>
        <div class="account-quick-stats">
          <div><span>▣</span><small>Tổng đơn hàng</small><b>0</b></div>
          <div><span>♧</span><small>Đã giới thiệu</small><b>0</b></div>
          <div><span>◷</span><small>Đang chờ xử lý</small><b>0đ</b></div>
        </div>
      </section>

      <div class="account-content-grid">
        <section class="account-panel account-profile-panel">
          <div class="account-panel-heading">
            <div><span class="account-section-icon">♙</span><div><small>THÔNG TIN CÁ NHÂN</small><h2>Hồ sơ của bạn</h2></div></div>
            <button class="account-edit-all" type="button">Chỉnh sửa</button>
          </div>
          <div class="account-info-list">
            <button class="account-info-item" type="button"><span class="account-info-icon">♙</span><span><small>Tên hiển thị</small><b>Hồng Vinh</b></span><i>›</i></button>
            <button class="account-info-item" type="button"><span class="account-info-icon">⌕</span><span><small>Số điện thoại</small><b class="is-empty">Thêm số điện thoại</b></span><i>›</i></button>
          </div>
          <div class="account-tip"><b>✓</b><span>Hoàn thiện số điện thoại để bảo vệ tài khoản và hỗ trợ rút tiền nhanh hơn.</span></div>
        </section>

      </div>

      <section class="account-panel account-connections">
        <div class="account-panel-heading">
          <div><span class="account-section-icon">⌘</span><div><small>THIẾT LẬP TÀI KHOẢN</small><h2>Nhận tiền & bảo mật</h2></div></div>
          <p>Hoàn tất các thiết lập để giao dịch thuận tiện hơn.</p>
        </div>
        <div class="account-setting-grid">
          <button class="account-setting zalo" type="button"><span class="account-setting-icon">Z</span><span><small>ZALO</small><b>Liên kết nhóm Hoàn Tiền</b><em>Chưa liên kết</em></span><i>›</i></button>
        </div>
      </section>

    </div>
  `;
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
  
  form.addEventListener('submit', e => {
    e.preventDefault();
    const newName = modal.querySelector('#edit-name').value.trim();
    const newPhone = modal.querySelector('#edit-phone').value.trim();
    
    if (!newName) return;
    
    const updatedUser = { ...user, name: newName };
    localStorage.setItem('shoppesale_user', JSON.stringify(updatedUser));
    
    if (newPhone) {
      localStorage.setItem('shoppesale_phone', newPhone);
    } else {
      localStorage.removeItem('shoppesale_phone');
    }
    
    if (typeof window.syncRealDataToUI === 'function') {
      window.syncRealDataToUI();
    }
    if (typeof updateTopbarUI === 'function') {
      updateTopbarUI(updatedUser);
    }
    
    closeModal();
  });
}

function enhanceAccountPage() {
  const view = document.querySelector('.account-view');
  if (!view || view.dataset.ready) return;
  view.dataset.ready = 'true';
  
  // Gắn sự kiện click mở modal chỉnh sửa hồ sơ
  const editBtn = view.querySelector('.account-edit-all');
  if (editBtn) {
    editBtn.addEventListener('click', openEditProfileModal);
  }
  
  view.querySelectorAll('.account-info-item').forEach(item => {
    item.addEventListener('click', openEditProfileModal);
  });
}

if ((location.hash.slice(1) || location.pathname.slice(1) || 'dashboard') === 'account') render();
requestAnimationFrame(enhanceAccountPage);
window.addEventListener('hashchange', () => requestAnimationFrame(enhanceAccountPage));
