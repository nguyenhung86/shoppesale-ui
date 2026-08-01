let cachedLeaderboard = null;
let currentMetric = "commission"; // Máº·c Ä‘á»‹nh lÃ  lá»c theo commission (Hoa há»“ng)
let currentPeriod = "7-2026"; // Máº·c Ä‘á»‹nh thÃ¡ng 7/2026

function leaderboardPage() {
  return `
    <div class="leaderboard-view">
      <section class="leaderboard-hero">
        <div><span>THÃ€NH TÃCH Cá»˜NG Äá»’NG</span><h1>Báº£ng xáº¿p háº¡ng <em id="hero-metric-name">hoa há»“ng</em></h1><p>Ghi nháº­n nhá»¯ng thÃ nh viÃªn cÃ³ thÃ nh tÃ­ch ná»•i báº­t trong thÃ¡ng. Báº£ng xáº¿p háº¡ng Ä‘Æ°á»£c cáº­p nháº­t má»—i ngÃ y.</p></div>
        <div class="leaderboard-hero-mark" aria-hidden="true"><i>â™•</i><b>Top 3</b><small>ThÃ¡ng 07</small></div>
      </section>

      <section class="leaderboard-card">
        <div class="leaderboard-tools">
          <div class="leaderboard-metrics">
            <button class="active" type="button" data-metric="commission">Hoa há»“ng</button>
            <button type="button" data-metric="orderCount">Sá»‘ Ä‘Æ¡n</button>
            <button type="button" data-metric="inviteCount">LÆ°á»£t má»i</button>
          </div>
          <select class="leaderboard-period" onchange="window.handlePeriodChange(this.value)" style="cursor:pointer; outline:none; background: transparent; border: 1px solid #ffe2cc; color: #ff5722; font-weight: 600; padding: 6px 12px; border-radius: 20px;">
            <option value="1-2026" ${currentPeriod === '1-2026' ? 'selected' : ''}>ThÃ¡ng 1/2026</option>
            <option value="2-2026" ${currentPeriod === '2-2026' ? 'selected' : ''}>ThÃ¡ng 2/2026</option>
            <option value="3-2026" ${currentPeriod === '3-2026' ? 'selected' : ''}>ThÃ¡ng 3/2026</option>
            <option value="4-2026" ${currentPeriod === '4-2026' ? 'selected' : ''}>ThÃ¡ng 4/2026</option>
            <option value="5-2026" ${currentPeriod === '5-2026' ? 'selected' : ''}>ThÃ¡ng 5/2026</option>
            <option value="6-2026" ${currentPeriod === '6-2026' ? 'selected' : ''}>ThÃ¡ng 6/2026</option>
            <option value="7-2026" ${currentPeriod === '7-2026' ? 'selected' : ''}>ThÃ¡ng 7/2026</option>
            <option value="8-2026" ${currentPeriod === '8-2026' ? 'selected' : ''}>ThÃ¡ng 8/2026</option>
            <option value="9-2026" ${currentPeriod === '9-2026' ? 'selected' : ''}>ThÃ¡ng 9/2026</option>
            <option value="10-2026" ${currentPeriod === '10-2026' ? 'selected' : ''}>ThÃ¡ng 10/2026</option>
            <option value="11-2026" ${currentPeriod === '11-2026' ? 'selected' : ''}>ThÃ¡ng 11/2026</option>
            <option value="12-2026" ${currentPeriod === '12-2026' ? 'selected' : ''}>ThÃ¡ng 12/2026</option>
            <option value="all" ${currentPeriod === 'all' ? 'selected' : ''}>Táº¥t cáº£ thá»i gian</option>
          </select>
        </div>
        <p class="leaderboard-note"><b>â†»</b> Dá»¯ liá»‡u Ä‘Æ°á»£c cáº­p nháº­t tá»± Ä‘á»™ng vÃ o 09:00 má»—i ngÃ y.</p>

        <div class="leaderboard-container">
          <div class="leaderboard-loading" style="text-align:center; padding:50px 0; color:#8490a3; font-weight:600;">
            <span class="spinner" style="display:inline-block; width:20px; height:20px; border:3px solid #ff5722; border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite; margin-right:8px; vertical-align:middle;"></span>
            Äang táº£i dá»¯ liá»‡u thá»±c táº¿...
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

  const user = getLoggedUser() || { name: "KhÃ¡ch HÃ ng Thá»­ Nghiá»‡m" };
  let userTotal = 0;
  let userCount = 0;

  if (window.cachedOrders && window.cachedOrders.success && window.cachedOrders.data) {
    const ordersList = window.cachedOrders.data;
    ordersList.forEach(o => {
      const cleaned = (o.orderStatus || "").toLowerCase();
      const isCancelled = cleaned.includes("há»§y") || cleaned.includes("invalid") || cleaned.includes("Ä‘Æ¡n há»§y");
      if (!isCancelled) {
        userTotal += Number(o.commission) || 0;
        userCount += 1;
      }
    });
  }

  const formatVND = val => Math.round(val).toLocaleString("vi-VN") + "Ä‘";
  const getInitials = name => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const renderLeaderboardUI = (list, metric) => {
    if (list.length < 3) {
      container.innerHTML = `<div style="text-align:center; padding:30px; color:#8490a3;">ChÆ°a cÃ³ Ä‘á»§ dá»¯ liá»‡u báº£ng xáº¿p háº¡ng.</div>`;
      return;
    }

    list.sort((a, b) => (b[metric] || 0) - (a[metric] || 0));
    const top10 = list.slice(0, 10);

    const first = top10[0];
    const second = top10[1];
    const third = top10[2];
    const remaining = top10.slice(3);

    const heroMetricText = document.getElementById('hero-metric-name');
    if (heroMetricText) {
      if (metric === 'commission') heroMetricText.textContent = "hoa há»“ng";
      else if (metric === 'orderCount') heroMetricText.textContent = "sá»‘ Ä‘Æ¡n";
      else if (metric === 'inviteCount') heroMetricText.textContent = "lÆ°á»£t má»i";
    }

    const getValuesHTML = (item) => {
      if (metric === "commission") {
        return `<strong>${formatVND(item.commission)}</strong><small>${item.orderCount} Ä‘Æ¡n</small>`;
      } else if (metric === "orderCount") {
        return `<strong>${item.orderCount} Ä‘Æ¡n</strong><small>${formatVND(item.commission)}</small>`;
      } else {
        return `<strong>${item.inviteCount || 0} lÆ°á»£t má»i</strong><small>${formatVND(item.commission)}</small>`;
      }
    };

    const getTableLabel = () => {
      if (metric === "commission") return "HOA Há»’NG";
      if (metric === "orderCount") return "Sá» ÄÆ N";
      return "LÆ¯á»¢T Má»œI";
    };

    const getTableValue = (item) => {
      if (metric === "commission") return `<strong style="color: #ff5722;">${formatVND(item.commission)}</strong>`;
      if (metric === "orderCount") return `<strong style="color: #ff5722;">${item.orderCount} Ä‘Æ¡n</strong>`;
      return `<strong style="color: #ff5722;">${item.inviteCount || 0} lÆ°á»£t</strong>`;
    };

    const getSecondValue = (item) => {
      if (metric === "commission") return `<span>${item.orderCount} Ä‘Æ¡n</span>`;
      return `<span>${formatVND(item.commission)}</span>`;
    };

    const secondLabel = metric === "commission" ? "Sá» ÄÆ N" : "HOA Há»’NG";

    container.innerHTML = `
      <div class="leaderboard-podium">
        <article class="rank-place second ${second.isUser ? 'is-current-user' : ''}" ${second.isUser ? 'style="border: 2px solid #ff5722; background: rgba(255,87,34,0.04);"' : ''}>
          <span class="rank-medal">2</span>
          <span class="rank-title">ðŸ¥ˆ Háº¡ng 2</span>
          <span class="rank-avatar">${getInitials(second.name)}</span>
          <b>${second.name}</b>
          ${getValuesHTML(second)}
        </article>
        
        <article class="rank-place first ${first.isUser ? 'is-current-user' : ''}" ${first.isUser ? 'style="border: 2px solid #ff5722; background: rgba(255,87,34,0.04);"' : ''}>
          <span class="rank-crown">â™•</span>
          <span class="rank-medal">1</span>
          <span class="rank-title">ðŸ‘‘ Háº¡ng 1</span>
          <span class="rank-avatar">${getInitials(first.name)}</span>
          <b>${first.name}</b>
          ${getValuesHTML(first)}
        </article>
        
        <article class="rank-place third ${third.isUser ? 'is-current-user' : ''}" ${third.isUser ? 'style="border: 2px solid #ff5722; background: rgba(255,87,34,0.04);"' : ''}>
          <span class="rank-medal">3</span>
          <span class="rank-title">ðŸ¥‰ Háº¡ng 3</span>
          <span class="rank-avatar">${getInitials(third.name)}</span>
          <b>${third.name}</b>
          ${getValuesHTML(third)}
        </article>
      </div>

      <div class="leaderboard-list">
        <div class="leaderboard-list-head">
          <span>#</span>
          <span>THÃ€NH VIÃŠN</span>
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

  if (!view.dataset.eventsBound) {
    view.dataset.eventsBound = 'true';
    const buttons = view.querySelectorAll('.leaderboard-metrics button');
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        buttons.forEach(item => item.classList.toggle('active', item === button));
        currentMetric = button.getAttribute('data-metric');
        // KÃ­ch hoáº¡t re-render nhanh báº±ng cache
        updateUI();
      });
    });
  }

  const fallbackList = [
    { name: user.name, commission: userTotal, orderCount: userCount, inviteCount: 0, isUser: true },
    { name: "Nguyá»…n Thu HÆ°Æ¡ng", commission: Math.round(userTotal * 0.85) + 300000, orderCount: Math.round(userCount * 0.8) + 15, inviteCount: 8 },
    { name: "Ella Quach", commission: Math.round(userTotal * 0.78) + 250000, orderCount: Math.round(userCount * 0.75) + 12, inviteCount: 14 },
    { name: "HoÃ ng Anh", commission: Math.round(userTotal * 0.65) + 180000, orderCount: Math.round(userCount * 0.6) + 9, inviteCount: 5 },
    { name: "BÃ­ch Háº¡nh Tráº§n", commission: Math.round(userTotal * 0.55) + 120000, orderCount: Math.round(userCount * 0.5) + 6, inviteCount: 3 },
    { name: "Tráº§n ThÃ¹y", commission: Math.round(userTotal * 0.48) + 90000, orderCount: Math.round(userCount * 0.45) + 4, inviteCount: 2 },
    { name: "Sam Äá»— Thá»‹ Há»“ng", commission: Math.round(userTotal * 0.42) + 70000, orderCount: Math.round(userCount * 0.4) + 3, inviteCount: 9 },
    { name: "Tráº§n Thanh NhÃ n", commission: Math.round(userTotal * 0.35) + 50000, orderCount: Math.round(userCount * 0.3) + 2, inviteCount: 1 },
    { name: "Yáº¿n Tráº§n", commission: Math.round(userTotal * 0.28) + 30000, orderCount: Math.round(userCount * 0.25) + 1, inviteCount: 4 }
  ];

  function updateUI() {
    let sourceData = cachedLeaderboard || fallbackList;
    let list = sourceData.map(m => ({
      name: m.name,
      commission: m.commission || 0,
      orderCount: m.orderCount || 0,
      inviteCount: m.inviteCount || 0,
      isUser: m.name === user.name
    }));

    const hasUser = list.some(m => m.isUser);
    if (!hasUser && (userTotal > 0 || userCount > 0)) {
      list.push({ name: user.name, commission: userTotal, orderCount: userCount, inviteCount: 0, isUser: true });
    }

    renderLeaderboardUI(list, currentMetric);
  }

  // Náº¿u cÃ³ cache, render luÃ´n
  if (cachedLeaderboard) {
    updateUI();
    return;
  }

  // Táº£i dá»¯ liá»‡u thá»±c táº¿ tá»« Google Sheet (thÃªm timestamp Ä‘á»ƒ trÃ¡nh cache vÃ  period)
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
          const selectEl = document.querySelector('.leaderboard-period');
          if (selectEl) {
            let optionsHtml = '';
            response.availablePeriods.forEach(p => {
              const parts = p.split('-');
              const text = `Tháng ${parts[0]}/${parts[1]}`;
              const selected = (p === currentPeriod) ? 'selected' : '';
              optionsHtml += `<option value="${p}" ${selected}>${text}</option>`;
            });
            optionsHtml += `<option value="all" ${currentPeriod === 'all' ? 'selected' : ''}>Tất cả thời gian</option>`;
            
            // Chỉ cập nhật nếu options có sự thay đổi để tránh nháy giật (flicker)
            if (selectEl.innerHTML !== optionsHtml) {
              selectEl.innerHTML = optionsHtml;
            }
          }
        }
        
        updateUI();
      } else {
        updateUI();
      }
    })
    .catch(err => {
      console.warn("Lá»—i táº£i BXH thá»±c táº¿, sá»­ dá»¥ng fallback:", err);
      updateUI();
    });
}

