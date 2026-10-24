const app = document.querySelector('#app');
const nav = document.querySelector('.nav');
const money = n => `${new Intl.NumberFormat('vi-VN').format(n)}đ`;
const card = (content, cls='') => `<article class="card ${cls}">${content}</article>`;
const head = (title, sub='') => `<div class="page-head"><h1 class="page-title">${title}</h1>${sub ? `<p class="subtitle">${sub}</p>` : ''}</div>`;
const stat = (name, value) => card(`<small>${name}</small><strong>${value}</strong>`, 'summary');

function dashboard(){return `<div class="home-bot-showcase"><section class="home-hero-light"><span class="home-hero-topline" aria-hidden="true"></span><div class="home-hero-copy"><span class="home-kicker">✦ HỆ THỐNG BOT ZALO HOÀN TIỀN TỰ ĐỘNG 24/7</span><h1>Sở hữu Bot hoàn tiền 24/7,<br><em>tạo thu nhập thụ động mỗi ngày</em></h1><p class="home-hero-lead">Bạn muốn sở hữu một hệ thống bot hoàn tiền tự động 24/7 để tạo ra nguồn thu nhập thụ động bền vững mỗi ngày?</p><div class="home-hero-metrics"><div><b>2 giây</b><small>Tự động trả link</small></div><div><b>24/7</b><small>Hoạt động xuyên suốt</small></div><div><b>Đa sàn</b><small>Shopee · Lazada<br>TikTok · ShopeeFood</small></div><div><b>A → Z</b><small>Cài đặt & hỗ trợ trọn gói</small></div></div><div class="home-hero-actions"><a href="https://zalo.me/0842835222" target="_blank" rel="noopener noreferrer" class="home-btn-orange">💬 Nhắn tin nhận Demo & Tư vấn ngay ↗</a><a href="#home-video-demo" class="home-btn-outline" onclick="document.getElementById('home-video-demo')?.scrollIntoView({behavior:'smooth'});return false;">▶ Xem Video thực tế</a></div></div><div class="home-hero-art"><span class="home-orbit orbit-1" aria-hidden="true"></span><span class="home-orbit orbit-2" aria-hidden="true"></span><div class="home-chat-preview"><div class="home-chat-top"><span class="home-zalo-badge">Zalo</span><div><b>Bot Hoàn Tiền Tự Động 24/7</b><small><i></i> Đang trực tuyến · Cloud Server</small></div><span class="home-speed-pill">⚡ 2s</span></div><div class="home-chat-messages"><div class="home-msg-user"><span>Thành viên gửi link mua hàng / đặt đồ ăn</span><p>https://shopee.vn/... · https://shopeefood.vn/...</p></div><div class="home-msg-bot"><span>🤖 Bot Hoàn Tiền phản hồi tự động</span><p>✅ <b>Đã tạo link mua hoàn tiền thành công!</b><br>🎁 Mua sắm & đặt ShopeeFood nhận tới <b>80% hoa hồng</b> vào ví.</p><em>✓ Tự động ghi nhận đơn & cộng dồn hoa hồng</em></div></div><div class="home-chat-bottom"><span>₫ Dòng tiền thụ động chảy về ngân hàng mỗi ngày</span><b>AUTO</b></div></div></div></section><div class="home-main-grid"><div class="home-stories-col"><article class="home-feature-card"><div class="home-feature-head"><span class="home-step-num">01</span><div><small>VẬN HÀNH TỰ ĐỘNG LIÊN TỤC</small><h2>Làm việc cả ngày lẫn đêm — Tự động trả link sau 2 giây</h2></div></div><p>Hệ thống bot Zalo thông minh sẽ thay bạn làm việc liên tục cả ngày lẫn đêm mà không cần can thiệp thủ công. Chỉ cần thành viên gửi link mua sắm hoặc đặt đồ ăn từ Shopee, ShopeeFood, TikTok Shop hay Lazada vào nhóm, bot sẽ tự động nhận diện và trả link hoàn tiền ngay sau hai giây. Mỗi khi có đơn hàng phát sinh, tiền hoa hồng tiếp thị sẽ được hệ thống tự động ghi nhận và cộng dồn liên tục. Dù bạn đang bận việc hay đang ngủ, dòng tiền thụ động vẫn đều đặn chảy về tài khoản ngân hàng của bạn mỗi ngày.</p><div class="home-feature-tags"><span>✓ Tự nhận diện Shopee · ShopeeFood · TikTok · Lazada</span><span>✓ Tự động ghi nhận & cộng dồn hoa hồng</span><span>✓ Tiền thụ động về ngân hàng mỗi ngày</span></div></article><article class="home-feature-card is-accent"><div class="home-feature-head"><span class="home-step-num">02</span><div><small>THIẾT KẾ & TỐI ƯU THEO YÊU CẦU RIÊNG</small><h2>Tùy biến linh hoạt — Đồng bộ Website & Google Sheet</h2></div></div><p>Đặc biệt, bên mình nhận thiết kế và tối ưu bot hoàn tiền theo đúng yêu cầu riêng của từng khách hàng. Bạn có thể tùy biến tỷ lệ trích hoa hồng, phân hạng thành viên, hoặc đồng bộ bảng xếp hạng minh bạch về website và Google Sheet. Hệ thống được cấu hình chuẩn chỉnh trên máy chủ đám mây, đảm bảo vận hành ổn định và bảo mật tuyệt đối. Đội ngũ kỹ thuật sẽ hỗ trợ cài đặt trọn gói từ A đến Z và đồng hành lâu dài cùng bạn trong suốt quá trình vận hành.</p><div class="home-feature-tags"><span>✓ Tùy chỉnh % hoa hồng & hạng thành viên</span><span>✓ Đồng bộ Website & Google Sheet</span><span>✓ Cài đặt Cloud trọn gói A-Z & đồng hành lâu dài</span></div></article></div><aside id="home-video-demo" class="home-video-card"><div class="home-video-head"><div><small>🎬 VIDEO DEMO THỰC TẾ</small><h2>Xem Bot vận hành trực tiếp</h2></div><a href="https://youtube.com/shorts/dpuWbIsUThY" target="_blank" rel="noopener noreferrer">Mở YouTube ↗</a></div><div class="home-phone-frame"><div class="home-phone-notch" aria-hidden="true"></div><div class="home-shorts-wrap"><iframe src="https://www.youtube.com/embed/dpuWbIsUThY?rel=0&playsinline=1" title="Video Demo Hệ Thống Bot Hoàn Tiền Tự Động 24/7" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe></div></div><div class="home-video-caption"><span>●</span><p>Video quay thực tế tốc độ phản hồi và xử lý tự động của hệ thống Bot hoàn tiền.</p></div></aside></div><section class="home-cta-warm"><div class="home-cta-copy"><span class="home-cta-pill">✦ ĐẦU TƯ MỘT LẦN — VẬN HÀNH BỀN BỈ 24/7</span><h2>Đừng để cộng đồng săn sale của bạn bỏ lỡ nguồn thu nhập thụ động hàng triệu đồng mỗi tháng!</h2><p>Chỉ cần đầu tư một lần, bạn đã sở hữu một cỗ máy kiếm tiền tự động hoạt động bền bỉ suốt 24/7. Hãy nhắn tin riêng ngay cho mình để được trải nghiệm bản demo thực tế và nhận tư vấn thiết kế tối ưu nhất nhé!</p></div><div class="home-cta-buttons"><a href="https://zalo.me/0842835222" target="_blank" rel="noopener noreferrer" class="home-cta-btn-white">💬 Nhắn tin riêng nhận Demo & Tư vấn ngay ↗</a><a href="/convert" class="home-cta-btn-glass">⚡ Dùng thử Chuyển đổi link →</a></div></section></div>`}
function convert(){return `${head('Chuyển đổi link','Tạo link hoàn tiền riêng, nhanh và minh bạch.')}${card(`<div class="section-header"><h2>Chọn sàn mua hàng</h2><span class="tag">4 sàn</span></div><div class="shop-grid"><div class="shop selected">🛍️ Shopee <span class="tag">đến 80%</span></div><div class="shop">◈ Lazada <span class="tag">đến 85%</span></div><div class="shop">♪ TikTok Shop <span class="tag">đến 85%</span></div><div class="shop">▣ ShopeeFood <span class="tag">đến 80%</span></div></div>`, 'convert-form')}<section class="section">${card(`<h2>Chuyển đổi link</h2><label for="product-link" class="subtitle">Dán link sản phẩm</label><div class="input-row"><input id="product-link" placeholder="https://shopee.vn/product/..." /><button class="button">Chuyển đổi</button></div>`, 'convert-form')}</section><section class="section"><div class="notice"><b>ⓘ Quan trọng:</b> Mở link hoàn tiền vừa tạo rồi mới thêm sản phẩm vào giỏ hàng.</div></section>`}
function orders(){return `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px;"><div class="loader" style="display: block; width: 40px; height: 40px; border: 4px solid rgba(242, 83, 35, 0.1); border-radius: 50%; border-top-color: #f25323; animation: spin 1s linear infinite;"></div><p style="margin-top: 15px; color: #7787a0; font-size: 14px; font-weight: 500;">Đang đồng bộ dữ liệu đơn hàng mới nhất...</p></div><style>@keyframes spin { to { transform: rotate(360deg); } }</style>`;}
function events(){return `${head('Chuỗi sự kiện chào đón sale giữa năm','Ngoài hoàn tiền cho mỗi đơn, bạn còn nhận thêm phần thưởng khi tham gia sự kiện.') }<div class="event-grid section">${card(`<div class="eyebrow">Sự kiện tháng 6</div><h2>Khoe đơn hoàn tiền</h2><p>Đăng bài khoe đơn — đủ 100 tương tác nhận ngay 50.000đ vào số dư hoàn tiền.</p><h2 style="color:var(--orange)">50.000đ</h2><ul class="checklist"><li>1 like / 1 bình luận = 1 điểm</li><li>Đủ 100 điểm = 50.000đ</li><li>Tiền vào thẳng số dư</li></ul><button class="button">Tham gia khoe đơn →</button>`, 'event-card')}${card(`<div class="eyebrow">Quà tặng</div><h2>Rủ bạn nhận quà</h2><p>Rủ bạn vào mua sắm — nhận tới 10.000đ thưởng và 5% hoa hồng suốt 365 ngày.</p><h2 style="color:#ffca30">tới 10.000đ</h2><ul class="checklist"><li>Bạn bè lên Kim Cương ngay</li><li>Thưởng cộng dồn 3 mốc đơn</li><li>5% hoa hồng suốt 365 ngày</li></ul><button class="button secondary">Rủ bạn ngay →</button>`, 'event-card dark')}</div>`}
function ranking(){return `<div class="ranking">${head('Bảng xếp hạng','Thành tích được cập nhật mỗi ngày lúc 9h.')}<div style="padding:50px;text-align:center;color:#8490a3;">Đang tải dữ liệu bảng xếp hạng...</div></div>`}
function account(){return `${card(`<span class="avatar">HV</span><div><div class="eyebrow">Hồ sơ</div><h1>Hồng Vinh</h1><span class="rank">✦ Kim Cương</span></div>`, 'profile-banner')}<section class="section">${card(`<div class="hero-wallet"><div class="money-label">Mua sắm hoàn tiền</div><div class="money">0đ</div><span class="rank">hoantienonline.io.vn</span></div><div class="grid-3" style="padding:14px">${stat('Đơn','0')}${stat('Giới thiệu','0')}${stat('Từ ngày','11/07/2026')}</div>`)}</section><section class="section">${card(`<h2 style="padding:18px 18px 0">Hạng thành viên</h2><div class="grid-3" style="padding:18px"><div class="mini-step"><b>Tỷ lệ hoàn</b><p>80% hôm nay</p></div><div class="mini-step"><b>Nâng hạng</b><p>Hạng cao nhất.</p></div><div class="mini-step" style="background:var(--mint)"><b>Duy trì hạng</b><p>5 đơn hoặc 10.000đ/tháng</p></div></div>`)}</section><section class="section">${card(`<h2 style="padding:18px 18px 0">Thông tin cá nhân</h2><div class="info-row"><div><small>Tên hiển thị</small><b>Hồng Vinh</b></div><span>✎</span></div><div class="info-row"><div><small>Số điện thoại</small><b style="color:#9aa5b5">Nhập số điện thoại</b></div><span>✎</span></div>`)}</section><section class="section">${card(`<h2 style="padding:18px 18px 0">Liên kết nhận tiền</h2><div class="grid-3" style="padding:18px"><div class="link-card"><small>NGÂN HÀNG</small><b style="display:block;margin:8px 0">Tài khoản nhận tiền</b><span class="tag">Chưa thêm</span></div><div class="link-card"><small>ZALO</small><b style="display:block;margin:8px 0">Chuyển đổi link nhóm</b><span class="tag">Chưa liên kết</span></div><div class="link-card"><small>BẢO MẬT</small><b style="display:block;margin:8px 0">Mã PIN rút tiền</b><span class="tag">Chưa bật</span></div></div>`)}</section>`}
function guide(){const steps=[['Bước 1','Sao chép link sản phẩm','Mở sản phẩm trên sàn, bấm chia sẻ và sao chép liên kết.'],['Bước 2','Dán link vào trang chuyển đổi','Hệ thống tạo link mua hàng gắn với tài khoản.'],['Bước 3','Mua bằng link vừa tạo','Mở link đã chuyển rồi đặt hàng như bình thường.'],['Bước 4','Theo dõi đơn và hoàn tiền','Đơn hợp lệ sẽ được ghi nhận và cộng tiền.']];return `${head('Hướng dẫn')}${card(`<div class="eyebrow" style="color:#fff">Mua sắm hoàn tiền</div><h1>Mua đúng link để nhận hoàn tiền tốt hơn</h1><p>Chỉ cần chuyển link trước khi mua để hệ thống gắn đơn với tài khoản của bạn. Đơn hợp lệ sau đối soát sẽ tạo tiền hoàn trong số dư.</p><div class="actions"><a href="#convert" class="button secondary">Chuyển đổi link →</a><a href="#account" class="button secondary">Xem hạng của tôi</a></div>`, 'guide-hero')}<section class="section"><h2>Hiểu nhanh về hoàn tiền</h2><p class="subtitle">Bạn vẫn mua trực tiếp trên sàn, Hoàn Dễ hỗ trợ tạo link ghi nhận và quản lý số dư.</p><div class="grid-3">${['Hoàn tiền là gì?','Hoàn tiền như thế nào?','Tiền về đâu?'].map((x,i)=>card(`<h3>${x}</h3><p class="subtitle">${['Đây là phần hoa hồng hợp lệ từ sàn được chia lại cho bạn khi đơn mua qua link đã chuyển đổi.','Dán link sản phẩm, mở link mua hàng mới rồi đặt hàng và thanh toán trực tiếp trên sàn.','Sau đối soát, tiền được cộng vào số dư. Bạn có thể rút tiền khi đủ điều kiện.'][i]}</p>`,'knowledge')).join('')}</div></section><section class="section"><h2>Quy trình mua hoàn tiền</h2><p class="subtitle">Làm theo đúng thứ tự để giảm rủi ro mất ghi nhận hoa hồng.</p><div class="grid-4">${steps.map(s=>card(`<div class="eyebrow">${s[0]}</div><b>${s[1]}</b><p>${s[2]}</p>`,'guide-step')).join('')}</div></section><section class="section">${card(`<h2>Lưu ý để không mất hoàn tiền</h2><div class="grid-2" style="margin-top:14px">${['Tránh lấy link từ livestream hoặc video, vì một số nguồn không được ghi nhận hoa hồng.','Xóa sản phẩm khỏi giỏ trước khi mở link hoàn tiền.','Mở link hoàn tiền trước khi thêm sản phẩm vào giỏ.','Sau khi mở link, nên đợi khoảng 10 giây rồi mới mua.','Không bấm link hoặc quảng cáo khác trong lúc mua.','Lưu voucher trước, sau đó quay lại đây để chuyển link và mua.'].map(x=>`<div class="notice">◉ ${x}</div>`).join('')}</div>`)}</section>`}
const deals = () => (typeof window.deals === 'function' ? window.deals() : '<div>Đang tải danh sách hoa hồng cao...</div>');
const pages={dashboard,convert,deals,orders,events,ranking,account,guide};
function render(){
  if (location.pathname === '/' || location.pathname === '') {
    history.replaceState(null, '', '/dashboard');
  }
  let key=location.pathname.slice(1)||'dashboard';
  if(location.hash){
    key=(location.hash.slice(1) || location.pathname.slice(1) || 'dashboard');
  }
  if(!pages[key])key='dashboard';
  
  // Kiểm tra quyền truy cập của khách vãng lai
  const restrictedKeys = ['convert', 'orders', 'account'];
  if (restrictedKeys.includes(key) && !getLoggedUser()) {
    key = 'dashboard';
    history.replaceState(null, '', '/dashboard');
    setTimeout(() => {
      if (typeof showLoginModal === 'function') showLoginModal();
    }, 100);
  }
  
  app.innerHTML=pages[key]();
  if(key==='dashboard' && app.querySelector('.dashboard-view')){
    const intro=document.createElement('section');
    intro.className='dashboard-intro';
    intro.innerHTML='<div class="intro-copy"><h1>Bấm nhận hàng<br>để <em>nhận hoàn tiền</em></h1><p>Tra cứu đơn hàng và theo dõi hoa hồng<br>của bạn chỉ trong vài giây.</p><div class="intro-markets"><span class="market-shopee">S</span><b>Shopee</b><span class="market-lazada">◆</span><b>Lazada</b><span class="market-tiktok">♪</span><b>TikTok Shop</b></div></div><img src="assets/hero-illustration-v3.png" alt="Minh họa hoàn tiền mua sắm"><div class="intro-phone-ui"><span class="phone-check">✓</span><b>Hoàn tiền</b><i></i><i></i><i></i></div>';
    app.querySelector('.dashboard-view').prepend(intro);
  }
  document.querySelectorAll('.shop').forEach((shop,index)=>{
    const labels=['Shopee','Lazada','TikTok Shop','ShopeeFood'];
    const classes=['market-shopee','market-lazada','market-tiktok','market-food'];
    shop.classList.add(classes[index]);
    const tag=shop.querySelector('.tag');
    shop.textContent='';
    const logo=document.createElement('span');
    logo.className='shop-logo';
    const label=document.createElement('span');
    label.className='shop-label';
    label.textContent=labels[index];
    shop.append(logo,label,tag);
  });
  const eventCard=app.querySelector('.event-card.dark');
  if(eventCard){
    const gift=document.createElement('img');
    gift.className='event-gift';
    gift.src='assets/commission-gift-v2.png';
    gift.alt='';
    eventCard.prepend(gift);
  }
  document.querySelectorAll('.nav a').forEach(a=>a.classList.toggle('active',a.dataset.page===key));
  nav.classList.remove('open');
  window.scrollTo(0,0);
}
const baseRender=render;
render=()=>{
  baseRender();
  if(typeof window.syncRealDataToUI==='function'){
    window.syncRealDataToUI();
  }
  const phone=document.querySelector('.intro-phone-ui');
  if(phone){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('class','intro-phone-ui');
    svg.setAttribute('viewBox','0 0 1679 937');
    svg.setAttribute('aria-hidden','true');
    svg.innerHTML='<g transform="rotate(7 810 430)"><circle cx="810" cy="390" r="110" fill="#fff"/><circle cx="810" cy="390" r="76" fill="none" stroke="#67bf55" stroke-width="8"/><path d="M771 390 798 418 853 354" fill="none" stroke="#67bf55" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/><text x="810" y="550" text-anchor="middle" fill="#5b6371" font-family="Arial, sans-serif" font-size="37" font-weight="600">Hoàn tiền</text><rect x="728" y="580" width="164" height="13" rx="7" fill="#e5e2e1"/><rect x="728" y="606" width="164" height="13" rx="7" fill="#e5e2e1"/><rect x="728" y="632" width="112" height="13" rx="7" fill="#e5e2e1"/></g>';
    phone.replaceWith(svg);
  }
};

// Global click listener for SPA pushState routing
document.addEventListener('click', e => {
  const a = e.target.closest('a');
  if (a) {
    const href = a.getAttribute('href');
    // Intercept internal routing links
    if (href && (href.startsWith('/') || href.startsWith('#')) && !href.startsWith('//')) {
      const path = href.startsWith('#') ? '/' + href.slice(1) : href;
      const targetPage = path.slice(1) || 'dashboard';
      
      const restrictedKeys = ['convert', 'orders', 'account'];
      if (restrictedKeys.includes(targetPage) && !getLoggedUser()) {
        e.preventDefault();
        if (typeof showLoginModal === 'function') showLoginModal();
        return;
      }
      
      e.preventDefault();
      history.pushState(null, '', path);
      render();
    }
  }
});

window.addEventListener('popstate', render);
document.querySelector('.menu-toggle').addEventListener('click',()=>nav.classList.toggle('open'));

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', render);
} else {
  render();
}
