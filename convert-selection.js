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
  
  const ENABLE_TIKTOK = true; // Đổi thành true để bật lại tính năng TikTok Shop

  shops.forEach((shop, index) => {
    shop.setAttribute('role', 'button');
    const isComingSoon = index === 2 && !ENABLE_TIKTOK;
    shop.setAttribute('tabindex', isComingSoon ? '-1' : '0');
    shop.setAttribute('aria-disabled', isComingSoon ? 'true' : 'false');
    shop.classList.toggle('coming-soon', isComingSoon);
    const tag = shop.querySelector('.tag');
    if (tag) {
      const status = index === 2 ? (ENABLE_TIKTOK ? '<small>HOT</small>' : '<small style="background:#fee2e2;color:#dc2626;font-weight:800">TẠM ĐÓNG</small>') : (index === 1 || index === 3 ? '<small>BETA</small>' : '');
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

  // Gắn sự kiện click trực tiếp trên nút chuyển đổi
  const convertBtn = document.querySelector('.input-row .button');
  if (convertBtn && input) {
    const newBtn = convertBtn.cloneNode(true);
    newBtn.setAttribute('type', 'button');
    convertBtn.replaceWith(newBtn);
    
    newBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleConvert();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConvert();
      }
    });
  }

  // Khôi phục hiển thị lịch sử chuyển link
  renderConvertHistory();
}

// Biến khóa chống kích hoạt trùng lặp
let isProcessingConvert = false;

