function appendConvertBot() {
  if ((location.hash.slice(1) || location.pathname.slice(1) || 'dashboard') !== 'convert' || document.querySelector('.convert-bot')) return;
  const bot = document.createElement('section');
  bot.className = 'convert-bot';
  bot.innerHTML = `<div class="convert-bot-intro"><img src="assets/bot-mascot.png" alt="Robot hỗ trợ"><div><h2>Bot tự động chuyển link <em>24/24</em></h2><p class="bot-action"><span>✓</span> Hỗ trợ đủ 3 sàn: Shopee • TikTok Shop • Lazada</p></div></div><div class="convert-bot-feature"><i class="safe">◇</i><h3>An toàn bảo mật</h3><p>Thông tin được bảo mật tuyệt đối</p></div><div class="convert-bot-feature"><i class="fast">ϟ</i><h3>Tra cứu nhanh chóng</h3><p>Kiểm tra đơn hàng chỉ trong vài giây</p></div><div class="convert-bot-feature"><i class="clear">□</i><h3>Hiển thị rõ ràng</h3><p>Mọi thứ rõ ràng, dễ hiểu, dễ theo dõi</p></div><div class="convert-bot-feature"><i class="help">●</i><h3>Hỗ trợ tận tâm</h3><p>Đội ngũ hỗ trợ 24/7, sẵn sàng giải đáp</p></div>`;
  document.querySelector('#app').append(bot);
}
window.addEventListener('hashchange', appendConvertBot);
appendConvertBot();
