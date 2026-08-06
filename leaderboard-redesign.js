let cachedLeaderboard = null;
let currentMetric = "commission"; // Mặc định là lọc theo commission (Hoa hồng)
const todayDate = new Date();
let currentPeriod = "all"; // Mặc định là hiển thị Tất cả thời gian

function leaderboardPage() {
  const now = new Date();
  const curM = now.getMonth() + 1;
  const curY = now.getFullYear();
  if (!currentPeriod) {
    currentPeriod = "all";
  }
  const parts = currentPeriod.split("-");
  const periodText = currentPeriod === "all" ? "Tất cả" : `Tháng ${parts[0]}/${parts[1]}`;
  const monthPad = parts[0] ? parts[0].toString().padStart(2, '0') : "";
  const heroPeriodSmallText = currentPeriod === "all" ? "Tất cả" : `Tháng ${monthPad}`;

  let optionsHtml = `<option value="all" ${currentPeriod === 'all' ? 'selected' : ''}>Tất cả thời gian</option>`;
  for (let m = 1; m <= 12; m++) {
    const val = `${m}-${curY}`;
    const selected = (val === currentPeriod) ? "selected" : "";
    optionsHtml += `<option value="${val}" ${selected}>Tháng ${m}/${curY}</option>`;
  }

  return `
    <div class="leaderboard-view">
      <section class="leaderboard-hero">
        <div><span>THÀNH TÍCH CỘNG ĐỒNG</span><h1>Bảng xếp hạng <em id="hero-metric-name">hoa hồng</em></h1><p>Ghi nhận những thành viên có thành tích nổi bật. Bảng xếp hạng được cập nhật mỗi ngày.</p></div>
        <div class="leaderboard-hero-mark" aria-hidden="true"><i>♕</i><b>Top 3</b><small id="hero-period-small">${heroPeriodSmallText}</small></div>
      </section>

      <section class="leaderboard-card">
        <div class="leaderboard-tools">
          <div class="leaderboard-metrics">
            <button class="active" type="button" data-metric="commission">Hoa hồng</button>
            <button type="button" data-metric="orderCount">Số đơn</button>
            <button type="button" data-metric="inviteCount">Lượt mời</button>
          </div>
          <div style="position: relative; display: inline-block;">
            <button class="leaderboard-period" id="leaderboard-period-btn" type="button">${periodText} <span>⌄</span></button>
            <select id="leaderboard-period-select" onchange="window.handlePeriodSelectChange(this.value)" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; font-size: 16px; -webkit-appearance: none;">
              ${optionsHtml}
            </select>
          </div>
        </div>
        <p class="leaderboard-note"><b>↻</b> Dữ liệu được cập nhật tự động vào 09:00 mỗi ngày.</p>

        <div class="leaderboard-container">
          <div class="leaderboard-loading" style="text-align:center; padding:50px 0; color:#8490a3; font-weight:600;">
            <span class="spinner" style="display:inline-block; width:20px; height:20px; border:3px solid #ff5722; border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite; margin-right:8px; vertical-align:middle;"></span>
            Đang tải dữ liệu thực tế...
          </div>
        </div>
      </section>
      
      <style>
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    </div>
  `;
}

pages.ranking = leaderboardPage;

