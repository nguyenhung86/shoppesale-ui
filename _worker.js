export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 0. Chuyển tiếp toàn bộ yêu cầu trang sản phẩm /shop/*, link đệm /r/*, ảnh bill /b_*, /bill_*, /bills/*, mã QR /qr_*, /qrcodes/*, /api/* sang máy chủ VPS
    if (
      url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/shop/') ||
      url.pathname.startsWith('/r/') ||
      url.pathname.startsWith('/b_') ||
      url.pathname.startsWith('/bill_') ||
      url.pathname.startsWith('/bills/') ||
      url.pathname.startsWith('/qr_') ||
      url.pathname.startsWith('/qrcodes/')
    ) {
      const vpsUrl = new URL(url.pathname + url.search, 'https://api-vps.hoantienonline.io.vn');
      const vpsRequest = new Request(vpsUrl.toString(), {
        method: request.method,
        headers: request.headers,
        redirect: 'manual'
      });
      return fetch(vpsRequest);
    }

    const path = url.pathname.replace(/^\/+|\/+$/g, '');

    // 1. API Tạo Link Rút Gọn 8 ký tự (/create-link-secure-api)
    if (path === 'create-link-secure-api' && request.method === 'POST') {
      try {
        const body = await request.json();
        const targetUrl = body.url;
        if (!targetUrl) return new Response(JSON.stringify({ success: false, error: 'Thiếu url' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });

        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let slug = '';
        for (let i = 0; i < 8; i++) slug += chars.charAt(Math.floor(Math.random() * chars.length));

        if (env.SHORT_LINKS) {
          await env.SHORT_LINKS.put(slug, targetUrl, { expirationTtl: 2592000 });
        }

        const shortUrl = `${url.origin}/${slug}`;
        return new Response(JSON.stringify({ success: true, shortUrl, slug }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }

    // 2. Xử lý khi bấm vào Link rút gọn root (VD: /RQgBxYSVu hoặc mã cũ)
    const reservedPaths = new Set([
      'dashboard', 'deals', 'convert', 'orders', 'events', 'ranking', 'account', 'guide',
      'payout', 'admin', 'bills', 'api', 'assets', 'create-link-secure-api', 'index', 'shop', 'r', 'chinh-sach-bao-mat', 'privacy', 'privacy-policy'
    ]);
    const lowerPath = path.toLowerCase();
    if (lowerPath === 'chinh-sach-bao-mat' || lowerPath === 'chinh-sach-bao-mat.html' || lowerPath === 'privacy' || lowerPath === 'privacy-policy') {
      return new Response("<!doctype html>\n<html lang=\"vi\">\n<head>\n  <meta charset=\"UTF-8\" />\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n  <title>Chính Sách Bảo Mật &amp; Bảo Vệ Dữ Liệu Cá Nhân – Hoàn Tiền Mua Sắm (hoantienonline.io.vn)</title>\n  <meta name=\"description\" content=\"Chính sách bảo mật và bảo vệ dữ liệu cá nhân của hệ thống Hoàn Tiền Mua Sắm Online (hoantienonline.io.vn) đối với dịch vụ hoàn tiền Shopee, ShopeeFood, Lazada, TikTok Shop qua Website và Bot Zalo.\" />\n  <meta property=\"og:title\" content=\"Chính Sách Bảo Mật – Hoàn Tiền Mua Sắm (hoantienonline.io.vn)\" />\n  <meta property=\"og:description\" content=\"Cam kết bảo vệ quyền riêng tư và dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP và pháp luật Việt Nam.\" />\n  <meta property=\"og:type\" content=\"website\" />\n  <meta property=\"og:url\" content=\"https://hoantienonline.io.vn/chinh-sach-bao-mat\" />\n  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\" />\n  <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin />\n  <link href=\"https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap\" rel=\"stylesheet\" />\n  <style>\n    :root {\n      --primary: #ea580c;\n      --primary-dark: #c2410c;\n      --primary-light: #fff7ed;\n      --primary-border: #fed7aa;\n      --bg: #f8fafc;\n      --card: #ffffff;\n      --text-main: #0f172a;\n      --text-body: #334155;\n      --text-muted: #64748b;\n      --border: #e2e8f0;\n      --green: #16a34a;\n      --green-bg: #f0fdf4;\n      --green-border: #bbf7d0;\n    }\n    * {\n      box-sizing: border-box;\n      margin: 0;\n      padding: 0;\n    }\n    body {\n      font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n      background-color: var(--bg);\n      color: var(--text-body);\n      line-height: 1.7;\n      font-size: 15px;\n      -webkit-font-smoothing: antialiased;\n    }\n    .topbar {\n      background: #ffffff;\n      border-bottom: 1px solid var(--border);\n      position: sticky;\n      top: 0;\n      z-index: 100;\n      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.03);\n    }\n    .topbar-inner {\n      max-width: 920px;\n      margin: 0 auto;\n      padding: 14px 20px;\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      gap: 16px;\n    }\n    .brand {\n      display: inline-flex;\n      align-items: center;\n      gap: 12px;\n      text-decoration: none;\n      color: var(--text-main);\n    }\n    .brand-mark {\n      width: 40px;\n      height: 40px;\n      border-radius: 12px;\n      background: linear-gradient(135deg, #ff6b40, #e84616);\n      color: #fff;\n      display: grid;\n      place-items: center;\n      font-size: 20px;\n      font-weight: 800;\n      box-shadow: 0 6px 14px rgba(232, 70, 22, 0.25);\n      flex-shrink: 0;\n    }\n    .brand-copy {\n      display: flex;\n      flex-direction: column;\n      line-height: 1.25;\n    }\n    .brand-copy strong {\n      font-size: 16px;\n      font-weight: 800;\n      color: var(--text-main);\n    }\n    .brand-copy small {\n      font-size: 12px;\n      color: var(--text-muted);\n      font-weight: 500;\n    }\n    .btn-back {\n      display: inline-flex;\n      align-items: center;\n      gap: 6px;\n      padding: 9px 16px;\n      border-radius: 10px;\n      background: var(--primary-light);\n      border: 1px solid var(--primary-border);\n      color: var(--primary);\n      font-size: 13.5px;\n      font-weight: 700;\n      text-decoration: none;\n      transition: all 0.2s ease;\n      white-space: nowrap;\n    }\n    .btn-back:hover {\n      background: var(--primary);\n      color: #fff;\n      border-color: var(--primary);\n    }\n    .page-wrap {\n      max-width: 920px;\n      margin: 28px auto 60px;\n      padding: 0 16px;\n    }\n    .policy-card {\n      background: var(--card);\n      border-radius: 24px;\n      border: 1px solid var(--border);\n      box-shadow: 0 12px 32px -8px rgba(15, 23, 42, 0.06);\n      overflow: hidden;\n    }\n    .hero-banner {\n      background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);\n      border-bottom: 1px solid var(--primary-border);\n      padding: 36px 36px 28px;\n    }\n    .ssl-badge {\n      display: inline-flex;\n      align-items: center;\n      gap: 6px;\n      background: var(--green-bg);\n      border: 1px solid var(--green-border);\n      color: var(--green);\n      font-size: 12px;\n      font-weight: 700;\n      padding: 5px 12px;\n      border-radius: 999px;\n      margin-bottom: 14px;\n    }\n    .hero-banner h1 {\n      font-size: 26px;\n      font-weight: 800;\n      color: var(--text-main);\n      line-height: 1.3;\n      margin-bottom: 14px;\n    }\n    .meta-grid {\n      display: flex;\n      flex-wrap: wrap;\n      gap: 12px 24px;\n      font-size: 13.5px;\n      color: var(--text-body);\n      background: rgba(255, 255, 255, 0.75);\n      border: 1px solid var(--primary-border);\n      padding: 12px 16px;\n      border-radius: 12px;\n    }\n    .meta-item b {\n      color: var(--text-main);\n    }\n    .policy-body {\n      padding: 32px 36px 40px;\n    }\n    .intro-text {\n      font-size: 15px;\n      color: var(--text-body);\n      margin-bottom: 16px;\n    }\n    .legal-box {\n      background: #f8fafc;\n      border-left: 4px solid var(--primary);\n      border-radius: 0 12px 12px 0;\n      padding: 16px 20px;\n      margin: 18px 0 24px;\n      font-size: 14px;\n    }\n    .legal-box p {\n      font-weight: 700;\n      color: var(--text-main);\n      margin-bottom: 8px;\n    }\n    .legal-box ul {\n      padding-left: 20px;\n      margin: 0;\n    }\n    .legal-box li {\n      margin-bottom: 5px;\n    }\n    hr.divider {\n      border: 0;\n      border-top: 1px solid var(--border);\n      margin: 28px 0;\n    }\n    section.policy-section {\n      margin-bottom: 28px;\n    }\n    section.policy-section:last-child {\n      margin-bottom: 0;\n    }\n    h2.section-title {\n      font-size: 19px;\n      font-weight: 800;\n      color: var(--text-main);\n      margin-bottom: 12px;\n      display: flex;\n      align-items: center;\n      gap: 10px;\n    }\n    h2.section-title .num {\n      display: inline-flex;\n      align-items: center;\n      justify-content: center;\n      width: 28px;\n      height: 28px;\n      border-radius: 8px;\n      background: var(--primary);\n      color: #fff;\n      font-size: 14px;\n      font-weight: 800;\n      flex-shrink: 0;\n    }\n    h3.sub-title {\n      font-size: 15.5px;\n      font-weight: 700;\n      color: var(--text-main);\n      margin: 14px 0 8px;\n    }\n    p {\n      margin-bottom: 12px;\n    }\n    ul.policy-list {\n      list-style: none;\n      padding-left: 0;\n      margin: 10px 0 14px;\n    }\n    ul.policy-list li {\n      position: relative;\n      padding-left: 22px;\n      margin-bottom: 12px;\n    }\n    ul.policy-list li::before {\n      content: \"•\";\n      position: absolute;\n      left: 6px;\n      top: 0;\n      color: var(--primary);\n      font-weight: 800;\n      font-size: 18px;\n      line-height: 1.4;\n    }\n    ul.policy-list li b {\n      color: var(--text-main);\n    }\n    code {\n      background: #f1f5f9;\n      color: #c2410c;\n      padding: 2px 6px;\n      border-radius: 6px;\n      font-size: 13.5px;\n      font-weight: 600;\n      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;\n    }\n    .contact-card {\n      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);\n      border: 1px solid var(--border);\n      border-radius: 16px;\n      padding: 20px 24px;\n      margin-top: 14px;\n    }\n    .contact-card ul {\n      margin: 0;\n    }\n    .contact-card a {\n      color: var(--primary);\n      font-weight: 700;\n      text-decoration: none;\n    }\n    .contact-card a:hover {\n      text-decoration: underline;\n    }\n    .footer-note {\n      text-align: center;\n      margin-top: 24px;\n      font-size: 13px;\n      color: var(--text-muted);\n    }\n    @media (max-width: 640px) {\n      .hero-banner {\n        padding: 24px 20px 20px;\n      }\n      .hero-banner h1 {\n        font-size: 21px;\n      }\n      .policy-body {\n        padding: 22px 20px 28px;\n      }\n      h2.section-title {\n        font-size: 17px;\n      }\n    }\n  </style>\n</head>\n<body>\n  <header class=\"topbar\">\n    <div class=\"topbar-inner\">\n      <a class=\"brand\" href=\"https://hoantienonline.io.vn/dashboard\" aria-label=\"Hoàn Tiền Mua Sắm - Trang chủ\">\n        <span class=\"brand-mark\">$</span>\n        <span class=\"brand-copy\">\n          <strong>Hoàn Tiền Mua Sắm</strong>\n          <small>Shopee • ShopeeFood • Lazada • TikTok Shop</small>\n        </span>\n      </a>\n      <a class=\"btn-back\" href=\"https://hoantienonline.io.vn/dashboard\">← Về Trang Chủ</a>\n    </div>\n  </header>\n\n  <main class=\"page-wrap\">\n    <article class=\"policy-card\">\n      <div class=\"hero-banner\">\n        <div class=\"ssl-badge\">🔒 Đã xác thực mã hóa bảo mật SSL/TLS 1.3 (256-bit)</div>\n        <h1>CHÍNH SÁCH BẢO MẬT VÀ BẢO VỆ DỮ LIỆU CÁ NHÂN</h1>\n        <div class=\"meta-grid\">\n          <div class=\"meta-item\"><b>Trang web áp dụng:</b> hoantienonline.io.vn</div>\n          <div class=\"meta-item\"><b>Ngày hiệu lực:</b> 01-07-2026</div>\n          <div class=\"meta-item\"><b>Nền tảng vận hành:</b> Website &amp; Hệ thống Bot Zalo</div>\n        </div>\n      </div>\n\n      <div class=\"policy-body\">\n        <p class=\"intro-text\">\n          Chào mừng bạn đến với <b>hoantienonline.io.vn</b> (<i>Hệ thống Hoàn Tiền Mua Sắm Online</i>). Chúng tôi cam kết tôn trọng quyền riêng tư và bảo vệ tuyệt đối dữ liệu cá nhân của người dùng.\n        </p>\n\n        <div class=\"legal-box\">\n          <p>Căn cứ pháp lý áp dụng tại Việt Nam:</p>\n          <ul>\n            <li><b>Nghị định số 13/2023/NĐ-CP</b> của Chính phủ về Bảo vệ dữ liệu cá nhân (và các văn bản pháp luật về Bảo vệ dữ liệu cá nhân hiện hành);</li>\n            <li><b>Luật An ninh mạng số 24/2018/QH14</b>;</li>\n            <li><b>Luật Giao dịch điện tử số 20/2023/QH15</b>;</li>\n            <li><b>Luật Bảo vệ quyền lợi người tiêu dùng số 19/2023/QH15</b> (từ Điều 15 đến Điều 20 về bảo vệ thông tin của người tiêu dùng).</li>\n          </ul>\n        </div>\n\n        <p class=\"intro-text\">\n          Chính sách bảo mật này giải thích rõ loại dữ liệu chúng tôi thu thập, mục đích xử lý, biện pháp bảo mật và quyền hợp pháp của bạn (với tư cách là <b>Chủ thể dữ liệu</b>) khi sử dụng dịch vụ hoàn tiền hoa hồng mua sắm <b>Shopee, ShopeeFood, Lazada, TikTok Shop</b> thông qua hệ thống <b>Website</b> và <b>Bot Zalo</b> của chúng tôi.\n        </p>\n\n        <hr class=\"divider\" />\n\n        <section class=\"policy-section\">\n          <h2 class=\"section-title\"><span class=\"num\">1</span> Phân loại và Phạm vi Dữ liệu cá nhân thu thập</h2>\n          <p>Theo quy định tại Điều 2 <b>Nghị định 13/2023/NĐ-CP</b>, để vận hành dịch vụ đối soát và hoàn tiền một cách tự động và chính xác, chúng tôi chỉ thu thập các thông tin cơ bản sau (thuộc nhóm <i>Dữ liệu cá nhân cơ bản</i>):</p>\n          <ul class=\"policy-list\">\n            <li><b>Thông tin định danh trên Zalo:</b> Bao gồm mã định danh <b>Zalo ID</b>, Tên hiển thị (<i>Display Name</i>) và Ảnh đại diện công khai của bạn khi bạn tương tác với <b>Bot Zalo</b> hoặc tham gia nhóm cộng đồng Zalo của hệ thống. Dữ liệu này dùng để phân biệt các tài khoản, gắn mã theo dõi đơn hàng (<i>SubID</i>) và gửi thông báo cá nhân hóa.</li>\n            <li><b>Thông tin xác thực trên Website:</b> Khi bạn đăng nhập vào website <b>hoantienonline.io.vn</b> thông qua <b>Google Sign-In</b>, hệ thống ghi nhận địa chỉ Email, Tên hiển thị, Ảnh đại diện Google và mã <b>Zalo ID</b> bạn liên kết nhằm đồng bộ lịch sử đơn hàng và số dư giữa Zalo và Website.</li>\n            <li><b>Dữ liệu giao dịch &amp; Liên kết mua sắm:</b> Các liên kết (<i>link</i>) sản phẩm <b>Shopee, ShopeeFood, Lazada, TikTok Shop</b> mà bạn gửi vào Bot Zalo hoặc chuyển đổi trực tiếp trên Website; mã đơn hàng (<i>Order ID</i>), trạng thái đơn hàng và giá trị hoa hồng được đồng bộ từ hệ thống phân tích tiếp thị liên kết (<i>Affiliate</i>).</li>\n            <li><b>Thông tin nhận thanh toán hoàn tiền:</b> Tên ngân hàng, Số tài khoản ngân hàng (hoặc mã QR nhận tiền) và Tên chủ tài khoản do bạn chủ động cung cấp qua lệnh <code>/stk</code> hoặc tại mục <b>Tài khoản</b> trên Website để chúng tôi tiến hành chuyển khoản số tiền hoàn lại cho bạn. <i>(Chúng tôi tuyệt đối không yêu cầu và không bao giờ thu thập mật khẩu ngân hàng, mã PIN, mã OTP hay số thẻ CVV/CVC của bạn).</i></li>\n            <li><b>Dữ liệu kỹ thuật truy cập Web:</b> Khi bạn truy cập website <a href=\"https://hoantienonline.io.vn\" style=\"color: var(--primary); font-weight: 600;\">hoantienonline.io.vn</a>, hệ thống có thể ghi nhận các thông tin kỹ thuật tiêu chuẩn như địa chỉ IP, loại trình duyệt, thiết bị, thời gian truy cập và Cookie phiên đăng nhập để tối ưu hóa trải nghiệm người dùng và ngăn chặn hành vi truy cập trái phép.</li>\n          </ul>\n        </section>\n\n        <section class=\"policy-section\">\n          <h2 class=\"section-title\"><span class=\"num\">2</span> Mục đích xử lý dữ liệu cá nhân</h2>\n          <p>Theo quy định tại Điều 11 và Điều 13 <b>Nghị định 13/2023/NĐ-CP</b>, thông tin của bạn chỉ được sử dụng riêng cho các mục đích vận hành dịch vụ đã thông báo, cụ thể:</p>\n          <ul class=\"policy-list\">\n            <li><b>Xử lý và đối soát hoàn tiền:</b> Xác minh đơn hàng hợp lệ qua liên kết bạn đã tạo và tính toán số dư hoàn tiền. Dữ liệu này giúp hệ thống xác định chính xác phần hoa hồng tiếp thị liên kết được hoàn trả lại cho bạn (ví dụ: hoàn lại tới 80% dựa trên tổng hoa hồng thực nhận từ sàn TMĐT; khoản này là tiền thưởng hoàn lại sau khi mua hàng, không phải là mức giảm giá trực tiếp trên tổng giá trị hóa đơn của sàn).</li>\n            <li><b>Vận hành Trợ Lý Hoàn Tiền (Bot Zalo &amp; Website):</b> Phản hồi các câu lệnh tra cứu tự động của bạn (<code>/kt</code>, <code>/donhang</code>, <code>/stk</code>, <code>/idzalo</code>, <code>/magt</code>, <code>/topgt</code>...), gửi thông báo khi có đơn hàng thành công, cập nhật trạng thái số dư và gửi biên lai xác nhận khi giao dịch chuyển tiền hoàn tất.</li>\n            <li><b>Cải thiện chất lượng dịch vụ:</b> Phân tích và khắc phục các sự cố kỹ thuật (nếu có) liên quan đến việc chuyển đổi link (<i>shortLink / deepLink</i>) để đảm bảo hệ thống hoạt động ổn định 24/7.</li>\n            <li><b>Giải quyết khiếu nại &amp; Hỗ trợ khách hàng:</b> Tra cứu, đối chiếu và giải quyết các thắc mắc liên quan đến mã đơn hàng, sự kiện giới thiệu hoặc trạng thái thanh toán theo quy định của <b>Luật Bảo vệ quyền lợi người tiêu dùng 2023</b>.</li>\n          </ul>\n        </section>\n\n        <section class=\"policy-section\">\n          <h2 class=\"section-title\"><span class=\"num\">3</span> Chia sẻ thông tin với bên thứ ba</h2>\n          <p>Tuân thủ Điều 19 <b>Luật Bảo vệ quyền lợi người tiêu dùng 2023</b> và <b>Nghị định 13/2023/NĐ-CP</b>, chúng tôi <b>tuyệt đối không bán, cho thuê hoặc trao đổi</b> thông tin cá nhân của bạn cho bất kỳ bên thứ ba nào vì mục đích thương mại. Thông tin chỉ được kết nối kỹ thuật trong các trường hợp bắt buộc sau:</p>\n          <ul class=\"policy-list\">\n            <li><b>Đối tác cung cấp nền tảng &amp; Thanh toán:</b> Giao tiếp qua nền tảng <b>Zalo</b> để vận hành Bot hỗ trợ, dịch vụ <b>Google Sign-In</b> để xác thực đăng nhập trên Website và hệ thống chuyển mạch ngân hàng (<b>VietQR / Napas 247</b>) để thực hiện lệnh chuyển tiền hoàn cho bạn.</li>\n            <li><b>Nền tảng sàn Thương mại điện tử (Shopee, Lazada, TikTok Shop):</b> Hệ thống chỉ gắn mã tham chiếu kỹ thuật ẩn danh (<i>SubID</i>) lên liên kết sản phẩm để sàn TMĐT ghi nhận lượt nhấp và chuyển đổi đơn hàng, hoàn toàn không chia sẻ thông tin cá nhân hay tài khoản ngân hàng của bạn cho sàn.</li>\n            <li><b>Yêu cầu pháp lý:</b> Chúng tôi có thể cung cấp thông tin nếu có yêu cầu hợp pháp bằng văn bản từ các cơ quan nhà nước có thẩm quyền theo quy định tại Khoản 1 Điều 17 <b>Nghị định 13/2023/NĐ-CP</b> và Điều 26 <b>Luật An ninh mạng 2018</b>.</li>\n          </ul>\n        </section>\n\n        <section class=\"policy-section\">\n          <h2 class=\"section-title\"><span class=\"num\">4</span> Bảo mật dữ liệu và Thời hạn lưu trữ</h2>\n          <p>Thực hiện nghĩa vụ bảo vệ dữ liệu cá nhân theo Điều 26, Điều 27 <b>Nghị định 13/2023/NĐ-CP</b>, chúng tôi áp dụng các biện pháp bảo mật kỹ thuật và quản lý chặt chẽ:</p>\n          <ul class=\"policy-list\">\n            <li><b>Mã hóa đường truyền (SSL/TLS):</b> Toàn bộ thông tin thanh toán và dữ liệu giao tiếp giữa trình duyệt người dùng, website <b>hoantienonline.io.vn</b>, hệ thống <b>Bot Zalo</b> và máy chủ đều được mã hóa chuẩn <b>TLS 1.3 (AES-256-GCM)</b> thông qua chứng chỉ bảo mật của <b>Google Trust Services</b> và đường hầm mã hóa <b>Cloudflare Tunnel</b>.</li>\n            <li><b>Kiểm soát truy cập nghiêm ngặt:</b> Chỉ những quản trị viên có thẩm quyền mới được phép truy cập vào hệ thống cơ sở dữ liệu đối soát hoàn tiền. Hệ thống tích hợp lớp bảo vệ chống cào dữ liệu tự động (<i>Anti-Scraper</i>) và giới hạn tần suất truy cập (<i>Rate Limiting</i>).</li>\n            <li><b>Lưu trữ an toàn &amp; Thời hạn lưu trữ:</b> Dữ liệu được lưu trữ và sao lưu định kỳ trên máy chủ bảo mật cao trong suốt thời gian bạn sử dụng dịch vụ tại <b>hoantienonline.io.vn</b>. Khi bạn yêu cầu xóa dữ liệu hoặc ngừng sử dụng dịch vụ, thông tin của bạn sẽ được xóa bỏ khỏi hệ thống trong vòng <b>72 giờ</b> sau khi hoàn tất đối soát công nợ (trừ trường hợp pháp luật có quy định khác).</li>\n          </ul>\n        </section>\n\n        <section class=\"policy-section\">\n          <h2 class=\"section-title\"><span class=\"num\">5</span> Quyền và Nghĩa vụ của Chủ thể dữ liệu (Người dùng)</h2>\n          <p>Căn cứ Điều 9 và Điều 10 <b>Nghị định 13/2023/NĐ-CP</b> về Bảo vệ dữ liệu cá nhân, bạn có đầy đủ các quyền và nghĩa vụ sau đối với dữ liệu cá nhân của mình:</p>\n          <h3 class=\"sub-title\">5.1. Quyền lợi của bạn:</h3>\n          <ul class=\"policy-list\">\n            <li><b>Quyền được biết và Quyền đồng ý:</b> Được thông báo minh bạch về mục đích và phạm vi xử lý dữ liệu thông qua Chính sách bảo mật này.</li>\n            <li><b>Quyền truy cập &amp; Tra cứu:</b> Bạn có thể xem lịch sử đơn hàng, mức hoa hồng, trạng thái duyệt đơn và số dư hiện tại trực tiếp trên website <b>hoantienonline.io.vn</b> hoặc thông qua các lệnh tra cứu trên <b>Bot Zalo</b>.</li>\n            <li><b>Quyền chỉnh sửa:</b> Chủ động cập nhật hoặc thay đổi thông tin nhận tiền (số tài khoản, ngân hàng) bằng cách gửi lệnh <code>/stk</code> cho <b>Bot Zalo</b> hoặc cập nhật trên trang <b>Tài khoản</b> của Website.</li>\n            <li><b>Quyền rút lại sự đồng ý &amp; Quyền xóa dữ liệu (Quyền được lãng quên):</b> Bạn có thể yêu cầu chúng tôi xóa hoàn toàn thông tin liên kết tài khoản Zalo/Google, lịch sử đơn hàng và thông tin thanh toán khỏi hệ thống của <b>hoantienonline.io.vn</b> bằng cách liên hệ trực tiếp với Quản trị viên hỗ trợ.</li>\n          </ul>\n          <h3 class=\"sub-title\">5.2. Nghĩa vụ của bạn:</h3>\n          <ul class=\"policy-list\">\n            <li>Tự bảo vệ thiết bị cá nhân, tài khoản Zalo và tài khoản Google của mình; không chia sẻ phiên đăng nhập cho người khác.</li>\n            <li>Cung cấp chính xác thông tin số tài khoản ngân hàng nhận tiền để đảm bảo quá trình chuyển khoản hoàn tiền tự động diễn ra chính xác.</li>\n          </ul>\n        </section>\n\n        <section class=\"policy-section\">\n          <h2 class=\"section-title\"><span class=\"num\">6</span> Thay đổi Chính sách bảo mật</h2>\n          <p>Chúng tôi có quyền cập nhật và sửa đổi Chính sách bảo mật này vào bất kỳ lúc nào để phù hợp với sự thay đổi của dịch vụ hoặc quy định mới của pháp luật Việt Nam. Bất kỳ thay đổi nào cũng sẽ được thông báo công khai trên trang web <b>hoantienonline.io.vn</b> và qua thông báo từ hệ thống <b>Bot Zalo / Nhóm Zalo chính thức</b>. Việc bạn tiếp tục sử dụng dịch vụ sau khi chính sách mới có hiệu lực đồng nghĩa với việc bạn chấp nhận các thay đổi đó.</p>\n        </section>\n\n        <section class=\"policy-section\">\n          <h2 class=\"section-title\"><span class=\"num\">7</span> Thông tin liên hệ</h2>\n          <p>Nếu bạn có bất kỳ câu hỏi, thắc mắc hoặc yêu cầu thực hiện quyền của Chủ thể dữ liệu liên quan đến Chính sách bảo mật này, vui lòng liên hệ với chúng tôi qua:</p>\n          <div class=\"contact-card\">\n            <ul class=\"policy-list\">\n              <li><b>Hỗ trợ trực tiếp qua Nhóm Zalo chính thức:</b> <a href=\"https://zalo.me/g/b8lixpggmg0kmacdeeii\" target=\"_blank\" rel=\"noopener noreferrer\">Tham gia Nhóm Zalo Hoàn Tiền Mua Sắm</a></li>\n              <li><b>Quản trị viên hỗ trợ (Zalo):</b> Bảo Sơn Qa</li>\n              <li><b>Website chính thức:</b> <a href=\"https://hoantienonline.io.vn\" target=\"_blank\" rel=\"noopener noreferrer\">https://hoantienonline.io.vn</a></li>\n            </ul>\n          </div>\n        </section>\n      </div>\n    </article>\n\n    <p class=\"footer-note\">© 2026 Hoàn Tiền Mua Sắm (hoantienonline.io.vn) – Hệ thống Hoàn tiền Shopee, ShopeeFood, Lazada &amp; TikTok Shop tự động.</p>\n  </main>\n</body>\n</html>\n", {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
      });
    }
    const isSlug = path && /^[a-zA-Z0-9_-]{5,16}$/.test(path) && !reservedPaths.has(path.toLowerCase()) && !path.includes('.');

    if (isSlug) {
      let targetUrl = null;
      if (env.SHORT_LINKS) {
        try {
          targetUrl = await env.SHORT_LINKS.get(path);
        } catch (e) {}
      }

      if (targetUrl) {
        const userAgent = request.headers.get('user-agent') || '';
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(userAgent);

        // ĐIỆN THOẠI -> Mở thẳng App Shopee
        if (isMobile) return Response.redirect(targetUrl, 302);

        // MÁY TÍNH (PC) -> Hiện trang Mã QR
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(request.url)}`;
        const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mở Shopee Bằng Điện Thoại - Hoàn Tiền Mua Sắm</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, sans-serif; background: #f8fafc; color: #0f172a; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { width: 100%; max-width: 460px; background: #ffffff; border-radius: 28px; padding: 40px 32px; text-align: center; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.12); }
    .badge { display: inline-flex; align-items: center; gap: 6px; background: #fff7ed; border: 1px solid #ffedd5; color: #ea580c; padding: 6px 16px; border-radius: 999px; font-size: 13px; font-weight: 700; margin-bottom: 20px; }
    h1 { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
    p.subtitle { font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 24px; }
    .qr-container { background: #ffffff; border: 2px dashed #fed7aa; border-radius: 20px; padding: 16px; display: inline-block; margin-bottom: 24px; }
    .qr-img { width: 220px; height: 220px; display: block; border-radius: 12px; }
    .steps { background: #f8fafc; border-radius: 18px; padding: 18px 20px; text-align: left; margin-bottom: 24px; }
    .step { display: flex; align-items: center; gap: 12px; font-size: 13.5px; color: #334155; margin-bottom: 12px; }
    .step:last-child { margin-bottom: 0; }
    .step-num { width: 22px; height: 22px; background: #ea580c; color: #fff; font-size: 12px; font-weight: bold; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; }
    .footer-badge { font-size: 12.5px; color: #16a34a; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">💎 HOÀN TIỀN MUA SẮM ONLINE</div>
    <h1>Mở Shopee Trên Điện Thoại</h1>
    <p class="subtitle">Vui lòng quét mã QR bằng điện thoại để mở App Shopee và được <b>tự động ghi nhận hoàn tiền 80%</b>.</p>
    <div class="qr-container"><img src="${qrCodeUrl}" alt="QR" class="qr-img"></div>
    <div class="steps">
      <div class="step"><span class="step-num">1</span><span>Mở <b>Camera điện thoại</b> hoặc <b>Zalo</b></span></div>
      <div class="step"><span class="step-num">2</span><span>Quét mã QR hiển thị ở trên</span></div>
      <div class="step"><span class="step-num">3</span><span>App Shopee sẽ tự động mở để bạn mua hàng</span></div>
    </div>
    <div class="footer-badge">🛡️ Bảo mật & Ghi nhận hoàn tiền 100% tự động</div>
  </div>
</body>
</html>`;
        return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }

      // Chuyển tiếp sang VPS để xử lý trang sản phẩm rút gọn root (/:slug)
      try {
        const vpsUrl = new URL(`/${path}${url.search}`, 'https://api-vps.hoantienonline.io.vn');
        const vpsRequest = new Request(vpsUrl.toString(), {
          method: request.method,
          headers: request.headers,
          redirect: 'manual'
        });
        const vpsRes = await fetch(vpsRequest);
        if (vpsRes.status === 200 || vpsRes.headers.get('content-type')?.includes('text/html')) {
          return vpsRes;
        }
      } catch (errVps) {
        console.error('Lỗi kết nối VPS slug:', errVps);
      }
    }

    // 3. Phục vụ toàn bộ website Pages (SPA fallback cho các trang web chính)
    const spaPaths = new Set(['dashboard', 'deals', 'convert', 'orders', 'events', 'ranking', 'account', 'guide']);
    if (spaPaths.has(path.toLowerCase())) {
      const indexReq = new Request(new URL('/', request.url), request);
      return env.ASSETS ? env.ASSETS.fetch(indexReq) : fetch(indexReq);
    }
    return env.ASSETS ? env.ASSETS.fetch(request) : fetch(request);
  }
};