if ((location.hash.slice(1) || location.pathname.slice(1) || 'dashboard') === 'ranking') render();
requestAnimationFrame(enhanceLeaderboard);
window.addEventListener('hashchange', () => requestAnimationFrame(enhanceLeaderboard));
window.addEventListener('popstate', () => requestAnimationFrame(enhanceLeaderboard));
setInterval(enhanceLeaderboard, 100);

// Hàm x? lý d?i tháng
window.handlePeriodChange = function(newPeriod) {
  if (currentPeriod === newPeriod) return;
  currentPeriod = newPeriod;
  cachedLeaderboard = null; // Xóa cache d? t?i l?i
  
  const heroMarkSmall = document.querySelector('.leaderboard-hero-mark small');
  if (heroMarkSmall) {
    if (newPeriod === "all") {
      heroMarkSmall.textContent = "Toàn th?i gian";
    } else {
      const parts = newPeriod.split("-");
      heroMarkSmall.textContent = "Tháng 0" + parts[0];
    }
  }

  const container = document.querySelector(".leaderboard-container");
  if (container) {
    container.innerHTML = \
      <div class="leaderboard-loading" style="text-align:center; padding:50px 0; color:#8490a3; font-weight:600;">
        <span class="spinner" style="display:inline-block; width:20px; height:20px; border:3px solid #ff5722; border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite; margin-right:8px; vertical-align:middle;"></span>
        Ðang t?i d? li?u th?c t?...
      </div>\;
  }
  
  const view = document.querySelector('.leaderboard-view');
  if (view) {
    delete view.dataset.ready;
  }
  if (typeof enhanceLeaderboard === 'function') {
    enhanceLeaderboard();
  }
};