function enhanceLeaderboard() {
  const view = document.querySelector('.leaderboard-view');
  if (!view || view.dataset.ready) return;
  view.dataset.ready = 'true';

  const container = view.querySelector('.leaderboard-container');
  if (!container) return;

  const user = getLoggedUser() || { name: "Khách Hàng Thử Nghiệm" };
  let userTotal = 0;
  let userCount = 0;

  if (window.cachedOrders && window.cachedOrders.success && window.cachedOrders.data) {
    const ordersList = window.cachedOrders.data;
    ordersList.forEach(o => {
      const cleaned = (o.orderStatus || "").toLowerCase();
      const isCancelled = cleaned.includes("hủy") || cleaned.includes("invalid") || cleaned.includes("đơn hủy");
      if (!isCancelled) {
        userTotal += Number(o.commission) || 0;
        userCount += 1;
      }
    });
  }

  const formatVND = val => Math.round(val).toLocaleString("vi-VN") + "đ";
  const getInitials = name => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Hàm render giao diện chính dựa trên danh sách và metric được chọn
  const renderLeaderboardUI = (list, metric) => {
    if (list.length < 3) {
      container.innerHTML = `<div style="text-align:center; padding:30px; color:#8490a3;">Chưa có đủ dữ liệu bảng xếp hạng.</div>`;
      return;
    }

    // Sắp xếp danh sách dựa trên metric đã chọn và lấy top 10
    list.sort((a, b) => (b[metric] || 0) - (a[metric] || 0));
    const top10 = list.slice(0, 10);

    const first = top10[0];
    const second = top10[1];
    const third = top10[2];
    const remaining = top10.slice(3);

    // Cập nhật tiêu đề Hero
    const heroMetricText = document.getElementById('hero-metric-name');
    if (heroMetricText) {
      if (metric === 'commission') heroMetricText.textContent = "hoa hồng";
      else if (metric === 'orderCount') heroMetricText.textContent = "số đơn";
      else if (metric === 'inviteCount') heroMetricText.textContent = "lượt mời";
    }

    // Xác định nhãn hiển thị cho Top 3
    const getValuesHTML = (item) => {
      if (metric === "commission") {
        return `
          <strong>${formatVND(item.commission)}</strong>
          <small>${item.orderCount} đơn</small>
        `;
      } else if (metric === "orderCount") {
        return `
          <strong>${item.orderCount} đơn</strong>
          <small>${formatVND(item.commission)}</small>
        `;
      } else {
        return `
          <strong>${item.inviteCount || 0} lượt mời</strong>
          <small>${formatVND(item.commission)}</small>
        `;
      }
    };

    // Xác định cột hiển thị ở bảng phía dưới
    const getTableLabel = () => {
      if (metric === "commission") return "HOA HỒNG";
      if (metric === "orderCount") return "SỐ ĐƠN";
      return "LƯỢT MỜI";
    };

    const getTableValue = (item) => {
      if (metric === "commission") return `<strong style="color: #ff5722;">${formatVND(item.commission)}</strong>`;
      if (metric === "orderCount") return `<strong style="color: #ff5722;">${item.orderCount} đơn</strong>`;
      return `<strong style="color: #ff5722;">${item.inviteCount || 0} lượt</strong>`;
    };

    const getSecondValue = (item) => {
      if (metric === "commission") return `<span>${item.orderCount} đơn</span>`;
      return `<span>${formatVND(item.commission)}</span>`;
    };

    const secondLabel = metric === "commission" ? "SỐ ĐƠN" : "HOA HỒNG";

    container.innerHTML = `
      <div class="leaderboard-podium">
        <article class="rank-place second ${second.isUser ? 'is-current-user' : ''}" ${second.isUser ? 'style="border: 2px solid #ff5722; background: rgba(255,87,34,0.04);"' : ''}>
          <span class="rank-medal">2</span>
          <span class="rank-title">🥈 Hạng 2</span>
          <span class="rank-avatar">${getInitials(second.name)}</span>
          <b>${second.name}</b>
          ${getValuesHTML(second)}
        </article>
        
        <article class="rank-place first ${first.isUser ? 'is-current-user' : ''}" ${first.isUser ? 'style="border: 2px solid #ff5722; background: rgba(255,87,34,0.04);"' : ''}>
          <span class="rank-crown">♕</span>
          <span class="rank-medal">1</span>
          <span class="rank-title">👑 Hạng 1</span>
          <span class="rank-avatar">${getInitials(first.name)}</span>
          <b>${first.name}</b>
          ${getValuesHTML(first)}
        </article>
        
        <article class="rank-place third ${third.isUser ? 'is-current-user' : ''}" ${third.isUser ? 'style="border: 2px solid #ff5722; background: rgba(255,87,34,0.04);"' : ''}>
          <span class="rank-medal">3</span>
          <span class="rank-title">🥉 Hạng 3</span>
          <span class="rank-avatar">${getInitials(third.name)}</span>
          <b>${third.name}</b>
          ${getValuesHTML(third)}
        </article>
      </div>

      <div class="leaderboard-list">
        <div class="leaderboard-list-head">
          <span>#</span>
          <span>THÀNH VIÊN</span>
          <span>${secondLabel}</span>
          <span>${getTableLabel()}</span>
        </div>
        ${remaining.map((m, idx) => `
          <article class="${m.isUser ? 'is-current-user' : ''}" ${m.isUser ? 'style="background: rgba(255,87,34,0.08); border-left: 4px solid #ff5722; padding-left: 12px;"' : ''}>
            <span class="member-rank">${idx + 4}</span>
            <span class="member-name"><i>${getInitials(m.name)}</i><b>${m.name}</b></span>
            ${getSecondValue(m)}
            <span>${getTableValue(m)}</span>
          </article>
        `).join('')}
      </div>
    `;
  };

  // Thiết lập sự kiện chuyển đổi tab (chỉ bind một lần duy nhất)
  if (!view.dataset.eventsBound) {
    view.dataset.eventsBound = 'true';
    const buttons = view.querySelectorAll('.leaderboard-metrics button');
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        buttons.forEach(item => item.classList.toggle('active', item === button));
        currentMetric = button.getAttribute('data-metric');
        
        // Kích hoạt re-render nhanh bằng cache
        updateUI();
      });
    });
  }

  const fallbackList = [];

  function updateUI() {
    let sourceData = cachedLeaderboard || fallbackList;
    let list = sourceData.map(m => ({
      name: m.name,
      commission: m.commission || 0,
      orderCount: m.orderCount || 0,
      inviteCount: m.inviteCount || 0,
      isUser: m.name === user.name
    }));

    renderLeaderboardUI(list, currentMetric);
  }

  // Nếu có cache RAM, render luôn
  if (cachedLeaderboard) {
    updateUI();
    return;
  }

