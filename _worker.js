export default {
  async fetch(request, env) {
    const url = new URL(request.url);
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

    // 2. Xử lý khi bấm vào Link 8 ký tự (VD: /Ta3qA6xk)
    if (path && path.length <= 12 && !path.includes('.') && !path.includes('/')) {
      let targetUrl = null;
      if (env.SHORT_LINKS) targetUrl = await env.SHORT_LINKS.get(path);

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
    }

    // 3. Phục vụ toàn bộ website, dashboard, payout bình thường
    return env.ASSETS ? env.ASSETS.fetch(request) : fetch(request);
  }
};