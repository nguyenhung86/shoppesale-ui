function getLoggedUser() {
  try {
    const user = localStorage.getItem('shoppesale_user');
    return user ? JSON.parse(user) : null;
  } catch (e) {
    return null;
  }
}

function parseJwt(token) {
  try {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("JWT Decode error", e);
    return null;
  }
}

function getZaloLinkElements() {
  return {
    overlay: document.getElementById('zalo-link-overlay'),
    form: document.getElementById('zalo-link-form'),
    input: document.getElementById('zalo-link-id'),
    email: document.getElementById('zalo-link-email'),
    error: document.getElementById('zalo-link-error'),
    submit: document.getElementById('zalo-link-submit')
  };
}

function showZaloLinkModal(user, message) {
  const elements = getZaloLinkElements();
  if (!elements.overlay) return;

  if (elements.email) elements.email.textContent = user?.email || '';
  if (elements.error) {
    elements.error.textContent = message || '';
    elements.error.classList.toggle('is-visible', Boolean(message));
  }

  elements.overlay.hidden = false;
  elements.overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('zalo-link-modal-open');
  requestAnimationFrame(() => elements.input?.focus());
}

function hideZaloLinkModal() {
  const elements = getZaloLinkElements();
  if (!elements.overlay) return;

  elements.overlay.hidden = true;
  elements.overlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('zalo-link-modal-open');
}

function applySyncedZaloId(user, zaloId) {
  localStorage.setItem('shoppesale_zalo_id', zaloId);
  localStorage.setItem('shoppesale_zalo_email', user.email);
  updateZaloSyncUI(zaloId);
  window.dispatchEvent(new CustomEvent('zalo_id_synced', { detail: zaloId }));

  if (typeof window.fetchOrdersInBackground === 'function') {
    window.fetchOrdersInBackground(zaloId);
  }
}

async function validateZaloIdOnSheet(zaloId) {
  const url = CONFIG.API_URL + '?action=unifiedSearch&query=' + encodeURIComponent(zaloId);
  const response = await fetch(url).then(res => res.json());
  const matches = Array.isArray(response.data)
    ? response.data.filter(item => item && item.found !== false)
    : [];

  return {
    exists: Boolean(response.success && (response.isZaloIdValid || matches.length > 0)),
    response
  };
}

window.validateZaloIdOnSheet = validateZaloIdOnSheet;

async function submitZaloLinkForm(event) {
  event.preventDefault();

  const elements = getZaloLinkElements();
  const user = getLoggedUser();
  const zaloId = elements.input?.value.trim() || '';

  if (!user) {
    location.reload();
    return;
  }

  const linkedZaloId = localStorage.getItem('shoppesale_zalo_id');
  const linkedEmail = localStorage.getItem('shoppesale_zalo_email');
  if (linkedZaloId && linkedEmail === user.email) {
    applySyncedZaloId(user, linkedZaloId);
    hideZaloLinkModal();
    return;
  }

  if (!/^\d{8,25}$/.test(zaloId)) {
    if (elements.error) {
      elements.error.textContent = 'ID Zalo chỉ gồm chữ số, độ dài từ 8 đến 25 số.';
      elements.error.classList.add('is-visible');
    }
    elements.input?.focus();
    return;
  }

  if (elements.error) {
    elements.error.textContent = '';
    elements.error.classList.remove('is-visible');
  }
  if (elements.submit) {
    elements.submit.disabled = true;
    elements.submit.textContent = 'Đang đồng bộ...';
  }

  try {
    if (elements.submit) elements.submit.textContent = 'Đang kiểm tra ID...';
    const validation = await validateZaloIdOnSheet(zaloId);
    if (!validation.exists) {
      if (elements.error) {
        elements.error.textContent = 'Không tìm thấy ID Zalo này trên hệ thống. Vui lòng kiểm tra lại ID đã dùng trong nhóm rồi nhập lại.';
        elements.error.classList.add('is-visible');
      }
      elements.input?.focus();
      return;
    }

    if (elements.submit) elements.submit.textContent = 'Đang lưu liên kết...';
    const url = CONFIG.API_URL + '?action=linkZaloId&email=' + encodeURIComponent(user.email) + '&zaloId=' + encodeURIComponent(zaloId);
    const response = await fetch(url).then(res => res.json());

    if (!response.success) {
      throw new Error(response.error || 'Không thể lưu ID Zalo.');
    }

    applySyncedZaloId(user, zaloId);
    hideZaloLinkModal();
  } catch (error) {
    console.error('Lỗi lưu Zalo ID', error);
    if (elements.error) {
      elements.error.textContent = error.message || 'Không thể kết nối đến máy chủ. Vui lòng thử lại.';
      elements.error.classList.add('is-visible');
    }
  } finally {
    if (elements.submit) {
      elements.submit.disabled = false;
      elements.submit.textContent = 'Đồng bộ đơn hàng';
    }
  }
}