function isLeaderboardCacheValid(cachedTimeMs) {
  if (!cachedTimeMs || isNaN(cachedTimeMs)) return false;
  const now = new Date();
  const today9am = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0).getTime();
  let latestCheckpoint = now.getTime() >= today9am ? today9am : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 9, 0, 0).getTime();
  return Number(cachedTimeMs) >= latestCheckpoint;
}

  // Kiểm tra localStorage cache (hiệu lực làm mới vào 9h00 hàng ngày)
  const localCacheKey = "lb_cache_data_" + currentPeriod;
  const localTimeKey = "lb_cache_time_" + currentPeriod;
  const cachedDataStr = localStorage.getItem(localCacheKey);
  const cachedTimeStr = localStorage.getItem(localTimeKey);

  if (cachedDataStr && cachedTimeStr && isLeaderboardCacheValid(cachedTimeStr)) {
    try {
      const parsedObj = JSON.parse(cachedDataStr);
      if (parsedObj && Array.isArray(parsedObj.data) && parsedObj.data.length > 0) {
        cachedLeaderboard = parsedObj.data;
        if (parsedObj.availablePeriods && Array.isArray(parsedObj.availablePeriods)) {
          setTimeout(() => {
            const selectEl = document.getElementById('leaderboard-period-select');
            if (selectEl) {
              let optionsHtml = `<option value="all" ${currentPeriod === 'all' ? 'selected' : ''}>Tất cả thời gian</option>`;
              parsedObj.availablePeriods.forEach(p => {
                const parts = p.split('-');
                optionsHtml += `<option value="${p}" ${p === currentPeriod ? 'selected' : ''}>Tháng ${parts[0]}/${parts[1]}</option>`;
              });
              selectEl.innerHTML = optionsHtml;
              selectEl.value = currentPeriod;
            }
          }, 0);
        }
        updateUI();
        return;
      }
    } catch(e) {}
  }

  // Tải dữ liệu thực tế từ Google Sheet
  let url = CONFIG.API_URL + "?action=getLeaderboard&t=" + Date.now();
  if (currentPeriod !== "all") {
    const parts = currentPeriod.split("-");
    url += "&month=" + parts[0] + "&year=" + parts[1];
  }

  fetch(url)
    .then(res => res.json())
    .then(response => {
      if (response.success && Array.isArray(response.data)) {
        cachedLeaderboard = response.data;
        
        if (response.availablePeriods && Array.isArray(response.availablePeriods)) {
          const selectEl = document.getElementById('leaderboard-period-select');
          const btnEl = document.getElementById('leaderboard-period-btn');
          const heroSmall = document.getElementById('hero-period-small');
          if (selectEl) {
            let optionsHtml = `<option value="all" ${currentPeriod === 'all' ? 'selected' : ''}>Tất cả thời gian</option>`;
            response.availablePeriods.forEach(p => {
              const parts = p.split('-');
              const text = `Tháng ${parts[0]}/${parts[1]}`;
              const selected = (p === currentPeriod) ? 'selected' : '';
              optionsHtml += `<option value="${p}" ${selected}>${text}</option>`;
            });
            selectEl.innerHTML = optionsHtml;
            selectEl.value = currentPeriod;
          }
          if (btnEl) {
            const parts = currentPeriod.split("-");
            btnEl.innerHTML = (currentPeriod === "all" ? "Tất cả" : `Tháng ${parts[0]}/${parts[1]}`) + ' <span>⌄</span>';
          }
          if (heroSmall) {
            const parts = currentPeriod.split("-");
            heroSmall.textContent = currentPeriod === "all" ? "Tất cả" : `Tháng ${parts[0] ? parts[0].padStart(2, '0') : ''}`;
          }
        }

        updateUI();

        // Lưu cache lâu dài vào localStorage (hiệu lực 6 tiếng) nếu có dữ liệu
        if (response.data && response.data.length > 0) {
          try {
            localStorage.setItem(localCacheKey, JSON.stringify({
              data: response.data,
              availablePeriods: response.availablePeriods || []
            }));
            localStorage.setItem(localTimeKey, String(Date.now()));
          } catch(e) {}
        }
      } else {
        updateUI();
      }
    })
    .catch(err => {
      console.warn("Lỗi tải BXH thực tế, sử dụng fallback:", err);
      updateUI();
    });
}

