(() => {
  const DEFAULT_WHEEL_SLICES = [
    { index: 0, label: 'JACKPOT 5.000đ', shortLabel: '5.000đ', amount: 5000, type: 'cash' },
    { index: 1, label: '+2.000đ', shortLabel: '2.000đ', amount: 2000, type: 'cash' },
    { index: 2, label: 'Chúc may mắn 🍀', shortLabel: 'May mắn', amount: 0, type: 'none' },
    { index: 3, label: '+1.000đ', shortLabel: '1.000đ', amount: 1000, type: 'cash' },
    { index: 4, label: '+3.000đ', shortLabel: '3.000đ', amount: 3000, type: 'cash' },
    { index: 5, label: 'Suýt trúng! 🎯', shortLabel: 'Suýt trúng', amount: 0, type: 'none' },
    { index: 6, label: '+1.500đ', shortLabel: '1.500đ', amount: 1500, type: 'cash' },
    { index: 7, label: 'Thêm 1 Lượt 🔄', shortLabel: '+1 Lượt', amount: 0, type: 'free_spin' }
  ];

  let wheelState = {
    slices: DEFAULT_WHEEL_SLICES,
    availableTickets: 0,
    welcomeTickets: 0,
    earnedOrderTickets: 0,
    bonusFreeSpins: 0,
    usedTickets: 0,
    totalWonAmount: 0,
    userHistory: [],
    recentWinners: [],
    launchDate: '2026-11-18'
  };

  let activeFeedTab = 'winners';
  let currentRotation = 0;
  let isSpinning = false;
  let isMuted = localStorage.getItem('shoppesale_wheel_muted') === '1';
  let audioCtx = null;

  function escapeWheelHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatWheelMoney(n) {
    return Math.round(Number(n) || 0).toLocaleString('vi-VN') + 'đ';
  }

  function formatWheelTime(iso) {
    if (!iso) return 'Vừa xong';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'Vừa xong';
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    }).format(d);
  }

  function ensureAudioContext() {
    if (isMuted) return null;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) {
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function playWheelTick() {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(860, now);
      osc.frequency.exponentialRampToValueAtTime(310, now + 0.032);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.038);
    } catch (_) {}
  }

  function playWinFanfare(isJackpot) {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    const notes = isJackpot ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      try {
        const start = ctx.currentTime + idx * 0.085;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.14, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.3);
      } catch (_) {}
    });
  }

  function playLoseSound() {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    [392, 329.63].forEach((freq, idx) => {
      try {
        const start = ctx.currentTime + idx * 0.12;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.1, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.24);
      } catch (_) {}
    });
  }

  function spawnConfettiBurst() {
    const colors = ['#ff5722', '#facc15', '#22c55e', '#3b82f6', '#ec4899', '#fb923c'];
    for (let i = 0; i < 48; i++) {
      const piece = document.createElement('span');
      piece.className = 'wheel-confetti-piece';
      piece.style.left = (Math.random() * 100) + 'vw';
      piece.style.backgroundColor = colors[i % colors.length];
      piece.style.animationDuration = (1.5 + Math.random() * 1.1) + 's';
      piece.style.animationDelay = (Math.random() * 0.28) + 's';
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 2900);
    }
  }

  function buildWheelSvg(slices) {
    const cx = 250;
    const cy = 250;
    const r = 236;
    const count = slices.length || 8;
    const step = 360 / count;

    const toXY = (deg, radius) => {
      const rad = (deg - 90) * Math.PI / 180;
      return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
    };

    const wedges = slices.map((slice, idx) => {
      const startDeg = idx * step - step / 2;
      const endDeg = idx * step + step / 2;
      const [x1, y1] = toXY(startDeg, r);
      const [x2, y2] = toXY(endDeg, r);
      const isJackpot = idx === 0;
      const isRed = idx % 2 === 1;
      const fill = isJackpot
        ? 'url(#wheelGoldGrad)'
        : (isRed ? 'url(#wheelRedGrad)' : 'url(#wheelCreamGrad)');
      const textFill = isJackpot ? '#7c2d12' : (isRed ? '#ffffff' : '#b91c1c');
      const subFill = isJackpot ? '#92400e' : (isRed ? '#fef08a' : '#ea580c');

      const lines = isJackpot
        ? ['JACKPOT', '5.000đ']
        : (slice.type === 'free_spin'
            ? ['THÊM', '1 LƯỢT']
            : (slice.amount > 0 ? ['TRÚNG', '+' + formatWheelMoney(slice.amount)] : [slice.shortLabel.toUpperCase(), '🍀']));

      const textGroup = `
        <g transform="rotate(${idx * step} ${cx} ${cy})">
          <text x="${cx}" y="76" text-anchor="middle" fill="${subFill}" font-family="'Be Vietnam Pro', sans-serif" font-size="13" font-weight="800" letter-spacing="0.04em">${escapeWheelHtml(lines[0])}</text>
          <text x="${cx}" y="104" text-anchor="middle" fill="${textFill}" font-family="'Be Vietnam Pro', sans-serif" font-size="${isJackpot ? 18 : 17}" font-weight="900">${escapeWheelHtml(lines[1] || '')}</text>
        </g>
      `;

      const [px, py] = toXY(startDeg, r - 12);
      const pin = `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4.5" fill="#fef08a" stroke="#92400e" stroke-width="1.2"/>`;

      return `<path d="M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${fill}" stroke="#d97706" stroke-width="1.6"/>${textGroup}${pin}`;
    }).join('');

    return `
      <svg class="wheel-svg" viewBox="0 0 500 500" aria-hidden="true">
        <defs>
          <linearGradient id="wheelGoldGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="50%" stop-color="#facc15"/>
            <stop offset="100%" stop-color="#eab308"/>
          </linearGradient>
          <linearGradient id="wheelRedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ef2d22"/>
            <stop offset="100%" stop-color="#b9110a"/>
          </linearGradient>
          <linearGradient id="wheelCreamGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="100%" stop-color="#fff0df"/>
          </linearGradient>
        </defs>
        ${wedges}
        <circle cx="${cx}" cy="${cy}" r="52" fill="#facc15" stroke="#92400e" stroke-width="3"/>
      </svg>
    `;
  }

  function buildLedBulbsHtml() {
    const bulbs = [];
    for (let i = 0; i < 24; i++) {
      const deg = i * 15;
      const rad = (deg - 90) * Math.PI / 180;
      const x = 50 + 47.6 * Math.cos(rad);
      const y = 50 + 47.6 * Math.sin(rad);
      bulbs.push(`<span class="wheel-led ${i % 2 === 0 ? 'is-even' : 'is-odd'}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;"></span>`);
    }
    return bulbs.join('');
  }

  function renderLuckyWheelPage() {
    return `
      <div class="wheel-page-wrap">
        <section class="wheel-hero-head">
          <div>
            <div class="wheel-hero-kicker">🎰 MINI GAME TRI ÂN THÀNH VIÊN</div>
            <h1>Vòng Quay May Mắn</h1>
            <p>Mỗi đơn hàng hoàn thành mới tặng 1 vé quay — trúng thưởng cộng thẳng vào ví hoàn tiền!</p>
          </div>
          <button type="button" id="wheel-sound-toggle" class="wheel-sound-btn">
            ${isMuted ? '🔇 Tắt tiếng' : '🔊 Âm thanh'}
          </button>
        </section>

        <div class="wheel-layout">
          <section class="wheel-stage-card">
            <div class="wheel-stage">
              <div id="wheel-pointer" class="wheel-pointer" aria-hidden="true">
                <svg viewBox="0 0 44 54" width="44" height="54">
                  <defs>
                    <linearGradient id="ptrGold" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stop-color="#fef08a"/>
                      <stop offset="45%" stop-color="#f59e0b"/>
                      <stop offset="100%" stop-color="#b45309"/>
                    </linearGradient>
                  </defs>
                  <path d="M22 52 L6 16 A16 16 0 1 1 38 16 Z" fill="url(#ptrGold)" stroke="#7c2d12" stroke-width="2.2"/>
                  <circle cx="22" cy="17" r="6" fill="#fffbeb" stroke="#92400e" stroke-width="1.6"/>
                </svg>
              </div>
              <div class="wheel-frame">
                <div class="wheel-led-ring">${buildLedBulbsHtml()}</div>
                <div class="wheel-rotor-wrap">
                  <div id="wheel-rotor" class="wheel-rotor">
                    ${buildWheelSvg(wheelState.slices)}
                  </div>
                </div>
                <button type="button" id="wheel-center-spin" class="wheel-center-btn">QUAY<br>NGAY</button>
              </div>
              <div class="wheel-pedestal" aria-hidden="true"></div>
              <div class="wheel-pedestal-base" aria-hidden="true"></div>
            </div>
            <button type="button" id="wheel-main-spin-btn" class="wheel-spin-cta">🎡 Bấm Quay Ngay (${wheelState.availableTickets} vé)</button>
          </section>

          <div class="wheel-side-col">
            <section class="wheel-card">
              <div class="wheel-stats-row">
                <div class="wheel-stat-box">
                  <small>🎟️ Vé quay hiện có</small>
                  <strong id="wheel-ticket-count">${wheelState.availableTickets} vé</strong>
                </div>
                <div class="wheel-stat-box is-green">
                  <small>💰 Tổng thưởng đã trúng</small>
                  <strong id="wheel-won-total">${formatWheelMoney(wheelState.totalWonAmount)}</strong>
                </div>
              </div>
              <div class="wheel-ticket-breakdown" id="wheel-ticket-breakdown">
                <span class="wheel-pill">🎁 Mở hàng: ${wheelState.welcomeTickets} vé</span>
                <span class="wheel-pill">🛍️ Từ đơn mới: ${wheelState.earnedOrderTickets} vé</span>
                <span class="wheel-pill">🔄 Quay thêm: ${wheelState.bonusFreeSpins} vé</span>
              </div>
              <div class="wheel-rule-box">
                <b>Cách nhận vé quay:</b><br>
                • Tặng miễn phí <b>1 vé mở hàng</b> khi tham gia.<br>
                • Mỗi đơn hàng hợp lệ mới (từ 18/11/2026) chuyển sang trạng thái <b>Hoàn thành</b> tự động cộng <b>+1 vé quay</b>.<br>
                • Tiền thưởng trúng được cộng thẳng vào số dư ví và đồng bộ Google Sheet!
              </div>
              <a href="/convert" class="wheel-earn-btn">⚡ Chuyển link mua sắm kiếm thêm vé →</a>
            </section>

            <section class="wheel-card">
              <div class="wheel-tabs-head">
                <button type="button" class="wheel-tab-btn ${activeFeedTab === 'winners' ? 'is-active' : ''}" data-wheel-tab="winners">🏆 Vừa trúng thưởng</button>
                <button type="button" class="wheel-tab-btn ${activeFeedTab === 'history' ? 'is-active' : ''}" data-wheel-tab="history">📜 Lịch sử của bạn</button>
              </div>
              <div id="wheel-feed-container" class="wheel-feed-list"></div>
            </section>
          </div>
        </div>
      </div>
    `;
  }

  function renderWheelFeedList() {
    const container = document.getElementById('wheel-feed-container');
    if (!container) return;

    if (activeFeedTab === 'winners') {
      const list = wheelState.recentWinners || [];
      if (!list.length) {
        container.innerHTML = '<div class="wheel-empty">Chưa có ai trúng thưởng hôm nay. Hãy là người đầu tiên quay nhé! 🎉</div>';
        return;
      }
      container.innerHTML = list.map(item => `
        <div class="wheel-feed-row">
          <div>
            <strong>🎉 ${escapeWheelHtml(item.name || 'Thành viên')}</strong>
            <small>${formatWheelTime(item.createdAt)}</small>
          </div>
          <span class="wheel-feed-prize">+${formatWheelMoney(item.amount)}</span>
        </div>
      `).join('');
      return;
    }

    const hist = wheelState.userHistory || [];
    if (!hist.length) {
      container.innerHTML = '<div class="wheel-empty">Bạn chưa có lượt quay nào. Bấm <b>QUAY NGAY</b> để thử vận may!</div>';
      return;
    }
    container.innerHTML = hist.map(item => {
      const isCash = item.type === 'cash' && Number(item.amount) > 0;
      const isFree = item.type === 'free_spin';
      return `
        <div class="wheel-feed-row">
          <div>
            <strong>${escapeWheelHtml(item.label)}</strong>
            <small>${formatWheelTime(item.createdAt)}</small>
          </div>
          <span class="wheel-feed-prize ${isCash ? '' : 'is-neutral'}">
            ${isCash ? '+' + formatWheelMoney(item.amount) : (isFree ? '+1 Lượt' : '0đ')}
          </span>
        </div>
      `;
    }).join('');
  }

  function updateWheelDom() {
    const ticketEl = document.getElementById('wheel-ticket-count');
    const wonEl = document.getElementById('wheel-won-total');
    const breakdownEl = document.getElementById('wheel-ticket-breakdown');
    const mainBtn = document.getElementById('wheel-main-spin-btn');
    const soundBtn = document.getElementById('wheel-sound-toggle');

    if (ticketEl) ticketEl.textContent = `${wheelState.availableTickets} vé`;
    if (wonEl) wonEl.textContent = formatWheelMoney(wheelState.totalWonAmount);
    if (breakdownEl) {
      breakdownEl.innerHTML = `
        <span class="wheel-pill">🎁 Mở hàng: ${wheelState.welcomeTickets} vé</span>
        <span class="wheel-pill">🛍️ Từ đơn mới: ${wheelState.earnedOrderTickets} vé</span>
        <span class="wheel-pill">🔄 Quay thêm: ${wheelState.bonusFreeSpins} vé</span>
      `;
    }
    if (mainBtn && !isSpinning) {
      mainBtn.textContent = `🎡 Bấm Quay Ngay (${wheelState.availableTickets} vé)`;
    }
    if (soundBtn) {
      soundBtn.textContent = isMuted ? '🔇 Tắt tiếng' : '🔊 Âm thanh';
    }
    document.querySelectorAll('[data-wheel-tab]').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.wheelTab === activeFeedTab);
    });
    renderWheelFeedList();
  }

  async function refreshWheelStatus() {
    const zaloId = localStorage.getItem('shoppesale_zalo_id') || '';
    try {
      const apiBase = (typeof CONFIG !== 'undefined' && CONFIG.API_URL) ? CONFIG.API_URL : 'https://api-vps.hoantienonline.io.vn/api/web';
      const url = apiBase + '?action=getWheelStatus' + (zaloId ? '&zaloId=' + encodeURIComponent(zaloId) : '') + '&_t=' + Date.now();
      const res = await fetch(url).then(r => r.json());
      if (res && res.success) {
        if (Array.isArray(res.slices) && res.slices.length === 8) {
          const prevKey = JSON.stringify(wheelState.slices);
          wheelState.slices = res.slices;
          const rotor = document.getElementById('wheel-rotor');
          if (rotor && prevKey !== JSON.stringify(res.slices) && !isSpinning) {
            rotor.innerHTML = buildWheelSvg(wheelState.slices);
          }
        }
        wheelState.availableTickets = Number(res.availableTickets) || 0;
        wheelState.welcomeTickets = Number(res.welcomeTickets) || 0;
        wheelState.earnedOrderTickets = Number(res.earnedOrderTickets) || 0;
        wheelState.bonusFreeSpins = Number(res.bonusFreeSpins) || 0;
        wheelState.usedTickets = Number(res.usedTickets) || 0;
        wheelState.totalWonAmount = Number(res.totalWonAmount) || 0;
        wheelState.userHistory = Array.isArray(res.userHistory) ? res.userHistory : [];
        wheelState.recentWinners = Array.isArray(res.recentWinners) ? res.recentWinners : [];
        updateWheelDom();
      }
    } catch (e) {
      console.warn('[LuckyWheel] Không thể tải trạng thái vòng quay:', e.message);
    }
  }

  function openWheelResultModal(slice) {
    document.querySelector('.wheel-result-modal')?.remove();
    const isCash = slice && slice.type === 'cash' && Number(slice.amount) > 0;
    const isFree = slice && slice.type === 'free_spin';

    let icon = '🍀';
    let title = 'Chúc bạn may mắn lần sau!';
    let amountHtml = '';
    let desc = 'Đừng nản nhé, hoàn thành đơn mua sắm mới sẽ nhận ngay thêm vé quay may mắn!';

    if (isCash) {
      icon = Number(slice.amount) >= 5000 ? '🏆' : '🎉';
      title = Number(slice.amount) >= 5000 ? 'NỔ HŨ JACKPOT!' : 'Chúc Mừng Bạn Đã Trúng Thưởng!';
      amountHtml = `<div class="wheel-result-amount">+${formatWheelMoney(slice.amount)}</div>`;
      desc = 'Tiền thưởng đã được tự động cộng vào ví hoàn tiền và đồng bộ đơn thưởng của bạn!';
    } else if (isFree) {
      icon = '🔄';
      title = 'Tuyệt Vời! +1 Lượt Quay Miễn Phí';
      desc = 'Bạn vừa nhận thêm 1 lượt quay nữa — bấm quay tiếp ngay nào!';
    }

    const modal = document.createElement('div');
    modal.className = 'wheel-result-modal';
    modal.innerHTML = `
      <div class="wheel-result-dialog" role="dialog" aria-modal="true">
        <div class="wheel-result-icon">${icon}</div>
        <h3>${title}</h3>
        ${amountHtml}
        <p>${desc}</p>
        <button type="button" class="wheel-result-close">Xác nhận</button>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('.wheel-result-close')?.addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
  }

  function animatePointerTicks(durationMs) {
    const rotor = document.getElementById('wheel-rotor');
    const pointer = document.getElementById('wheel-pointer');
    if (!rotor || !pointer) return;

    const startTime = performance.now();
    let lastSector = -1;

    function step(now) {
      if (now - startTime > durationMs + 100 || !isSpinning) return;
      const tr = window.getComputedStyle(rotor).transform;
      if (tr && tr !== 'none') {
        const m = tr.match(/matrix\(([^)]+)\)/);
        if (m) {
          const vals = m[1].split(',').map(Number);
          let deg = Math.atan2(vals[1], vals[0]) * (180 / Math.PI);
          deg = ((deg % 360) + 360) % 360;
          const sector = Math.floor(((deg + 22.5) % 360) / 45);
          if (sector !== lastSector) {
            lastSector = sector;
            pointer.classList.remove('is-ticking');
            void pointer.offsetWidth;
            pointer.classList.add('is-ticking');
            playWheelTick();
          }
        }
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  async function handleWheelSpin() {
    if (isSpinning) return;

    const user = typeof getLoggedUser === 'function' ? getLoggedUser() : null;
    if (!user) {
      if (typeof showLoginModal === 'function') showLoginModal();
      return;
    }

    const zaloId = localStorage.getItem('shoppesale_zalo_id') || '';
    if (!zaloId) {
      if (typeof showZaloLinkModal === 'function') showZaloLinkModal(user);
      return;
    }

    ensureAudioContext();

    if (wheelState.availableTickets <= 0) {
      alert('Bạn đã hết vé quay! Hãy chuyển link mua hàng để nhận thêm vé sau khi đơn hoàn thành nhé.');
      return;
    }

    isSpinning = true;
    const centerBtn = document.getElementById('wheel-center-spin');
    const mainBtn = document.getElementById('wheel-main-spin-btn');
    const rotor = document.getElementById('wheel-rotor');
    if (centerBtn) centerBtn.disabled = true;
    if (mainBtn) {
      mainBtn.disabled = true;
      mainBtn.textContent = '🎡 Đang quay may mắn...';
    }

    try {
      const apiBase = (typeof CONFIG !== 'undefined' && CONFIG.API_URL) ? CONFIG.API_URL : 'https://api-vps.hoantienonline.io.vn/api/web';
      const url = apiBase + '?action=spinWheel&zaloId=' + encodeURIComponent(zaloId) + '&userName=' + encodeURIComponent(user.name || '');
      const res = await fetch(url).then(r => r.json());

      if (!res || !res.success) {
        alert((res && res.error) || 'Không thể quay lúc này, vui lòng thử lại!');
        isSpinning = false;
        if (centerBtn) centerBtn.disabled = false;
        if (mainBtn) {
          mainBtn.disabled = false;
          mainBtn.textContent = `🎡 Bấm Quay Ngay (${wheelState.availableTickets} vé)`;
        }
        return;
      }

      const sliceIndex = Number(res.sliceIndex) || 0;
      const targetMod = (360 - sliceIndex * 45) % 360;
      const jitter = Math.random() * 20 - 10;
      const currentMod = ((currentRotation % 360) + 360) % 360;
      const delta = ((targetMod + jitter - currentMod) % 360 + 360) % 360;
      currentRotation = currentRotation + 360 * 6 + delta;

      if (rotor) {
        rotor.style.transform = `rotate(${currentRotation.toFixed(2)}deg)`;
      }
      animatePointerTicks(4600);

      setTimeout(() => {
        isSpinning = false;
        wheelState.availableTickets = Number(res.availableTickets) || 0;
        wheelState.totalWonAmount = Number(res.totalWonAmount) || 0;
        wheelState.userHistory = Array.isArray(res.userHistory) ? res.userHistory : wheelState.userHistory;
        wheelState.recentWinners = Array.isArray(res.recentWinners) ? res.recentWinners : wheelState.recentWinners;

        if (centerBtn) centerBtn.disabled = false;
        if (mainBtn) mainBtn.disabled = false;
        updateWheelDom();

        const wonSlice = res.slice || wheelState.slices[sliceIndex];
        if (wonSlice && wonSlice.type === 'cash' && Number(wonSlice.amount) > 0) {
          playWinFanfare(Number(wonSlice.amount) >= 5000);
          spawnConfettiBurst();
          if (typeof window.fetchOrdersInBackground === 'function') {
            window.fetchOrdersInBackground(zaloId);
          }
        } else if (wonSlice && wonSlice.type === 'free_spin') {
          playWinFanfare(false);
        } else {
          playLoseSound();
        }
        openWheelResultModal(wonSlice);
      }, 4700);
    } catch (err) {
      console.error('[LuckyWheel] Lỗi quay:', err);
      alert('Kết nối máy chủ bị gián đoạn, vui lòng thử lại!');
      isSpinning = false;
      if (centerBtn) centerBtn.disabled = false;
      if (mainBtn) {
        mainBtn.disabled = false;
        mainBtn.textContent = `🎡 Bấm Quay Ngay (${wheelState.availableTickets} vé)`;
      }
    }
  }

  function enhanceLuckyWheelPage() {
    const wrap = document.querySelector('.wheel-page-wrap');
    if (!wrap || wrap.dataset.ready) return;
    wrap.dataset.ready = 'true';

    document.getElementById('wheel-center-spin')?.addEventListener('click', handleWheelSpin);
    document.getElementById('wheel-main-spin-btn')?.addEventListener('click', handleWheelSpin);
    document.getElementById('wheel-sound-toggle')?.addEventListener('click', () => {
      isMuted = !isMuted;
      localStorage.setItem('shoppesale_wheel_muted', isMuted ? '1' : '0');
      updateWheelDom();
    });

    wrap.querySelectorAll('[data-wheel-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeFeedTab = btn.dataset.wheelTab || 'winners';
        updateWheelDom();
      });
    });

    updateWheelDom();
    refreshWheelStatus();
  }

  window.renderLuckyWheelPage = renderLuckyWheelPage;
  if (typeof pages !== 'undefined') {
    pages.wheel = renderLuckyWheelPage;
  }

  const curRoute = location.hash.slice(1) || location.pathname.replace(/^\/+|\/+$/g, '') || 'dashboard';
  if (curRoute === 'wheel' && typeof render === 'function') {
    render();
  }

  enhanceLuckyWheelPage();
  window.addEventListener('hashchange', () => requestAnimationFrame(enhanceLuckyWheelPage));
  window.addEventListener('popstate', () => requestAnimationFrame(enhanceLuckyWheelPage));
  window.addEventListener('zalo_id_synced', () => {
    if (document.querySelector('.wheel-page-wrap')) refreshWheelStatus();
  });
  setInterval(enhanceLuckyWheelPage, 150);
})();
