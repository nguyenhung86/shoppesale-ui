function setupConvertSelection() {
  if ((location.hash.slice(1) || location.pathname.slice(1) || 'dashboard') !== 'convert') return;
  
  const container = document.querySelector('.shop-grid');
  if (!container || container.dataset.ready) return;
  container.dataset.ready = 'true';
  
  const shops = [...document.querySelectorAll('#app .shop')];
  const input = document.querySelector('#product-link');
  if (!shops.length || !input) return;
  
  const links = ['https://shopee.vn/product/...', 'https://www.lazada.vn/products/...', 'https://www.tiktok.com/...', 'https://shopeefood.vn/...'];
  const rates = ['80%', '80%', '80%', '80%'];
  
  shops.forEach((shop, index) => {
    shop.setAttribute('role', 'button');
    const isComingSoon = index === 2;
    shop.setAttribute('tabindex', isComingSoon ? '-1' : '0');
    shop.setAttribute('aria-disabled', isComingSoon ? 'true' : 'false');
    shop.classList.toggle('coming-soon', isComingSoon);
    const tag = shop.querySelector('.tag');
    if (tag) {
      const status = index === 2 ? '<small>SẮP RA MẮT</small>' : (index === 1 || index === 3 ? '<small>BETA</small>' : '');
      tag.innerHTML = `${rates[index]}${status}`;
    }

    if (isComingSoon) return;
    
    const select = () => {
      shops.forEach((item, position) => item.classList.toggle('selected', position === index));
      input.placeholder = links[index];
      input.setAttribute('aria-label', `Link sản phẩm ${shop.querySelector('.shop-label')?.textContent || ''}`);
    };
    
    shop.addEventListener('click', select);
    shop.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } });
  });

  // Tìm nút chuyển đổi trong form
  const convertBtn = document.querySelector('.input-row .button');
  if (convertBtn && input) {
    // Clone và replace nút để tránh bị lặp sự kiện khi chuyển tab
    const newBtn = convertBtn.cloneNode(true);
    convertBtn.replaceWith(newBtn);
    
    newBtn.addEventListener('click', handleConvert);
  }

  // Khôi phục hiển thị lịch sử chuyển link
  renderConvertHistory();

  function handleConvert() {
    const rawUrl = input.value.trim();
    const zaloId = localStorage.getItem('shoppesale_zalo_id') || "";
    
    // Xóa kết quả cũ nếu có
    const oldResult = document.querySelector('.convert-result-card');
    if (oldResult) oldResult.remove();
    
    if (!zaloId) {
      alert("⚠️ Vui lòng liên kết tài khoản Zalo ở tab 'Tài khoản' trước để hệ thống ghi nhận hoàn tiền cho bạn!");
      return;
    }
    
    if (!rawUrl) {
      alert("⚠️ Vui lòng dán link sản phẩm cần chuyển đổi!");
      return;
    }
    
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      alert("⚠️ Link sản phẩm không hợp lệ. Vui lòng nhập link bắt đầu bằng http:// hoặc https://");
      return;
    }

    // Hiển thị trạng thái đang xử lý (loading)
    const convertBtnEl = document.querySelector('.input-row .button');
    convertBtnEl.disabled = true;
    convertBtnEl.textContent = "Đang tạo...";
    
    // TikTok Shop chua ho tro chuyen doi: hien thong bao thay vi goi API.
    if (/(^|\.)tiktok\.com|vt\.tiktok\.com/i.test(rawUrl)) {
      const comingSoonCard = document.createElement('div');
      comingSoonCard.className = 'card convert-result-card tiktok-coming-soon-card';
      comingSoonCard.innerHTML = `
        <div class="tiktok-coming-soon-icon" aria-hidden="true">♪</div>
        <div>
          <p class="tiktok-coming-soon-eyebrow">TIKTOK SHOP</p>
          <h3>Tính năng sắp ra mắt</h3>
          <p>Chuyển đổi link TikTok Shop đang được hoàn thiện. Vui lòng quay lại sau nhé.</p>
        </div>
      `;
      const convertSection = document.querySelector('#product-link').closest('.section');
      convertSection.appendChild(comingSoonCard);
      return;
    }

    async function processConversion() {
      let response = null;
      // 1. Thử gọi Bot API cục bộ (nếu Admin đang mở Chrome Extension addlivetag.com/lazada-affiliate-api/)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const localRes = await fetch("http://127.0.0.1:9225/api/convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: rawUrl, userId: zaloId }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (localRes.ok) {
          const localJson = await localRes.json();
          if (localJson && localJson.success) {
            response = {
              success: true,
              shortLink: localJson.affiliateLink,
              productName: localJson.productName,
              commissionRate: parseFloat(String(localJson.formattedComm2 || "").replace(/,/g, ".").replace(/%/g, "")) || 5,
              commissionAmount: 0,
              imageUrl: ""
            };
          }
        }
      } catch (e) {}

      // 2. Nếu không kết nối được Bot API cục bộ, gọi Google Apps Script làm dự phòng
      if (!response) {
        try {
          const apiCallUrl = CONFIG.API_URL + "?action=convertLink&url=" + encodeURIComponent(rawUrl) + "&subId=" + zaloId;
          const res = await fetch(apiCallUrl);
          response = await res.json();
        } catch(errScript) {
          response = { success: false, error: errScript.message };
        }
      }

      convertBtnEl.disabled = false;
      convertBtnEl.textContent = "Chuyển đổi";

      if (response && response.success) {
          const shortLink = response.shortLink;
          const productName = response.productName || "Sản phẩm mua sắm";
          const commissionAmount = response.commissionAmount || 0;
          const commissionRate = response.commissionRate || 0;
          const price = response.price || 0;
          const imageUrl = response.imageUrl || "";
          
          // Xác định sàn mua hàng
          let platform = "Shopee";
          const lowerUrl = rawUrl.toLowerCase();
          if (lowerUrl.includes('lazada')) platform = "Lazada";
          else if (lowerUrl.includes('tiktok')) platform = "TikTok Shop";
          else if (lowerUrl.includes('shopeefood')) platform = "ShopeeFood";
          
          // Hiển thị 100% hoa hồng ước tính theo yêu cầu của sếp
          const cashback = commissionAmount;
          
          // Tạo kết quả hiển thị
          const resultCard = document.createElement('div');
          resultCard.className = 'card convert-result-card';
          resultCard.style = `
            margin-top: 24px;
            padding: 24px;
            border-radius: 20px;
            border: 1px solid #e2e8f0;
            border-left: 5px solid #22c55e;
            background: #ffffff;
            box-shadow: 0 4px 20px rgba(0,0,0,0.03);
            animation: slideUp 0.3s ease;
          `;
          
          resultCard.innerHTML = `
            <!-- Header -->
            <div style="color: #22c55e; font-weight: 800; font-size: 13px; display: flex; align-items: center; gap: 6px; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 18px;">
              <svg style="width: 16px; height: 16px; fill: currentColor;" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
              Chuyển đổi thành công
            </div>
            
            <!-- Product Info Row -->
            <div style="display: flex; gap: 16px; margin-bottom: 20px; align-items: flex-start;">
              <img src="${imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120'}" style="width: 68px; height: 68px; border-radius: 12px; object-fit: cover; border: 1px solid #f1f5f9; flex-shrink: 0;" alt="Product Image" />
              <div style="font-size: 14px; font-weight: 600; color: #1e293b; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-top: 2px;">
                ${productName}
              </div>
            </div>
            
            <!-- Pricing & Commission Info -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-bottom: 20px;">
              <div>
                <div style="font-size: 13px; color: #64748b; display: flex; align-items: center; gap: 4px; font-weight: 600;">
                  💰 Hoa hồng ước tính
                </div>
                <div style="font-size: 26px; font-weight: 800; color: #0f172a; margin-top: 4px; line-height: 1;">
                  ≈ ${cashback > 0 ? cashback.toLocaleString('vi-VN') + 'đ' : (commissionRate > 0 ? commissionRate + '%' : 'Chờ đối soát')}
                </div>
                ${price > 0 ? `
                <div style="font-size: 12px; color: #94a3b8; margin-top: 6px; font-weight: 500;">
                  Giá: ${price.toLocaleString('vi-VN')}đ
                </div>` : ''}
              </div>
              
              <div style="background: #fff7ed; border: 1px solid #ffedd5; color: #ea580c; border-radius: 9999px; padding: 6px 12px; font-size: 13px; font-weight: 800;">
                ${commissionRate.toFixed(2)}%
              </div>
            </div>
            
            <!-- Primary CTA Action Button -->
            <a href="${shortLink}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px; background: #ea580c; color: #ffffff; border-radius: 16px; font-weight: bold; text-decoration: none; font-size: 15px; box-shadow: 0 4px 14px rgba(234,88,12,0.25); margin-bottom: 12px; transition: background 0.2s;">
              <svg style="width: 16px; height: 16px; fill: currentColor;" viewBox="0 0 20 20"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"></path><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"></path></svg>
              Mở link mua hàng
            </a>
            
            <!-- Secondary Action Buttons -->
            <div style="display: flex; gap: 12px;">
              <button id="copy-converted-link" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 16px; font-weight: bold; color: #334155; font-size: 13px; cursor: pointer; transition: background 0.2s;">
                <svg style="width: 14px; height: 14px; fill: currentColor;" viewBox="0 0 20 20"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"></path><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"></path></svg>
                Sao chép
              </button>
              <button id="show-qr-code" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 16px; font-weight: bold; color: #334155; font-size: 13px; cursor: pointer; transition: background 0.2s;">
                <svg style="width: 14px; height: 14px; fill: currentColor;" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1v-1h-1zM11 12a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1zm3 2a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1zm-2 2a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1zm5-11a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1a1 1 0 01-1-1V5zm-2 2a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1a1 1 0 01-1-1V7zm-4 0a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1a1 1 0 01-1-1V7zm2 5a1 1 0 00-1 1v1a1 1 0 001 1h1a1 1 0 001-1v-1a1 1 0 00-1-1h-1z" clip-rule="evenodd"></path></svg>
                QR Code
              </button>
            </div>
            
            <!-- Hidden QR Code container -->
            <div id="qr-code-container" style="display: none; flex-direction: column; align-items: center; justify-content: center; margin-top: 18px; padding-top: 18px; border-top: 1px solid #f1f5f9; text-align: center;">
              <img id="qr-code-img" src="" style="width: 150px; height: 150px; border: 1px solid #e2e8f0; padding: 6px; border-radius: 12px; background: white;" alt="QR Code" />
              <span style="font-size: 11px; color: #64748b; margin-top: 6px; font-weight: 500;">Quét mã QR bằng điện thoại để mở link mua sắm</span>
            </div>
          `;
          
          // Chèn kết quả vào sau form chuyển đổi
          const convertSection = document.querySelector('#product-link').closest('.section');
          convertSection.appendChild(resultCard);
          
          // Gắn sự kiện sao chép
          const copyBtn = resultCard.querySelector('#copy-converted-link');
          copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(shortLink).then(() => {
              copyBtn.innerHTML = `
                <svg style="width: 14px; height: 14px; fill: currentColor;" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                Đã chép!
              `;
              copyBtn.style.color = "#22c55e";
              copyBtn.style.borderColor = "#22c55e";
              setTimeout(() => {
                copyBtn.innerHTML = `
                  <svg style="width: 14px; height: 14px; fill: currentColor;" viewBox="0 0 20 20"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"></path><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"></path></svg>
                  Sao chép
                `;
                copyBtn.style.color = "#334155";
                copyBtn.style.borderColor = "#cbd5e1";
              }, 2000);
            }).catch(err => {
              console.error("Lỗi sao chép:", err);
            });
          });
          
          // Gắn sự kiện hiện QR Code
          const qrBtn = resultCard.querySelector('#show-qr-code');
          const qrContainer = resultCard.querySelector('#qr-code-container');
          const qrImg = resultCard.querySelector('#qr-code-img');
          qrBtn.addEventListener('click', () => {
            if (qrContainer.style.display === 'none') {
              // Tạo ảnh QR Code qua API qrserver
              qrImg.src = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" + encodeURIComponent(shortLink);
              qrContainer.style.display = 'flex';
              qrBtn.style.background = '#f8fafc';
            } else {
              qrContainer.style.display = 'none';
              qrBtn.style.background = '#ffffff';
            }
          });
          
          // Lưu lịch sử chuyển đổi vào localStorage
          saveConvertHistory(platform, rawUrl, shortLink, productName, price, commissionRate, commissionAmount, imageUrl);
        } else {
          alert("Lỗi: " + (response.error || "Không thể chuyển đổi link"));
        }
      } else {
        convertBtnEl.disabled = false;
        convertBtnEl.textContent = "Chuyển đổi";
        alert("⚠️ Không thể kết nối máy chủ để lấy thông tin hoa hồng. Vui lòng kiểm tra lại cấu hình hoặc thử lại sau!");
      }
    }
    
    processConversion();
  }

  function saveConvertHistory(platform, originalUrl, convertedUrl, productName, price, commissionRate, commissionAmount, imageUrl) {
    let history = JSON.parse(localStorage.getItem('shoppesale_convert_history') || "[]");
    
    // Thêm vào đầu danh sách với đầy đủ chi tiết sản phẩm
    history.unshift({
      platform: platform,
      originalUrl: originalUrl,
      convertedUrl: convertedUrl,
      productName: productName,
      price: price,
      commissionRate: commissionRate,
      commissionAmount: commissionAmount,
      imageUrl: imageUrl,
      timestamp: Date.now(),
      date: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})
    });
    
    // Giới hạn tối đa 5 lịch sử
    history = history.slice(0, 5);
    localStorage.setItem('shoppesale_convert_history', JSON.stringify(history));
    
    renderConvertHistory();
  }

  function timeAgo(timestamp) {
    if (!timestamp) return "";
    const diff = Date.now() - timestamp;
    if (diff < 60000) return "Vừa xong";
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return mins + " phút trước";
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + " giờ trước";
    const days = Math.floor(hours / 24);
    return days + " ngày trước";
  }

  function renderConvertHistory() {
    const oldHistory = document.querySelector('.convert-history-section');
    if (oldHistory) oldHistory.remove();
    
    const history = JSON.parse(localStorage.getItem('shoppesale_convert_history') || "[]");
    if (history.length === 0) return;
    
    // Đọc trạng thái thu gọn từ localStorage
    const isCollapsed = localStorage.getItem('shoppesale_history_collapsed') === 'true';
    
    const historySection = document.createElement('section');
    historySection.className = 'section convert-history-section convert-history-panel';
    historySection.style.marginTop = '24px';
    
    let historyItemsHTML = history.map((item, idx) => {
      // Chọn màu viền trái theo từng sàn
      let platformColor = "#ea580c"; // Shopee
      if (item.platform === "Lazada") platformColor = "#0f34c6";
      else if (item.platform === "TikTok Shop") platformColor = "#000000";
      else if (item.platform === "ShopeeFood") platformColor = "#f43f5e";
      
      const itemTime = item.timestamp ? timeAgo(item.timestamp) : (item.date || "Vừa xong");
      // commissionAmount da la so tien hoa hong khach nhan, khong tru them ty le nua.
      const itemCashback = item.commissionAmount ? Math.round(item.commissionAmount) : 0;
      
      return `
        <div class="convert-history-item" style="border-left-color: ${platformColor} !important;">
          <!-- Hàng tiêu đề sản phẩm và số tiền hoàn -->
          <div class="convert-history-item-top">
            <h3 style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${item.productName || item.originalUrl}
            </h3>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; padding: 4px 10px; border-radius: 8px; font-size: 13px; font-weight: 800; white-space: nowrap;">
              ${itemCashback > 0 ? itemCashback.toLocaleString('vi-VN') + 'đ' : (item.commissionRate > 0 ? item.commissionRate + '%' : 'Chờ đối soát')}
            </div>
          </div>
          
          <!-- Hàng thông tin sàn & thời gian -->
          <div style="font-size: 11px; color: #64748b; font-weight: 600; display: flex; align-items: center; gap: 6px; margin-top: -4px;">
            <span style="color: ${platformColor}; font-size: 14px; line-height: 1;">•</span>
            <span>${item.platform}</span>
            <span style="color: #cbd5e1;">•</span>
            <span style="color: #94a3b8; font-weight: 500;">${itemTime}</span>
          </div>
          
          <!-- Hàng pills Giá & Tỷ lệ hoa hồng -->
          <div class="convert-history-pills">
            ${item.price > 0 ? `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; color: #475569; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600;">
              Giá ${item.price.toLocaleString('vi-VN')}đ
            </div>` : ''}
            ${item.commissionRate > 0 ? `
            <div style="background: #fffbeb; border: 1px solid #fef3c7; color: #d97706; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;">
              Hoa hồng ${item.commissionRate.toFixed(1).replace('.', ',')}%
            </div>` : ''}
          </div>
          
          <!-- Thanh thao tác chính -->
          <div class="convert-history-actions">
            <button class="history-copy-btn" data-url="${item.convertedUrl}" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; font-weight: 600; color: #475569; font-size: 13px; cursor: pointer; transition: background 0.2s;">
              <svg style="width: 14px; height: 14px; fill: currentColor;" viewBox="0 0 20 20"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"></path><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"></path></svg>
              Sao chép
            </button>
            <a href="${item.convertedUrl}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 4px; padding: 8px 16px; background: #fff7ed; border: 1px solid #ffedd5; color: #ea580c; border-radius: 8px; font-size: 13px; font-weight: 700; text-decoration: none; white-space: nowrap;">
              Mở lại <svg style="width: 12px; height: 12px; fill: currentColor;" viewBox="0 0 20 20"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"></path><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"></path></svg>
            </a>
            <button class="history-delete-btn" data-index="${idx}" style="display: flex; align-items: center; justify-content: center; padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; color: #94a3b8; cursor: pointer; transition: background 0.2s;">
              <svg style="width: 14px; height: 14px; fill: currentColor;" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    historySection.innerHTML = `
      <!-- Header tiêu đề -->
      <div id="history-toggle-header" class="convert-history-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="background: #fff7ed; padding: 8px; border-radius: 50%; color: #ea580c; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
            <svg style="width: 18px; height: 18px; fill: currentColor;" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path></svg>
          </div>
          <span style="font-size: 15px; font-weight: 800; color: #1e293b;">Chuyển đổi gần đây</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="background: #fff7ed; color: #ea580c; border-radius: 12px; padding: 2px 8px; font-size: 11px; font-weight: bold; border: 1px solid #ffedd5;">${history.length}</span>
          <svg id="history-chevron" style="width: 18px; height: 18px; fill: #ea580c; transition: transform 0.2s; transform: ${isCollapsed ? 'rotate(180deg)' : 'none'};" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd"></path></svg>
        </div>
      </div>
      
      <!-- Vùng nội dung danh sách lịch sử -->
      <div id="history-content-area" class="convert-history-content" style="display: ${isCollapsed ? 'none' : 'flex'};">
        <!-- Chú ý -->
        <div style="background: #fff7ed; border: 1px solid #ffedd5; color: #c2410c; padding: 12px 16px; border-radius: 12px; font-size: 12px; font-weight: 500; line-height: 1.45;">
          <strong>Chú ý:</strong> đây là danh sách chuyển đổi gần đây, việc ghi nhận sẽ được sàn xác nhận vào <strong>ngày hôm sau</strong> sau khi mua hàng.
        </div>
        
        <!-- Các cards lịch sử -->
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${historyItemsHTML}
        </div>
      </div>
    `;
    
    const appContainer = document.querySelector('#app');
    const botPanel = document.querySelector('.convert-bot');
    if (botPanel) {
      appContainer.insertBefore(historySection, botPanel);
    } else {
      appContainer.appendChild(historySection);
    }
    
    // Đăng ký sự kiện thu gọn / mở rộng
    const headerToggle = historySection.querySelector('#history-toggle-header');
    headerToggle.addEventListener('click', () => {
      const contentArea = historySection.querySelector('#history-content-area');
      const chevron = historySection.querySelector('#history-chevron');
      const collapsed = contentArea.style.display === 'none';
      
      if (collapsed) {
        contentArea.style.display = 'flex';
        chevron.style.transform = 'none';
        localStorage.setItem('shoppesale_history_collapsed', 'false');
      } else {
        contentArea.style.display = 'none';
        chevron.style.transform = 'rotate(180deg)';
        localStorage.setItem('shoppesale_history_collapsed', 'true');
      }
    });
    
    // Gắn sự kiện sao chép cho lịch sử
    historySection.querySelectorAll('.history-copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.getAttribute('data-url');
        navigator.clipboard.writeText(url).then(() => {
          btn.innerHTML = `<svg style="width: 14px; height: 14px; fill: currentColor;" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg> Đã chép!`;
          btn.style.background = "#eafaf1";
          btn.style.color = "#19a45c";
          btn.style.borderColor = "#a7f3d0";
          setTimeout(() => {
            btn.innerHTML = `<svg style="width: 14px; height: 14px; fill: currentColor;" viewBox="0 0 20 20"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"></path><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"></path></svg> Sao chép`;
            btn.style.background = "#ffffff";
            btn.style.color = "#475569";
            btn.style.borderColor = "#e2e8f0";
          }, 1500);
        });
      });
    });
    
    // Gắn sự kiện xóa lịch sử
    historySection.querySelectorAll('.history-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'), 10);
        let currentHistory = JSON.parse(localStorage.getItem('shoppesale_convert_history') || "[]");
        currentHistory.splice(index, 1);
        localStorage.setItem('shoppesale_convert_history', JSON.stringify(currentHistory));
        renderConvertHistory();
      });
    });
  }
}

window.addEventListener('hashchange', setupConvertSelection);
window.addEventListener('popstate', () => requestAnimationFrame(setupConvertSelection));
setInterval(() => {
  if ((location.hash.slice(1) || location.pathname.slice(1) || 'dashboard') === 'convert') {
    setupConvertSelection();
  }
}, 100);
setupConvertSelection();
