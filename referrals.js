function referrals() {
  const referralLink = 'https://zalo.me/g/0u5xwlj4npkvl4bomy1o';

  return `
    <div class="referrals-view">
      <section class="referral-hero">
        <div class="referral-reward">
          <span class="reward-gift" aria-hidden="true">🎁</span>
          <small>TỔNG THƯỞNG</small>
          <strong>0<em>đ</em></strong>
          <p>Nhận <b>5% hoa hồng</b> từ đơn hợp lệ của bạn bè trong 365 ngày.</p>
          <div class="reward-stats">
            <span>Hoa hồng<b>5%</b></span>
            <span>Hiệu lực<b>365 ngày</b></span>
            <span>Đã mời<b>0</b></span>
          </div>
        </div>

        <div class="referral-link-panel">
          <header><span class="referral-icon">↗</span><div><h1>Link giới thiệu</h1><p>Chia sẻ để nhận thưởng từ đơn hợp lệ.</p></div><i>i</i></header>
          <div class="referral-link-row">
            <input id="referral-link" value="${referralLink}" readonly aria-label="Link giới thiệu">
            <button class="referral-copy" type="button">▣ <span>Chép link</span></button>
          </div>
          <div class="referral-qr-box">
            <svg class="referral-qr" viewBox="0 0 84 84" aria-label="QR giới thiệu" role="img">
              <rect width="84" height="84" rx="7" fill="#fff"/>
              <path d="M7 7h24v24H7zm5 5v14h14V12zm41-5h24v24H53zm5 5v14h14V12zM7 53h24v24H7zm5 5v14h14V58z" fill="#101216"/>
              <path d="M17 17h4v4h-4zM63 17h4v4h-4zM17 63h4v4h-4zM37 8h6v6h-6zm8 0h5v12h-5zm-8 10h7v5h-7zm0 8h5v10h-5zm8-2h6v6h-6zm-9 15h7v7h-7zm10-6h6v12h-6zm8 3h5v7h-5zm8-2h6v12h-6zm9 0h6v7h-6zM34 51h8v5h-8zm11-3h6v11h-6zm9 1h7v7h-7zm10 0h12v5H64zm-30 11h5v8h-5zm8 2h8v6h-8zm11-3h6v13h-6zm9 0h5v6h-5zm8-2h7v8h-7zM35 72h12v5H35zm20 3h8v4h-8zm12-7h9v9h-9z" fill="#101216"/>
            </svg>
            <div><b>QR giới thiệu</b><button type="button">⌗ Tải QR</button></div>
          </div>
        </div>
      </section>

      <section class="referral-accordion open">
        <button class="referral-accordion-head" type="button"><span>⌯</span><b>Chia sẻ lời mời</b><i>⌄</i></button>
        <div class="referral-accordion-body">
          <p>Gửi link cho bạn bè qua kênh bạn thường dùng.</p>
          <div class="referral-share-actions"><button type="button">Zalo</button><button type="button">Facebook</button><button class="share-copy" type="button">Sao chép link</button></div>
        </div>
      </section>

      <section class="referral-accordion">
        <button class="referral-accordion-head" type="button"><span>♢</span><b>Điều kiện nhận thưởng</b><i>⌄</i></button>
        <div class="referral-accordion-body referral-rules">
          <span><b>1</b>Bạn bè đăng ký bằng link giới thiệu.</span>
          <span><b>2</b>Đơn hàng được ghi nhận và xác nhận hợp lệ.</span>
          <span><b>3</b>Bạn nhận 5% hoa hồng trong 365 ngày.</span>
        </div>
      </section>

      <section class="referral-campaign">
        <header><div><small>⚑ &nbsp; THƯỞNG CHƯƠNG TRÌNH</small><h2>Thêm bạn thêm vui T7</h2><span>Đang chạy</span></div><i>⌄</i></header>
        <div class="campaign-time"><span>▦ &nbsp; Thời gian diễn ra</span><div><b>14/7/2026</b><b>31/7/2026</b></div><progress value="5" max="100"></progress></div>
        <div class="campaign-stats">
          <span>♙ <small>Đã mời<b>0</b></small></span>
          <span>✓ <small>Hợp lệ<b>0</b></small></span>
          <span>⌘ <small>Dự kiến<b>0đ</b></small></span>
          <span>▣ <small>Đã nhận<b>0đ</b></small></span>
        </div>
      </section>

      <section class="referral-activity">
        <h2>Hoạt động giới thiệu</h2>
        <div class="referral-activity-tabs"><button class="active" type="button">♙ &nbsp; Đã mời <b>0</b></button><button type="button">◷ &nbsp; Lịch sử thưởng <b>0</b></button></div>
        <div class="referral-empty"><span>♙</span><b>Chưa có hoạt động giới thiệu</b><p>Chia sẻ link để bắt đầu nhận thưởng cùng bạn bè.</p></div>
      </section>
    </div>
  `;
}

