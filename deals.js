// deals.js - Logic hiển thị và tương tác Săn Sản Phẩm Hoa Hồng Cao
(function () {
  let dealsCache = null;
  let currentCategory = 'all';
  let searchKeyword = '';
  let isLoading = false;

  // Lấy API URL từ cấu hình
  function getApiBase() {
    if (typeof CONFIG !== 'undefined' && CONFIG.API_URL) {
      // CONFIG.API_URL = "https://api-vps.hoantienonline.io.vn/api/web"
      return CONFIG.API_URL;
    }
    return 'https://api-vps.hoantienonline.io.vn/api/web';
  }

  // Tải danh sách sản phẩm từ backend VPS
  async function loadDealsData(category = 'all', keyword = '') {
    isLoading = true;
    renderDealsGrid();

    try {
      const baseUrl = getApiBase().replace(/\/+$/, '');
      const url = `${baseUrl}/high-commission-products?category=${encodeURIComponent(category)}&keyword=${encodeURIComponent(keyword)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.success) {
        dealsCache = data;
      }
    } catch (e) {
      console.error('Lỗi tải sản phẩm hoa hồng cao:', e);
    } finally {
      isLoading = false;
      renderDealsGrid();
    }
  }

  // Sao chép link sạch Shopee và thông báo
  window.copyCleanDealUrl = function (cleanUrl) {
    if (!cleanUrl) return;
    navigator.clipboard.writeText(cleanUrl).then(() => {
      showDealToast('✅ Đã sao chép link Shopee sạch! Hãy dán vào ô "Chuyển link" hoặc gửi Bot Zalo để nhận hoàn tiền nhé!');
    }).catch(() => {
      const tempInput = document.createElement('input');
      tempInput.value = cleanUrl;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      showDealToast('✅ Đã sao chép link Shopee sạch! Hãy dán vào ô "Chuyển link" hoặc gửi Bot Zalo để nhận hoàn tiền nhé!');
    });
  };

  // Điều hướng sang trang /convert và tự động điền link
  window.redirectToConvertWithDeal = function (cleanUrl) {
    if (!cleanUrl) return;

    // Nếu chưa đăng nhập: sao chép link và mở modal đăng nhập
    if (typeof getLoggedUser === 'function' && !getLoggedUser()) {
      window.copyCleanDealUrl(cleanUrl);
      if (typeof showLoginModal === 'function') {
        showLoginModal();
      }
      return;
    }

    sessionStorage.setItem('pending_convert_deal_url', cleanUrl);

    // Chuyển hướng sang trang chuyển link
    history.pushState(null, '', '/convert');
    if (typeof render === 'function') render();

    // Tự động điền và kích hoạt chuyển đổi sau khi trang convert mở
    setTimeout(() => {
      const inputEl = document.querySelector('#product-link');
      if (inputEl) {
        inputEl.value = cleanUrl;
        inputEl.focus();
        inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showDealToast('✨ Đã điền link sản phẩm! Đang tiến hành chuyển đổi...');
        if (typeof handleConvert === 'function') {
          handleConvert();
        }
      }
    }, 300);
  };

  // Hiển thị Toast thông báo
  function showDealToast(msg) {
    let toast = document.querySelector('.deal-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'deal-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3800);
  }

  // Chọn danh mục
  window.selectDealCategory = function (catId) {
    currentCategory = catId;
    document.querySelectorAll('.deals-cat-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.cat === catId);
    });
    loadDealsData(currentCategory, searchKeyword);
  };

  // Tìm kiếm
  window.handleDealSearch = function (e) {
    searchKeyword = e.target.value.trim();
    clearTimeout(window._dealSearchTimer);
    window._dealSearchTimer = setTimeout(() => {
      loadDealsData(currentCategory, searchKeyword);
    }, 350);
  };

  // Vẽ lưới sản phẩm
  function renderDealsGrid() {
    const gridEl = document.querySelector('#deals-product-grid');
    if (!gridEl) return;

    if (isLoading && (!dealsCache || !dealsCache.products || dealsCache.products.length === 0)) {
      gridEl.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 60px 20px; text-align: center; color: #64748b;">
          <div style="display: inline-block; width: 36px; height: 36px; border: 3px solid #f1f5f9; border-top-color: #ee4d2d; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
          <p style="margin-top: 12px; font-weight: 600; font-size: 14px;">Đang tải danh sách sản phẩm hoa hồng cao...</p>
        </div>
      `;
      return;
    }

    const products = dealsCache?.products || [];
    if (products.length === 0) {
      gridEl.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 60px 20px; text-align: center; color: #94a3b8;">
          <div style="font-size: 40px; margin-bottom: 12px;">🛍️</div>
          <h3 style="font-size: 16px; color: #334155; margin-bottom: 6px;">Không tìm thấy sản phẩm phù hợp</h3>
          <p style="font-size: 13.5px;">Hãy thử tìm từ khóa khác hoặc chuyển sang danh mục khác nhé!</p>
        </div>
      `;
      return;
    }

    gridEl.innerHTML = products.map(p => {
      const priceText = `${new Intl.NumberFormat('vi-VN').format(p.price)}₫`;
      const commRate = p.commissionPercent ? `${p.commissionPercent}%` : `${(p.commissionRate * 100).toFixed(1)}%`;
      const safeTitle = (p.productName || 'Sản phẩm Shopee').replace(/"/g, '&quot;');
      const safeCleanUrl = (p.cleanProductUrl || '').replace(/'/g, "\\'");

      return `
        <div class="deal-card">
          <div class="deal-img-wrapper">
            <span class="deal-comm-badge">⚡ HH ${commRate}</span>
            <img class="deal-img" src="${p.imageUrl}" alt="${safeTitle}" loading="lazy" onerror="this.src='assets/hero-illustration-v3.png'" />
          </div>
          <div class="deal-body">
            <h3 class="deal-title" title="${safeTitle}">${p.productName}</h3>
            <div class="deal-price-row">
              <span class="deal-price">${priceText}</span>
              <span class="deal-rating">★ ${p.ratingStar || 5}</span>
            </div>
            <div class="deal-shop" title="${p.shopName || ''}">🏬 ${p.shopName || 'Shopee Shop'}</div>
            <div class="deal-actions">
              <button class="btn-copy-deal" onclick="copyCleanDealUrl('${safeCleanUrl}')" title="Sao chép link Shopee gốc không kèm id bên thứ 3">
                📋 Chép link
              </button>
              <button class="btn-convert-deal" onclick="redirectToConvertWithDeal('${safeCleanUrl}')" title="Chuyển link nhận hoàn tiền ngay">
                ⚡ Nhận tiền
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Hàm render view chính của trang deals
  window.deals = function () {
    const categories = [
      { id: 'all', name: '🔥 Tất cả hot' },
      { id: 'fashion', name: '👗 Thời trang' },
      { id: 'beauty', name: '💄 Sắc đẹp & Mỹ phẩm' },
      { id: 'sports', name: '🏃 Thể thao & Dã ngoại' },
      { id: 'jewelry', name: '💍 Đồng hồ & Trang sức' },
      { id: 'shoes_bags', name: '👟 Giày dép & Túi ví' },
      { id: 'health', name: '🌿 Sức khỏe & TPCN' },
      { id: 'home', name: '🏠 Nhà cửa & Đời sống' },
      { id: 'tech', name: '📱 Phụ kiện & Công nghệ' },
      { id: 'mom_baby', name: '🍼 Mẹ & Bé' },
      { id: 'food', name: '🍿 Bách hóa & Ăn vặt' },
      { id: 'stationery', name: '📚 Sách & Văn phòng phẩm' },
      { id: 'auto_moto', name: '🚗 Xe máy & Ô tô' },
      { id: 'pets', name: '🐾 Chăm sóc Thú cưng' }
    ];

    setTimeout(() => {
      loadDealsData(currentCategory, searchKeyword);
    }, 50);

    return `
      <div class="deals-container">
        <!-- Banner Hero & Hướng dẫn nhận hoa hồng -->
        <div class="deals-hero-banner">
          <div class="deals-hero-header">
            <span class="deals-badge">💎 HOA HỒNG CAO TỚI 25%</span>
            <span style="font-size: 13px; font-weight: 600; opacity: 0.9;">Tự động cập nhật từ Shopee</span>
          </div>
          <h1 class="deals-hero-title">Săn Sản Phẩm Hoa Hồng Khủng</h1>
          <p class="deals-hero-desc">
            Danh sách các sản phẩm đang có mức chiết khấu hoa hồng cao nhất trên Shopee. Hãy sao chép link sạch hoặc chuyển đổi ngay để nhận hoàn tiền <b>lên đến 80% hoa hồng</b>!
          </p>

          <!-- 3 Bước nhận hoàn tiền -->
          <div class="deals-steps">
            <div class="deals-step-item">
              <span class="deals-step-num">1</span>
              <div class="deals-step-text">
                <strong>Chọn sản phẩm & Lấy link</strong>
                <span>Bấm <b>"Chép link"</b> hoặc <b>"Nhận tiền"</b> để lấy link Shopee gốc sạch 100%.</span>
              </div>
            </div>
            <div class="deals-step-item">
              <span class="deals-step-num">2</span>
              <div class="deals-step-text">
                <strong>Chuyển đổi nhận hoàn tiền</strong>
                <span>Dán vào ô <b>Chuyển link</b> trên web hoặc gửi trực tiếp vào <b>Bot Zalo</b>.</span>
              </div>
            </div>
            <div class="deals-step-item">
              <span class="deals-step-num">3</span>
              <div class="deals-step-text">
                <strong>Mua hàng & Nhận tiền về ví</strong>
                <span>Đặt hàng trên Shopee qua link vừa tạo, tiền hoàn sẽ được tự động cộng vào ví!</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bộ điều khiển: Tìm kiếm & Tab danh mục -->
        <div class="deals-controls">
          <div class="deals-search-bar">
            <span class="deals-search-icon">🔍</span>
            <input 
              type="text" 
              class="deals-search-input" 
              placeholder="Tìm kiếm sản phẩm hoa hồng cao (tên sản phẩm, thương hiệu, shop)..." 
              value="${searchKeyword}"
              oninput="handleDealSearch(event)"
            />
          </div>

          <div class="deals-cat-tabs">
            ${categories.map(c => `
              <button 
                class="deals-cat-tab ${c.id === currentCategory ? 'active' : ''}" 
                data-cat="${c.id}" 
                onclick="selectDealCategory('${c.id}')"
              >
                ${c.name}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Lưới sản phẩm -->
        <div id="deals-product-grid" class="deals-grid">
          <!-- Render động từ API -->
        </div>
      </div>
    `;
  };

  // Lắng nghe khi tải trang /convert để tự động điền nếu có deal đang chờ
  window.addEventListener('DOMContentLoaded', () => {
    checkPendingDealConvert();
  });

  function checkPendingDealConvert() {
    const pendingUrl = sessionStorage.getItem('pending_convert_deal_url');
    if (pendingUrl) {
      setTimeout(() => {
        const inputEl = document.querySelector('#product-link');
        if (inputEl) {
          sessionStorage.removeItem('pending_convert_deal_url');
          inputEl.value = pendingUrl;
          if (typeof handleConvert === 'function') handleConvert();
        }
      }, 300);
    }
  }
})();
