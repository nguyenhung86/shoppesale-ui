(() => {
  function enhanceZaloSync() {
    const button = document.querySelector('.account-setting.zalo');
    if (!button || button.dataset.syncReady) return;

    button.dataset.syncReady = 'true';
    
    // Check if there is already a saved Zalo ID
    const savedZaloId = localStorage.getItem('shoppesale_zalo_id');
    const title = button.querySelector('b');
    if (title) title.textContent = 'Đồng bộ với tài khoản Zalo';

    if (savedZaloId) {
      updateZaloSyncUI(savedZaloId);
      return;
    }

    const panel = document.createElement('div');
    panel.className = 'account-zalo-sync-panel';
    panel.innerHTML = `
      <label for="account-zalo-id" style="display:block; margin-top:10px; font-size:11px; font-weight:800; color:#7787a0;">ID ZALO</label>
      <div class="account-zalo-sync-row" style="display:flex; gap:10px; margin-top:5px;">
        <input id="account-zalo-id" type="text" placeholder="Nhập ID hoặc tên Zalo của bạn" style="flex:1; padding:10px; border:1px solid #e3e5ec; border-radius:10px; font-size:13px;" value="${savedZaloId || ''}">
        <button type="button" style="padding:10px 15px; border:0; border-radius:10px; background:#ff5722; color:#fff; font-weight:bold; font-size:13px; cursor:pointer;">Lưu thông tin</button>
      </div>
    `;
    button.closest('.account-setting-grid')?.append(panel);

    button.addEventListener('click', event => {
      event.preventDefault();
      panel.classList.toggle('is-open');
      if (panel.classList.contains('is-open')) panel.querySelector('input')?.focus();
    });

    panel.querySelector('button')?.addEventListener('click', async event => {
      event.preventDefault();
      const input = panel.querySelector('input');
      const zaloId = input ? input.value.trim() : '';
      if (!zaloId) {
        input?.focus();
        return;
      }
      
      const user = getLoggedUser();
      if (!user) {
        alert("Vui lòng đăng nhập Google trước!");
        return;
      }

      const linkedZaloId = localStorage.getItem('shoppesale_zalo_id');
      if (linkedZaloId) {
        panel.remove();
        updateZaloSyncUI(linkedZaloId);
        return;
      }
      
      const saveBtn = panel.querySelector('button');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Đang kiểm tra...';
      }

      try {
        const validation = await window.validateZaloIdOnSheet(zaloId);
        if (!validation.exists) {
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Lưu thông tin';
          }
          alert("Không tìm thấy ID Zalo này trên hệ thống. Vui lòng kiểm tra lại ID đã dùng trong nhóm!");
          input?.focus();
          return;
        }

        if (saveBtn) saveBtn.textContent = 'Đang lưu...';
        const url = CONFIG.API_URL + "?action=linkZaloId&email=" + encodeURIComponent(user.email) + "&zaloId=" + encodeURIComponent(zaloId);
        const response = await fetch(url).then(res => res.json());

          if (response.success) {
            localStorage.setItem('shoppesale_zalo_id', zaloId);
            localStorage.setItem('shoppesale_zalo_email', user.email);
            updateZaloSyncUI(zaloId);
            panel.remove();
            alert("Đã liên kết ID Zalo thành công. ID này không thể thay đổi!");
            // Dispatch event to trigger reload of order data
            window.dispatchEvent(new CustomEvent('zalo_id_synced', { detail: zaloId }));
          } else {
            alert("Có lỗi xảy ra khi lưu. Vui lòng thử lại!");
          }
      } catch (err) {
          console.error("Lỗi lưu Zalo ID", err);
          alert("Không thể kết nối đến máy chủ. Vui lòng thử lại!");
      } finally {
        if (saveBtn && document.body.contains(saveBtn)) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Lưu thông tin';
        }
      }
    });
  }

  enhanceZaloSync();
  window.addEventListener('hashchange', () => requestAnimationFrame(enhanceZaloSync));
})();