function referralProgram() {
  const referralLink = 'https://zalo.me/g/0u5xwlj4npkvl4bomy1o';
  const tiers = [
    ['Mốc 5', '5 bạn mới tích cực', '+5%', 'mint'],
    ['Mốc 10', '10 bạn mới tích cực', '+10%', 'amber'],
    ['Mốc 15', '15 bạn mới tích cực', '+15%', 'coral'],
    ['Mốc 20', '20 bạn mới tích cực', '+20%', 'violet']
  ];

  return `
    <div class="referral-program">
      <section class="ref-program-hero">
        <div class="ref-program-copy">
          <span class="ref-program-kicker">CHƯƠNG TRÌNH THÀNH VIÊN</span>
          <h1>Giới thiệu bạn mới,<br><em>nhận thưởng song hành</em></h1>
          <p>Chia sẻ Hoàn Tiền Mua Sắm với bạn bè. Khi bạn bè mua sắm hợp lệ, cả hai cùng nhận thêm phần thưởng.</p>
          <span class="ref-program-date">Hiệu lực từ 01/07/2026 · Áp dụng hằng tháng</span>
        </div>
        <div class="ref-program-art" aria-hidden="true">
          <span class="ref-program-orbit orbit-one"></span><span class="ref-program-orbit orbit-two"></span>
          <img src="assets/commission-gift-v2.png" alt="">
          <span class="ref-coin ref-coin-one">₫</span><span class="ref-coin ref-coin-two">₫</span>
        </div>
      </section>

      <section class="ref-rewards-panel"><span class="ref-reward-trace" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        <div class="ref-section-heading"><span>01</span><div><h2>Cơ chế giải thưởng song hành</h2><p>Thưởng nóng cho mỗi lượt giới thiệu hợp lệ và thưởng thêm theo số bạn mới hoạt động trong tháng.</p></div></div>
        <div class="ref-rewards-grid">
          <article class="ref-hot-reward">
            <span class="ref-card-icon">✦</span>
            <small>THƯỞNG NÓNG</small>
            <h3>10.000đ <em>/ thành viên mới</em></h3>
            <p>Nhận ngay khi thành viên mới hoàn thành đơn mua đầu tiên, không bị hủy hoặc trả hàng.</p>
            <div><b>✓</b> Cộng trực tiếp vào số dư tích lũy của bạn</div>
          </article>
          <article class="ref-tier-reward">
            <div class="ref-tier-title"><span>★</span><div><small>THƯỞNG MỐC THÁNG</small><h3>Giới thiệu càng nhiều, thưởng càng cao</h3></div></div>
            <p class="ref-tier-condition"><span>✓</span>Mỗi thành viên mới được tính mốc khi có tối thiểu <b>03 đơn hàng hợp lệ</b> trong tháng đăng ký.</p>
            <div class="ref-tier-grid">${tiers.map(t => `<div class="ref-tier ${t[3]}"><b>${t[0]}</b><span>${t[1]}</span><strong>${t[2]}</strong><small>tổng hoa hồng gốc của tháng</small></div>`).join('')}</div>
          </article>
        </div>
      </section>

      <section class="ref-link-card">
        <div class="ref-link-icon">↗</div>
        <div class="ref-link-copy"><small>LINK GIỚI THIỆU CỦA BẠN</small><h2>Mời bạn bè cùng mua sắm hoàn tiền</h2><p>Chia sẻ link cá nhân; hệ thống tự ghi nhận phần thưởng khi đơn hợp lệ.</p></div>
        <div class="ref-link-control"><input id="referral-link" value="${referralLink}" readonly aria-label="Link giới thiệu"><button class="referral-copy" type="button">Sao chép link</button></div>
      </section>

      <section class="ref-zalo-card">
        <div class="ref-zalo-copy"><span class="ref-zalo-icon">⌁</span><div><small>ĐĂNG KÝ QUA NHÓM ZALO</small><h2>Bot tự ghi nhận lượt giới thiệu</h2><p>Người mới gửi cú pháp sau vào nhóm để hệ thống xác thực người giới thiệu.</p><code>/gt [Tên Zalo người giới thiệu]</code><span class="ref-zalo-note">Ví dụ: <b>/gt Hồng Vinh</b></span></div></div>
        <div class="ref-zalo-phone" aria-hidden="true"><div class="ref-zalo-phone-head"><span class="ref-zalo-group-mark">₫</span><div><b><i></i>Hoàn Tiền Shopee - Lazada - TikTok</b><small>Cộng đồng <em></em> 1000 thành viên</small></div></div><div class="ref-zalo-chat"><p>/gt Hồng Vinh</p><span>✓ Hệ thống đã ghi nhận lời giới thiệu thành công.</span></div></div>
      </section>

      <section class="ref-steps">
        <div class="ref-section-heading"><span>02</span><div><h2>Ba bước để nhận thưởng</h2><p>Làm đúng quy trình để đơn hàng được ghi nhận nhanh và chính xác.</p></div></div>
        <div class="ref-steps-grid">
          <article><b>1</b><h3>Chia sẻ link</h3><p>Gửi link giới thiệu cá nhân cho bạn bè.</p></article>
          <article><b>2</b><h3>Bạn bè mua sắm</h3><p>Đơn đầu tiên hợp lệ sẽ được hệ thống ghi nhận.</p></article>
          <article><b>3</b><h3>Nhận thưởng</h3><p>Thưởng nóng cộng ngay, thưởng mốc chốt cuối tháng.</p></article>
        </div>
      </section>

      <section class="ref-terms">
        <div class="ref-section-heading"><span>03</span><div><h2>Điều kiện áp dụng</h2><p>Minh bạch và dễ theo dõi trong suốt chương trình.</p></div></div>
        <div class="ref-terms-grid">
          <p><b>01</b>Lượt giới thiệu hợp lệ tính từ ngày người mới tham gia bằng link của bạn.</p>
          <p><b>02</b>Đơn hợp lệ là đơn đã giao thành công, không phát sinh hủy hoặc hoàn hàng.</p>
          <p><b>03</b>Thưởng mốc tháng sẽ được tự động cộng khi đối soát hoa hồng hoàn tất.</p>
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
