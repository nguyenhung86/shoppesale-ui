(() => {
  function updateCommissionRange() {
    if ((location.hash.slice(1) || location.pathname.slice(1) || 'dashboard') && (location.hash.slice(1) || location.pathname.slice(1) || 'dashboard') !== 'dashboard') return;

    const card = document.querySelector('.commission-chart-card');
    const monthsEl = card?.querySelector('.commission-chart-months');
    const svg = card?.querySelector('.commission-chart-canvas svg');
    if (!card || !monthsEl || !svg) return;

    const now = new Date();
    const currentMonthIndex = now.getFullYear() * 12 + now.getMonth();
    const endOfYearMonthIndex = now.getFullYear() * 12 + 11;
    const totalsByMonth = new Map();
    let earliestMonthIndex = null;

    const parseOrderMonthIndex = value => {
      const text = String(value || '').trim();
      let match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (match) {
        const month = Number(match[2]);
        const year = Number(match[3]);
        return month >= 1 && month <= 12 ? year * 12 + month - 1 : null;
      }

      match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (match) {
        const month = Number(match[2]);
        const year = Number(match[1]);
        return month >= 1 && month <= 12 ? year * 12 + month - 1 : null;
      }

      return null;
    };

    if (window.cachedOrders && window.cachedOrders.success && window.cachedOrders.data) {
      const orders = window.cachedOrders.data;
      orders.forEach(o => {
        const commission = Number(o.commission) || 0;
        const status = o.orderStatus ? o.orderStatus.toLowerCase() : "";
        if (status.includes("hủy") || status.includes("invalid") || status.includes("đơn hủy")) {
          return; // Bỏ qua đơn hủy
        }
        
        const monthIndex = parseOrderMonthIndex(o.orderDate);
        if (monthIndex === null || monthIndex > currentMonthIndex) return;

        totalsByMonth.set(monthIndex, (totalsByMonth.get(monthIndex) || 0) + commission);
        if (earliestMonthIndex === null || monthIndex < earliestMonthIndex) {
          earliestMonthIndex = monthIndex;
        }
      });
    }

    // Bắt đầu đúng từ tháng đầu tiên khách có dữ liệu; nếu chưa có dữ liệu chỉ hiện tháng hiện tại.
    const startMonthIndex = earliestMonthIndex === null ? currentMonthIndex : earliestMonthIndex;
    const months = [];
    for (let monthIndex = startMonthIndex; monthIndex <= endOfYearMonthIndex; monthIndex += 1) {
      const year = Math.floor(monthIndex / 12);
      const month = monthIndex % 12 + 1;
      months.push({
        monthIndex,
        label: `T${month}/${String(year).slice(-2)}`,
        hasData: totalsByMonth.has(monthIndex),
        value: totalsByMonth.get(monthIndex) || 0
      });
    }
    const values = months.map(month => month.value);
    const count = months.length;
    const isMobileViewport = typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 700px)').matches;

    // Tính toán tỷ lệ trục Y động
    const maxValue = Math.max(...values, 100000); // Tối thiểu 100k
    const yScale = maxValue * 1.15; // Thêm 15% khoảng trống phía trên cột cao nhất

    const y = value => Math.max(18, 214 - (value / yScale) * 196);
    const format = value => `${new Intl.NumberFormat('vi-VN').format(Math.round(value))}đ`;
    const formatCompact = val => val >= 1000 ? Math.round(val / 1000) + 'k' : Math.round(val);

    // Cập nhật nhãn trục Y trên biểu đồ
    const yLabels = card.querySelectorAll('.commission-chart-y i');
    if (yLabels.length === 5) {
      yLabels[0].textContent = formatCompact(yScale * 0.9);
      yLabels[1].textContent = formatCompact(yScale * 0.675);
      yLabels[2].textContent = formatCompact(yScale * 0.45);
      yLabels[3].textContent = formatCompact(yScale * 0.225);
      yLabels[4].textContent = '0';
    }

    const slot = 1000 / count;
    const barWidth = Math.min(84, slot * .58);
    const valueFontSize = isMobileViewport ? 14 : (count > 10 ? 13 : 14);
    const bars = months.map((month, index) => {
      if (!month.hasData) return '';
      const value = month.value;
      const x = index * slot + (slot - barWidth) / 2;
      const top = y(value);
      const label = format(value);
      const labelX = x + barWidth / 2;
      const labelY = Math.max(valueFontSize + 5, top - 9);
      const labelWidth = Math.min(slot * .92, Math.max(68, label.length * valueFontSize * .56));
      const labelHeight = valueFontSize + 8;
      return `<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${(214 - top).toFixed(1)}" rx="9" fill="url(#commissionBars)" filter="url(#commissionBarShadow)"/><rect x="${(labelX - labelWidth / 2).toFixed(1)}" y="${(labelY - valueFontSize - 4).toFixed(1)}" width="${labelWidth.toFixed(1)}" height="${labelHeight.toFixed(1)}" rx="5" fill="#fffaf7" fill-opacity=".94"/><text x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" fill="#c0562a" font-size="${valueFontSize}" font-weight="700">${label}</text>`;
    }).join('');
    const grids = [18, 67, 116, 165, 214].map(value => `<path d="M0 ${value}H1000"/>`).join('');
    svg.innerHTML = `<defs><linearGradient id="commissionBars" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#ffab70"/><stop offset="48%" stop-color="#ff8747"/><stop offset="100%" stop-color="#f26932"/></linearGradient><filter id="commissionBarShadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#d86432" flood-opacity=".16"/></filter></defs><g stroke="#eee8e2" stroke-width="1">${grids}</g>${bars}`;
    
    // Cập nhật nhãn Tổng hoa hồng góc phải của biểu đồ
    const chartHeaderTotal = card.querySelector('.commission-chart-head > b');
    if (chartHeaderTotal) {
      const totalSum = values.reduce((a, b) => a + b, 0);
      chartHeaderTotal.textContent = format(totalSum);
    }

    const overlayLabel = card.querySelector('.commission-chart-label');
    const overlayDot = card.querySelector('.commission-chart-dot');
    if (overlayLabel) overlayLabel.hidden = true;
    if (overlayDot) overlayDot.hidden = true;

    monthsEl.innerHTML = months.map(month => `<span>${month.label}</span>`).join('');
    monthsEl.style.gridTemplateColumns = `repeat(${count}, minmax(45px, 1fr))`;
    const chartCanvas = card.querySelector('.commission-chart-canvas');
    const minimumChartWidth = isMobileViewport
      ? `${Math.max(620, count * 92)}px`
      : (count > 10 ? `${count * 90}px` : '0px');
    if (chartCanvas) chartCanvas.style.minWidth = minimumChartWidth;
    monthsEl.style.minWidth = minimumChartWidth;
    if (!card.dataset.chartPan) {
      card.dataset.chartPan = 'true';
      const scroller = card.querySelector('.commission-chart-visual');
      let startX = 0;
      let startScroll = 0;
      let dragging = false;
      scroller.addEventListener('pointerdown', event => {
        if (scroller.scrollWidth <= scroller.clientWidth) return;
        dragging = true;
        startX = event.clientX;
        startScroll = scroller.scrollLeft;
        scroller.setPointerCapture?.(event.pointerId);
      });
      scroller.addEventListener('pointermove', event => {
        if (!dragging) return;
        scroller.scrollLeft = startScroll - (event.clientX - startX);
      });
      const stop = () => { dragging = false; };
      scroller.addEventListener('pointerup', stop);
      scroller.addEventListener('pointercancel', stop);
      scroller.addEventListener('pointerleave', stop);
    }
  }

  window.updateCommissionRange = updateCommissionRange;
  updateCommissionRange();
  window.addEventListener('hashchange', () => requestAnimationFrame(updateCommissionRange));
})();