function handleGoogleCredentialResponse(response) {
  const credential = response.credential;
  const payload = parseJwt(credential);
  if (payload) {
    const user = {
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    };
    localStorage.setItem('shoppesale_user', JSON.stringify(user));
    
    // Hide login screen
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'none';
    
    // Show main layout
    const shell = document.querySelector('.app-shell');
    if (shell) shell.style.display = 'block';
    
    // Update Topbar UI
    updateTopbarUI(user);
    
    // Auto sync Zalo ID
    checkZaloIdAndSync(user.email);
  } else {
    alert("Đăng nhập thất bại. Vui lòng thử lại!");
  }
}

function showLoginModal() {
  const overlay = document.getElementById('login-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    document.body.classList.add('login-overlay-active');
  }
}

function hideLoginModal() {
  const overlay = document.getElementById('login-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    document.body.classList.remove('login-overlay-active');
  }
}

window.showLoginModal = showLoginModal;
window.hideLoginModal = hideLoginModal;

// Lắng nghe sự kiện click ngoài modal và nút đóng
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('login-overlay');
  const closeBtn = document.getElementById('close-login-modal-btn');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        hideLoginModal();
      }
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      hideLoginModal();
    });
  }
});

function updateTopbarUI(user) {
  const userArea = document.querySelector('.user-area');
  if (!userArea) return;
  
  if (user) {
    userArea.innerHTML = `
      <span class="avatar"></span>
      <span class="user-name"></span>
      <div class="topbar-actions">
        <button class="topbar-action topbar-notification" type="button" aria-label="Thông báo" title="Thông báo" style="display:none;">♧</button>
        <button class="topbar-action topbar-logout" type="button" aria-label="Đăng xuất" title="Đăng xuất">↪</button>
      </div>
    `;
    
    userArea.querySelector('.topbar-logout')?.addEventListener('click', event => {
      event.preventDefault();
      if (typeof window.openLogoutModal === 'function') {
        window.openLogoutModal();
      } else {
        const overlay = document.createElement('div');
        overlay.className = 'logout-modal';
        overlay.innerHTML = '<div class="logout-dialog" role="dialog" aria-modal="true" aria-labelledby="logout-title"><div class="logout-dialog-heading"><span class="logout-dialog-icon" aria-hidden="true">△</span><h2 id="logout-title">Đăng xuất?</h2></div><p>Bạn sẽ cần đăng nhập lại để tiếp tục.</p><div class="logout-dialog-actions"><button class="logout-stay" type="button">Ở lại</button><button class="logout-confirm" type="button">Đăng xuất</button></div></div>';
        document.body.append(overlay);
        overlay.addEventListener('click', e => {
          if (e.target === overlay || e.target.closest('.logout-stay')) overlay.remove();
          if (e.target.closest('.logout-confirm')) {
            overlay.remove();
            localStorage.removeItem('shoppesale_user');
            localStorage.removeItem('shoppesale_zalo_id');
            localStorage.removeItem('shoppesale_zalo_email');
            location.reload();
          }
        });
      }
    });

    const nameEl = userArea.querySelector('.user-name');
    const avatarEl = userArea.querySelector('.avatar');
    if (nameEl) nameEl.textContent = user.name;
    if (avatarEl) {
      if (user.picture) {
        avatarEl.innerHTML = `<img src="${user.picture}" alt="${user.name}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        avatarEl.style.background = 'transparent';
        avatarEl.style.border = '1px solid #e8e9ef';
      } else {
        avatarEl.textContent = (user.name || "User").slice(0, 2).toUpperCase();
      }
    }
  } else {
    userArea.innerHTML = `
      <button class="topbar-login-btn" type="button" style="padding: 6px 16px; background: linear-gradient(135deg, #ff6b40, #e84616); color: #fff; border: 0; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 10px rgba(233,91,34,0.15); transition: all 0.2s;">
        <span style="font-size: 14px;">🔑</span> Đăng nhập
      </button>
    `;
    userArea.querySelector('.topbar-login-btn')?.addEventListener('click', () => {
      showLoginModal();
    });
  }
}


function checkZaloIdAndSync(email) {
  const user = getLoggedUser();

  // Tài khoản thử nghiệm cũng đi qua bước nhập Zalo ID để kiểm tra đúng luồng thật.
  const url = CONFIG.API_URL + "?action=getUserInfo&email=" + encodeURIComponent(email);
  fetch(url)
    .then(res => res.json())
    .then(response => {
      if (response.success && response.zaloId) {
        if (response.phone) {
          localStorage.setItem('shoppesale_phone', String(response.phone));
        } else {
          localStorage.removeItem('shoppesale_phone');
        }
        applySyncedZaloId(user, String(response.zaloId));
        hideZaloLinkModal();
      } else {
        localStorage.removeItem('shoppesale_zalo_id');
        localStorage.removeItem('shoppesale_zalo_email');
        localStorage.removeItem('shoppesale_phone');
        window.dispatchEvent(new CustomEvent('zalo_id_missing'));
        updateZaloSyncUI(null);
        showZaloLinkModal(user);
      }
    })
    .catch(err => {
      console.error("Lỗi đồng bộ Zalo ID", err);
      showZaloLinkModal(user, 'Chưa kiểm tra được thông tin đã liên kết. Bạn hãy nhập ID Zalo để tiếp tục.');
    });
}

function updateZaloSyncUI(zaloId) {
  const zaloSettingBtn = document.querySelector('.account-setting.zalo');
  if (zaloSettingBtn) {
    const statusText = zaloSettingBtn.querySelector('em');
    const badge = zaloSettingBtn.querySelector('.tag');
    const arrow = zaloSettingBtn.querySelector('i');
    const syncPanel = document.querySelector('.account-zalo-sync-panel');
    
    if (zaloId) {
      zaloSettingBtn.disabled = true;
      zaloSettingBtn.setAttribute('aria-disabled', 'true');
      zaloSettingBtn.classList.add('is-zalo-locked');
      zaloSettingBtn.title = 'ID Zalo đã được liên kết và không thể thay đổi';
      if (arrow) arrow.textContent = '✓';
      if (syncPanel) syncPanel.remove();
      if (statusText) {
        statusText.textContent = 'Đồng bộ Zalo: ' + zaloId;
        statusText.style.color = '#18ad60';
        statusText.style.fontWeight = '700';
      }
      if (badge) {
        badge.textContent = 'Đã liên kết';
        badge.style.background = '#eafaf1';
        badge.style.color = '#19a45c';
        badge.style.border = '1px solid #bfead0';
      }
    } else {
      zaloSettingBtn.disabled = false;
      zaloSettingBtn.removeAttribute('aria-disabled');
      zaloSettingBtn.classList.remove('is-zalo-locked');
      zaloSettingBtn.removeAttribute('title');
      if (arrow) arrow.textContent = '›';
      if (statusText) {
        statusText.textContent = 'Chưa liên kết tài khoản Zalo';
        statusText.style.color = '#ff5722';
        statusText.style.fontWeight = 'normal';
      }
      if (badge) {
        badge.textContent = 'Chưa liên kết';
        badge.style.background = '#fff3ef';
        badge.style.color = '#f45a25';
        badge.style.border = '1px solid #ffd5c8';
      }
    }
  }
}

function initGoogleAuth() {
  const user = getLoggedUser();
  const overlay = document.getElementById('login-overlay');
  const shell = document.querySelector('.app-shell');
  
  if (overlay) overlay.style.display = 'none';
  if (shell) shell.style.display = 'block';
  
  if (user) {
    // Update Topbar UI on load
    setTimeout(() => {
      updateTopbarUI(user);
      const savedZaloId = localStorage.getItem('shoppesale_zalo_id');
      const savedZaloEmail = localStorage.getItem('shoppesale_zalo_email');
      if (savedZaloId && savedZaloEmail === user.email) {
        updateZaloSyncUI(savedZaloId);
        
        // Tải ngầm đơn hàng để cập nhật thống kê trên các tab
        if (typeof window.fetchOrdersInBackground === 'function') {
          window.fetchOrdersInBackground(savedZaloId);
        }
      } else {
        checkZaloIdAndSync(user.email);
      }
    }, 200);
  } else {
    // Update Topbar UI for guest on load
    setTimeout(() => {
      updateTopbarUI(null);
    }, 200);
    
    // Chế độ Đăng nhập Thử nghiệm cục bộ nếu chưa cấu hình Google Client ID
    if (!CONFIG.GOOGLE_CLIENT_ID || CONFIG.GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID_HERE") {
      const btnContainer = document.getElementById("google-login-btn");
      if (btnContainer) {
        btnContainer.innerHTML = `
          <div style="display:flex; flex-direction:column; gap:10px; align-items:center;">
            <button type="button" id="mock-login-btn" style="padding: 12px 24px; background: #ff5722; color: #fff; border: 0; border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 14px; box-shadow: 0 4px 10px rgba(233,91,34,0.2); transition: all 0.2s;">
              🚀 Đăng Nhập Thử Nghiệm
            </button>
            <small style="color: #7787a0; font-size: 11px;">(Sử dụng khi chạy thử nghiệm trên localhost)</small>
          </div>
        `;
        document.getElementById("mock-login-btn").addEventListener('click', () => {
          const user = {
            email: "test.user@gmail.com",
            name: "Khách Hàng Thử Nghiệm",
            picture: ""
          };
          localStorage.setItem('shoppesale_user', JSON.stringify(user));
          
          // Ẩn overlay đăng nhập
          if (overlay) overlay.style.display = 'none';
          
          // Hiện giao diện chính
          if (shell) shell.style.display = 'block';
          
          // Cập nhật thông tin Topbar
          updateTopbarUI(user);
          
          // Đồng bộ Zalo ID
          checkZaloIdAndSync(user.email);
        });
      }
      return;
    }
    
    // Render Google button thật
    window.addEventListener('load', () => {
      if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
          client_id: CONFIG.GOOGLE_CLIENT_ID,
          callback: handleGoogleCredentialResponse
        });
        google.accounts.id.renderButton(
          document.getElementById("google-login-btn"),
          { theme: "outline", size: "large", width: 240 }
        );
        google.accounts.id.prompt();
      } else {
        console.error("Google Identity Services SDK not loaded.");
      }
    });
  }
}

// Global logout listener
document.body.addEventListener('click', event => {
  if (event.target.closest('.logout-confirm')) {
    localStorage.removeItem('shoppesale_user');
    localStorage.removeItem('shoppesale_zalo_id');
    localStorage.removeItem('shoppesale_zalo_email');
    location.reload();
  }
});

document.getElementById('zalo-link-form')?.addEventListener('submit', submitZaloLinkForm);

initGoogleAuth();
