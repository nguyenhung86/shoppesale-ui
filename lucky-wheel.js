/* =========================================================
   LUCKY WHEEL GAME MODULE (Vòng Quay May Mắn)
   HoanTienOnline - Studio Casino Edition (v4)
   ========================================================= */
(function () {
  const DEFAULT_WHEEL_SLICES = [
    { index: 0, label: 'JACKPOT 5.000đ', shortLabel: '5.000đ', subLabel: 'JACKPOT', amount: 5000, type: 'cash' },
    { index: 1, label: '+2.000đ', shortLabel: '+2.000đ', subLabel: 'TIỀN MẶT', amount: 2000, type: 'cash' },
    { index: 2, label: 'Chúc may mắn 🍀', shortLabel: 'May mắn 🍀', subLabel: 'CHÚC BẠN', amount: 0, type: 'none' },
    { index: 3, label: '+1.000đ', shortLabel: '+1.000đ', subLabel: 'TIỀN MẶT', amount: 1000, type: 'cash' },
    { index: 4, label: '+3.000đ', shortLabel: '+3.000đ', subLabel: 'GIẢI LỚN', amount: 3000, type: 'cash' },
    { index: 5, label: 'Suýt trúng! 🎯', shortLabel: 'Suýt trúng 🎯', subLabel: 'CỐ LÊN NHÉ', amount: 0, type: 'none' },
    { index: 6, label: '+1.500đ', shortLabel: '+1.500đ', subLabel: 'TIỀN MẶT', amount: 1500, type: 'cash' },
    { index: 7, label: 'Thêm 1 Lượt 🔄', shortLabel: '+1 Lượt 🔄', subLabel: 'QUAY TIẾP', amount: 0, type: 'free_spin' }
  ];

  const wheelState = {
    slices: DEFAULT_WHEEL_SLICES,
    availableTickets: 0,
    adminBonusTickets: 0,
    earnedOrderTickets: 0,
    bonusFreeSpins: 0,
    usedTickets: 0,
    totalWonAmount: 0,
    isTestRestricted: false,
    userHistory: [],
    recentWinners: [],
    activeTab: 'winners',
    currentDeg: 0,
    isSpinning: false,
    isLoading: false,
    soundEnabled: localStorage.getItem('wheel_sound_enabled') !== '0',
    audioCtx: null,
    rafId: null
  };

  function getApiUrl() {
    if (typeof CONFIG !== 'undefined' && CONFIG && CONFIG.API_URL) {
      return CONFIG.API_URL;
    }
    return 'https://api.hoantienonline.io.vn';
  }

  function getCurrentUser() {
    if (typeof getLoggedUser === 'function') {
      return getLoggedUser();
    }
    try {
      const raw = localStorage.getItem('shoppesale_user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function getCurrentZaloId() {
    const lsId = localStorage.getItem('shoppesale_zalo_id');
    if (lsId) return String(lsId).trim();
    const user = getCurrentUser();
    return user && user.zaloId ? String(user.zaloId).trim() : '';
  }

  function formatVnd(n) {
    return `${new Intl.NumberFormat('vi-VN').format(Number(n) || 0)}đ`;
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDateTime(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return String(iso);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      return `${hh}:${mm} ${dd}-${mo}`;
    } catch (e) {
      return '';
    }
  }

  /* ---------- Web Audio Sound Engine ---------- */
  function ensureAudioCtx() {
    if (!wheelState.soundEnabled) return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!wheelState.audioCtx) {
      wheelState.audioCtx = new AudioCtx();
    }
    if (wheelState.audioCtx.state === 'suspended') {
      wheelState.audioCtx.resume().catch(() => {});
    }
    return wheelState.audioCtx;
  }

  function playTickSound() {
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(780, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.032);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.034);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.036);
    } catch (e) {}
  }

  function playWinFanfare(isJackpot) {
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    try {
      const notes = isJackpot ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [523.25, 659.25, 783.99, 1046.5];
      const base = ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const start = base + idx * 0.085;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.11, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.34);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.36);
      });
    } catch (e) {}
  }

  function playFreeSpinSound() {
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    try {
      const notes = [440, 587.33, 880];
      const base = ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const start = base + idx * 0.075;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.09, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.24);
      });
    } catch (e) {}
  }

  function playSoftMissSound() {
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    try {
      const base = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, base);
      osc.frequency.exponentialRampToValueAtTime(210, base + 0.22);
      gain.gain.setValueAtTime(0.06, base);
      gain.gain.exponentialRampToValueAtTime(0.001, base + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(base);
      osc.stop(base + 0.25);
    } catch (e) {}
  }

  /* ---------- 3D SVG Assets (Wheel, Pointer, Pedestal, Icons) ---------- */
  function buildPointerSvg() {
    return `
      <svg viewBox="0 0 64 74" aria-hidden="true">
        <defs>
          <linearGradient id="wp-gold-l" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fffbeb"/>
            <stop offset="50%" stop-color="#facc15"/>
            <stop offset="100%" stop-color="#b45309"/>
          </linearGradient>
          <linearGradient id="wp-gold-r" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fde047"/>
            <stop offset="55%" stop-color="#d97706"/>
            <stop offset="100%" stop-color="#78350f"/>
          </linearGradient>
          <radialGradient id="wp-ruby" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#fecaca"/>
            <stop offset="45%" stop-color="#ef4444"/>
            <stop offset="100%" stop-color="#7f1d1d"/>
          </radialGradient>
        </defs>
        <path d="M32 70 L10 22 C8 12 18 4 32 4 Z" fill="url(#wp-gold-l)" stroke="#78350f" stroke-width="1.5"/>
        <path d="M32 70 L54 22 C56 12 46 4 32 4 Z" fill="url(#wp-gold-r)" stroke="#78350f" stroke-width="1.5"/>
        <circle cx="32" cy="21" r="9.5" fill="url(#wp-ruby)" stroke="#fef08a" stroke-width="2.2"/>
        <circle cx="29" cy="18" r="2.6" fill="#ffffff" opacity="0.8"/>
      </svg>
    `;
  }

  function buildPedestalSvg() {
    return `
      <svg class="wheel-pedestal-svg" viewBox="0 0 320 96" aria-hidden="true">
        <defs>
          <linearGradient id="ped-neck" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#78350f"/>
            <stop offset="22%" stop-color="#f59e0b"/>
            <stop offset="44%" stop-color="#fef3c7"/>
            <stop offset="68%" stop-color="#d97706"/>
            <stop offset="100%" stop-color="#78350f"/>
          </linearGradient>
          <linearGradient id="ped-rim" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#92400e"/>
            <stop offset="30%" stop-color="#fde047"/>
            <stop offset="52%" stop-color="#fffbeb"/>
            <stop offset="78%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#78350f"/>
          </linearGradient>
          <radialGradient id="ped-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="rgba(120, 53, 15, 0.34)"/>
            <stop offset="70%" stop-color="rgba(120, 53, 15, 0.1)"/>
            <stop offset="100%" stop-color="rgba(120, 53, 15, 0)"/>
          </radialGradient>
        </defs>
        <ellipse cx="160" cy="84" rx="146" ry="11" fill="url(#ped-shadow)"/>
        <path d="M98 6 C100 38 78 52 50 64 L270 64 C242 52 220 38 222 6 Z" fill="url(#ped-neck)"/>
        <rect x="40" y="61" width="240" height="12" rx="6" fill="url(#ped-rim)" stroke="#92400e" stroke-width="1"/>
        <rect x="26" y="71" width="268" height="13" rx="6.5" fill="url(#ped-neck)" stroke="#78350f" stroke-width="1"/>
        <line x1="56" y1="64" x2="264" y2="64" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `;
  }

  function buildWheelSvg(slices) {
    const list = Array.isArray(slices) && slices.length === 8 ? slices : DEFAULT_WHEEL_SLICES;
    const cx = 250;
    const cy = 250;
    const radius = 244;
    const count = list.length;
    const stepDeg = 360 / count;

    function polarToCartesian(degFromTop, r) {
      const rad = ((degFromTop - 90) * Math.PI) / 180;
      return {
        x: (cx + r * Math.cos(rad)).toFixed(2),
        y: (cy + r * Math.sin(rad)).toFixed(2)
      };
    }

    const slicePalette = [
      { fill: 'url(#ws-gold)', text: '#7c2d12', sub: '#92400e', outline: 'rgba(255,255,255,0.55)' },
      { fill: 'url(#ws-red)', text: '#ffffff', sub: '#fef08a', outline: 'rgba(127,29,29,0.5)' },
      { fill: 'url(#ws-ivory)', text: '#b91c1c', sub: '#64748b', outline: 'rgba(255,255,255,0.8)' },
      { fill: 'url(#ws-red)', text: '#ffffff', sub: '#fef08a', outline: 'rgba(127,29,29,0.5)' },
      { fill: 'url(#ws-ivory-gold)', text: '#b91c1c', sub: '#b45309', outline: 'rgba(255,255,255,0.85)' },
      { fill: 'url(#ws-red)', text: '#ffffff', sub: '#fde68a', outline: 'rgba(127,29,29,0.5)' },
      { fill: 'url(#ws-ivory)', text: '#b91c1c', sub: '#64748b', outline: 'rgba(255,255,255,0.8)' },
      { fill: 'url(#ws-crimson-orange)', text: '#ffffff', sub: '#fef08a', outline: 'rgba(124,45,18,0.55)' }
    ];

    let pathsHtml = '';
    let dividersHtml = '';
    let labelsHtml = '';

    list.forEach((slice, idx) => {
      const merged = Object.assign({}, DEFAULT_WHEEL_SLICES[idx] || {}, slice || {});
      const startDeg = idx * stepDeg - stepDeg / 2;
      const endDeg = idx * stepDeg + stepDeg / 2;
      const p1 = polarToCartesian(startDeg, radius);
      const p2 = polarToCartesian(endDeg, radius);
      const pal = slicePalette[idx % slicePalette.length];

      pathsHtml += `<path d="M ${cx} ${cy} L ${p1.x} ${p1.y} A ${radius} ${radius} 0 0 1 ${p2.x} ${p2.y} Z" fill="${pal.fill}" />`;

      // 3D Gold Divider Line & Rim Stud
      const divOuter = polarToCartesian(startDeg, radius);
      const studPos = polarToCartesian(startDeg, radius - 14);
      dividersHtml += `
        <line x1="${cx}" y1="${cy}" x2="${divOuter.x}" y2="${divOuter.y}" stroke="#fef08a" stroke-width="2.5" opacity="0.92"/>
        <circle cx="${studPos.x}" cy="${studPos.y}" r="4.5" fill="url(#ws-stud)" stroke="#78350f" stroke-width="1"/>
      `;

      // Radial Spoke Label (flip left half idx=5,6,7 so every slice reads cleanly right-side up)
      const isLeftSide = idx >= 5;
      const midDeg = idx * stepDeg;
      const rotAngle = isLeftSide ? midDeg - 270 : midDeg - 90;
      const anchor = isLeftSide ? 'start' : 'end';
      const labelX = isLeftSide ? 42 : 458;

      const mainText = escapeHtml(merged.shortLabel || merged.label || '');
      const subText = escapeHtml(merged.subLabel || '');
      const mainSize = mainText.length >= 12 ? 17.5 : mainText.length >= 9 ? 19.5 : 22.5;

      labelsHtml += `
        <g transform="rotate(${rotAngle} ${cx} ${cy})">
          ${subText ? `<text x="${labelX}" y="236" text-anchor="${anchor}" fill="${pal.sub}" font-family="'Be Vietnam Pro', sans-serif" font-size="10.5" font-weight="800" letter-spacing="0.06em">${subText}</text>` : ''}
          <text x="${labelX}" y="${subText ? '260' : '256'}" text-anchor="${anchor}" fill="${pal.text}" stroke="${pal.outline}" stroke-width="2.2" paint-order="stroke" font-family="'Be Vietnam Pro', sans-serif" font-size="${mainSize}" font-weight="900">${mainText}</text>
        </g>
      `;
    });

    return `
      <svg viewBox="0 0 500 500" aria-label="Vòng quay may mắn 8 ô thưởng">
        <defs>
          <radialGradient id="ws-gold" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stop-color="#fffbeb"/>
            <stop offset="48%" stop-color="#fde047"/>
            <stop offset="100%" stop-color="#d97706"/>
          </radialGradient>
          <radialGradient id="ws-red" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stop-color="#f87171"/>
            <stop offset="45%" stop-color="#dc2626"/>
            <stop offset="100%" stop-color="#881337"/>
          </radialGradient>
          <radialGradient id="ws-ivory" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="65%" stop-color="#fffaf0"/>
            <stop offset="100%" stop-color="#fde68a"/>
          </radialGradient>
          <radialGradient id="ws-ivory-gold" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="62%" stop-color="#fef3c7"/>
            <stop offset="100%" stop-color="#fcd34d"/>
          </radialGradient>
          <radialGradient id="ws-crimson-orange" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stop-color="#fb923c"/>
            <stop offset="48%" stop-color="#ea580c"/>
            <stop offset="100%" stop-color="#9a3412"/>
          </radialGradient>
          <radialGradient id="ws-stud" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="55%" stop-color="#fde047"/>
            <stop offset="100%" stop-color="#b45309"/>
          </radialGradient>
        </defs>
        ${pathsHtml}
        ${dividersHtml}
        ${labelsHtml}
        <circle cx="${cx}" cy="${cy}" r="${radius - 1}" fill="none" stroke="rgba(120,53,15,0.35)" stroke-width="5"/>
      </svg>
    `;
  }

  function renderBulbsHtml() {
    let html = '';
    const total = 24;
    for (let i = 0; i < total; i++) {
      const deg = (i * 360) / total;
      const rad = ((deg - 90) * Math.PI) / 180;
      const pctX = 50 + 47.4 * Math.cos(rad);
      const pctY = 50 + 47.4 * Math.sin(rad);
      html += `<span class="wheel-bulb ${i % 2 ? 'is-alt' : ''}" style="left:${pctX.toFixed(2)}%;top:${pctY.toFixed(2)}%;"></span>`;
    }
    return html;
  }

  /* ---------- UI Page Template ---------- */
  function renderLuckyWheelPage() {
    const soundLabel = wheelState.soundEnabled ? 'Âm thanh: Bật' : 'Âm thanh: Tắt';
    const soundIcon = wheelState.soundEnabled
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;

    return `
      <div class="wheel-page-wrap" id="wheel-page-root">
        <header class="wheel-hero-head">
          <div class="wheel-hero-decor" aria-hidden="true">
            <svg class="wheel-hero-spark s1" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4Z"/></svg>
            <svg class="wheel-hero-spark s2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4Z"/></svg>
            <svg class="wheel-hero-spark s3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4Z"/></svg>
          </div>
          <div class="wheel-hero-copy">
            <div class="wheel-hero-badge">
              <span>🎡</span>
              <span>MINI GAME TRI ÂN THÀNH VIÊN</span>
            </div>
            <h1>Vòng Quay May Mắn</h1>
            <p>Mỗi đơn hàng hoàn thành mới tặng 1 vé quay — rinh thưởng tiền mặt cộng thẳng vào ví hoàn tiền!</p>
            <div class="wheel-hero-pills">
              <span class="wheel-hero-pill">🏆 Jackpot 5.000đ</span>
              <span class="wheel-hero-pill">⚡ Cộng thẳng vào ví</span>
              <span class="wheel-hero-pill">📢 Bot vinh danh nhóm Zalo</span>
            </div>
          </div>
          <div class="wheel-hero-actions">
            <button type="button" id="wheel-sound-toggle" class="wheel-sound-btn" aria-pressed="${wheelState.soundEnabled ? 'true' : 'false'}">
              ${soundIcon}
              <span>${soundLabel}</span>
            </button>
          </div>
        </header>

        <div class="wheel-layout-grid">
          <section class="wheel-stage-card" aria-label="Sân khấu vòng quay">
            <div class="wheel-sunburst" aria-hidden="true"></div>
            <div class="wheel-jackpot-banner">
              <span class="wheel-jackpot-dot" aria-hidden="true"></span>
              <span>👑 Giải đặc biệt: JACKPOT 5.000Đ</span>
            </div>

            <div class="wheel-frame">
              <div id="wheel-pointer" class="wheel-pointer">${buildPointerSvg()}</div>
              <div class="wheel-outer-rim">
                <div class="wheel-bulbs">${renderBulbsHtml()}</div>
                <div id="wheel-rotor" class="wheel-rotor">${buildWheelSvg(wheelState.slices)}</div>
                <div class="wheel-glass-sheen" aria-hidden="true"></div>
              </div>
              <button type="button" id="wheel-center-spin" class="wheel-center-cap" aria-label="Quay ngay">
                <span>QUAY</span>
                <span>NGAY</span>
              </button>
            </div>

            <div class="wheel-pedestal-wrap">${buildPedestalSvg()}</div>

            <div class="wheel-stage-footer">
              <button type="button" id="wheel-main-spin-btn" class="wheel-main-spin-btn">
                <span>🎡 Bấm Quay Ngay (${wheelState.availableTickets} vé)</span>
              </button>
              <div id="wheel-stage-note" class="wheel-stage-note"></div>
            </div>
          </section>

          <aside class="wheel-side-col">
            <div class="wheel-status-card">
              <div class="wheel-stat-grid">
                <div class="wheel-stat-box tickets">
                  <div class="wheel-stat-icon" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>
                  </div>
                  <div class="wheel-stat-meta">
                    <div class="wheel-stat-label">Vé quay hiện có</div>
                    <div id="wheel-ticket-count" class="wheel-stat-value">${wheelState.availableTickets} vé</div>
                  </div>
                </div>

                <div class="wheel-stat-box won">
                  <div class="wheel-stat-icon" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                  </div>
                  <div class="wheel-stat-meta">
                    <div class="wheel-stat-label">Tổng thưởng đã trúng</div>
                    <div id="wheel-won-total" class="wheel-stat-value">${formatVnd(wheelState.totalWonAmount)}</div>
                  </div>
                </div>
              </div>

              <div id="wheel-ticket-breakdown" class="wheel-breakdown-row"></div>

              <div class="wheel-prize-strip">
                <div class="wheel-prize-strip-title">🎁 Cơ cấu giải thưởng</div>
                <div class="wheel-prize-chips">
                  <span class="wheel-prize-chip is-jackpot">👑 5.000đ Jackpot</span>
                  <span class="wheel-prize-chip">💵 3.000đ</span>
                  <span class="wheel-prize-chip">💵 2.000đ</span>
                  <span class="wheel-prize-chip">💵 1.500đ</span>
                  <span class="wheel-prize-chip">💵 1.000đ</span>
                  <span class="wheel-prize-chip is-free">🔄 +1 Lượt</span>
                </div>
              </div>

              <div class="wheel-rule-box">
                <strong class="wheel-rule-heading">
                  <span>📋 Cách nhận vé quay &amp; Thể lệ</span>
                </strong>
                <ul class="wheel-rule-list">
                  <li class="wheel-rule-item">
                    <span class="wheel-rule-check" aria-hidden="true">✓</span>
                    <span>Mỗi đơn hàng hợp lệ mới (từ 18/11/2026) chuyển sang trạng thái <strong>Hoàn thành</strong> tự động cộng <strong>+1 vé quay</strong>.</span>
                  </li>
                  <li class="wheel-rule-item">
                    <span class="wheel-rule-check" aria-hidden="true">✓</span>
                    <span>Tiền thưởng trúng được cộng thẳng vào số dư ví.</span>
                  </li>
                  <li class="wheel-rule-item">
                    <span class="wheel-rule-check" aria-hidden="true">✓</span>
                    <span>Khi trúng thưởng sẽ được Bot tự động thông báo chúc mừng trong nhóm Zalo.</span>
                  </li>
                </ul>
              </div>

              <button type="button" class="wheel-earn-btn" data-go-convert="1">
                <span>⚡ Chuyển link mua sắm kiếm thêm vé →</span>
              </button>
            </div>

            <div class="wheel-feed-card">
              <div class="wheel-feed-tabs" role="tablist">
                <button type="button" class="wheel-feed-tab ${wheelState.activeTab === 'winners' ? 'active' : ''}" data-wheel-tab="winners" role="tab">
                  <span>🏆 Vừa trúng thưởng</span>
                </button>
                <button type="button" class="wheel-feed-tab ${wheelState.activeTab === 'history' ? 'active' : ''}" data-wheel-tab="history" role="tab">
                  <span>📜 Lịch sử của bạn</span>
                </button>
              </div>
              <div id="wheel-feed-container" class="wheel-feed-list"></div>
            </div>
          </aside>
        </div>
      </div>
    `;
  }

  /* ---------- UI Hydration & State Updates ---------- */
  function updateWheelUI() {
    const ticketEl = document.getElementById('wheel-ticket-count');
    const wonEl = document.getElementById('wheel-won-total');
    const breakdownEl = document.getElementById('wheel-ticket-breakdown');
    const mainBtn = document.getElementById('wheel-main-spin-btn');
    const centerBtn = document.getElementById('wheel-center-spin');
    const noteEl = document.getElementById('wheel-stage-note');
    const soundBtn = document.getElementById('wheel-sound-toggle');

    if (ticketEl) ticketEl.textContent = `${wheelState.availableTickets} vé`;
    if (wonEl) wonEl.textContent = formatVnd(wheelState.totalWonAmount);

    if (breakdownEl) {
      const chips = [];
      if (wheelState.adminBonusTickets > 0) {
        chips.push(`<span class="wheel-breakdown-chip is-admin">👑 Vé Test Admin: ${wheelState.adminBonusTickets} vé</span>`);
      }
      chips.push(`<span class="wheel-breakdown-chip">🛍️ Từ đơn mới: ${wheelState.earnedOrderTickets} vé</span>`);
      chips.push(`<span class="wheel-breakdown-chip">🔄 Quay thêm: ${wheelState.bonusFreeSpins} vé</span>`);
      breakdownEl.innerHTML = chips.join('');
    }

    if (soundBtn) {
      soundBtn.setAttribute('aria-pressed', wheelState.soundEnabled ? 'true' : 'false');
      soundBtn.innerHTML = wheelState.soundEnabled
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg><span>Âm thanh: Bật</span>`
        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg><span>Âm thanh: Tắt</span>`;
    }

    const user = getCurrentUser();
    const zaloId = getCurrentZaloId();

    if (mainBtn) {
      mainBtn.disabled = wheelState.isSpinning || wheelState.isLoading;
      if (wheelState.isSpinning) {
        mainBtn.innerHTML = '<span>⏳ Đang quay vòng may mắn...</span>';
      } else if (!user) {
        mainBtn.innerHTML = '<span>🔐 Đăng nhập để Quay Ngay</span>';
      } else if (!zaloId) {
        mainBtn.innerHTML = '<span>🔗 Liên kết Zalo để Quay Ngay</span>';
      } else if (wheelState.isTestRestricted) {
        mainBtn.innerHTML = '<span>🚧 Đang bảo trì / Admin thử nghiệm</span>';
      } else {
        mainBtn.innerHTML = `<span>🎡 Bấm Quay Ngay (${wheelState.availableTickets} vé)</span>`;
      }
    }

    if (centerBtn) {
      centerBtn.disabled = wheelState.isSpinning || wheelState.isLoading;
      centerBtn.innerHTML = wheelState.isSpinning ? '<span>ĐANG</span><span>QUAY</span>' : '<span>QUAY</span><span>NGAY</span>';
    }

    if (noteEl) {
      if (!user) {
        noteEl.textContent = 'Đăng nhập Google & liên kết ID Zalo để nhận và sử dụng vé quay.';
      } else if (!zaloId) {
        noteEl.textContent = 'Liên kết ID Zalo để hệ thống đồng bộ vé quay từ đơn hàng của bạn.';
      } else if (wheelState.isTestRestricted) {
        noteEl.textContent = '🚧 Khu vực Vòng Quay đang được Admin thử nghiệm nội bộ, sẽ mở cho mọi người sớm nhất!';
      } else if (wheelState.availableTickets <= 0) {
        noteEl.textContent = 'Bạn chưa có vé khả dụng — hãy chuyển link & hoàn thành đơn hàng mới để nhận vé!';
      } else {
        noteEl.textContent = '';
      }
    }

    renderFeed();
  }

  function renderFeed() {
    const container = document.getElementById('wheel-feed-container');
    if (!container) return;

    document.querySelectorAll('[data-wheel-tab]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.wheelTab === wheelState.activeTab);
    });

    const items = wheelState.activeTab === 'winners' ? wheelState.recentWinners : wheelState.userHistory;
    if (!Array.isArray(items) || items.length === 0) {
      container.innerHTML = wheelState.activeTab === 'winners'
        ? '<div class="wheel-feed-empty">Chưa có ai trúng thưởng gần đây — hãy là người mở hàng may mắn!</div>'
        : '<div class="wheel-feed-empty">Bạn chưa có lượt quay nào. Quay thử vận may ngay nhé!</div>';
      return;
    }

    container.innerHTML = items.map((item) => {
      const amt = Number(item.amount) || 0;
      const isJackpot = amt >= 5000;
      const isCash = amt > 0;
      const isFree = item.type === 'free_spin' || String(item.label || '').includes('Lượt');
      const cls = isJackpot ? 'is-jackpot' : isCash ? 'is-cash' : isFree ? 'is-free' : 'is-none';
      const icon = isJackpot ? '👑' : isCash ? '💵' : isFree ? '🔄' : '🍀';
      const title = wheelState.activeTab === 'winners'
        ? escapeHtml(item.name || 'Thành viên')
        : escapeHtml(item.label || (isCash ? `+${formatVnd(amt)}` : 'Lượt quay'));
      const time = escapeHtml(formatDateTime(item.createdAt));
      const prizeLabel = isCash
        ? `+${formatVnd(amt)}`
        : (isFree ? '+1 Lượt' : (wheelState.activeTab === 'winners' ? escapeHtml(item.label || '0đ') : '0đ'));

      return `
        <div class="wheel-feed-row">
          <div class="wheel-feed-left">
            <span class="wheel-feed-avatar ${cls}">${icon}</span>
            <div class="wheel-feed-meta">
              <span class="wheel-feed-user">${title}</span>
              <span class="wheel-feed-time">${time}</span>
            </div>
          </div>
          <span class="wheel-feed-prize ${cls}">${prizeLabel}</span>
        </div>
      `;
    }).join('');
  }

  /* ---------- API Communication ---------- */
  async function fetchWheelStatus() {
    wheelState.isLoading = true;
    try {
      const zaloId = getCurrentZaloId();
      const url = `${getApiUrl()}?action=getWheelStatus&zaloId=${encodeURIComponent(zaloId)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.success) {
        wheelState.availableTickets = Number(data.availableTickets) || 0;
        wheelState.adminBonusTickets = Number(data.adminBonusTickets) || 0;
        wheelState.earnedOrderTickets = Number(data.earnedOrderTickets) || 0;
        wheelState.bonusFreeSpins = Number(data.bonusFreeSpins) || 0;
        wheelState.usedTickets = Number(data.usedTickets) || 0;
        wheelState.totalWonAmount = Number(data.totalWonAmount) || 0;
        wheelState.isTestRestricted = Boolean(data.isTestRestricted);
        wheelState.userHistory = Array.isArray(data.userHistory) ? data.userHistory : [];
        wheelState.recentWinners = Array.isArray(data.recentWinners) ? data.recentWinners : [];
        if (Array.isArray(data.slices) && data.slices.length === 8) {
          wheelState.slices = data.slices;
        }
      }
    } catch (err) {
      console.error('[Wheel] fetchWheelStatus error:', err);
    } finally {
      wheelState.isLoading = false;
      updateWheelUI();
    }
  }

  function startPegTickTracker(durationMs) {
    if (wheelState.rafId) cancelAnimationFrame(wheelState.rafId);
    const rotor = document.getElementById('wheel-rotor');
    const pointer = document.getElementById('wheel-pointer');
    if (!rotor) return;

    let lastSector = -1;
    const startTime = performance.now();

    function tick(now) {
      if (now - startTime > durationMs + 150) {
        wheelState.rafId = null;
        return;
      }
      const style = window.getComputedStyle(rotor);
      const tf = style.transform || style.webkitTransform;
      if (tf && tf !== 'none') {
        const match = tf.match(/matrix\(([^)]+)\)/);
        if (match) {
          const vals = match[1].split(',').map(Number);
          const angle = Math.atan2(vals[1], vals[0]) * (180 / Math.PI);
          const norm = ((angle % 360) + 360) % 360;
          const sector = Math.floor(((norm + 22.5) % 360) / 45);
          if (sector !== lastSector) {
            if (lastSector !== -1) {
              playTickSound();
              if (pointer) {
                pointer.classList.remove('is-ticking');
                void pointer.offsetWidth;
                pointer.classList.add('is-ticking');
              }
            }
            lastSector = sector;
          }
        }
      }
      if (wheelState.isSpinning) {
        wheelState.rafId = requestAnimationFrame(tick);
      }
    }

    wheelState.rafId = requestAnimationFrame(tick);
  }

  function spawnWheelConfetti() {
    const colors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#ec4899', '#fde047'];
    for (let i = 0; i < 48; i++) {
      const el = document.createElement('span');
      el.className = 'wheel-confetti-piece';
      el.style.left = `${Math.random() * 100}vw`;
      el.style.background = colors[i % colors.length];
      el.style.animationDelay = `${Math.random() * 0.45}s`;
      el.style.animationDuration = `${1.8 + Math.random() * 1.1}s`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3400);
    }
  }

  function ensureResultModal() {
    let overlay = document.getElementById('wheel-result-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'wheel-result-modal';
      overlay.className = 'wheel-modal-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.innerHTML = `
        <div class="wheel-modal-card" role="dialog" aria-modal="true" aria-labelledby="wheel-modal-title">
          <div id="wheel-modal-icon" class="wheel-modal-icon is-win">🎉</div>
          <h2 id="wheel-modal-title" class="wheel-modal-title">Chúc mừng bạn!</h2>
          <div id="wheel-modal-amount" class="wheel-modal-amount"></div>
          <p id="wheel-modal-desc" class="wheel-modal-desc"></p>
          <button type="button" id="wheel-modal-close" class="wheel-modal-btn">Tuyệt vời!</button>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay || e.target.closest('#wheel-modal-close')) {
          overlay.classList.remove('open');
          overlay.setAttribute('aria-hidden', 'true');
        }
      });
    }
    return overlay;
  }

  function openWheelResultModal(slice, errorMsg) {
    const overlay = ensureResultModal();
    const iconEl = document.getElementById('wheel-modal-icon');
    const titleEl = document.getElementById('wheel-modal-title');
    const amountEl = document.getElementById('wheel-modal-amount');
    const descEl = document.getElementById('wheel-modal-desc');

    if (errorMsg) {
      iconEl.className = 'wheel-modal-icon is-miss';
      iconEl.textContent = '⚠️';
      titleEl.textContent = 'Thông báo';
      amountEl.textContent = '';
      descEl.textContent = errorMsg;
    } else if (slice && slice.type === 'cash' && Number(slice.amount) > 0) {
      const isJackpot = Number(slice.amount) >= 5000;
      iconEl.className = 'wheel-modal-icon is-win';
      iconEl.textContent = isJackpot ? '👑' : '🎉';
      titleEl.textContent = isJackpot ? 'NỔ HŨ JACKPOT!' : 'Chúc mừng bạn trúng thưởng!';
      amountEl.textContent = `+${formatVnd(slice.amount)}`;
      descEl.textContent = 'Tiền thưởng trúng được cộng thẳng vào số dư ví của bạn!';
    } else if (slice && slice.type === 'free_spin') {
      iconEl.className = 'wheel-modal-icon is-free';
      iconEl.textContent = '🔄';
      titleEl.textContent = 'Tặng thêm 1 lượt quay!';
      amountEl.textContent = '+1 Vé Quay';
      descEl.textContent = 'Bạn nhận được 1 lượt quay miễn phí — bấm quay tiếp để săn Jackpot 5.000đ nhé!';
    } else {
      iconEl.className = 'wheel-modal-icon is-miss';
      iconEl.textContent = '🍀';
      titleEl.textContent = escapeHtml((slice && slice.label) || 'Chúc bạn may mắn lần sau!');
      amountEl.textContent = '';
      descEl.textContent = 'Rất tiếc lần này chưa trúng tiền thưởng. Mua sắm thêm để nhận vé quay mới nhé!';
    }

    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
  }

  async function handleSpinClick() {
    if (wheelState.isSpinning || wheelState.isLoading) return;

    const user = getCurrentUser();
    if (!user) {
      if (typeof showLoginModal === 'function') showLoginModal();
      return;
    }

    const zaloId = getCurrentZaloId();
    if (!zaloId) {
      if (typeof showZaloLinkModal === 'function') {
        showZaloLinkModal(user, 'Vui lòng liên kết ID Zalo để tham gia Vòng Quay May Mắn!');
      } else {
        openWheelResultModal(null, 'Vui lòng liên kết ID Zalo trước khi quay thưởng.');
      }
      return;
    }

    if (wheelState.isTestRestricted) {
      openWheelResultModal(null, '🚧 Vòng Quay May Mắn hiện đang trong giai đoạn Admin thử nghiệm nội bộ, sẽ sớm mở cho toàn bộ thành viên nhé!');
      return;
    }

    if (wheelState.availableTickets <= 0) {
      openWheelResultModal(null, 'Bạn đã hết vé quay! Hãy chuyển link & hoàn thành thêm đơn hàng mới để nhận vé nhé.');
      return;
    }

    ensureAudioCtx();
    wheelState.isSpinning = true;
    const frameEl = document.querySelector('.wheel-frame');
    if (frameEl) frameEl.classList.add('is-spinning');
    updateWheelUI();

    try {
      const res = await fetch(`${getApiUrl()}?action=spinWheel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zaloId,
          userName: user.name || ''
        })
      });
      const data = await res.json();

      if (!data || !data.success) {
        wheelState.isSpinning = false;
        if (frameEl) frameEl.classList.remove('is-spinning');
        updateWheelUI();
        openWheelResultModal(null, (data && data.error) || 'Không thể quay lúc này, vui lòng thử lại!');
        return;
      }

      const sliceIndex = Number(data.sliceIndex) || 0;
      const slice = data.slice || wheelState.slices[sliceIndex] || DEFAULT_WHEEL_SLICES[sliceIndex];
      const rotor = document.getElementById('wheel-rotor');

      // Land safely inside the chosen 45° wedge (±8° natural variance)
      const jitter = (Math.random() - 0.5) * 16;
      const targetMod = ((360 - (sliceIndex * 45 + jitter)) % 360 + 360) % 360;
      const curMod = ((wheelState.currentDeg % 360) + 360) % 360;
      const delta = (targetMod - curMod + 360) % 360;
      const nextDeg = wheelState.currentDeg + 360 * 6 + delta;
      wheelState.currentDeg = nextDeg;

      const spinDuration = 4800;
      if (rotor) {
        rotor.style.transition = `transform ${spinDuration}ms cubic-bezier(0.12, 0.85, 0.14, 1)`;
        void rotor.offsetWidth;
        rotor.style.transform = `rotate(${nextDeg}deg)`;
        startPegTickTracker(spinDuration);
      }

      setTimeout(() => {
        wheelState.isSpinning = false;
        if (frameEl) frameEl.classList.remove('is-spinning');

        wheelState.availableTickets = Number(data.availableTickets) || 0;
        if (data.adminBonusTickets !== undefined) {
          wheelState.adminBonusTickets = Number(data.adminBonusTickets) || 0;
        }
        if (data.earnedOrderTickets !== undefined) {
          wheelState.earnedOrderTickets = Number(data.earnedOrderTickets) || 0;
        }
        if (data.bonusFreeSpins !== undefined) {
          wheelState.bonusFreeSpins = Number(data.bonusFreeSpins) || 0;
        } else if (slice && slice.type === 'free_spin') {
          wheelState.bonusFreeSpins += 1;
        }
        wheelState.totalWonAmount = Number(data.totalWonAmount) || wheelState.totalWonAmount;
        if (Array.isArray(data.userHistory)) wheelState.userHistory = data.userHistory;
        if (Array.isArray(data.recentWinners)) wheelState.recentWinners = data.recentWinners;

        updateWheelUI();

        if (slice && slice.type === 'cash' && Number(slice.amount) > 0) {
          playWinFanfare(Number(slice.amount) >= 5000);
          spawnWheelConfetti();
          if (typeof window.fetchOrdersInBackground === 'function') {
            window.fetchOrdersInBackground(zaloId);
          }
        } else if (slice && slice.type === 'free_spin') {
          playFreeSpinSound();
          spawnWheelConfetti();
        } else {
          playSoftMissSound();
        }

        openWheelResultModal(slice, null);
      }, spinDuration + 120);
    } catch (err) {
      console.error('[Wheel] spinWheel error:', err);
      wheelState.isSpinning = false;
      if (frameEl) frameEl.classList.remove('is-spinning');
      updateWheelUI();
      openWheelResultModal(null, 'Lỗi kết nối máy chủ vòng quay. Vui lòng thử lại!');
    }
  }

  /* ---------- Event Binding & Lifecycle ---------- */
  function bindWheelPageEvents(root) {
    if (!root || root.dataset.ready === '1') return;
    root.dataset.ready = '1';

    const rotor = document.getElementById('wheel-rotor');
    if (rotor && wheelState.currentDeg) {
      rotor.style.transition = 'none';
      rotor.style.transform = `rotate(${wheelState.currentDeg}deg)`;
    }

    document.getElementById('wheel-center-spin')?.addEventListener('click', handleSpinClick);
    document.getElementById('wheel-main-spin-btn')?.addEventListener('click', handleSpinClick);

    document.getElementById('wheel-sound-toggle')?.addEventListener('click', () => {
      wheelState.soundEnabled = !wheelState.soundEnabled;
      localStorage.setItem('wheel_sound_enabled', wheelState.soundEnabled ? '1' : '0');
      updateWheelUI();
    });

    root.querySelectorAll('[data-wheel-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        wheelState.activeTab = btn.dataset.wheelTab === 'history' ? 'history' : 'winners';
        renderFeed();
      });
    });

    root.querySelector('[data-go-convert="1"]')?.addEventListener('click', () => {
      const convertLink = document.querySelector('.topbar .nav a[data-page="convert"]');
      if (convertLink) {
        convertLink.click();
      } else {
        history.pushState(null, '', '/convert');
        if (typeof render === 'function') render();
      }
    });

    updateWheelUI();
    fetchWheelStatus();
  }

  function mountWheelRuntimeIfPresent() {
    const root = document.querySelector('.wheel-page-wrap');
    if (root) {
      bindWheelPageEvents(root);
    }
  }

  // Export globally for app.js router
  window.renderLuckyWheelPage = renderLuckyWheelPage;
  try {
    if (typeof pages !== 'undefined' && pages) {
      pages.wheel = renderLuckyWheelPage;
    }
  } catch (e) {}

  // Hook into app.js render cycle via window.syncRealDataToUI
  const prevSyncRealDataToUI = window.syncRealDataToUI;
  window.syncRealDataToUI = function () {
    let res;
    if (typeof prevSyncRealDataToUI === 'function') {
      res = prevSyncRealDataToUI.apply(this, arguments);
    }
    mountWheelRuntimeIfPresent();
    return res;
  };

  window.addEventListener('zalo_id_synced', () => {
    if (document.querySelector('.wheel-page-wrap')) {
      fetchWheelStatus();
    }
  });

  // If page loaded directly on /wheel before script finished loading
  if (document.querySelector('.wheel-page-wrap')) {
    mountWheelRuntimeIfPresent();
  } else if (window.location.pathname.replace(/^\/+|\/+$/g, '') === 'wheel' && typeof render === 'function') {
    render();
  }
})();
