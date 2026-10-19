function referrals() {
  return referralProgram();
}

function referralProgram() {
  const referralLink = 'https://zalo.me/g/b8lixpggmg0kmacdeeii';
  const tiers = [
    ['Mỗi bạn', 'Có đơn đầu tiên hợp lệ', '10.000đ', 'mint', 'Cộng ngay ví cả 2 bạn'],
    ['Mốc 3', 'Từ 4 bạn có đơn trong tháng', '100.000đ', 'amber', 'Thưởng nóng thêm cuối tháng'],
    ['Mốc 2', 'Từ 6 bạn có đơn trong tháng', '200.000đ', 'coral', 'Thưởng nóng thêm cuối tháng'],
    ['Mốc 1', 'Từ 10 bạn có đơn trong tháng', '300.000đ', 'violet', 'Thưởng nóng thêm cuối tháng']
  ];

  return `
    <div class="referral-program">
      <section class="ref-program-hero">
        <div class="ref-program-copy">
          <span class="ref-program-kicker">CHƯƠNG TRÌNH THÀNH VIÊN</span>
          <h1>Giới thiệu bạn mới,<br><em>nhận thưởng song hành</em></h1>
          <p>Chia sẻ Hoàn Tiền Mua Sắm với bạn bè. Khi bạn bè mua sắm hợp lệ, cả hai cùng nhận ngay 10.000đ + thưởng mốc tháng lên đến 300.000đ!</p>
          <span class="ref-program-date">Hiệu lực từ 19/10/2026 · Chốt mốc thưởng hằng tháng</span>
        </div>
        <div class="ref-program-art" aria-hidden="true">
          <span class="ref-program-orbit orbit-one"></span><span class="ref-program-orbit orbit-two"></span>
          <img src="assets/tuyen_ban_san_sale.jpg" alt="Tuyển bạn săn sale" style="width: 175px; height: auto; border-radius: 14px; box-shadow: 0 10px 22px rgba(0,0,0,0.18); border: 2px solid #fff; right: 35px; bottom: 8px; transform: rotate(-2deg); object-fit: cover;">
          <span class="ref-coin ref-coin-one">₫</span><span class="ref-coin ref-coin-two">₫</span>
        </div>
      </section>

      <section class="ref-rewards-panel"><span class="ref-reward-trace" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        <div class="ref-section-heading"><span>01</span><div><h2>Cơ chế giải thưởng song hành</h2><p>Thưởng nóng cho mỗi lượt giới thiệu hợp lệ và thưởng thêm nóng theo mốc tuyển bạn trong tháng.</p></div></div>
        <div class="ref-rewards-grid">
          <article class="ref-hot-reward">
            <span class="ref-card-icon">✦</span>
            <small>THƯỞNG SONG HÀNH</small>
            <h3>10.000đ <em>/ mỗi bạn có đơn đầu</em></h3>
            <p>Nhận ngay khi thành viên mới hoàn thành đơn mua đầu tiên trong vòng 14 ngày, không bị hủy hoặc hoàn hàng.</p>
            <div><b>✓</b> Bạn nhận 10.000đ & bạn mới nhận 10.000đ</div>
            <div><b>✓</b> Thưởng trực tiếp vào số dư ví của cả hai</div>
          </article>
          <article class="ref-tier-reward">
            <div class="ref-tier-title"><span>★</span><div><small>THƯỞNG MỐC THÁNG</small><h3>Giới thiệu càng nhiều, thưởng càng khủng</h3></div></div>
            <p class="ref-tier-condition"><span>✓</span>Vẫn nhận đủ <b>10.000đ/bạn</b> + cộng thưởng thêm <b>mốc cao nhất</b> đạt được cuối tháng (trao thưởng ngày 5 đầu tháng sau).</p>
            <div class="ref-tier-grid">${tiers.map(t => `<div class="ref-tier ${t[3]}"><b>${t[0]}</b><span>${t[1]}</span><strong>${t[2]}</strong><small>${t[4]}</small></div>`).join('')}</div>
          </article>
        </div>
      </section>

      <section class="ref-link-card">
        <div class="ref-link-icon">↗</div>
        <div class="ref-link-copy"><small>LINK NHÓM HOÀN TIỀN</small><h2>Mời bạn bè cùng mua sắm hoàn tiền</h2><p>Gửi link nhóm cho bạn bè kèm theo Mã Giới Thiệu riêng của bạn.</p></div>
        <div class="ref-link-control"><input id="referral-link" value="${referralLink}" readonly aria-label="Link giới thiệu"><button class="referral-copy" type="button">Sao chép link</button></div>
      </section>

      <section class="ref-zalo-card">
        <div class="ref-zalo-copy"><span class="ref-zalo-icon">⌁</span><div><small>THAM GIA QUA BOT ZALO</small><h2>Bot tự ghi nhận lượt giới thiệu</h2><p>Quy trình tham gia nhận thưởng siêu đơn giản cùng Bot Zalo:</p>
          <div style="margin: 12px 0; font-size: 13px; line-height: 1.6; color: #475569;">
            <div style="margin-bottom: 6px;">1️⃣ <b>Lấy mã giới thiệu:</b> Gõ <code style="background:#fee2e2; color:#dc2626; padding:2px 6px; border-radius:4px; font-weight:700;">/magt</code> trong nhóm để nhận Mã Giới Thiệu riêng (VD: GT123456).</div>
            <div style="margin-bottom: 6px;">2️⃣ <b>Bạn bè nhập mã:</b> Bạn bè vào nhóm gửi cú pháp <code style="background:#fef3c7; color:#d97706; padding:2px 6px; border-radius:4px; font-weight:700;">/gt [Mã_của_bạn]</code> (hoặc /gt @Tên_Zalo).</div>
            <div>3️⃣ <b>Kiểm tra BXH & Mốc:</b> Gõ <code style="background:#dcfce7; color:#15803d; padding:2px 6px; border-radius:4px; font-weight:700;">/topgt</code> bất kỳ lúc nào để xem tiến độ mốc và thứ hạng!</div>
          </div>
          <span class="ref-zalo-note">Ví dụ cú pháp bạn bè gõ: <b>/gt GT123456</b></span>
        </div></div>
        <div class="ref-zalo-phone" aria-hidden="true"><div class="ref-zalo-phone-head"><span class="ref-zalo-group-mark">₫</span><div><b><i></i>Hoàn Tiền Shopee - Lazada - TikTok</b><small>Cộng đồng <em></em> 1000+ thành viên</small></div></div><div class="ref-zalo-chat"><p>/gt GT123456</p><span>✓ Đã liên kết người giới thiệu! Nhận ngay 10.000đ khi có đơn đầu tiên trong 14 ngày.</span></div></div>
      </section>

      <section class="ref-steps">
        <div class="ref-section-heading"><span>02</span><div><h2>Ba bước để nhận thưởng</h2><p>Làm đúng quy trình để đơn hàng được ghi nhận nhanh và chính xác.</p></div></div>
        <div class="ref-steps-grid">
          <article><b>1</b><h3>Lấy mã & Mời bạn</h3><p>Gõ /magt trong nhóm Zalo để lấy mã riêng, gửi link nhóm và mã cho bạn bè.</p></article>
          <article><b>2</b><h3>Bạn bè nhập mã & Mua sắm</h3><p>Bạn bè gõ /gt [Mã] và mua đơn đầu tiên thành công trong vòng 14 ngày.</p></article>
          <article><b>3</b><h3>Nhận thưởng song hành</h3><p>Cả 2 nhận ngay 10.000đ vào ví + cộng thêm thưởng nóng mốc tháng lên tới 300.000đ!</p></article>
        </div>
      </section>

      <section class="ref-terms">
        <div class="ref-section-heading"><span>03</span><div><h2>Điều kiện áp dụng</h2><p>Minh bạch và dễ theo dõi trong suốt chương trình.</p></div></div>
        <div class="ref-terms-grid">
          <p><b>01</b>Lượt giới thiệu hợp lệ khi bạn mới có đơn mua đầu tiên hoàn tất trong vòng 14 ngày kể từ khi nhập mã (không hủy/hoàn hàng).</p>
          <p><b>02</b>Cả người giới thiệu và bạn mới đều được cộng ngay 10.000đ vào ví tích lũy khi có đơn đầu.</p>
          <p><b>03</b>Thưởng mốc tháng (Mốc 1: 300k, Mốc 2: 200k, Mốc 3: 100k) chốt vào cuối tháng và chi trả trực tiếp vào ngày 5 đầu tháng sau.</p>
        </div>
      </section>
    </div>
  `;
}

