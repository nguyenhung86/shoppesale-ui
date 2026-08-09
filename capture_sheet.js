import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

(async () => {
  try {
    // Lấy tham số ngày truyền từ command line (VD: node capture_sheet.js 2026-07-10)
    let targetDateStr = process.argv[2];
    
    // Nếu không truyền ngày, mặc định lấy ngày hôm qua (theo múi giờ Việt Nam)
    if (!targetDateStr) {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Ho_Chi_Minh",
          year: "numeric",
          month: "2-digit",
          day: "2-digit"
      });
      const parts = formatter.formatToParts(yesterday);
      const map = {};
      parts.forEach(p => map[p.type] = p.value);
      targetDateStr = `${map.year}-${map.month}-${map.day}`;
    }
    
    console.log(`🤖 [Sheet Capturer] Ngày báo cáo cần chụp: ${targetDateStr}`);

    const configPath = path.resolve('affiliate-config.json');
    if (!existsSync(configPath)) {
      console.error('❌ [Sheet Capturer] Không tìm thấy file cấu hình affiliate-config.json');
      process.exit(1);
    }
    
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    let sheetUrl = config.scheduler?.spreadsheetUrl || config.spreadsheetUrl;
    
    if (!sheetUrl) {
      console.error('❌ [Sheet Capturer] Chưa cấu hình spreadsheetUrl trong affiliate-config.json');
      process.exit(1);
    }
    
    // Đảm bảo sử dụng link htmlview trực tiếp của sheet "Dữ liệu nạp tự động" (gid=585796894)
    const base = sheetUrl.split('/htmlview')[0].split('/edit')[0];
    sheetUrl = base + '/htmlview/sheet?headers=true&gid=585796894';
    
    console.log('🤖 [Sheet Capturer] Đang mở Google Sheet:', sheetUrl);
    
    let launchOptions = { headless: true };
    const possiblePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      (process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe') : ''),
      (process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Microsoft\\Edge\\Application\\msedge.exe') : '')
    ].filter(Boolean);

    for (const p of possiblePaths) {
      if (existsSync(p)) {
        launchOptions.executablePath = p;
        console.log(`🤖 [Sheet Capturer] Tìm thấy trình duyệt hệ thống: ${p}`);
        break;
      }
    }

    let browser;
    try {
      browser = await chromium.launch(launchOptions);
    } catch (launchErr) {
      console.log(`⚠️ [Sheet Capturer] Không khởi chạy được trình duyệt mặc định (${launchErr.message}). Đang tự động tải bộ Playwright Chromium...`);
      try {
        const { execSync } = await import('child_process');
        execSync("npx playwright install chromium", { stdio: 'inherit' });
        browser = await chromium.launch({ headless: true });
      } catch (installErr) {
        console.error("❌ [Sheet Capturer] Lỗi tải Playwright Chromium:", installErr.message);
        throw launchErr;
      }
    }

    const page = await browser.newPage();
    
    // Đặt kích thước viewport rộng để hiển thị đủ cột và cao để có không gian chứa bảng
    await page.setViewportSize({ width: 1600, height: 1200 });
    
    await page.goto(sheetUrl, { waitUntil: 'commit', timeout: 120000 });
    await page.waitForSelector('.waffle', { timeout: 120000 });
    await page.waitForTimeout(3000); // Đợi dữ liệu tải ban đầu

    // Cuộn trang xuống tận cùng để ép Google Sheet HTML view nạp đầy đủ 100% tất cả các dòng
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 800;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight || totalHeight > 30000) {
            clearInterval(timer);
            window.scrollTo(0, 0); // Cuộn lại lên đầu
            resolve();
          }
        }, 50);
      });
    });
    await page.waitForTimeout(1000);
    
    // Thực hiện ẩn các dòng không thuộc ngày targetDateStr bằng JavaScript trên trang
    const filterResult = await page.evaluate((targetDate) => {
      function getDateVariants(dateStr) {
        if (!dateStr) return [];
        const variants = new Set([dateStr]);
        const mIso = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
        if (mIso) {
          const y = mIso[1], m = mIso[2].padStart(2, '0'), d = mIso[3].padStart(2, '0');
          const mNum = parseInt(m, 10), dNum = parseInt(d, 10);
          variants.add(`${y}-${m}-${d}`);
          variants.add(`${d}/${m}/${y}`);
          variants.add(`${dNum}/${mNum}/${y}`);
          variants.add(`${d}/${m}`);
          variants.add(`${dNum}/${mNum}`);
        }
        const mVn = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
        if (mVn) {
          const d = mVn[1].padStart(2, '0'), m = mVn[2].padStart(2, '0'), y = mVn[3];
          const mNum = parseInt(m, 10), dNum = parseInt(d, 10);
          variants.add(`${y}-${m}-${d}`);
          variants.add(`${d}/${m}/${y}`);
          variants.add(`${dNum}/${mNum}/${y}`);
          variants.add(`${d}/${m}`);
          variants.add(`${dNum}/${mNum}`);
        }
        return Array.from(variants);
      }

      const rows = Array.from(document.querySelectorAll('.waffle tr'));
      let targetVariants = getDateVariants(targetDate);
      let visibleCount = 0;
      
      // Bước 1: Tìm các dòng khớp ngày targetDate (hoặc biến thể ngày)
      for (let i = 3; i < rows.length; i++) {
        const row = rows[i];
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length > 0) {
          const dateText = cells[0].innerText.trim();
          if (targetVariants.some(v => dateText.includes(v))) {
            visibleCount++;
          }
        }
      }
      
      // Bước 2: Nếu targetDate chưa có dữ liệu (ví dụ sáng sớm ngày mới chưa nhảy dòng),
      // Tự động tìm NGÀY MỚI NHẤT hiện đang có trên Sheet (VD: 07/08/2026) để chụp chính xác!
      let matchedDateLabel = targetDate;
      if (visibleCount === 0) {
        let latestDateFound = "";
        for (let i = rows.length - 1; i >= 3; i--) {
          const row = rows[i];
          const cells = Array.from(row.querySelectorAll('td'));
          if (cells.length > 0) {
            const dateText = cells[0].innerText.trim();
            if (dateText && dateText.length >= 5) {
              latestDateFound = dateText;
              break;
            }
          }
        }
        if (latestDateFound) {
          matchedDateLabel = latestDateFound;
          targetVariants = [latestDateFound];
          for (let i = 3; i < rows.length; i++) {
            const row = rows[i];
            const cells = Array.from(row.querySelectorAll('td'));
            if (cells.length > 0) {
              const dateText = cells[0].innerText.trim();
              if (dateText.includes(latestDateFound)) {
                visibleCount++;
              }
            }
          }
        }
      }
      
      // Bước 3: Ẩn tất cả các dòng dữ liệu không thuộc ngày mới nhất được chọn
      let hiddenCount = 0;
      for (let i = 3; i < rows.length; i++) {
        const row = rows[i];
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length > 0) {
          const dateText = cells[0].innerText.trim();
          if (targetVariants.some(v => dateText.includes(v))) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
            hiddenCount++;
          }
        }
      }
      
      return { total: rows.length, visible: visibleCount, hidden: hiddenCount, matchedDateLabel };
    }, targetDateStr);
    
    function formatDdMm(str) {
      if (!str) return "";
      let m = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
      if (m) return `${m[3].padStart(2, '0')}/${m[2].padStart(2, '0')}`;
      m = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
      if (m) return `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}`;
      m = str.match(/^(\d{1,2})[-/](\d{1,2})$/);
      if (m) return `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}`;
      return str;
    }

    const assetsDir = path.resolve('assets');
    const matchedDdMm = formatDdMm(filterResult.matchedDateLabel);
    const datePath = path.join(assetsDir, 'last_report_date.txt');
    try {
      const fs = await import('fs');
      fs.writeFileSync(datePath, matchedDdMm, 'utf8');
      console.log(`🤖 [Sheet Capturer] Đã lưu mốc ngày DD/MM (${matchedDdMm}) vào: ${datePath}`);
    } catch (eDate) {}

    console.log(`🤖 [Sheet Capturer] Kết quả lọc dòng (${filterResult.matchedDateLabel} -> ${matchedDdMm}): Khớp ${filterResult.visible} dòng, Ẩn ${filterResult.hidden} dòng`);
    
    const outputPath = path.join(assetsDir, 'bao_cao_hang_ngay.jpg');
    
    // Tính toán bounding box của vùng dữ liệu đang hiển thị (đã lọc)
    const clip = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.waffle tr'));
      if (rows.length === 0) return null;
      
      // Hàng tiêu đề (dòng 2 của sheet = index 2 trong waffle tr)
      const headerRow = rows[2] || rows[1];
      
      // Tìm dòng cuối cùng đang hiển thị và tính tổng chiều cao các dòng
      let lastVisibleRow = null;
      let visibleRowsCount = 0;
      let totalVisibleRowsHeight = 0;
      
      for (let i = 3; i < rows.length; i++) {
        if (rows[i].style.display !== 'none') {
          lastVisibleRow = rows[i];
          visibleRowsCount++;
          totalVisibleRowsHeight += (rows[i].offsetHeight || 28);
        }
      }
      
      const endRow = lastVisibleRow || rows[5] || headerRow;
      const headerRect = headerRow.getBoundingClientRect();
      const endRect = endRow.getBoundingClientRect();
      
      const cells = Array.from(headerRow.querySelectorAll('td, th'));
      if (cells.length < 2) return null;
      
      // Cột A (index 1) đến Cột I (Chốt - index 9) đúng theo yêu cầu của Sếp
      const colStart = cells[1].getBoundingClientRect();
      const colEnd = cells[Math.min(cells.length - 1, 9)].getBoundingClientRect();
      
      // Tính chiều cao chuẩn tuyệt đối từ offsetTop của dòng cuối cùng để chụp đủ 100% tất cả 77 dòng
      const headerTop = headerRow.offsetTop || headerRect.top;
      const endBottom = (endRow.offsetTop + endRow.offsetHeight) || (headerTop + totalVisibleRowsHeight + 60);
      const calculatedHeight = Math.max(endBottom - headerTop, totalVisibleRowsHeight + 60);
      
      return {
        x: Math.max(0, colStart.left - 5),
        y: Math.max(0, headerRect.top - 5),
        width: (colEnd.right - colStart.left) + 10,
        height: calculatedHeight + 40
      };
    });
    
    if (clip) {
      console.log('🤖 [Sheet Capturer] Clip box calculated:', clip);
      // Mở rộng Viewport chiều cao trình duyệt để chụp đủ 100% tất cả các dòng từ dòng 1 đến 77 không bị thiếu
      const requiredHeight = Math.max(1400, Math.ceil(clip.y + clip.height + 200));
      await page.setViewportSize({ width: 1600, height: requiredHeight });
      await page.waitForTimeout(500);
      await page.screenshot({ path: outputPath, type: 'jpeg', quality: 95, clip: clip });
    } else {
      console.log('⚠️ [Sheet Capturer] Không tính được clip box, chụp toàn bộ waffle...');
      const tableElement = await page.$('.waffle');
      if (tableElement) {
        await tableElement.screenshot({ path: outputPath, type: 'jpeg', quality: 95 });
      } else {
        await page.screenshot({ path: outputPath, type: 'jpeg', quality: 95 });
      }
    }
    
    console.log('🤖 [Sheet Capturer] Đã lưu ảnh báo cáo sắc nét vào:', outputPath);
    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ [Sheet Capturer] Lỗi khi chụp màn hình Google Sheet:', error.message);
    process.exit(1);
  }
})();
