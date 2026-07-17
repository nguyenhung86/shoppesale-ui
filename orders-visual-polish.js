(() => {
  function polishOrders() {
    const heading = document.querySelector('.commission-summary h2');
    if (!heading || heading.dataset.polished) return;
    heading.dataset.polished = 'true';
    heading.textContent = 'Tổng quan hoa hồng';
  }

  polishOrders();
  window.addEventListener('hashchange', () => requestAnimationFrame(polishOrders));
  window.addEventListener('popstate', () => requestAnimationFrame(polishOrders));
  setInterval(polishOrders, 100);
})();