// Handler xử lý thay đổi tháng
window.handlePeriodSelectChange = function(newPeriod) {
  if (currentPeriod === newPeriod) return;
  currentPeriod = newPeriod;
  cachedLeaderboard = null; // Reset cache
  
  const btnEl = document.getElementById('leaderboard-period-btn');
  const heroSmall = document.getElementById('hero-period-small');
  if (btnEl) {
    if (newPeriod === 'all') {
      btnEl.innerHTML = 'Tất cả <span>⌄</span>';
      if (heroSmall) heroSmall.textContent = 'Tất cả';
    } else {
      const parts = newPeriod.split('-');
      btnEl.innerHTML = `Tháng ${parts[0]}/${parts[1]} <span>⌄</span>`;
      if (heroSmall) heroSmall.textContent = `Tháng ${parts[0].padStart(2, '0')}`;
    }
  }

  const container = document.querySelector(".leaderboard-container");
  if (container) {
    container.innerHTML = `
      <div class="leaderboard-loading" style="text-align:center; padding:50px 0; color:#8490a3; font-weight:600;">
        <span class="spinner" style="display:inline-block; width:20px; height:20px; border:3px solid #ff5722; border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite; margin-right:8px; vertical-align:middle;"></span>
        Đang tải dữ liệu thực tế...
      </div>`;
  }

  const view = document.querySelector('.leaderboard-view');
  if (view) {
    delete view.dataset.ready;
  }
  enhanceLeaderboard();
};

if ((location.hash.slice(1) || location.pathname.slice(1) || 'dashboard') === 'ranking') render();
requestAnimationFrame(enhanceLeaderboard);
window.addEventListener('hashchange', () => requestAnimationFrame(enhanceLeaderboard));
window.addEventListener('popstate', () => requestAnimationFrame(enhanceLeaderboard));
setInterval(enhanceLeaderboard, 100);