// Định nghĩa handleConvert ở phạm vi toàn cục (Global Scope)
function handleConvert() {
  if (isProcessingConvert) return;
  
  const inputEl = document.querySelector('#product-link');
  const convertBtnEl = document.querySelector('.input-row .button');
  if (!inputEl) return;
  
  const rawUrl = inputEl.value.trim();
  let zaloId = localStorage.getItem('shoppesale_zalo_id') || "";
  const ENABLE_TIKTOK = true;
  
  // Tự động khôi phục Zalo ID hoặc lấy thông tin tài khoản đăng nhập làm sub_id
  if (!zaloId) {
    try {
      const userObj = JSON.parse(localStorage.getItem('shoppesale_user') || '{}');
      zaloId = userObj.zaloId || userObj.email || userObj.id || "guest_user";
    } catch(e) {
      zaloId = "guest_user";
    }
  }
  
  // Xóa TẤT CẢ kết quả cũ nếu có
  document.querySelectorAll('.convert-result-card').forEach(card => card.remove());
  
  if (!rawUrl) {
    alert("⚠️ Vui lòng dán link sản phẩm cần chuyển đổi!");
    return;
  }
  
  if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
    alert("⚠️ Link sản phẩm không hợp lệ. Vui lòng nhập link bắt đầu bằng http:// hoặc https://");
    return;
  }

  // Kiểm tra nếu tính năng TikTok đang bị tạm đóng
  if (!ENABLE_TIKTOK && /tiktok\.com|vt\.tiktok\.com/i.test(rawUrl)) {
    alert("⚠️ Chức năng chuyển đổi link TikTok Shop hiện đang tạm đóng. Vui lòng quay lại sau!");
    return;
  }

  // Bật cờ khóa xử lý và đổi trạng thái nút sang Đang tạo...
  isProcessingConvert = true;
  if (convertBtnEl) {
    convertBtnEl.disabled = true;
    convertBtnEl.textContent = "Đang tạo...";
  }
    
    function convertViaExtensionBridge(url, userId) {
      return new Promise((resolve) => {
        const reqId = "req_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
        const timeout = setTimeout(() => {
          window.removeEventListener("message", handler);
          resolve(null);
        }, 1200);

        function handler(event) {
          if (event.data && event.data.type === "SHOPPESALE_CONVERT_LAZADA_RES" && event.data.id === reqId) {
            clearTimeout(timeout);
            window.removeEventListener("message", handler);
            resolve(event.data.data);
          }
        }

        window.addEventListener("message", handler);
        window.postMessage({
          type: "SHOPPESALE_CONVERT_LAZADA_REQ",
          id: reqId,
          url: url,
          userId: userId
        }, "*");
      });
    }

    async function processConversion() {
      try {
        let response = null;

        // 1. Ưu tiên thử qua Extension Bridge (Local Bot Node.js Server - Lấy 100% data Tên, Giá, Ảnh, Hoa hồng)
        try {
          const bridgeRes = await convertViaExtensionBridge(rawUrl, zaloId);
          if (bridgeRes && bridgeRes.success) {
            response = {
              success: true,
              shortLink: bridgeRes.affiliateLink || bridgeRes.shortLink,
              rawAffiliateLink: bridgeRes.affiliateLink || bridgeRes.shortLink,
              productName: bridgeRes.productName,
              commissionRate: bridgeRes.commissionRate || parseFloat(String(bridgeRes.formattedComm2 || "").replace(/,/g, ".").replace(/%/g, "")) || 8.0,
              commissionAmount: bridgeRes.commissionAmount || 0,
              price: bridgeRes.price || 0,
              imageUrl: bridgeRes.imageUrl || "",
              platformName: bridgeRes.platformName || (/tiktok/i.test(rawUrl) ? "TikTok Shop" : (/lazada/i.test(rawUrl) ? "Lazada" : "Shopee"))
            };
          }
        } catch(eBridge) {}

        // 2. Nếu chưa có Bridge, gọi RioHub API trực tiếp cho TikTok
        if (!response && /tiktok\.com|vt\.tiktok\.com/i.test(rawUrl)) {
          try {
            const apiKey = "rhk_5e184fd38ebff8c159abbe6fb302d875cc4f00c4bbf162bc";
            const creatorUsername = "con.muon.noi6";
            const rioRes = await fetch("https://riohub.vn/api/v1/partner/tiktok/affiliate/links", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Riohub-Api-Key": apiKey
              },
              body: JSON.stringify({
                creator_username: creatorUsername,
                product_url: rawUrl,
                sub_id: zaloId
              })
            });
            const rioData = await rioRes.json();
            if (rioData && (rioData.affiliate_link || rioData.link)) {
              const affLink = rioData.affiliate_link || rioData.link;
              let pName = "";
              let commRate = 10.0;
              let pPrice = 0;
              let pImg = "";
              let pCommAmt = 0;

              const prodId = rioData.product_id || (rioData.product && rioData.product.id);
              if (prodId) {
                try {
                  const pUrl = `https://riohub.vn/api/v1/partner/tiktok/affiliate/products?creator_username=${encodeURIComponent(creatorUsername)}&product_id=${encodeURIComponent(prodId)}`;
                  let pData = null;
                  
                  // Thử lấy dữ liệu trực tiếp hoặc qua CORS Proxy nếu trình duyệt chặn preflight
                  try {
                    const pRes = await fetch(pUrl, { headers: { "X-Riohub-Api-Key": apiKey } });
                    if (pRes.ok) pData = await pRes.json();
                  } catch(eDirect) {
                    try {
                      const proxyUrl = "https://api.allorigins.win/raw?url=" + encodeURIComponent(pUrl);
                      const pResProxy = await fetch(proxyUrl, { headers: { "X-Riohub-Api-Key": apiKey } });
                      if (pResProxy.ok) pData = await pResProxy.json();
                    } catch(eProxy) {}
                  }

                  if (pData && pData.products && pData.products.length > 0) {
                    const item = pData.products[0];
                    if (item.title) pName = item.title;
                    if (item.main_image_url) pImg = item.main_image_url;
                    
                    if (item.sales_price && (item.sales_price.minimum_amount || item.sales_price.amount)) {
                      pPrice = parseFloat(item.sales_price.minimum_amount || item.sales_price.amount) || 0;
                    }
                    
                    if (item.commission) {
                      if (item.commission.rate) {
                        const rawRate = parseFloat(item.commission.rate);
                        commRate = rawRate > 50 ? rawRate / 100 : rawRate;
                      }
                      if (item.commission.amount) {
                        const mComm = String(item.commission.amount).match(/[\d.]+/);
                        if (mComm) pCommAmt = Math.round(parseFloat(mComm[0]));
                      }
                    }

                    if (pCommAmt === 0 && pPrice > 0 && commRate > 0) {
                      pCommAmt = Math.round(pPrice * commRate / 100);
                    }
                  }
                } catch(eP) {
                  console.warn("Lỗi tải thông tin sản phẩm TikTok:", eP);
                }
              }

              response = {
                success: true,
                shortLink: affLink,
                rawAffiliateLink: affLink,
                productName: pName || "Sản phẩm TikTok Shop",
                commissionRate: commRate || 10.0,
                commissionAmount: pCommAmt || (pPrice > 0 ? Math.round(pPrice * (commRate / 100)) : 0),
                price: pPrice || 0,
                imageUrl: pImg || "",
                platformName: "TikTok Shop"
              };
            } else if (rioData && (rioData.message || rioData.error)) {
              response = {
                success: false,
                error: rioData.message || rioData.error
              };
            }
          } catch(eRio) {
            console.error("Lỗi kết nối RioHub API:", eRio);
          }
        }

        if (!response) {
          try {
            const apiCallUrl = CONFIG.API_URL + "?action=convertLink&url=" + encodeURIComponent(rawUrl) + "&subId=" + zaloId;
            const res = await fetch(apiCallUrl);
            response = await res.json();
          } catch(errScript) {
            response = { success: false, error: errScript.message };
          }
        }

        if (response && response.success) {
          let shortLink = response.shortLink;
          let productName = response.productName || "Sản phẩm mua sắm";
          const commissionAmount = response.commissionAmount || 0;
          const commissionRate = response.commissionRate || 10.0;
          const price = response.price || 0;
          let imageUrl = response.imageUrl || "";
          
          // Xác định sàn mua hàng
          let platform = response.platformName || "Shopee";
          const lowerUrl = rawUrl.toLowerCase();
          if (lowerUrl.includes('lazada')) platform = "Lazada";
          else if (lowerUrl.includes('tiktok')) platform = "TikTok Shop";
          else if (lowerUrl.includes('shopeefood')) platform = "ShopeeFood";
          
          // THEO YÊU CẦU CỦA SẾP: TIKTOK VÀ LAZADA HIỂN THỊ LINK GỐC, KHÔNG BỌC LINK SHOPPESALE.IO.VN
          if (platform === "TikTok Shop" || platform === "Lazada") {
            if (response.rawAffiliateLink || response.affiliateLink || response.originalLink) {
              shortLink = response.rawAffiliateLink || response.affiliateLink || response.originalLink;
            }
          }

          // Xử lý tên sản phẩm động cho TikTok Shop (Loại bỏ các chữ lỗi mặc định)
          if (platform === "TikTok Shop") {
            if (!productName || productName.includes("Shopee") || productName.includes("Tra cứu hoa hồng")) {
              productName = (response.productName && !response.productName.includes("Shopee") && !response.productName.includes("Tra cứu hoa hồng"))
                ? response.productName
                : "Sản phẩm TikTok Shop";
            }
          }

          // Tự động điều chỉnh tỷ lệ hoa hồng cơ bản theo chính sách đặc biệt tài khoản của sếp (Trích xuất chuẩn 100% từ affiliate-bot.js)
          let shopeeRate = (response.commissionRate !== undefined && response.commissionRate !== null) ? parseFloat(response.commissionRate) : 0;
          let sellerRate = response.sellerRate || 0;
          let finalRate = shopeeRate;
          
          if (platform === "Shopee") {
            const nameLower = (productName || "").toLowerCase();

            const isPetProduct = nameLower.includes("chó") || nameLower.includes("mèo") ||
              nameLower.includes("thú cưng") || nameLower.includes("pet") ||
              nameLower.includes("cát vệ sinh") || nameLower.includes("pate") ||
              nameLower.includes("royal canin") || nameLower.includes("whiskas") ||
              nameLower.includes("ve rận");

            const isMotorcycle = nameLower.includes("xe máy") || nameLower.includes("xe may") ||
              nameLower.includes("ô tô") || nameLower.includes("o to") ||
              nameLower.includes("xe hơi") || nameLower.includes("salaya") ||
              nameLower.includes("nhông sên") || nameLower.includes("nhớt") ||
              nameLower.includes("dầu nhớt") || nameLower.includes("bao tay") ||
              nameLower.includes("tay nắm") || nameLower.includes("kính chiếu hậu") ||
              nameLower.includes("gương xe") || nameLower.includes("pô xe") ||
              nameLower.includes("mũ bảo hiểm") || nameLower.includes("mu bao hiem") ||
              nameLower.includes("nón bảo hiểm") || nameLower.includes("non bao hiem");

            if (isPetProduct) {
              shopeeRate = 0.0;
            } else if (isMotorcycle) {
              shopeeRate = 3.5;
            } else {
              if (shopeeRate < 8.0) shopeeRate = 8.0; // Nâng hoa hồng cơ bản tối thiểu 8%, giữ nguyên nếu hoa hồng thực tế cao hơn (10%, 15%, 20%)
            }
            finalRate = shopeeRate + sellerRate;
          } else if (platform === "TikTok Shop") {
            if (!finalRate || finalRate <= 0) finalRate = 10.0;
          } else if (platform === "Lazada") {
            if (!finalRate || finalRate <= 0) finalRate = 8.0;
          }
          
          // Tên sản phẩm hiển thị chuẩn từ API
          let displayName = productName || "Sản phẩm mua sắm";

          // Ảnh sản phẩm chuẩn từ API
          let safeImage = imageUrl;
          if (!safeImage || safeImage.includes("addlivetag") || safeImage.includes("unsplash")) {
            safeImage = "assets/hero-illustration-v3.png";
          }

          // Giá sản phẩm & Số tiền hoàn VNĐ (Tính chuẩn hạn mức 40.000đ của Shopee theo affiliate-bot.js)
          let displayPrice = price || 0;
          let calculatedShopeeComm = 0;
          if (platform === "Shopee" && shopeeRate > 0 && displayPrice > 0) {
            calculatedShopeeComm = Math.round(displayPrice * (shopeeRate / 100));
            if (calculatedShopeeComm > 40000) calculatedShopeeComm = 40000;
          }
          let sellerCommVal = (sellerRate > 0 && displayPrice > 0) ? Math.round(displayPrice * (sellerRate / 100)) : 0;
          let cashback = (platform === "Shopee")
            ? (calculatedShopeeComm + sellerCommVal)
            : ((commissionAmount && commissionAmount > 0) ? commissionAmount : Math.round(displayPrice * (finalRate / 100)));

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
          
          // Xây dựng nhãn chi tiết hoa hồng chia 2 loại chuẩn 100% theo Bot Zalo
          let breakdownStr = "";
          if (platform === "Shopee") {
            const parts = [];
            if (shopeeRate > 0) {
              const isCapped = calculatedShopeeComm >= 40000;
              const sRateFormatted = Number.isInteger(shopeeRate) ? shopeeRate : shopeeRate.toFixed(1);
              if (isCapped) {
                parts.push(`Shopee ${sRateFormatted}% (₫40.000,tối đa)`);
              } else {
                parts.push(`Shopee ${sRateFormatted}%`);
              }
            }
            if (sellerRate > 0) {
              const sellerRateFormatted = Number.isInteger(sellerRate) ? sellerRate : sellerRate.toFixed(1);
              parts.push(`Xtra ${sellerRateFormatted}%`);
            }
            breakdownStr = parts.length > 0 ? parts.join(" + ") : `Shopee ${finalRate}%`;
          } else if (platform === "TikTok Shop") {
            breakdownStr = `TikTok ${finalRate}%`;
          } else if (platform === "Lazada") {
            breakdownStr = `Lazada ${finalRate}%`;
          } else {
            breakdownStr = `${platform} ${finalRate}%`;
          }

          resultCard.innerHTML = `
            <!-- Header -->
            <div style="color: #22c55e; font-weight: 800; font-size: 13px; display: flex; align-items: center; gap: 6px; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 18px;">
              <svg style="width: 16px; height: 16px; fill: currentColor;" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
              Chuyển đổi thành công
            </div>
            
            <!-- Product Info Row -->
            <div style="display: flex; gap: 14px; margin-bottom: 20px; align-items: flex-start;">
              <img src="${safeImage}" style="width: 64px; height: 64px; border-radius: 10px; object-fit: cover; border: 1px solid #f1f5f9; flex-shrink: 0;" alt="Product Image" />
              <div style="font-size: 14px; font-weight: 700; color: #1e293b; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-top: 2px;">
                ${displayName}
              </div>
            </div>
            
            <!-- Pricing & Commission Info (Chuẩn 100% phong cách Bot Zalo) -->
            <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; margin-bottom: 20px;">
              <div style="font-size: 13px; color: #64748b; font-weight: 500; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
                Bạn nhận ước tính <svg style="width: 14px; height: 14px; fill: #94a3b8;" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                <div>
                  <div style="font-size: 24px; font-weight: 800; color: #0f172a; line-height: 1.2;">
                    ≈ ${cashback > 0 ? cashback.toLocaleString('vi-VN') + 'đ' : finalRate + '%'}
                  </div>
                  <div style="font-size: 13px; color: #ea580c; margin-top: 4px; font-weight: 600;">
                    (${breakdownStr})
                  </div>
                  ${displayPrice > 0 ? `
                  <div style="font-size: 13px; color: #64748b; margin-top: 2px; font-weight: 500;">
                    Giá: ${displayPrice.toLocaleString('vi-VN')}đ
                  </div>
                  ` : ''}
                </div>
                <div style="background: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; padding: 4px 10px; border-radius: 8px; font-size: 13px; font-weight: 700;">
                  ${Number(finalRate).toFixed(2)}%
                </div>
              </div>
            </div>
                <div style="background: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; padding: 4px 10px; border-radius: 8px; font-size: 13px; font-weight: 700;">
                  ${Number(finalRate).toFixed(2)}%
                </div>
              </div>
            </div>
            
            <!-- Primary CTA Action Button -->
            <a href="${shortLink}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px; background: #f97316; color: #ffffff; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 15px; box-shadow: 0 4px 14px rgba(249,115,22,0.25); margin-bottom: 12px; transition: all 0.2s;">
              <svg style="width: 16px; height: 16px; fill: currentColor;" viewBox="0 0 20 20"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"></path><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"></path></svg>
              Mở link mua hàng
            </a>
            
            <!-- Secondary Action Buttons -->
            <div style="display: flex; gap: 12px;">
              <button id="copy-converted-link" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; font-weight: 600; color: #475569; font-size: 13px; cursor: pointer; transition: all 0.2s;">
                <svg style="width: 14px; height: 14px; fill: currentColor;" viewBox="0 0 20 20"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"></path><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"></path></svg>
                Sao chép
              </button>
              <button id="show-qr-code" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; font-weight: 600; color: #475569; font-size: 13px; cursor: pointer; transition: all 0.2s;">
                <svg style="width: 14px; height: 14px; fill: currentColor;" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1v-1h-1zM11 12a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1zm3 2a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1zm-2 2a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1zm5-11a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1a1 1 0 01-1-1V5zm-2 2a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1a1 1 0 01-1-1V7zm-4 0a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1a1 1 0 01-1-1V7zm2 5a1 1 0 00-1 1v1a1 1 0 001 1h1a1 1 0 001-1v-1a1 1 0 00-1-1h-1z" clip-rule="evenodd"></path></svg>
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
          alert("Lỗi: " + (response ? response.error : "Không thể chuyển đổi link"));
        }
      } catch (err) {
        console.error("Lỗi chuyển đổi:", err);
        alert("⚠️ Không thể kết nối máy chủ để lấy thông tin hoa hồng. Vui lòng kiểm tra lại cấu hình hoặc thử lại sau!");
      } finally {
        isProcessingConvert = false;
        if (convertBtnEl) {
          convertBtnEl.disabled = false;
          convertBtnEl.textContent = "Chuyển đổi";
        }
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

window.addEventListener('hashchange', setupConvertSelection);
window.addEventListener('popstate', () => requestAnimationFrame(setupConvertSelection));
setInterval(() => {
  if ((location.hash.slice(1) || location.pathname.slice(1) || 'dashboard') === 'convert') {
    setupConvertSelection();
  }
}, 100);
setupConvertSelection();

// Sự kiện click toàn cục đảm bảo bấm nút Chuyển đổi hoặc gõ Enter luôn phản hồi hiệu ứng Đang tạo... 100%
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.input-row .button');
  if (btn && document.querySelector('#product-link')) {
    e.preventDefault();
    if (typeof handleConvert === 'function') handleConvert();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target && e.target.id === 'product-link') {
    e.preventDefault();
    if (typeof handleConvert === 'function') handleConvert();
  }
});
