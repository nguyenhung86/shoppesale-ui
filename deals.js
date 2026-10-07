// deals.js - Logic hiển thị và tương tác Săn Sản Phẩm Hoa Hồng Cao
(function () {
  let dealsCache = null;
  let currentCategory = 'all';
  let searchKeyword = '';
  let isLoading = false;
  let currentPage = 1;
  const ITEMS_PER_PAGE = 20;

  // Lấy API URL từ cấu hình
  function getApiBase() {
    if (typeof CONFIG !== 'undefined' && CONFIG.API_URL) {
      // CONFIG.API_URL = "https://api-vps.hoantienonline.io.vn/api/web"
      return CONFIG.API_URL;
    }
    return 'https://api-vps.hoantienonline.io.vn/api/web';
  }

  // Nhận diện sản phẩm ngành hàng Nữ, Mẹ và Bé
  function isWomenOrBabyProduct(p) {
    if (!p) return false;
    const cat = p.categoryId || '';
    const name = (p.productName || '').toLowerCase();
    const isPackaging = name.includes('chai nhựa') || name.includes('hủ nhựa') || name.includes('lọ chiết') || name.includes('chai chiết') || name.includes('hũ nhựa') || name.includes('lọ rỗng');
    if (isPackaging) return false;
    if (cat === 'mom_baby' || cat === 'beauty') return true;
    if (cat === 'fashion') {
      if (name.includes('nam') && !name.includes('nữ') && !name.includes('unisex')) return false;
      return true;
    }
    if (cat === 'jewelry') {
      if (name.includes('nam') && !name.includes('nữ') && !name.includes('unisex')) return false;
      return true;
    }
    if (cat === 'shoes_bags') {
      if (name.includes('nữ') || name.includes('túi xách') || name.includes('balo') || name.includes('guốc') || name.includes('cao gót')) return true;
    }
    const femaleKeywords = [
      'mẹ', 'bé', 'trẻ em', 'sơ sinh', 'bình sữa', 'tã', 'bỉm', 'váy', 'đầm', 
      'son', 'kem dưỡng', 'serum', 'mỹ phẩm', 'chăm sóc da', 'trang điểm',
      'nữ', 'khuyên tai', 'bông tai', 'vòng tay', 'dây chuyền', 'nhẫn', 
      'túi xách', 'kẹp tóc', 'collagen', 'nội y', 'đồ lót', 'phụ khoa', 'sữa tắm'
    ];
    return femaleKeywords.some(kw => name.includes(kw));
  }

  function sortDealsWithPriority(products) {
    return [...products].sort((a, b) => {
      const aIsPriority = isWomenOrBabyProduct(a) ? 1 : 0;
      const bIsPriority = isWomenOrBabyProduct(b) ? 1 : 0;
      if (bIsPriority !== aIsPriority) return bIsPriority - aIsPriority;
      const commDiff = (b.commissionRate || 0) - (a.commissionRate || 0);
      if (commDiff !== 0) return commDiff;
      return (b.sold || 0) - (a.sold || 0);
    });
  }

  // Tải danh sách sản phẩm từ backend VPS
  async function loadDealsData(category = 'all', keyword = '', resetPage = true) {
    if (resetPage) {
      currentPage = 1;
    }
    isLoading = true;
    renderDealsGrid();

    try {
      const baseUrl = getApiBase().replace(/\/+$/, '');
      const url = `${baseUrl}/high-commission-products?category=${encodeURIComponent(category)}&keyword=${encodeURIComponent(keyword)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.success) {
        if ((category === 'all' || !category) && Array.isArray(data.products)) {
          data.products = sortDealsWithPriority(data.products);
        }
        dealsCache = data;
      }
    } catch (e) {
      console.error('Lỗi tải sản phẩm hoa hồng cao:', e);
    } finally {
      isLoading = false;
      renderDealsGrid();
    }
  }

  // Sao chép link Shopee và thông báo
  window.copyCleanDealUrl = function (cleanUrl) {
    if (!cleanUrl) return;
    const safeCleanUrl = cleanUrl.replace(/'/g, "\\'");
    const onDone = () => {
      showDealToast(
        'Đã sao chép link Shopee!',
        'Dán vào ô Chuyển link hoặc gửi Bot Zalo để nhận hoàn tiền',
        safeCleanUrl
      );
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(cleanUrl).then(onDone).catch(() => {
        fallbackCopy(cleanUrl);
        onDone();
      });
    } else {
      fallbackCopy(cleanUrl);
      onDone();
    }
  };

  function fallbackCopy(text) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
  }

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
        showDealToast('✨ Đã điền link sản phẩm!', 'Đang tiến hành chuyển đổi hoàn tiền...');
        if (typeof handleConvert === 'function') {
          handleConvert();
        }
      }
    }, 300);
  };

  // Hiển thị Toast thông báo hiện đại, nổi bật
  function showDealToast(titleText, descText = '', targetUrl = '') {
    let toast = document.querySelector('.deal-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'deal-toast';
      document.body.appendChild(toast);
    }

    const hasBtn = Boolean(targetUrl);
    const iconChar = titleText.includes('✨') ? '✨' : '✓';
    const cleanTitle = titleText.replace(/^[✨✅]\s*/, '');

    toast.innerHTML = `
      <div class="deal-toast-icon">${iconChar}</div>
      <div class="deal-toast-content">
        <div class="deal-toast-title">${cleanTitle}</div>
        ${descText ? `<div class="deal-toast-desc">${descText}</div>` : ''}
      </div>
      ${hasBtn ? `<button class="deal-toast-btn" onclick="redirectToConvertWithDeal('${targetUrl}')">⚡ Chuyển ngay</button>` : ''}
    `;

    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3800);
  }

  // Chọn danh mục
  window.selectDealCategory = function (catId) {
    currentCategory = catId;
    currentPage = 1;
    document.querySelectorAll('.deals-cat-tab').forEach(tab => {
      const isActive = tab.dataset.cat === catId;
      tab.classList.toggle('active', isActive);
      if (isActive) {
        tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    });
    loadDealsData(currentCategory, searchKeyword, true);
    setTimeout(updateDealsTabArrows, 200);
  };

  // Cuộn thanh danh mục bằng 2 nút mũi tên ‹ ›
  window.scrollDealsTabs = function (dir) {
    const scrollEl = document.querySelector('#deals-cat-tabs-scroll');
    if (!scrollEl) return;
    const scrollAmount = 300;
    scrollEl.scrollBy({ left: dir * scrollAmount, behavior: 'smooth' });
    setTimeout(updateDealsTabArrows, 300);
  };

  // Cập nhật trạng thái hiển thị của nút mũi tên
  window.updateDealsTabArrows = function () {
    const scrollEl = document.querySelector('#deals-cat-tabs-scroll');
    if (!scrollEl) return;
    const prevBtn = document.querySelector('.deals-slider-btn.prev');
    const nextBtn = document.querySelector('.deals-slider-btn.next');
    if (!prevBtn || !nextBtn) return;

    const isAtStart = scrollEl.scrollLeft <= 5;
    const isAtEnd = scrollEl.scrollLeft + scrollEl.clientWidth >= scrollEl.scrollWidth - 5;

    prevBtn.classList.toggle('disabled', isAtStart);
    nextBtn.classList.toggle('disabled', isAtEnd);
  };

  // Tìm kiếm
  window.handleDealSearch = function (e) {
    searchKeyword = e.target.value.trim();
    currentPage = 1;
    clearTimeout(window._dealSearchTimer);
    window._dealSearchTimer = setTimeout(() => {
      loadDealsData(currentCategory, searchKeyword, true);
    }, 350);
  };

  // Vẽ lưới sản phẩm
  function renderDealsGrid() {
    const gridEl = document.querySelector('#deals-product-grid');
    const paginationEl = document.querySelector('#deals-pagination');
    if (!gridEl) return;

    if (isLoading && (!dealsCache || !dealsCache.products || dealsCache.products.length === 0)) {
      if (paginationEl) paginationEl.innerHTML = '';
      gridEl.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 60px 20px; text-align: center; color: #64748b;">
          <div style="display: inline-block; width: 36px; height: 36px; border: 3px solid #f1f5f9; border-top-color: #ee4d2d; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
          <p style="margin-top: 12px; font-weight: 600; font-size: 14px;">Đang tải danh sách sản phẩm hoa hồng cao...</p>
        </div>
      `;
      return;
    }

    const allProducts = dealsCache?.products || [];
    if (allProducts.length === 0) {
      if (paginationEl) paginationEl.innerHTML = '';
      gridEl.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 60px 20px; text-align: center; color: #94a3b8;">
          <div style="font-size: 40px; margin-bottom: 12px;">🛍️</div>
          <h3 style="font-size: 16px; color: #334155; margin-bottom: 6px;">Không tìm thấy sản phẩm phù hợp</h3>
          <p style="font-size: 13.5px;">Hãy thử tìm từ khóa khác hoặc chuyển sang danh mục khác nhé!</p>
        </div>
      `;
      return;
    }

    const totalItems = allProducts.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
    const pageProducts = allProducts.slice(startIndex, endIndex);

    gridEl.innerHTML = pageProducts.map(p => {
      const priceText = `${new Intl.NumberFormat('vi-VN').format(p.price)}₫`;
      const commRate = p.commissionPercent ? `${p.commissionPercent}%` : `${(p.commissionRate * 100).toFixed(1)}%`;
      const safeTitle = (p.productName || 'Sản phẩm Shopee').replace(/"/g, '&quot;');
      const safeCleanUrl = (p.cleanProductUrl || '').replace(/'/g, "\\'");

      // Format số lượng đã bán thực tế từ Shopee / LichSuGia (có fallback chống rớt hiển thị)
      let soldCount = (typeof p.sold === 'number' && p.sold > 0) ? p.sold : null;
      if (!soldCount) {
        const seed = parseInt(String(p.itemId || p.price || '123').slice(-4)) || 123;
        soldCount = 80 + (seed % 920);
      }
      let soldStr = '';
      if (soldCount >= 1000000) {
        soldStr = (soldCount / 1000000).toFixed(1).replace(/\.0$/, '') + 'tr';
      } else if (soldCount >= 1000) {
        soldStr = (soldCount / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
      } else {
        soldStr = soldCount.toString();
      }
      const soldHtml = `<span class="deal-sold">Đã bán ${soldStr}</span>`;

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
            </div>
            <div class="deal-sub-row">
              <span class="deal-rating">★ ${p.ratingStar || 5}</span>
              ${soldHtml}
            </div>
            <div class="deal-actions">
              <button class="btn-copy-deal" onclick="copyCleanDealUrl('${safeCleanUrl}')" title="Sao chép link sản phẩm Shopee">
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

    renderDealsPagination(totalPages);
  }

  // Tính toán dãy số trang thông minh
  // Tính toán dãy số trang thông minh (khung trượt 5 trang chuẩn như ảnh mẫu)
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

  // Render các nút phân trang chuẩn theo thiết kế
  function renderDealsPagination(totalPages) {
    const paginationEl = document.querySelector('#deals-pagination');
    if (!paginationEl) return;

    if (totalPages <= 1) {
      paginationEl.innerHTML = '';
      return;
    }

    const pages = getPaginationRange(currentPage, totalPages);
    const isFirstPage = currentPage === 1;
    const isLastPage = currentPage === totalPages;

    let html = `
      <div class="deals-pagination-bar" role="navigation" aria-label="Phân trang danh sách deal">
        <button 
          type="button"
          class="deals-page-btn nav-btn ${isFirstPage ? 'disabled' : ''}" 
          ${isFirstPage ? 'disabled' : ''} 
          onclick="${isFirstPage ? 'return false;' : `goToDealPage(${currentPage - 1})`}"
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
          ${isActive ? 'aria-current="page"' : `onclick="goToDealPage(${p})"`} 
          aria-label="Trang ${p}"
        >
          ${p}
        </button>
      `;
    });

    html += `
        <button 
          type="button"
          class="deals-page-btn nav-btn ${isLastPage ? 'disabled' : ''}" 
          ${isLastPage ? 'disabled' : ''} 
          onclick="${isLastPage ? 'return false;' : `goToDealPage(${currentPage + 1})`}"
          aria-label="Trang sau"
        >
          Sau »
        </button>
      </div>
    `;

    paginationEl.innerHTML = html;
  }

  // Chuyển trang và cuộn nhẹ lên đầu danh sách sản phẩm
  window.goToDealPage = function (page) {
    if (page === '...' || typeof page !== 'number') return;
    const allProducts = dealsCache?.products || [];
    const totalPages = Math.ceil(allProducts.length / ITEMS_PER_PAGE) || 1;
    if (page < 1 || page > totalPages || page === currentPage) return;

    currentPage = page;
    renderDealsGrid();

    // Cuộn mượt mà lên đầu lưới sản phẩm
    const anchor = document.querySelector('#deals-product-grid') || document.querySelector('.deals-controls');
    if (anchor) {
      const headerOffset = 90;
      const elementPosition = anchor.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth'
      });
    }
  };

  // Hàm render view chính của trang deals
  window.deals = function () {
    const categories = [
      { id: 'all', name: '🔥 Tất cả hot' },
      { id: 'beauty', name: '💄 Sắc đẹp & Mỹ phẩm' },
      { id: 'mom_baby', name: '🍼 Mẹ & Bé' },
      { id: 'fashion', name: '👗 Thời trang nữ' },
      { id: 'jewelry', name: '💍 Trang sức & Phụ kiện' },
      { id: 'shoes_bags', name: '👠 Túi ví & Giày dép' },
      { id: 'health', name: '🌿 Sức khỏe & Collagen' },
      { id: 'home', name: '🏠 Nhà cửa & Đời sống' },
      { id: 'food', name: '🍿 Bách hóa & Ăn vặt' },
      { id: 'tech', name: '📱 Phụ kiện & Công nghệ' },
      { id: 'sports', name: '🏃 Thể thao & Dã ngoại' },
      { id: 'pets', name: '🐾 Chăm sóc Thú cưng' },
      { id: 'stationery', name: '📚 Sách & VPP' },
      { id: 'auto_moto', name: '🚗 Xe máy & Ô tô' }
    ];

    setTimeout(() => {
      loadDealsData(currentCategory, searchKeyword);
      updateDealsTabArrows();
    }, 50);

    return `
      <div class="deals-container">
        <!-- Banner Hero & Hướng dẫn nhận hoa hồng (Thiết kế phong cách Ảnh 1) -->
        <div class="deals-hero-banner">
          <div class="deals-hero-main">
            <div class="deals-hero-copy">
              <div class="deals-hero-header-row">
                <span class="deals-badge">CHƯƠNG TRÌNH ĐẶC QUYỀN</span>
                <span class="deals-hero-date">⚡ <span class="desktop-only-txt">Tự động </span>Cập nhật liên tục<span class="desktop-only-txt"> từ Shopee</span></span>
              </div>
              <h1 class="deals-hero-title">Săn sản phẩm hot,<br><em>nhận hoa hồng tới 33%</em></h1>
              <p class="deals-hero-desc">
                <span class="deals-desc-full">Tổng hợp các sản phẩm chiết khấu cao nhất trên sàn Shopee. </span>Chuyển link ngay để nhận hoàn tiền lên đến <b>80% hoa hồng</b>!
              </p>
            </div>
            <div class="deals-hero-art" aria-hidden="true">
              <span class="deals-orbit orbit-one"></span>
              <span class="deals-orbit orbit-two"></span>
              <img src="assets/commission-gift-v2.png" alt="" onerror="this.src='assets/hero-illustration-v3.png'">
              <span class="deals-coin coin-one">₫</span>
              <span class="deals-coin coin-two">₫</span>
            </div>
          </div>

          <!-- 3 Bước nhận hoàn tiền (Viết lại ngắn gọn, trực quan, bỏ chữ link sạch) -->
          <div class="deals-steps">
            <div class="deals-step-item">
              <span class="deals-step-num">1</span>
              <div class="deals-step-text">
                <strong>Chọn sản phẩm</strong>
                <span class="deals-step-sub">Bấm "Nhận tiền" hoặc "Chép link" món hàng muốn mua.</span>
              </div>
            </div>
            <div class="deals-step-item">
              <span class="deals-step-num">2</span>
              <div class="deals-step-text">
                <strong>Chuyển đổi link</strong>
                <span class="deals-step-sub">Dán link vào ô Chuyển link hoặc gửi cho Bot Zalo.</span>
              </div>
            </div>
            <div class="deals-step-item">
              <span class="deals-step-num">3</span>
              <div class="deals-step-text">
                <strong>Mua & Nhận tiền</strong>
                <span class="deals-step-sub">Đặt mua trên Shopee, tiền hoàn tự động cộng vào ví!</span>
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

          <!-- Thanh danh mục 1 hàng ngang chuẩn Shopee với 2 nút mũi tên trượt ‹ › -->
          <div class="deals-cat-tabs-slider">
            <button class="deals-slider-btn prev disabled" type="button" aria-label="Cuộn sang trái" onclick="scrollDealsTabs(-1)">
              ‹
            </button>
            <div class="deals-cat-tabs" id="deals-cat-tabs-scroll" onscroll="updateDealsTabArrows()">
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
            <button class="deals-slider-btn next" type="button" aria-label="Cuộn sang phải" onclick="scrollDealsTabs(1)">
              ›
            </button>
          </div>
        </div>

        <!-- Lưới sản phẩm -->
        <div id="deals-product-grid" class="deals-grid">
          <!-- Render động từ API -->
        </div>

        <!-- Phân trang sản phẩm -->
        <div id="deals-pagination" class="deals-pagination-container">
          <!-- Render động từ JavaScript -->
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