pages.referrals = referralProgram;

function enhanceReferrals() {
  const view = document.querySelector('.referral-program, .referrals-view');
  if (!view || view.dataset.ready) return;
  view.dataset.ready = 'true';

  const copyLink = async button => {
    const input = view.querySelector('#referral-link');
    try {
      await navigator.clipboard.writeText(input.value);
    } catch {
      input.select();
      document.execCommand('copy');
    }
    const label = button.querySelector('span');
    if (label) label.textContent = 'Đã chép';
    else button.textContent = 'Đã sao chép';
    setTimeout(() => {
      if (label) label.textContent = 'Chép link';
      else button.textContent = 'Sao chép link';
    }, 1800);
  };

  view.querySelector('.referral-copy')?.addEventListener('click', event => copyLink(event.currentTarget));
  view.querySelector('.referral-copy')?.addEventListener('click', event => {
    const button = event.currentTarget;
    button.classList.remove('copy-pop');
    requestAnimationFrame(() => button.classList.add('copy-pop'));
    setTimeout(() => button.classList.remove('copy-pop'), 700);
  });
  view.querySelector('.share-copy')?.addEventListener('click', event => copyLink(event.currentTarget));
  view.querySelectorAll('.referral-accordion-head').forEach(button => {
    button.addEventListener('click', () => button.closest('.referral-accordion').classList.toggle('open'));
  });
  view.querySelectorAll('.referral-activity-tabs button').forEach(button => {
    button.addEventListener('click', () => {
      view.querySelectorAll('.referral-activity-tabs button').forEach(item => item.classList.toggle('active', item === button));
    });
  });
}

if ((location.hash.slice(1) || location.pathname.slice(1) || 'dashboard') === 'referrals') render();
requestAnimationFrame(enhanceReferrals);
window.addEventListener('hashchange', () => requestAnimationFrame(enhanceReferrals));
window.addEventListener('popstate', () => requestAnimationFrame(enhanceReferrals));
setInterval(enhanceReferrals, 100);
