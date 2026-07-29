const SCRIPT_VERSION = "1.0";
const API_TOKEN = "DongChau@Secure2026"; // Mã bí mật bảo mật chống bơm dữ liệu giả

function doGet(e) {
  if (e && e.parameter) {
    const action = e.parameter.action;
    if (action === 'test') {
      return ContentService.createTextOutput(JSON.stringify({ status: "ok" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'debug_spreadsheet') {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      return ContentService.createTextOutput(JSON.stringify({
        id: ss.getId(),
        name: ss.getName(),
        url: ss.getUrl()
      })).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'searchBySubId') {
      const subId = e.parameter.subId;
      const dateStr = e.parameter.date; // yyyy-MM-dd
      const res = getOrdersBySubIdAndDate(subId, dateStr);
      return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'getPayoutList') {
      const res = getPayoutDashboardData();
      return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'unifiedSearch') {
      var query = e.parameter.query || "";
      var translatedName = getZaloNameById(query);
      var isZaloIdValid = false;
      if (translatedName) {
        query = translatedName;
        isZaloIdValid = true;
      }
      var res = unifiedSearch(query, "", "");
      // Nếu là ID Zalo hợp lệ nhưng chưa phát sinh đơn hàng (unifiedSearch báo lỗi hoặc rỗng)
      if (isZaloIdValid && (!res || !res.success)) {
        res = {
          success: true,
          searchType: 'customer',
          data: [],
          isZaloIdValid: true,
          zaloName: translatedName
        };
      } else if (isZaloIdValid) {
        res.isZaloIdValid = true;
        res.zaloName = translatedName;
      }
      return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'getUserInfo') {
      const email = e.parameter.email || "";
      const zaloId = getZaloIdByEmail(email);
      return ContentService.createTextOutput(JSON.stringify({ success: true, zaloId: zaloId }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'getZaloUserInfo') {
      var zaloId = e.parameter.zaloId || "";
      var zaloName = e.parameter.zaloName || "";
      
      if (zaloName) {
        var idFromSheet = getZaloIdByName(zaloName);
        if (idFromSheet) {
          zaloId = idFromSheet;
        }
      }
      
      const email = getEmailByZaloId(zaloId);
      const name = getZaloNameById(zaloId) || zaloName;
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        zaloId: zaloId, 
        email: email, 
        name: name 
      }))
      .setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'linkZaloId') {
      const email = e.parameter.email || "";
      const zaloId = e.parameter.zaloId || "";
      const success = saveUserLink(email, zaloId);
      return ContentService.createTextOutput(JSON.stringify({ success: success }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // CỔNG API MỚI BỔ SUNG: CHUYỂN ĐỔI LINK HOÀN TIỀN
    
    if (action === 'test_fetch') {
      try {
        const url = e.parameter.url || "";
        const res = UrlFetchApp.fetch(url, {
          followNewLocation: false,
          muteHttpExceptions: true,
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
        });
        const headers = res.getHeaders();
        const redirectUrl = headers["Location"] || headers["location"] || "";
        return ContentService.createTextOutput(JSON.stringify({
          code: res.getResponseCode(),
          redirectUrl: redirectUrl,
          headers: headers
        })).setMimeType(ContentService.MimeType.JSON);
      } catch (e) {
        return ContentService.createTextOutput(JSON.stringify({ error: e.toString() }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    if (action === 'test_lazada') {
      try {
        const appKey = "105827";
        const appSecret = "r8ZMKhPxu1JZUCwTUBVMJiJnZKjhWeQF";
        const accessToken = "c114183301c74ba3be1f69ad58a53b23";
        
        const apiPath = e.parameter.path || "/affiliate/product/query";
        const timestamp = new Date().getTime().toString();
        const params = {
          app_key: appKey,
          timestamp: timestamp,
          sign_method: "sha256",
          access_token: accessToken
        };
        
        // Nhận thêm query parameters phụ nếu có
        const additionalParamsStr = e.parameter.params || "{}";
        const addParams = JSON.parse(additionalParamsStr);
        for (let k in addParams) {
          params[k] = addParams[k];
        }
        
        // Sắp xếp tham số theo bảng chữ cái ASCII và nối chuỗi
        const keys = Object.keys(params).sort();
        let baseString = apiPath;
        for (let i = 0; i < keys.length; i++) {
          baseString += keys[i] + params[keys[i]];
        }
        
        // Tính HMAC-SHA256
        const signatureBytes = Utilities.computeHmacSignature(
          Utilities.MacAlgorithm.HMAC_SHA_256,
          baseString,
          appSecret,
          Utilities.Charset.UTF_8
        );
        const signature = signatureBytes.map(function(byte) { 
          return ('0' + (byte & 0xFF).toString(16)).slice(-2); 
        }).join('').toUpperCase();
        
        params.sign = signature;
        
        // Gửi request tới API Lazada VN
        const url = "https://api.lazada.vn/rest" + apiPath + "?" + Object.keys(params).map(k => k + "=" + encodeURIComponent(params[k])).join("&");
        const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        
        return ContentService.createTextOutput(JSON.stringify({
          url: url,
          code: res.getResponseCode(),
          body: res.getContentText()
        })).setMimeType(ContentService.MimeType.JSON);
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
if (action === 'saveLazadaRate') {
      const url = e.parameter.url || "";
      const rateStr = e.parameter.rate || "";
      if (url && rateStr) {
        try {
          var key1 = "lazada_rate_" + encodeURIComponent(url);
          var key2 = "lazada_rate_" + encodeURIComponent(url.split('?')[0]);
          CacheService.getScriptCache().put(key1, rateStr, 21600);
          CacheService.getScriptCache().put(key2, rateStr, 21600);
          PropertiesService.getScriptProperties().setProperty(key1, rateStr);
          PropertiesService.getScriptProperties().setProperty(key2, rateStr);
        } catch(e){}
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'convertLink') {
      const url = e.parameter.url || "";
      const subId = e.parameter.subId || "";
      const res = convertLinkAndGetCommission(url, subId);
      return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // ĐƯỜNG DẪN API LẤY BẢNG XẾP HẠNG HOA HỒNG THỰC TẾ
    if (action === 'getLeaderboard') {
      const res = getLeaderboardData();
      return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'getPaymentHistory') {
      const zaloId = e.parameter.zaloId || "";
      const res = getPaymentHistory(zaloId);
      return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  const output = HtmlService.createHtmlOutputFromFile('index');
  output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  return output;
}

function doPost(e) {
  try {
    // Dữ liệu từ Extension gửi lên dưới dạng text/plain để tránh lỗi CORS preflight
    const data = JSON.parse(e.postData.contents);

    if (data.action === 'save_qr') {
      const res = saveCustomerQrCode(data.userId, data.image);
      return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (data.action === 'confirm_payout') {
      const res = confirmPayout(data.userId);
      if (data.amount && data.billBase64) {
        const historyRes = savePayoutHistory(data.userId, data.amount, data.billBase64);
        res.billUrl = historyRes.billUrl;
        res.historySuccess = historyRes.success;
        if (!historyRes.success) res.historyError = historyRes.error;
      }
      return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (data.action === 'save_bank_info') {
      const res = saveCustomerBankInfo(data.userId, data.bankBin, data.bankAcc);
      return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'upgrade_sheet_layout') {
      if (data.token !== API_TOKEN) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: "Unauthorized: Mã bảo mật không hợp lệ!"
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      const message = upgradeSheetLayoutInternal();
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: message
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'register_user') {
      // Kiểm tra bảo mật (Token)
      if (data.token !== API_TOKEN) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: "Unauthorized: Mã bảo mật không hợp lệ!"
        })).setMimeType(ContentService.MimeType.JSON);
      }

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName("Thanh toán hoa hồng");
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: "Sheet 'Thanh toán hoa hồng' không tồn tại!"
        })).setMimeType(ContentService.MimeType.JSON);
      }

      const lastRow = sheet.getLastRow();
      let exists = false;
      if (lastRow >= 2) {
        const ids = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
        for (let i = 0; i < ids.length; i++) {
          if (String(ids[i][0]).trim() === String(data.userId).trim()) {
            exists = true;
            break;
          }
        }
      }

      if (!exists) {
        // Tìm dòng trống đầu tiên ở cột B (ID Zalo) để điền vào
        const lastRow = sheet.getLastRow();
        let targetRow = 0;
        if (lastRow >= 2) {
          const ids = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
          for (let i = 0; i < ids.length; i++) {
            if (String(ids[i][0]).trim() === "") {
              targetRow = i + 2;
              break;
            }
          }
        }
        if (targetRow === 0) {
          targetRow = lastRow + 1;
        }

        sheet.getRange(targetRow, 1).setValue(data.userName);
        sheet.getRange(targetRow, 2).setValue("'" + data.userId);
        sheet.getRange(targetRow, 3).setFormula(`=SUMIFS('Dữ liệu nạp tự động'!G:G; 'Dữ liệu nạp tự động'!K:K; B${targetRow}; 'Dữ liệu nạp tự động'!C:C; "<>Thưởng GT"; 'Dữ liệu nạp tự động'!C:C; "<>Thưởng GT Mốc"; 'Dữ liệu nạp tự động'!H:H; "waiting for payment"; 'Dữ liệu nạp tự động'!I:I; "Chưa TT") + SUMIFS('Dữ liệu nạp tự động'!G:G; 'Dữ liệu nạp tự động'!K:K; B${targetRow}; 'Dữ liệu nạp tự động'!C:C; "<>Thưởng GT"; 'Dữ liệu nạp tự động'!C:C; "<>Thưởng GT Mốc"; 'Dữ liệu nạp tự động'!H:H; "completed"; 'Dữ liệu nạp tự động'!I:I; "Chưa TT") + SUMIFS('Dữ liệu nạp tự động'!G:G; 'Dữ liệu nạp tự động'!K:K; B${targetRow}; 'Dữ liệu nạp tự động'!C:C; "<>Thưởng GT"; 'Dữ liệu nạp tự động'!C:C; "<>Thưởng GT Mốc"; 'Dữ liệu nạp tự động'!H:H; "hoàn thành"; 'Dữ liệu nạp tự động'!I:I; "Chưa TT")`);
        sheet.getRange(targetRow, 4).setFormula(`=SUMIFS('Dữ liệu nạp tự động'!G:G; 'Dữ liệu nạp tự động'!K:K; B${targetRow}; 'Dữ liệu nạp tự động'!C:C; "Thưởng GT"; 'Dữ liệu nạp tự động'!I:I; "Chưa TT")`);
        sheet.getRange(targetRow, 5).setFormula(`=IFERROR(XLOOKUP(B${targetRow};'Giới thiệu'!D:D;'Giới thiệu'!I:I;"";0;-1);"")`);
        sheet.getRange(targetRow, 6).setFormula(`=SUMIFS('Dữ liệu nạp tự động'!G:G; 'Dữ liệu nạp tự động'!K:K; B${targetRow}; 'Dữ liệu nạp tự động'!C:C; "Thưởng GT Mốc"; 'Dữ liệu nạp tự động'!I:I; "Chưa TT")`);
        sheet.getRange(targetRow, 7).setFormula(`=C${targetRow}+D${targetRow}+F${targetRow}`);
        
        sheet.getRange(targetRow, 6).setNumberFormat("#,##0đ");
        sheet.getRange(targetRow, 7).setNumberFormat("#,##0đ");

        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          status: "inserted"
        })).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          status: "exists"
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    if (data.action === 'register_referral') {
      // Kiểm tra bảo mật (Token)
      if (data.token !== API_TOKEN) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: "Unauthorized: Mã bảo mật không hợp lệ!"
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let refSheet = ss.getSheetByName("Giới thiệu");
      if (!refSheet) {
        refSheet = ss.insertSheet("Giới thiệu");
        refSheet.appendRow(["Ngày Đăng Ký", "ID Người Mới", "Tên Người Mới", "ID Người Giới Thiệu", "Tên Người Giới Thiệu", "Trạng thái", "Đã Thông Báo", "Số Đơn Người Mới", "Đạt Mốc Thưởng", "Đã TB Mốc"]);
        refSheet.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#3c5b87").setFontColor("#ffffff");
      }
      
      // Kiểm tra xem đã đăng ký chưa
      const lastRow = refSheet.getLastRow();
      let exists = false;
      if (lastRow >= 2) {
        const newIds = refSheet.getRange(2, 2, lastRow - 1, 1).getValues();
        for (let i = 0; i < newIds.length; i++) {
          if (String(newIds[i][0]).replace(/'/g, "").trim() === String(data.newUserId).trim()) {
            exists = true;
            break;
          }
        }
      }
      
      if (!exists) {
        const nextRow = refSheet.getLastRow() + 1;
        refSheet.appendRow([
          new Date(),
          "'" + data.newUserId,
          data.newUserName,
          "'" + data.referrerId,
          data.referrerName,
          "chờ đơn đầu",
          "",
          `=IF(ISBLANK(B${nextRow}); ""; COUNTIFS('Dữ liệu nạp tự động'!K:K; B${nextRow}; 'Dữ liệu nạp tự động'!H:H; "<>cancelled"; 'Dữ liệu nạp tự động'!A:A; ">="&DATE(YEAR(A${nextRow}); MONTH(A${nextRow}); 1); 'Dữ liệu nạp tự động'!A:A; "<="&EOMONTH(A${nextRow}; 0)))`,
          "",
          ""
        ]);
        
        // Định dạng cột text và canh lề
        const newRow = refSheet.getLastRow();
        refSheet.getRange(newRow, 1, 1, 10).setFontWeight("normal");
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.action === 'get_pending_announcements') {
      // Kiểm tra bảo mật (Token)
      if (data.token !== API_TOKEN) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: "Unauthorized: Mã bảo mật không hợp lệ!"
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let refSheet = ss.getSheetByName("Giới thiệu");
      let pending = [];
      let milestones = [];
      if (refSheet) {
        const lastRow = refSheet.getLastRow();
        if (lastRow >= 2) {
          const refRange = refSheet.getRange(2, 1, lastRow - 1, 10);
          const refData = refRange.getValues();
          for (let i = 0; i < refData.length; i++) {
            // 1. Thông báo thưởng nóng 10k đơn đầu
            const status = String(refData[i][5]).trim();
            const announced = String(refData[i][6]).trim();
            if (status === "đã thưởng" && announced !== "y") {
              refSheet.getRange(i + 2, 7).setValue("y");
              pending.push({
                referrerId: String(refData[i][3]).replace(/'/g, "").trim(),
                referrerName: String(refData[i][4]).trim(),
                newUserId: String(refData[i][1]).replace(/'/g, "").trim(),
                newUserName: String(refData[i][2]).trim()
              });
            }
            
            // 2. Thông báo thưởng mốc giới thiệu theo tháng
            const bonusRateStr = String(refData[i][8]).trim();
            const milestoneAnnounced = String(refData[i][9]).trim();
            if (bonusRateStr && milestoneAnnounced === "chờ thông báo") {
              refSheet.getRange(i + 2, 10).setValue("y").setBackground("#f6ffed").setFontColor("#389e0d").setFontWeight("normal");
              
              const regDateVal = refData[i][0];
              let mYearStr = "";
              if (regDateVal instanceof Date) {
                mYearStr = `${regDateVal.getMonth() + 1}/${regDateVal.getFullYear()}`;
              }
              
              milestones.push({
                referrerId: String(refData[i][3]).replace(/'/g, "").trim(),
                referrerName: String(refData[i][4]).trim(),
                monthYear: mYearStr,
                bonusRate: bonusRateStr
              });
            }
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        pending: pending,
        milestones: milestones
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.action === 'sync_orders' && data.orders) {
      // Kiểm tra bảo mật (Token)
      if (data.token !== API_TOKEN) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: "Unauthorized: Mã bảo mật không hợp lệ!"
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheetName = "Dữ liệu nạp tự động";
      let sheet = ss.getSheetByName(sheetName);
      
      // Nếu sheet chưa tồn tại thì tạo mới
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      }
      
      // Khởi tạo Header ở hàng 2 nếu sheet chưa có đủ dữ liệu
      if (sheet.getLastRow() < 2) {
        sheet.getRange(2, 1, 1, 11).setValues([["Ngày Báo Cáo", "", "Mã Đơn Hàng", "Tên Sản Phẩm", "Hoa Hồng (VNĐ)", "", "", "Trạng Thái", "", "", "Sub ID"]]);
        // Định dạng Header
        sheet.getRange(2, 1, 1, 11).setFontWeight("bold").setBackground("#f3f3f3");
      }
      
      // Bỏ sắp xếp ngày, giữ nguyên thứ tự gốc từ Shopee
      const orders = data.orders;
      const lastRow = sheet.getLastRow();
      
      // Đọc toàn bộ dữ liệu hiện có để đối soát thông minh (hỗ trợ nhiều dòng cùng Mã Đơn Hàng như TikTok)
      let existingRows = [];
      if (lastRow > 2) {
        const rangeValues = sheet.getRange(3, 1, lastRow - 2, 11).getValues();
        for (let i = 0; i < rangeValues.length; i++) {
          const row = rangeValues[i];
          existingRows.push({
            rowIndex: i + 3,
            report_date: row[0],
            order_sn: String(row[2]).trim(),
            item_name: String(row[3]).trim(),
            commission: parseInt(row[4], 10) || 0,
            checkout_status: String(row[7]).trim(),
            sub_id: String(row[10]).replace(/'/g, "").trim(),
            matched: false
          });
        }
      }
      
      let inserted = 0;
      let updated = 0;
      let triggeredRewards = [];
      
      // Đọc toàn bộ Sub ID (cột K) để đếm số đơn của người này
      let subIdCounts = {};
      if (lastRow > 2) {
        const subIds = sheet.getRange(3, 11, lastRow - 2, 1).getValues();
        for (let i = 0; i < subIds.length; i++) {
          const sId = String(subIds[i][0]).replace(/'/g, "").trim();
          if (sId) {
            subIdCounts[sId] = (subIdCounts[sId] || 0) + 1;
          }
        }
      }
      
      for (let order of orders) {
        const cleanOrderSn = String(order.order_sn).trim();
        const cleanItemName = String(order.item_name).trim();
        const incomingComm = parseInt(order.commission, 10) || 0;
        
        // Hàm hỗ trợ kiểm tra khớp mã đơn hàng (hỗ trợ so khớp 15 số Lazada với 20 số trên Sheet)
        const isOrderSnMatch = (sheetSn, incomingSn) => {
          if (sheetSn === incomingSn) return true;
          if (sheetSn.length === 15 && incomingSn.startsWith(sheetSn)) return true;
          if (incomingSn.length === 15 && sheetSn.startsWith(incomingSn)) return true;
          return false;
        };
        
        // Bước 1: Tìm dòng khớp chính xác cả Mã đơn, Tên sản phẩm và Số tiền hoa hồng (chưa được match)
        let match = existingRows.find(r => 
          !r.matched && 
          isOrderSnMatch(r.order_sn, cleanOrderSn) && 
          r.item_name === cleanItemName && 
          r.commission === incomingComm
        );
        
        // Bước 2: Nếu không khớp tiền, tìm dòng khớp Mã đơn và Tên sản phẩm (chưa được match)
        if (!match) {
          match = existingRows.find(r => 
            !r.matched && 
            isOrderSnMatch(r.order_sn, cleanOrderSn) && 
            r.item_name === cleanItemName
          );
        }
        
        // Bước 3: Nếu vẫn không khớp tên, tìm dòng khớp Mã đơn (chưa được match) làm dự phòng
        if (!match) {
          match = existingRows.find(r => 
            !r.matched && 
            isOrderSnMatch(r.order_sn, cleanOrderSn)
          );
        }
        
        if (match) {
          match.matched = true;
          const existingRowIndex = match.rowIndex;
          
          // Đã tồn tại -> Cập nhật cột Hoa Hồng (cột 5) và Trạng Thái (cột 8)
          sheet.getRange(existingRowIndex, 5).setValue(order.commission);
          sheet.getRange(existingRowIndex, 8).setValue(order.checkout_status);
          
          // Cập nhật Tên sản phẩm nếu trước đó chưa đúng hoặc trống
          if ((!match.item_name || match.item_name === "undefined") && order.item_name) {
            sheet.getRange(existingRowIndex, 4).setValue(order.item_name);
          }
          
          // Chỉ cập nhật Sub ID nếu trên Sheet chưa có Sub ID cũ và dữ liệu mới gửi lên có Sub ID
          let existingSubId = sheet.getRange(existingRowIndex, 11).getValue();
          if (!existingSubId && order.sub_id) {
            existingSubId = order.sub_id;
            sheet.getRange(existingRowIndex, 11).setValue("'" + order.sub_id);
          }
          updated++;
          
          // --- XỬ LÝ KHUYẾN MẠI GIỚI THIỆU THÀNH VIÊN MỚI PHÁT SINH ĐƠN ĐẦU ---
          const cleanSubId = order.sub_id ? String(order.sub_id).replace(/'/g, "").trim() : String(existingSubId).replace(/'/g, "").trim();
          const orderStatusLower = String(order.checkout_status).trim().toLowerCase();
          const isCompleted = (orderStatusLower === 'completed' || orderStatusLower === 'waiting for payment' || orderStatusLower === 'hoàn thành');
          
          if (cleanSubId && isCompleted) {
            // Kiểm tra ngày áp dụng (từ 1/7/2026)
            let isApplicableDate = false;
            try {
              if (order.report_date) {
                const orderParts = order.report_date.split("-");
                if (orderParts.length === 3) {
                  const oYear = parseInt(orderParts[0], 10);
                  const oMonth = parseInt(orderParts[1], 10);
                  const oDay = parseInt(orderParts[2], 10);
                  if (oYear > 2026 || (oYear === 2026 && oMonth > 7) || (oYear === 2026 && oMonth === 7 && oDay >= 1)) {
                    isApplicableDate = true;
                  }
                }
              }
            } catch(e){}
            
            if (isApplicableDate) {
              const rewardAdded = checkAndTriggerReferralReward(ss, sheet, cleanSubId, order.report_date, triggeredRewards);
              if (rewardAdded) {
                inserted += rewardAdded;
              }
            }
          }
        } else {
          // Chưa tồn tại -> Thêm hàng mới vào cuối
          const targetRowIndex = Math.max(lastRow, 2) + inserted + 1;
          const rowData = [
            order.report_date,
            `=IFERROR(XLOOKUP(K${targetRowIndex};'Thanh toán hoa hồng'!B:B;'Thanh toán hoa hồng'!A:A;"");"")`,
            order.order_sn,
            order.item_name,
            order.commission,
            `=E${targetRowIndex}*0,9`,
            `=E${targetRowIndex}*0,9*0,8`,
            order.checkout_status,
            "Chưa TT",
            `=E${targetRowIndex}*0,9*0,2`,
            order.sub_id ? "'" + order.sub_id : ""
          ];
          const targetRange = sheet.getRange(targetRowIndex, 1, 1, rowData.length);
          targetRange.setValues([rowData]);
          if (targetRowIndex > 3) {
            const sourceRange = sheet.getRange(3, 1, 1, rowData.length);
            sourceRange.copyTo(targetRange, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
            sourceRange.copyTo(targetRange, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
          }
          
          // Thêm dòng mới vào danh sách đối soát tạm thời
          existingRows.push({
            rowIndex: targetRowIndex,
            report_date: order.report_date,
            order_sn: cleanOrderSn,
            item_name: cleanItemName,
            commission: incomingComm,
            checkout_status: order.checkout_status,
            sub_id: order.sub_id ? String(order.sub_id).trim() : "",
            matched: true
          });
          inserted++;
          
          // --- XỬ LÝ KHUYẾN MẠI GIỚI THIỆU THÀNH VIÊN MỚI PHÁT SINH ĐƠN ĐẦU ---
          if (order.sub_id) {
            const cleanSubId = String(order.sub_id).replace(/'/g, "").trim();
            const orderStatusLower = String(order.checkout_status).trim().toLowerCase();
            const isCompleted = (orderStatusLower === 'completed' || orderStatusLower === 'waiting for payment' || orderStatusLower === 'hoàn thành');
            
            if (isCompleted) {
              // Chỉ áp dụng thưởng từ ngày 1/7/2026
              let isApplicableDate = false;
              try {
                if (order.report_date) {
                  const orderParts = order.report_date.split("-");
                  if (orderParts.length === 3) {
                    const oYear = parseInt(orderParts[0], 10);
                    const oMonth = parseInt(orderParts[1], 10);
                    const oDay = parseInt(orderParts[2], 10);
                    if (oYear > 2026 || (oYear === 2026 && oMonth > 7) || (oYear === 2026 && oMonth === 7 && oDay >= 1)) {
                      isApplicableDate = true;
                    }
                  }
                }
              } catch(e){}
              
              if (isApplicableDate) {
                const rewardAdded = checkAndTriggerReferralReward(ss, sheet, cleanSubId, order.report_date, triggeredRewards);
                if (rewardAdded) {
                  inserted += rewardAdded;
                }
              }
            }
          }
        }
      }
      
      // Đảm bảo toàn bộ phần dữ liệu (từ hàng 3 trở đi) không bị in đậm
      const finalLastRow = sheet.getLastRow();
      if (finalLastRow > 2) {
        sheet.getRange(3, 1, finalLastRow - 2, 11).setFontWeight("normal");
        
        // Tự động khôi phục định dạng và danh sách chọn từ dòng 3 cho tất cả các dòng
        try {
          if (finalLastRow >= 4) {
            const sourceRange = sheet.getRange(3, 1, 1, 11);
            const targetRange = sheet.getRange(4, 1, finalLastRow - 3, 11);
            sourceRange.copyTo(targetRange, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
            sourceRange.copyTo(targetRange, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
          }
        } catch(e) {
          console.error("Lỗi tự động khôi phục định dạng: " + e.toString());
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        inserted: inserted,
        updated: updated,
        triggeredRewards: triggeredRewards
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function unifiedSearch(query, startDateStr, endDateStr) {
  try {
    if (!query || String(query).trim() === '') {
      return { success: false, error: 'Vui lòng nhập mã đơn hàng hoặc tên Zalo' };
    }
    
    const cleanQuery = String(query).trim();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Dữ liệu nạp tự động");
    if (!sheet) {
      return { success: false, error: 'Hệ thống chưa có dữ liệu.' };
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 3) {
      return { success: false, error: 'Không tìm thấy dữ liệu' };
    }
    
    const dataRange = sheet.getRange(3, 1, lastRow - 2, 10);
    const data = dataRange.getValues();
    
    // Tách các mã đơn hàng có thể có (bằng dấu phẩy)
    const possibleOrderIds = cleanQuery.split(',').map(id => id.trim()).filter(id => id !== '');
    
    // Thử tìm chính xác theo mã đơn hàng trước
    let orderMatches = [];
    for (let j = 0; j < possibleOrderIds.length; j++) {
      let currentId = possibleOrderIds[j];
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (String(row[2]).trim() === currentId) {
          let orderStatus = String(row[7]).trim(); // Cột H
          let orderStatusLower = orderStatus.toLowerCase();
          if (orderStatusLower === 'pending') {
            orderStatus = 'Đang chờ xác nhận';
          } else if (orderStatusLower === 'waiting for payment' || orderStatusLower === 'completed') {
            orderStatus = 'Hoàn thành';
          } else if (orderStatusLower === 'invalid' || orderStatusLower === 'cancelled') {
            orderStatus = 'Đơn hủy';
          }
          
          orderMatches.push({
            orderId: currentId,
            itemName: row[3],          // Cột D
            commission: row[6],        // Cột G
            orderStatus: orderStatus,  // Cột H
            paymentStatus: row[8],     // Cột I
            found: true
          });
          break;
        }
      }
    }
    
    // Nếu tìm thấy ít nhất 1 mã đơn hàng khớp chính xác, hoặc nếu chuỗi tìm kiếm có chứa dấu phẩy
    if (orderMatches.length > 0 || (cleanQuery.includes(',') && possibleOrderIds.length > 0)) {
      // Bổ sung các mã không tìm thấy vào kết quả của tra cứu đơn hàng
      for (let j = 0; j < possibleOrderIds.length; j++) {
        const currentId = possibleOrderIds[j];
        const isMatched = orderMatches.some(m => m.orderId === currentId);
        if (!isMatched) {
          orderMatches.push({
            orderId: currentId,
            found: false
          });
        }
      }
      return {
        success: true,
        searchType: 'orderId',
        data: orderMatches
      };
    }
    
    // 2. Nếu không tìm thấy mã đơn hàng khớp chính xác nào, ta thực hiện tìm kiếm theo Tên khách hàng
    const searchName = cleanQuery.toLowerCase();
    const filterStart = startDateStr ? startDateStr.trim() : null;
    const filterEnd = endDateStr ? endDateStr.trim() : null;
    const tz = ss.getSpreadsheetTimeZone();
    
    let customerResults = [];
    let totalCommission = 0;
    let totalReceived = 0;
    let totalPending = 0;
    let totalCompleted = 0;
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nameInCell = String(row[1]).trim().toLowerCase(); // Cột B
      
      let dateValid = true;
      let orderDate = row[0]; // Cột A
      
      let rowDateStr = "";
      if (orderDate instanceof Date) {
        rowDateStr = Utilities.formatDate(orderDate, tz, "yyyy-MM-dd");
      } else {
        let str = String(orderDate).trim();
        let matchYYYY = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
        let matchDD = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        if (matchYYYY) {
          rowDateStr = `${matchYYYY[1]}-${matchYYYY[2].padStart(2, '0')}-${matchYYYY[3].padStart(2, '0')}`;
        } else if (matchDD) {
          rowDateStr = `${matchDD[3]}-${matchDD[2].padStart(2, '0')}-${matchDD[1].padStart(2, '0')}`;
        } else {
          rowDateStr = str;
        }
      }
      
      if (filterStart && rowDateStr < filterStart) dateValid = false;
      if (filterEnd && rowDateStr > filterEnd) dateValid = false;
      
      if (dateValid && nameInCell !== '' && nameInCell.includes(searchName)) {
        let displayDate = "";
        if (orderDate instanceof Date) {
          displayDate = Utilities.formatDate(orderDate, tz, "dd/MM/yyyy");
        } else if (rowDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          let parts = rowDateStr.split('-');
          displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        } else {
          displayDate = String(orderDate).split(' ')[0];
        }

        let orderStatus = String(row[7]).trim(); // Cột H
        let orderStatusLower = orderStatus.toLowerCase();
        if (orderStatusLower === 'pending') orderStatus = 'Đang chờ xác nhận';
        else if (orderStatusLower === 'waiting for payment' || orderStatusLower === 'completed') orderStatus = 'Hoàn thành';
        else if (orderStatusLower === 'invalid' || orderStatusLower === 'cancelled') orderStatus = 'Đơn hủy';
        
        const paymentStatus = String(row[8]).trim(); // Cột I
        const commission = Number(row[6]) || 0; // Cột G
        
        if (orderStatus !== 'Đơn hủy') {
          totalCommission += commission;
          if (paymentStatus === "Đã TT") {
            totalReceived += commission;
          } else {
            if (orderStatus === 'Đang chờ xác nhận') {
              totalPending += commission;
            } else if (orderStatus === 'Hoàn thành') {
              totalCompleted += commission;
            }
          }
        }
        
        customerResults.push({
          orderId: row[2],           // Cột C
          orderDate: displayDate,    // Cột A
          itemName: row[3],          // Cột D
          commission: commission,    // Cột G
          orderStatus: orderStatus,  // Cột H
          paymentStatus: paymentStatus, // Cột I
          customerName: row[1],      // Cột B
          found: true
        });
      }
    }
    
    if (customerResults.length > 0) {
      return {
        success: true,
        searchType: 'customerName',
        data: customerResults,
        summary: {
          totalCommission: totalCommission,
          totalReceived: totalReceived,
          totalPending: totalPending,
          totalCompleted: totalCompleted
        }
      };
    }
    
    // Nếu cả hai đều không tìm thấy
    return { success: false, error: 'Không tìm thấy thông tin phù hợp cho mã đơn hàng hoặc tên khách hàng này.' };
  } catch (err) {
    return { success: false, error: 'Đã xảy ra lỗi hệ thống: ' + err.toString() };
  }
}

// === Hàm phục vụ tra cứu đơn hàng từ Web App ===
function searchOrder(orderIdsStr) {
  try {
    if (!orderIdsStr || String(orderIdsStr).trim() === '') {
      return { success: false, error: 'Vui lòng nhập mã đơn hàng' };
    }
    
    // Tách các mã đơn hàng bằng dấu phẩy và làm sạch
    const orderIds = String(orderIdsStr).split(',').map(id => id.trim()).filter(id => id !== '');
    if (orderIds.length === 0) {
      return { success: false, error: 'Vui lòng nhập mã đơn hàng hợp lệ' };
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Dữ liệu nạp tự động");
    
    if (!sheet) {
      return { success: false, error: 'Hệ thống chưa có dữ liệu.' };
    }
    
    const lastRow = sheet.getLastRow();
    // Dữ liệu bắt đầu từ dòng 3
    if (lastRow < 3) {
      return { success: false, error: 'Không tìm thấy đơn hàng' };
    }
    
    // Đọc toàn bộ dữ liệu từ dòng 3 đến cuối (Đọc 10 cột từ A -> J)
    const dataRange = sheet.getRange(3, 1, lastRow - 2, 10);
    const data = dataRange.getValues();
    
    let results = [];
    
    for (let j = 0; j < orderIds.length; j++) {
      let currentId = orderIds[j];
      let found = false;
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        // Mã đơn hàng ở cột C (index 2)
        if (String(row[2]).trim() === currentId) {
          let orderStatus = String(row[7]).trim(); // Cột H
          
          // Chuyển đổi hiển thị tiếng Việt
          let orderStatusLower = orderStatus.toLowerCase();
          if (orderStatusLower === 'pending') {
            orderStatus = 'Đang chờ xác nhận';
          } else if (orderStatusLower === 'waiting for payment' || orderStatusLower === 'completed') {
            orderStatus = 'Hoàn thành';
          } else if (orderStatusLower === 'invalid' || orderStatusLower === 'cancelled') {
            orderStatus = 'Đơn hủy';
          }
          
          results.push({
            orderId: currentId,
            itemName: row[3],          // Cột D: Tên sản phẩm
            commission: row[6],        // Cột G: Hoa hồng khách nhận
            orderStatus: orderStatus,  // Cột H: Trạng thái đơn hàng (đã dịch)
            paymentStatus: row[8],     // Cột I: Trạng thái thanh toán
            found: true
          });
          found = true;
          break;
        }
      }
      
      if (!found) {
        results.push({
          orderId: currentId,
          found: false
        });
      }
    }
    
    return {
      success: true,
      data: results
    };
  } catch (err) {
    return { success: false, error: 'Đã xảy ra lỗi hệ thống: ' + err.toString() };
  }
}

// === Hàm phục vụ tra cứu theo tên khách hàng ===
function searchCustomer(customerNameStr, startDateStr, endDateStr) {
  try {
    if (!customerNameStr || String(customerNameStr).trim() === '') {
      return { success: false, error: 'Vui lòng nhập tên khách hàng' };
    }
    
    const searchName = String(customerNameStr).trim().toLowerCase();
    
    const filterStart = startDateStr ? startDateStr.trim() : null;
    const filterEnd = endDateStr ? endDateStr.trim() : null;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Dữ liệu nạp tự động");
    const tz = ss.getSpreadsheetTimeZone();
    
    if (!sheet) {
      return { success: false, error: 'Hệ thống chưa có dữ liệu.' };
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 3) {
      return { success: false, error: 'Không tìm thấy dữ liệu' };
    }
    
    const dataRange = sheet.getRange(3, 1, lastRow - 2, 10);
    const data = dataRange.getValues();
    
    let results = [];
    let totalCommission = 0;
    let totalReceived = 0;
    let totalPending = 0;
    let totalCompleted = 0;
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nameInCell = String(row[1]).trim().toLowerCase(); // Cột B
      
      let dateValid = true;
      let orderDate = row[0]; // Cột A
      
      let rowDateStr = "";
      if (orderDate instanceof Date) {
        rowDateStr = Utilities.formatDate(orderDate, tz, "yyyy-MM-dd");
      } else {
        let str = String(orderDate).trim();
        let matchYYYY = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
        let matchDD = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        
        if (matchYYYY) {
          rowDateStr = `${matchYYYY[1]}-${matchYYYY[2].padStart(2, '0')}-${matchYYYY[3].padStart(2, '0')}`;
        } else if (matchDD) {
          rowDateStr = `${matchDD[3]}-${matchDD[2].padStart(2, '0')}-${matchDD[1].padStart(2, '0')}`;
        } else {
          rowDateStr = str;
        }
      }
      
      if (filterStart && rowDateStr < filterStart) dateValid = false;
      if (filterEnd && rowDateStr > filterEnd) dateValid = false;
      
      if (dateValid && nameInCell !== '' && nameInCell.includes(searchName)) {
        let displayDate = "";
        if (orderDate instanceof Date) {
          displayDate = Utilities.formatDate(orderDate, tz, "dd/MM/yyyy");
        } else if (rowDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          let parts = rowDateStr.split('-');
          displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        } else {
          displayDate = String(orderDate).split(' ')[0]; // Fallback
        }

        let orderStatus = String(row[7]).trim(); // Cột H
        let orderStatusLower = orderStatus.toLowerCase();
        if (orderStatusLower === 'pending') orderStatus = 'Đang chờ xác nhận';
        else if (orderStatusLower === 'waiting for payment' || orderStatusLower === 'completed') orderStatus = 'Hoàn thành';
        else if (orderStatusLower === 'invalid' || orderStatusLower === 'cancelled') orderStatus = 'Đơn hủy';
        
        const paymentStatus = String(row[8]).trim(); // Cột I
        const commission = Number(row[6]) || 0; // Cột G
        
        if (orderStatus !== 'Đơn hủy') {
          totalCommission += commission;
          if (paymentStatus === "Đã TT") {
            totalReceived += commission;
          } else {
            if (orderStatus === 'Đang chờ xác nhận') {
              totalPending += commission;
            } else if (orderStatus === 'Hoàn thành') {
              totalCompleted += commission;
            }
          }
        }
        
        results.push({
          orderId: row[2],           // Cột C
          orderDate: displayDate,    // Cột A
          itemName: row[3],          // Cột D
          commission: commission,    // Cột G
          orderStatus: orderStatus,  // Cột H
          paymentStatus: paymentStatus, // Cột I
          customerName: row[1],      // Cột B
          found: true
        });
      }
    }
    
    if (results.length === 0) {
      return { success: false, error: 'Không tìm thấy đơn hàng nào cho khách hàng này.' };
    }
    
    return {
      success: true,
      data: results,
      summary: {
        totalCommission: totalCommission,
        totalReceived: totalReceived,
        totalPending: totalPending,
        totalCompleted: totalCompleted
      }
    };
  } catch (err) {
    return { success: false, error: 'Đã xảy ra lỗi hệ thống: ' + err.toString() };
  }
}

// === Hàm phục vụ tra cứu đơn hàng theo Sub ID và Ngày (Bot Zalo) ===
function getOrdersBySubIdAndDate(subId, dateStr) {
  try {
    if (!subId) {
      return { success: false, error: 'Thiếu Sub ID' };
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Dữ liệu nạp tự động");
    if (!sheet) {
      return { success: false, error: 'Hệ thống chưa có dữ liệu.' };
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 3) {
      return { success: false, error: 'Không tìm thấy dữ liệu.' };
    }
    
    // Đọc đến cột K (Sub ID - index 10)
    const dataRange = sheet.getRange(3, 1, lastRow - 2, 11);
    const data = dataRange.getValues();
    const tz = ss.getSpreadsheetTimeZone();
    
    const searchSubId = String(subId).trim();
    const searchDate = dateStr ? dateStr.trim() : null; // định dạng yyyy-MM-dd
    
    let results = [];
    let totalComm = 0;
    let totalReceived = 0;
    let totalPending = 0;
    let totalCompleted = 0;
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      // Sub ID ở cột K (index 10)
      const rowSubId = String(row[10]).trim().replace(/'/g, ''); // Bỏ dấu nháy đơn bảo mật nếu có
      
      if (rowSubId === searchSubId) {
        let dateValid = true;
        let orderDate = row[0]; // Cột A
        
        let rowDateStr = "";
        if (orderDate instanceof Date) {
          rowDateStr = Utilities.formatDate(orderDate, tz, "yyyy-MM-dd");
        } else {
          let str = String(orderDate).trim();
          let matchYYYY = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
          let matchDD = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
          
          if (matchYYYY) {
            rowDateStr = `${matchYYYY[1]}-${matchYYYY[2].padStart(2, '0')}-${matchYYYY[3].padStart(2, '0')}`;
          } else if (matchDD) {
            rowDateStr = `${matchDD[3]}-${matchDD[2].padStart(2, '0')}-${matchDD[1].padStart(2, '0')}`;
          } else {
            rowDateStr = str;
          }
        }
        
        if (searchDate && rowDateStr !== searchDate) {
          dateValid = false;
        }
        
        if (dateValid) {
          let orderStatus = String(row[7]).trim(); // Cột H
          let orderStatusLower = orderStatus.toLowerCase();
          if (orderStatusLower === 'pending') orderStatus = 'Đang chờ xác nhận';
          else if (orderStatusLower === 'waiting for payment' || orderStatusLower === 'completed') orderStatus = 'Hoàn thành';
          else if (orderStatusLower === 'invalid' || orderStatusLower === 'cancelled') orderStatus = 'Đơn hủy';

          const paymentStatus = String(row[8]).trim(); // Cột I
          const commission = Number(row[6]) || 0; // Cột G (Hoa hồng khách nhận)

          if (orderStatus !== 'Đơn hủy') {
            totalComm += commission;
            if (paymentStatus === "Đã TT") {
              totalReceived += commission;
            } else {
              if (orderStatus === 'Đang chờ xác nhận') {
                totalPending += commission;
              } else if (orderStatus === 'Hoàn thành') {
                totalCompleted += commission;
              }
            }
          }
          
          let displayDate = "";
          if (orderDate instanceof Date) {
            displayDate = Utilities.formatDate(orderDate, tz, "dd/MM/yyyy");
          } else {
            displayDate = rowDateStr;
          }
          
          results.push({
            orderId: row[2], // Cột C
            orderDate: displayDate, // Cột A
            itemName: row[3], // Cột D
            commission: commission,
            orderStatus: row[7], // Cột H
            paymentStatus: row[8] // Cột I (Trạng thái thanh toán: Chưa TT / Đã TT)
          });
        }
      }
    }
    
    return {
      success: true,
      data: results,
      totalCommission: totalComm,
      totalReceived: totalReceived,
      totalPending: totalPending,
      totalCompleted: totalCompleted
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}


// === CÁC HÀM MỚI BỔ SUNG CHO TÍNH NĂNG QUẢN LÝ THANH TOÁN ===

function getPayoutDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const customerSheet = ss.getSheetByName("Thanh toán hoa hồng");
  const orderSheet = ss.getSheetByName("Dữ liệu nạp tự động");
  
  if (!customerSheet || !orderSheet) {
    return { success: false, error: "Thiếu sheet dữ liệu" };
  }
  
  const lastRowCustomer = customerSheet.getLastRow();
  // Đọc đến 12 cột (cột L) để lấy toàn bộ thông tin Tên, ID, QR, Ngân hàng và STK sau khi chèn cột mới
  const customers = lastRowCustomer >= 2 ? customerSheet.getRange(2, 1, lastRowCustomer - 1, 12).getValues() : [];
  
  const lastRowOrder = orderSheet.getLastRow();
  const orders = lastRowOrder >= 3 ? orderSheet.getRange(3, 1, lastRowOrder - 2, 11).getValues() : [];
  
  let userStats = {};
  for (let i = 0; i < orders.length; i++) {
    const subId = String(orders[i][10]).trim().replace(/'/g, ''); // Cột K
    const orderId = String(orders[i][2]).trim(); // Cột C (index 2)
    const status = String(orders[i][7]).trim().toLowerCase(); // Cột H
    const payStatus = String(orders[i][8]).trim(); // Cột I
    const commission = Number(orders[i][6]) || 0; // Cột G
    
    if (!subId) continue;
    if (!userStats[subId]) {
      userStats[subId] = { unpaid: 0, paid: 0, unpaidReferral: 0 };
    }
    
    const isCompleted = (status === 'completed' || status === 'waiting for payment' || status === 'hoàn thành');
    const isReferral = (orderId === "Thưởng GT" || orderId === "Thưởng GT Mốc");

    if (payStatus === "Đã TT") {
      userStats[subId].paid += commission;
    } else if (isCompleted) {
      userStats[subId].unpaid += commission;
      if (isReferral) {
        userStats[subId].unpaidReferral += commission;
      }
    }
  }
  
  let resultList = [];
  for (let i = 0; i < customers.length; i++) {
    const name = customers[i][0];
    const userId = String(customers[i][1]).trim();
    const qrUrl = customers[i][9] || ""; // Cột J (cột thứ 10, index 9)
    const bankBin = customers[i][10] || ""; // Cột K (cột thứ 11, index 10)
    const bankAcc = customers[i][11] || ""; // Cột L (cột thứ 12, index 11)
    
    if (!userId) continue;
    const stats = userStats[userId] || { unpaid: 0, paid: 0, unpaidReferral: 0 };
    
    resultList.push({
      userId: userId,
      userName: name,
      unpaid: stats.unpaid,
      unpaidReferral: stats.unpaidReferral,
      paid: stats.paid,
      qrCodeUrl: qrUrl,
      bankBin: bankBin,
      bankAcc: bankAcc
    });
  }
  
  return { success: true, data: resultList };
}

function saveCustomerQrCode(userId, base64Image) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Thanh toán hoa hồng");
    
    let folder;
    const folders = DriveApp.getFoldersByName("QR_KhachHang");
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder("QR_KhachHang");
    }
    
    const contentType = base64Image.substring(5, base64Image.indexOf(";"));
    const bytes = Utilities.base64Decode(base64Image.split(",")[1]);
    const blob = Utilities.newBlob(bytes, contentType, "QR_" + userId + ".png");
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const downloadUrl = "https://lh3.googleusercontent.com/d/" + file.getId();
    
    const lastRow = sheet.getLastRow();
    const ids = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === String(userId).trim()) {
        // Đặt tiêu đề cho Cột J nếu chưa có
        if (sheet.getRange(1, 10).getValue() !== "Ảnh QR") {
          sheet.getRange(1, 10).setValue("Ảnh QR");
        }
        // Ghi link QR vào Cột J (cột số 10)
        sheet.getRange(i + 2, 10).setValue(downloadUrl);
        return { success: true, qrUrl: downloadUrl };
      }
    }
    return { success: false, error: "Không tìm thấy khách hàng" };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function confirmPayout(userId) {
  try {
    if (!userId) return { success: false, error: "Missing User ID" };
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const orderSheet = ss.getSheetByName("Dữ liệu nạp tự động");
    if (!orderSheet) return { success: false, error: "Sheet 'Dữ liệu nạp tự động' không tồn tại" };
    
    const lastRow = orderSheet.getLastRow();
    if (lastRow < 3) return { success: false, error: "Không có dữ liệu đơn hàng" };
    
    const range = orderSheet.getRange(3, 1, lastRow - 2, 11);
    const data = range.getValues();
    
    const searchSubId = String(userId).trim();
    let updatedCount = 0;
    
    for (let i = 0; i < data.length; i++) {
      const rowSubId = String(data[i][10]).trim().replace(/'/g, ''); // Cột K
      const status = String(data[i][7]).trim().toLowerCase(); // Cột H
      const payStatus = String(data[i][8]).trim(); // Cột I
      
      const isCompleted = (status === 'completed' || status === 'waiting for payment' || status === 'hoàn thành');
      if (rowSubId === searchSubId && isCompleted && payStatus !== "Đã TT") {
        orderSheet.getRange(i + 3, 9).setValue("Đã TT");
        updatedCount++;
      }
    }
    
    return { success: true, updatedCount: updatedCount };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function checkAndTriggerReferralReward(ss, sheet, cleanSubId, orderReportDate, triggeredRewards) {
  if (!cleanSubId) return 0;
  
  let refSheet = ss.getSheetByName("Giới thiệu");
  if (!refSheet) return 0;
  
  const refLastRow = refSheet.getLastRow();
  if (refLastRow < 2) return 0;
  
  const refRange = refSheet.getRange(2, 1, refLastRow - 1, 7);
  const refData = refRange.getValues();
  
  for (let rIdx = 0; rIdx < refData.length; rIdx++) {
    const rowSubId = String(refData[rIdx][1]).replace(/'/g, "").trim();
    const status = String(refData[rIdx][5]).trim();
    
    if (rowSubId === cleanSubId && status === "chờ đơn đầu") {
      // Cập nhật trạng thái thành "đã thưởng" và reset trạng thái thông báo thành rỗng
      refSheet.getRange(rIdx + 2, 6).setValue("đã thưởng");
      refSheet.getRange(rIdx + 2, 7).setValue("");
      
      const referrerId = String(refData[rIdx][3]).replace(/'/g, "").trim();
      const referrerName = String(refData[rIdx][4]).trim();
      const newUserName = String(refData[rIdx][2]).trim();
      
      // Thêm hàng thưởng 10k cho người giới thiệu
      const nextRowIdx = sheet.getLastRow() + 1;
      const rewardRow = [
        orderReportDate,
        `=IFERROR(XLOOKUP(K${nextRowIdx};'Thanh toán hoa hồng'!B:B;'Thanh toán hoa hồng'!A:A;"");"")`,
        "Thưởng GT",
        `Thưởng giới thiệu thành viên mới @${newUserName} phát sinh đơn đầu tiên`,
        13889, // 13889 * 0.9 * 0.8 = 10000đ
        12500, // 13889 * 0.9
        10000, // Nhận đúng 10.000đ
        "Waiting for payment",
        "Chưa TT",
        2500,
        "'" + referrerId
      ];
      const targetRange = sheet.getRange(nextRowIdx, 1, 1, rewardRow.length);
      targetRange.setValues([rewardRow]);
      if (nextRowIdx > 3) {
        const sourceRange = sheet.getRange(3, 1, 1, rewardRow.length);
        sourceRange.copyTo(targetRange, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
        sourceRange.copyTo(targetRange, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
      }
      
      triggeredRewards.push({
        referrerId: referrerId,
        referrerName: referrerName,
        newUserId: cleanSubId,
        newUserName: newUserName
      });
      return 1; // Trả về 1 dòng được thêm mới
    }
  }
  return 0;
}

function saveCustomerBankInfo(userId, bankBin, bankAcc) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Thanh toán hoa hồng");
    if (!sheet) return { success: false, error: "Thiếu sheet dữ liệu" };
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { success: false, error: "Không có dữ liệu khách hàng" };
    
    const ids = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === String(userId).trim()) {
        // Đặt tiêu đề cho Cột K và L nếu chưa có
        if (sheet.getRange(1, 11).getValue() !== "Mã BIN ngân hàng") {
          sheet.getRange(1, 11).setValue("Mã BIN ngân hàng");
        }
        if (sheet.getRange(1, 12).getValue() !== "Số tài khoản") {
          sheet.getRange(1, 12).setValue("Số tài khoản");
        }
        
        sheet.getRange(i + 2, 11).setValue("'" + bankBin);
        sheet.getRange(i + 2, 12).setValue("'" + bankAcc);
        return { success: true };
      }
    }
    return { success: false, error: "Không tìm thấy khách hàng" };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// Hàm bổ trợ giúp khôi phục toàn bộ định dạng và danh sách chọn của cột H, I cho tất cả dòng
function fixAutoSheetFormatting() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Dữ liệu nạp tự động");
  if (!sheet) return "Sheet 'Dữ liệu nạp tự động' không tồn tại!";
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return "Bảng tính trống.";
  
  // Lấy dòng 3 làm nguồn định dạng mẫu
  const sourceRange = sheet.getRange(3, 1, 1, 11);
  
  // Lấy toàn bộ các dòng còn lại từ dòng 4 đến cuối
  const targetRange = sheet.getRange(4, 1, lastRow - 3, 11);
  
  // Sao chép định dạng và xác thực dữ liệu (dropdown) từ dòng 3 xuống
  sourceRange.copyTo(targetRange, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  sourceRange.copyTo(targetRange, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
  
  return "Đã khôi phục định dạng màu sắc và danh sách chọn cho toàn bộ dòng thành công!";
}

// === TỰ ĐỘNG THÊM MENU KHI MỞ BẢNG TÍNH ===
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Menu Hoàn Tiền')
    .addItem('Tính thưởng giới thiệu mốc tháng', 'calculateMonthlyReferralBonusPrompt')
    .addItem('Nâng cấp layout bảng thanh toán', 'upgradeSheetLayoutPrompt')
    .addToUi();
}

// === HIỂN THỊ HỘP THOẠI NHẬP THÁNG/NĂM ===
function calculateMonthlyReferralBonusPrompt() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Tính Thưởng Giới Thiệu Mốc Tháng',
    'Nhập Tháng/Năm muốn tính thưởng (Ví dụ: 7/2026 hoặc 07/2026):',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() === ui.Button.OK) {
    const inputText = response.getResponseText().trim();
    if (!inputText) {
      ui.alert('Lỗi: Bạn chưa nhập thông tin tháng/năm!');
      return;
    }
    
    // Tách tháng và năm
    const parts = inputText.split('/');
    if (parts.length !== 2) {
      ui.alert('Lỗi: Vui lòng nhập đúng định dạng MM/YYYY (Ví dụ: 7/2026)');
      return;
    }
    
    const month = parseInt(parts[0], 10);
    const year = parseInt(parts[1], 10);
    
    if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
      ui.alert('Lỗi: Tháng hoặc năm không hợp lệ!');
      return;
    }
    
    const result = calculateMonthlyReferralBonus(month, year);
    ui.alert(result);
  }
}

// === HÀM TÍNH TOÁN VÀ GHI NHẬN THƯỞNG GIỚI THIỆU MỐC THEO THÁNG ===
function calculateMonthlyReferralBonus(month, year) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const refSheet = ss.getSheetByName("Giới thiệu");
  const dataSheet = ss.getSheetByName("Dữ liệu nạp tự động");
  
  if (!refSheet) return "Lỗi: Không tìm thấy trang 'Giới thiệu'!";
  if (!dataSheet) return "Lỗi: Không tìm thấy trang 'Dữ liệu nạp tự động'!";
  
  const refLastRow = refSheet.getLastRow();
  if (refLastRow < 2) return "Không có dữ liệu trong trang 'Giới thiệu'.";
  
  const dataLastRow = dataSheet.getLastRow();
  if (dataLastRow < 3) return "Không có dữ liệu trong trang 'Dữ liệu nạp tự động'.";
  
  // Đảm bảo ghi nhận tên tiêu đề cột H, I, J nếu chưa có
  const h1Value = String(refSheet.getRange(1, 8).getValue()).trim();
  if (!h1Value) {
    refSheet.getRange(1, 8, 1, 3).setValues([["Số Đơn Người Mới", "Đạt Mốc Thưởng", "Đã TB Mốc"]]);
  }
  
  // 1. Quét danh sách người giới thiệu và người được giới thiệu trong tháng/năm yêu cầu
  const refValues = refSheet.getRange(2, 1, refLastRow - 1, 5).getValues();
  const referrerMap = {}; 
  const nameMap = {};
  
  for (let i = 0; i < refValues.length; i++) {
    const regDateVal = refValues[i][0];
    let regMonth = 0;
    let regYear = 0;
    
    if (regDateVal instanceof Date) {
      regMonth = regDateVal.getMonth() + 1;
      regYear = regDateVal.getFullYear();
    } else if (regDateVal) {
      const regDateStr = String(regDateVal).trim();
      const datePart = regDateStr.split(" ")[0];
      const dateParts = datePart.split("/");
      if (dateParts.length === 3) {
        // Định dạng dd/MM/yyyy
        regMonth = parseInt(dateParts[1], 10);
        regYear = parseInt(dateParts[2], 10);
      } else {
        const parsedDate = new Date(regDateStr);
        if (!isNaN(parsedDate.getTime())) {
          regMonth = parsedDate.getMonth() + 1;
          regYear = parsedDate.getFullYear();
        }
      }
    }
    
    if (regMonth === month && regYear === year) {
      const newUserId = String(refValues[i][1]).replace(/'/g, "").trim();
      const newUserName = String(refValues[i][2]).trim();
      const referrerId = String(refValues[i][3]).replace(/'/g, "").trim();
      const referrerName = String(refValues[i][4]).trim();
      
      if (!referrerId || !newUserId) continue;
      
      nameMap[referrerId] = referrerName;
      nameMap[newUserId] = newUserName;
      
      if (!referrerMap[referrerId]) {
        referrerMap[referrerId] = [];
      }
      referrerMap[referrerId].push({ newUserId: newUserId, rowIdx: i + 2 });
    }
  }
  
  // 2. Quét tất cả đơn hàng và tích lũy hoa hồng của từng người trong tháng/năm đó
  const dataValues = dataSheet.getRange(3, 1, dataLastRow - 2, 11).getValues();
  const userOrderCountMap = {};
  const userCommissionMap = {};
  const targetPrefix = `${year}-${String(month).padStart(2, '0')}`;
  
  for (let i = 0; i < dataValues.length; i++) {
    const orderDateStr = String(dataValues[i][0]).trim(); // Cột A: orderReportDate
    const orderId = String(dataValues[i][2]).trim();      // Cột C: orderId
    const comm = Number(dataValues[i][6]) || 0;            // Cột G: User Share (Hoa hồng thực nhận)
    const status = String(dataValues[i][7]).toLowerCase().trim(); // Cột H: Trạng thái đơn
    const subId = String(dataValues[i][10]).replace(/'/g, "").trim(); // Cột K: subId
    
    if (!subId) continue;
    if (!orderDateStr.startsWith(targetPrefix)) continue;
    if (orderId === "Thưởng GT" || orderId === "Thưởng GT Mốc") continue;
    
    if (status === "completed" || status === "waiting for payment" || status === "hoàn thành" || status === "waiting_for_payment") {
      userOrderCountMap[subId] = (userOrderCountMap[subId] || 0) + 1;
    }
    
    userCommissionMap[subId] = (userCommissionMap[subId] || 0) + comm;
  }
  
  // 3. Tính toán thưởng cho từng Referrer và lưu vào Dữ liệu nạp tự động
  let addedCount = 0;
  let updatedCount = 0;
  const resultLogs = [];
  
  // Định dạng ngày báo cáo thưởng (ngày cuối của tháng)
  const lastDay = new Date(year, month, 0).getDate();
  const reportDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  
  for (const referrerId in referrerMap) {
    const referralsList = referrerMap[referrerId];
    let validReferralCount = 0;
    const qualifiedNames = [];
    
    for (const ref of referralsList) {
      const orderCount = userOrderCountMap[ref.newUserId] || 0;
      if (orderCount >= 3) {
        validReferralCount++;
        qualifiedNames.push(nameMap[ref.newUserId] || ref.newUserId);
      }
    }
    
    // Tỷ lệ thưởng mốc giới thiệu
    let bonusRate = 0;
    if (validReferralCount >= 20) {
      bonusRate = 0.20;
    } else if (validReferralCount >= 15) {
      bonusRate = 0.15;
    } else if (validReferralCount >= 10) {
      bonusRate = 0.10;
    } else if (validReferralCount >= 5) {
      bonusRate = 0.05;
    }

    // --- Cập nhật cột H, I, J trên sheet 'Giới thiệu' ---
    for (let rIdx = 0; rIdx < referralsList.length; rIdx++) {
      const ref = referralsList[rIdx];
      const rowIdx = ref.rowIdx;
      const rangeH = refSheet.getRange(rowIdx, 8);
      rangeH.setFormula(`=IF(ISBLANK(B${rowIdx}); ""; COUNTIFS('Dữ liệu nạp tự động'!K:K; B${rowIdx}; 'Dữ liệu nạp tự động'!H:H; "<>cancelled"; 'Dữ liệu nạp tự động'!A:A; ">="&DATE(YEAR(A${rowIdx}); MONTH(A${rowIdx}); 1); 'Dữ liệu nạp tự động'!A:A; "<="&EOMONTH(A${rowIdx}; 0)))`);
      rangeH.setBackground(null); // Để định dạng có điều kiện tự tô màu
      
      const rangeI = refSheet.getRange(rowIdx, 9);
      const rangeJ = refSheet.getRange(rowIdx, 10);
      
      // Chỉ ghi nhận thưởng mốc cho dòng đầu tiên của người giới thiệu này trong tháng
      if (rIdx === 0 && bonusRate > 0) {
        const currentBonusRateStr = String(rangeI.getValue()).trim();
        const currentAnnounced = String(rangeJ.getValue()).trim();
        const targetRateStr = `${bonusRate * 100}%`;
        
        rangeI.setValue(targetRateStr).setBackground(null).setFontColor(null).setFontWeight(null);
        
        let finalAnnounceStatus = currentAnnounced;
        if (currentBonusRateStr !== targetRateStr || (currentAnnounced !== "y" && currentAnnounced !== "đã thông báo")) {
          finalAnnounceStatus = "chờ thông báo";
        }
        rangeJ.setValue(finalAnnounceStatus).setBackground(null).setFontColor(null).setFontWeight(null);
      } else {
        rangeI.setValue("").setBackground(null).setFontColor(null).setFontWeight(null);
        rangeJ.setValue(bonusRate > 0 ? "n/a" : "").setBackground(null).setFontColor(null).setFontWeight(null);
      }
    }
    
    if (bonusRate === 0) continue; // Không đạt mốc tối thiểu 5 người
    
    const referrerComm = userCommissionMap[referrerId] || 0;
    if (referrerComm <= 0) {
      resultLogs.push(`- @${nameMap[referrerId] || referrerId}: Đạt mốc ${validReferralCount} người nhưng không phát sinh hoa hồng cá nhân để nhận thưởng thêm.`);
      continue;
    }
    
    const bonusAmount = Math.round(referrerComm * (bonusRate / 0.8));
    
    // Kiểm tra trùng lặp
    let alreadyRewarded = false;
    let existingRowIndex = -1;
    
    for (let i = 0; i < dataValues.length; i++) {
      const orderId = String(dataValues[i][2]).trim();
      const subId = String(dataValues[i][10]).replace(/'/g, "").trim();
      const desc = String(dataValues[i][3]).trim();
      
      if (orderId === "Thưởng GT Mốc" && subId === referrerId && desc.includes(`Tháng ${month}/${year}`)) {
        alreadyRewarded = true;
        existingRowIndex = i + 3;
        break;
      }
    }
    
    const nextRowIdx = alreadyRewarded ? existingRowIndex : dataSheet.getLastRow() + 1;
    
    // Quy đổi ngược về Raw Shopee commission và hoa hồng nhóm (20%):
    // bonusAmount = Raw * 0.9 * 0.8
    // Raw Shopee commission = Math.round(bonusAmount / 0.72)
    // Commission after tax = Math.round(Raw Shopee commission * 0.9)
    // Group share = Raw Shopee commission - Commission after tax
    const rawShopeeComm = Math.round(bonusAmount / 0.72);
    const commAfterTax = Math.round(rawShopeeComm * 0.9);
    const groupShare = rawShopeeComm - commAfterTax;
    
    const rewardRow = [
      reportDateStr,
      `=IFERROR(XLOOKUP(K${nextRowIdx};'Thanh toán hoa hồng'!B:B;'Thanh toán hoa hồng'!A:A;"");"")`,
      "Thưởng GT Mốc",
      `Thưởng giới thiệu mốc ${validReferralCount} người - Tháng ${month}/${year} (${bonusRate*100}% hoa hồng)`,
      rawShopeeComm,
      commAfterTax,
      bonusAmount,
      "completed",
      "Chưa TT",
      groupShare,
      "'" + referrerId
    ];
    
    const targetRange = dataSheet.getRange(nextRowIdx, 1, 1, rewardRow.length);
    targetRange.setValues([rewardRow]);
    
    if (!alreadyRewarded) {
      if (nextRowIdx > 3) {
        const sourceRange = dataSheet.getRange(3, 1, 1, rewardRow.length);
        sourceRange.copyTo(targetRange, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
        sourceRange.copyTo(targetRange, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
      }
      addedCount++;
    } else {
      updatedCount++;
    }
    
    resultLogs.push(`- @${nameMap[referrerId] || referrerId}: Nhận thêm ${bonusRate*100}% = ${bonusAmount.toLocaleString("vi-VN")}đ (Giới thiệu thành công ${validReferralCount} người: ${qualifiedNames.join(", ")})`);
  }
  
  // Tự động thiết lập quy tắc định dạng có điều kiện (tô màu trạng thái tự động)
  try {
    applyConditionalFormattingToIntroSheet(refSheet);
  } catch (e) {
    console.error("Lỗi thiết lập định dạng có điều kiện: " + e.toString());
  }

  if (resultLogs.length === 0) {
    return `Kết quả tính thưởng tháng ${month}/${year}:\nKhông có thành viên nào đạt mốc tối thiểu 5 người giới thiệu hợp lệ trong tháng.`;
  }
  
  return `Kết quả tính thưởng tháng ${month}/${year}:\n` +
         `Đã thêm mới: ${addedCount} dòng, cập nhật đè: ${updatedCount} dòng.\n\n` +
         `Chi tiết:\n` + resultLogs.join("\n");
}

// === TỰ ĐỘNG THIẾT LẬP QUY TẮC ĐỊNH DẠNG CÓ ĐIỀU KIỆN CHO TRANG GIỚI THIỆU ===
function applyConditionalFormattingToIntroSheet(refSheet) {
  refSheet.clearConditionalFormatRules();
  
  const rules = [];
  
  // 1. Cột F (Trạng thái) === "đã thưởng" -> Xanh lá cây đậm, chữ trắng
  const ruleF1 = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("đã thưởng")
    .setBackground("#107c41")
    .setFontColor("#ffffff")
    .setRanges([refSheet.getRange("F2:F")])
    .build();
  rules.push(ruleF1);
  
  // 2. Cột F (Trạng thái) === "chờ đơn đầu" -> Vàng/Cam đất, chữ đen
  const ruleF2 = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("chờ đơn đầu")
    .setBackground("#fce8b2")
    .setFontColor("#000000")
    .setRanges([refSheet.getRange("F2:F")])
    .build();
  rules.push(ruleF2);
  
  // 3. Cột G (Đã Thông Báo) === "y" -> Xanh lá cây đậm, chữ trắng
  const ruleG1 = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("y")
    .setBackground("#107c41")
    .setFontColor("#ffffff")
    .setRanges([refSheet.getRange("G2:G")])
    .build();
  rules.push(ruleG1);
  
  // 4. Cột H (Số Đơn Người Mới) >= 3 -> Xanh lá cây đậm, chữ trắng
  const ruleH1 = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThanOrEqualTo(3)
    .setBackground("#107c41")
    .setFontColor("#ffffff")
    .setRanges([refSheet.getRange("H2:H")])
    .build();
  rules.push(ruleH1);

  // 5. Cột H (Số Đơn Người Mới) từ 1 đến 2 -> Vàng/Cam đất, chữ đen
  const ruleH2 = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberBetween(1, 2)
    .setBackground("#fce8b2")
    .setFontColor("#000000")
    .setRanges([refSheet.getRange("H2:H")])
    .build();
  rules.push(ruleH2);
  
  // 6. Cột I (Đạt Mốc Thưởng) chứa ký tự "%" -> Vàng/Cam đất, chữ đen đậm
  const ruleI1 = SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains("%")
    .setBackground("#fce8b2")
    .setFontColor("#000000")
    .setBold(true)
    .setRanges([refSheet.getRange("I2:I")])
    .build();
  rules.push(ruleI1);
  
  // 7. Cột J (Đã TB Mốc) === "y" -> Xanh lá cây đậm, chữ trắng
  const ruleJ1 = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("y")
    .setBackground("#107c41")
    .setFontColor("#ffffff")
    .setRanges([refSheet.getRange("J2:J")])
    .build();
  rules.push(ruleJ1);
  
  // 8. Cột J (Đã TB Mốc) === "chờ thông báo" -> Đỏ đậm, chữ trắng đậm
  const ruleJ2 = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("chờ thông báo")
    .setBackground("#cc0000")
    .setFontColor("#ffffff")
    .setBold(true)
    .setRanges([refSheet.getRange("J2:J")])
    .build();
  rules.push(ruleJ2);
  
  // 9. Cột J (Đã TB Mốc) === "n/a" -> Xám nhạt, chữ xám đậm
  const ruleJ3 = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("n/a")
    .setBackground("#f3f3f3")
    .setFontColor("#595959")
    .setRanges([refSheet.getRange("J2:J")])
    .build();
  rules.push(ruleJ3);
  
  refSheet.setConditionalFormatRules(rules);
}

// === HIỂN THỊ HỘP THOẠI XÁC NHẬN NÂNG CẤP LAYOUT BẢNG THANH TOÁN ===
function upgradeSheetLayoutPrompt() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Nâng Cấp Layout Bảng Thanh Toán',
    'Bạn có chắc chắn muốn chèn thêm 2 cột "% Thưởng Mốc" và "Thưởng Mốc Tháng" vào bảng Thanh toán hoa hồng?',
    ui.ButtonSet.YES_NO
  );
  if (response === ui.Button.YES) {
    try {
      const result = upgradeSheetLayoutInternal();
      ui.alert(result);
    } catch (e) {
      ui.alert("Lỗi: " + e.toString());
    }
  }
}

// === THỰC HIỆN NÂNG CẤP LAYOUT BẢNG THANH TOÁN ===
function upgradeSheetLayoutInternal() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Thanh toán hoa hồng");
  if (!sheet) {
    throw new Error("Không tìm thấy trang 'Thanh toán hoa hồng'!");
  }
  
  // Kiểm tra xem đã chèn cột mới chưa, nếu chưa thì chèn 2 cột vào vị trí cột E (cột số 5)
  if (sheet.getRange(1, 5).getValue() !== "% Thưởng Mốc") {
    sheet.insertColumnsBefore(5, 2);
  }
  
  // Xoá nội dung ở cột cũ trước khi định vị lại để tránh rác công thức
  sheet.getRange("H1:I1").clearContent();

  // Đổi tiêu đề các cột theo yêu cầu mới
  sheet.getRange(1, 3).setValue("Hoa Hồng Đơn Hàng");
  sheet.getRange(1, 4).setValue("Thưởng Giới Thiệu");
  sheet.getRange(1, 5).setValue("% Thưởng Mốc");
  sheet.getRange(1, 6).setValue("Thưởng Mốc Tháng");
  sheet.getRange(1, 7).setValue("Cần Thanh Toán");
  sheet.getRange(1, 8).setValue("Tổng Cần Thanh Toán ="); // Cột H
  sheet.getRange(1, 9).setFormula("=SUM(G2:G)"); // Cột I (Tổng tiền = sum of G2:G)
  sheet.getRange(1, 10).setValue("Ảnh QR"); // Cột J
  sheet.getRange(1, 11).setValue("Mã BIN ngân hàng"); // Cột K
  sheet.getRange(1, 12).setValue("Số tài khoản"); // Cột L
  
  // Định dạng phần Tổng thanh toán ở cột H1 và I1
  sheet.getRange("H1:I1").setFontWeight("bold").setBackground("#f3f3f3");
  sheet.getRange("I1").setNumberFormat("#,##0đ");
  
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    for (let r = 2; r <= lastRow; r++) {
      sheet.getRange(r, 3).setFormula(`=SUMIFS('Dữ liệu nạp tự động'!G:G; 'Dữ liệu nạp tự động'!K:K; B${r}; 'Dữ liệu nạp tự động'!C:C; "<>Thưởng GT"; 'Dữ liệu nạp tự động'!C:C; "<>Thưởng GT Mốc"; 'Dữ liệu nạp tự động'!H:H; "waiting for payment"; 'Dữ liệu nạp tự động'!I:I; "Chưa TT") + SUMIFS('Dữ liệu nạp tự động'!G:G; 'Dữ liệu nạp tự động'!K:K; B${r}; 'Dữ liệu nạp tự động'!C:C; "<>Thưởng GT"; 'Dữ liệu nạp tự động'!C:C; "<>Thưởng GT Mốc"; 'Dữ liệu nạp tự động'!H:H; "completed"; 'Dữ liệu nạp tự động'!I:I; "Chưa TT") + SUMIFS('Dữ liệu nạp tự động'!G:G; 'Dữ liệu nạp tự động'!K:K; B${r}; 'Dữ liệu nạp tự động'!C:C; "<>Thưởng GT"; 'Dữ liệu nạp tự động'!C:C; "<>Thưởng GT Mốc"; 'Dữ liệu nạp tự động'!H:H; "hoàn thành"; 'Dữ liệu nạp tự động'!I:I; "Chưa TT")`);
      sheet.getRange(r, 4).setFormula(`=SUMIFS('Dữ liệu nạp tự động'!G:G; 'Dữ liệu nạp tự động'!K:K; B${r}; 'Dữ liệu nạp tự động'!C:C; "Thưởng GT"; 'Dữ liệu nạp tự động'!I:I; "Chưa TT")`);
      sheet.getRange(r, 5).setFormula(`=IFERROR(XLOOKUP(B${r};'Giới thiệu'!D:D;'Giới thiệu'!I:I;"";0;-1);"")`);
      sheet.getRange(r, 6).setFormula(`=SUMIFS('Dữ liệu nạp tự động'!G:G; 'Dữ liệu nạp tự động'!K:K; B${r}; 'Dữ liệu nạp tự động'!C:C; "Thưởng GT Mốc"; 'Dữ liệu nạp tự động'!I:I; "Chưa TT")`);
      sheet.getRange(r, 7).setFormula(`=C${r}+D${r}+F${r}`);
      
      sheet.getRange(r, 6).setNumberFormat("#,##0đ");
      sheet.getRange(r, 7).setNumberFormat("#,##0đ");
    }
  }
  return "Đã tự động chèn thêm 2 cột mới và điền công thức thành công!";
}


// ==========================================
// CÁC HÀM HỖ TRỢ CHUYỂN ĐỔI LINK HOÀN TIỀN TỰ ĐỘNG
// ==========================================

// Hàm chuyển link hoàn tiền tự động (Shopee rút gọn, Lazada không rút gọn)
function convertLinkAndGetCommission(productUrl, subId) {
  // --- XỬ LÝ LẤY LINK VÀ GIÁ TIKTOK SHOP THỰC TẾ QUA RIOHUB API ---
  const isTikTok = productUrl.indexOf("tiktok.com") !== -1 || productUrl.indexOf("vt.tiktok.com") !== -1;
  if (isTikTok) {
    var rioRes = convertTikTokLinkWithRio(productUrl, subId);
    if (rioRes && rioRes.success) {
      return rioRes;
    }
  }
  try {
    let productName = "";
    let price = 0;
    let rate = 0;
    let value = 0;
    let shortLink = "";
    let affiliateLink = "";
    let imageUrl = "";
    
    // 1. Kiểm tra loại sàn để tạo Link Affiliate chính chủ
    const isLazada = productUrl.indexOf("lazada.vn") !== -1 || productUrl.indexOf("lzd.co") !== -1 || productUrl.indexOf("s.lazada") !== -1;
    
    if (isLazada) {
      // --- XỬ LÝ LẤY LINK VÀ GIÁ LAZADA TỰ ĐỘNG ---
      let resolvedUrl = null;
      
      // Bước A: Cào thông tin sản phẩm (name, image) trực tiếp từ short link trước để tránh bot-blocked
      try {
        const shortRes = UrlFetchApp.fetch(productUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
          muteHttpExceptions: true
        });
        if (shortRes.getResponseCode() === 200) {
          const html = shortRes.getContentText();
          const titleMatch = html.match(/property="og:title"\s+content="([^"]+)"/i) || 
                             html.match(/content="([^"]+)"\s+property="og:title"/i);
          const imgMatch = html.match(/property="og:image"\s+content="([^"]+)"/i) || 
                           html.match(/content="([^"]+)"\s+property="og:image"/i);
          if (titleMatch) {
            let rawTitle = titleMatch[1];
            rawTitle = rawTitle.replace(/^(?:\u200b)?Thủ tục thanh toán\s+/i, "");
            rawTitle = rawTitle.replace(/\s*Mua ngay tại Lazada!\s*$/i, "");
            productName = rawTitle.trim();
          }
          if (imgMatch) {
            imageUrl = imgMatch[1];
          }
        }
      } catch(eShort) {}

      // Bước B: Gọi API AddLiveTag để giải mã link và lấy tỷ lệ hoa hồng chính thức
      try {
        const configPayload = "save_config=1&app_key=105827&app_secret=r8ZMKhPxu1JZUCwTUBVMJiJnZKjhWeQF&user_token=c114183301c74ba3be1f69ad58a53b23&base_url=https%3A%2F%2Fapi.lazada.vn";
        const configRes = UrlFetchApp.fetch("https://addlivetag.com/lazada-affiliate-api/", {
          method: "post",
          contentType: "application/x-www-form-urlencoded",
          payload: configPayload,
          muteHttpExceptions: true
        });
        
        let cookieHeader = "";
        const allHeaders = configRes.getAllHeaders();
        if (allHeaders["Set-Cookie"]) {
          cookieHeader = Array.isArray(allHeaders["Set-Cookie"]) ? allHeaders["Set-Cookie"].join("; ") : allHeaders["Set-Cookie"];
        }

        const linkPayload = "action=get_tracking_link&product_input=" + encodeURIComponent(productUrl);
        const linkRes = UrlFetchApp.fetch("https://addlivetag.com/lazada-affiliate-api/", {
          method: "post",
          contentType: "application/x-www-form-urlencoded",
          headers: {
            "X-Requested-With": "XMLHttpRequest",
            "Cookie": cookieHeader
          },
          payload: linkPayload,
          muteHttpExceptions: true
        });

        if (linkRes.getResponseCode() === 200) {
          const json = JSON.parse(linkRes.getContentText());
          if (json.analysis && json.analysis.resolved_url) {
            resolvedUrl = json.analysis.resolved_url;
          }
          if (json.data && json.data.result && json.data.result.data) {
            const list = json.data.result.data.productBatchGetLinkInfoList || [];
            if (list.length > 0) {
              const item = list[0];
              const commStr = item.regularCommission || item.offerCommission || "";
              const rVal = parseFloat(commStr.replace("%", "").replace(",", ".")) || 0;
              if (rVal > 0) rate = rVal;
              if (item.regularPromotionLink || item.promotionLink) {
                affiliateLink = item.regularPromotionLink || item.promotionLink;
              }
              if (item.productName && !productName) productName = item.productName;
            }
          }
        }
      } catch(eApi) {}

      if (affiliateLink) {
        // Chuẩn hóa slug về affiliate chính chủ của sếp (s.nqOJ2)
        const slugMatch = affiliateLink.match(/s\.lazada\.vn\/s\.([a-zA-Z0-9]+)/i);
        if (slugMatch) {
          const currentSlug = slugMatch[1];
          if (currentSlug !== "nqOJ2") {
            affiliateLink = affiliateLink.replace("s.lazada.vn/s." + currentSlug, "s.lazada.vn/s.nqOJ2");
          }
        }
        // Đảm bảo có sub_aff_id
        if (subId && affiliateLink.indexOf("sub_aff_id") === -1) {
          const separator = affiliateLink.indexOf("?") === -1 ? "?" : "&";
          affiliateLink = affiliateLink + separator + "sub_aff_id=" + subId;
        }
      } else {
        let tParam = "";
        let match = productUrl.match(/[?&]t=([^&]+)/);
        if (match) tParam = match[1];
        if (tParam) {
          affiliateLink = "https://s.lazada.vn/s.nqOJ2?c=d&t=" + tParam + "&sub_aff_id=" + subId;
        } else {
          let tRes = "";
          if (resolvedUrl) {
            let matchRes = resolvedUrl.match(/[?&]t=([^&]+)/);
            if (matchRes) tRes = matchRes[1];
          }
          if (tRes) {
            affiliateLink = "https://s.lazada.vn/s.nqOJ2?c=d&t=" + tRes + "&sub_aff_id=" + subId;
          } else {
            let link = productUrl;
            if (subId && link.indexOf("sub_aff_id") === -1) {
              const separator = link.indexOf("?") === -1 ? "?" : "&";
              link = link + separator + "sub_aff_id=" + subId;
            }
            affiliateLink = link;
          }
        }
      }
      shortLink = affiliateLink;

      // Lấy hoa hồng cached nếu có
      if (rate === 0 || rate === 8.0) {
        try {
          var key1 = "lazada_rate_" + encodeURIComponent(productUrl);
          var key2 = "lazada_rate_" + encodeURIComponent(productUrl.split('?')[0]);
          var cachedRate = CacheService.getScriptCache().get(key1) || CacheService.getScriptCache().get(key2);
          if (!cachedRate) {
            cachedRate = PropertiesService.getScriptProperties().getProperty(key1) || PropertiesService.getScriptProperties().getProperty(key2);
          }
          if (cachedRate) rate = parseFloat(cachedRate) || estimateLazadaRate(productName);
          else rate = estimateLazadaRate(productName);
        } catch(eRate) { rate = estimateLazadaRate(productName); }
      }

      // Bước C: Nếu là link dài hoặc chưa lấy được tên từ short link, thử cào từ resolvedUrl hoặc tự động parse từ URL path
      if (!productName) {
        const checkUrl = resolvedUrl || productUrl;
        try {
          const matchSlug = checkUrl.match(/\/products\/([a-zA-Z0-9-]+)-i\d+/);
          if (matchSlug) {
            productName = matchSlug[1].replace(/-/g, " ").trim();
            // Viết hoa chữ cái đầu mỗi từ
            productName = productName.replace(/\b\w/g, c => c.toUpperCase());
          }
        } catch(eSlug) {}
      }

      // Trích xuất giá sản phẩm từ trang gốc Lazada (pdpTrackingData) - giữ lại phòng hờ
      try {
        const fetchTarget = resolvedUrl || productUrl;
        const pageRes = UrlFetchApp.fetch(fetchTarget, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
          muteHttpExceptions: true
        });
        if (pageRes.getResponseCode() === 200) {
          const html = pageRes.getContentText();
          const matchPdp = html.match(/var pdpTrackingData = "([\s\S]*?)";/);
          if (matchPdp) {
            try {
              const jsonStr = JSON.parse('"' + matchPdp[1] + '"');
              const pdpData = JSON.parse(jsonStr);
              if (pdpData.pdt_price) {
                price = parseInt(String(pdpData.pdt_price).replace(/[^0-9]/g, ""), 10) || 0;
              }
              if (pdpData.pdt_name && !productName) productName = pdpData.pdt_name;
              if (pdpData.pdt_photo && !imageUrl) {
                imageUrl = pdpData.pdt_photo.indexOf("//") === 0 ? "https:" + pdpData.pdt_photo : pdpData.pdt_photo;
              }
            } catch(eJson) {}
          }
        }
      } catch (ePage) {}

      value = price > 0 && rate > 0 ? Math.round(price * rate / 100) : 0;
    } else {
      // --- XỬ LÝ LẤY LINK SHOPEE (CÓ RÚT GỌN CLOUDFLARE) ---
      const cleanUrl = cleanShopeeUrl(productUrl);
      const affId = "17359760464"; // Mã Shopee Affiliate của sếp
      affiliateLink = "https://s.shopee.vn/an_redir?origin_link=" + encodeURIComponent(cleanUrl) + "&affiliate_id=" + affId + "&sub_id=" + subId;
      
      // Rút gọn link bằng Cloudflare API của sếp
      try {
        const cfUrl = "https://shoppesale.io.vn/create-link-secure-api";
        const cfResponse = UrlFetchApp.fetch(cfUrl, {
          method: "POST",
          contentType: "application/json",
          payload: JSON.stringify({ url: affiliateLink }),
          muteHttpExceptions: true
        });
        
        if (cfResponse.getResponseCode() === 200) {
          const result = JSON.parse(cfResponse.getContentText());
          if (result && result.shortUrl) {
            shortLink = result.shortUrl;
          }
        }
      } catch(e) {}
      
      // Dự phòng nếu Cloudflare lỗi
      if (!shortLink) {
        try {
          const base64Url = Utilities.base64Encode(affiliateLink, Utilities.Charset.UTF_8);
          shortLink = "https://shoppesale.io.vn/?to=" + base64Url;
        } catch (e) {
          shortLink = affiliateLink;
        }
      }
      
      // Tải thông tin hoa hồng Shopee từ AddLiveTag công khai
      try {
        const addLiveTagUrl = "https://addlivetag.com/product/?q=" + encodeURIComponent(productUrl);
        const response = UrlFetchApp.fetch(addLiveTagUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html"
          },
          muteHttpExceptions: true
        });
        
        if (response.getResponseCode() === 200) {
          const html = response.getContentText();
          
          // Parse JSON-LD
          const schemaMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
          if (schemaMatch) {
            try {
              const schema = JSON.parse(schemaMatch[1]);
              if (schema["@type"] === "Product") {
                productName = schema.name || "";
                if (schema.offers && schema.offers.price) {
                  price = parseInt(schema.offers.price, 10) || 0;
                }
              }
            } catch(e) {}
          }
          
          if (!productName) {
            const titleMatch = html.match(/property="og:title"\s+content="([^"]+)"/i) || 
                               html.match(/content="([^"]+)"\s+property="og:image"/i);
            if (titleMatch) {
              const parts = titleMatch[1].split("—");
              productName = parts.length >= 2 ? parts.slice(1).join("—").replace(/\s*\|\s*AddLiveTag/i, "").trim() : titleMatch[1].replace(/\s*\|\s*AddLiveTag/i, "").trim();
            }
          }
          
          // Parse hoa hồng Shopee
          const descMatch = html.match(/<meta name="description" content="([^"]+)"/i);
          if (descMatch) {
            const desc = descMatch[1];
            const commMatch = desc.match(/(?:tổng|tong)\s*([0-9.,]+)\s*[đd]?\s*\(\s*([0-9.,]+)\s*%\s*\)/i);
            if (commMatch) {
              value = parseInt(commMatch[1].replace(/[.,]/g, ""), 10) || 0;
              rate = parseFloat(commMatch[2].replace(",", "."));
            // Trích xuất chuẩn 100% từ affiliate-bot.js
            var nameLower = (productName || "").toLowerCase();
            var isPetProduct = nameLower.indexOf("chó") !== -1 || nameLower.indexOf("mèo") !== -1 ||
              nameLower.indexOf("thú cưng") !== -1 || nameLower.indexOf("pet") !== -1 ||
              nameLower.indexOf("cát vệ sinh") !== -1 || nameLower.indexOf("pate") !== -1 ||
              nameLower.indexOf("royal canin") !== -1 || nameLower.indexOf("whiskas") !== -1 ||
              nameLower.indexOf("ve rận") !== -1;

            var isMotorcycle = nameLower.indexOf("xe máy") !== -1 || nameLower.indexOf("xe may") !== -1 ||
              nameLower.indexOf("ô tô") !== -1 || nameLower.indexOf("o to") !== -1 ||
              nameLower.indexOf("xe hơi") !== -1 || nameLower.indexOf("salaya") !== -1 ||
              nameLower.indexOf("nhông sên") !== -1 || nameLower.indexOf("nhớt") !== -1 ||
              nameLower.indexOf("dầu nhớt") !== -1 || nameLower.indexOf("bao tay") !== -1 ||
              nameLower.indexOf("tay nắm") !== -1 || nameLower.indexOf("kính chiếu hậu") !== -1 ||
              nameLower.indexOf("gương xe") !== -1 || nameLower.indexOf("pô xe") !== -1 ||
              nameLower.indexOf("mũ bảo hiểm") !== -1 || nameLower.indexOf("mu bao hiem") !== -1 ||
              nameLower.indexOf("nón bảo hiểm") !== -1 || nameLower.indexOf("non bao hiem") !== -1;

            if (isPetProduct) {
              rate = 0.0;
              value = 0;
            } else if (isMotorcycle) {
              rate = 3.5;
              if (price > 0) { value = Math.round(price * 0.035); }
            } else {
              rate = 8.0; // Hầu hết các ngành hàng còn lại (điện thoại, mỹ phẩm, mẹ bé, thời trang, gia dụng...) đều được 8%
              if (price > 0) {
                var commCalc = Math.round(price * 0.08);
                value = commCalc > 40000 ? 40000 : commCalc; // Hạn mức tối đa 40.000đ theo affiliate-bot.js
              }
            }
            }
          }
          
          // Parse ảnh sản phẩm Shopee
          const imgMatch = html.match(/property="og:image"\s+content="([^"]+)"/i) || 
                           html.match(/content="([^"]+)"\s+property="og:image"/i);
          if (imgMatch) {
            imageUrl = imgMatch[1];
          }
        }
      } catch (e) {}
    }
    
    return {
      success: true,
      shortLink: shortLink,
      productName: productName || (isLazada ? "Sản phẩm Lazada" : "Sản phẩm Shopee"),
      price: price,
      commissionRate: rate,
      commissionAmount: value,
      imageUrl: imageUrl
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function cleanShopeeUrl(url) {
  try {
    if (url.indexOf("shopee.vn") !== -1) {
      let shopId = "";
      let itemId = "";
      
      const parts = url.split("?")[0].split("/");
      const pathParts = [];
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].trim()) {
          pathParts.push(parts[i].trim());
        }
      }
      
      if (pathParts.length >= 2) {
        const last = pathParts[pathParts.length - 1];
        const prev = pathParts[pathParts.length - 2];
        if (/^\d+$/.test(last) && /^\d+$/.test(prev)) {
          shopId = prev;
          itemId = last;
        }
      }
      
      if (!shopId || !itemId) {
        const match = url.match(/-i\.(\d+)\.(\d+)/) || url.match(/i\.(\d+)\.(\d+)/);
        if (match) {
          shopId = match[1];
          itemId = match[2];
        }
      }
      
      if (shopId && itemId) {
        return "https://shopee.vn/product/" + shopId + "/" + itemId;
      }
    }
    return url.split("?")[0].split("#")[0];
  } catch (e) {
    return url;
  }
}

// Hàm lấy dữ liệu bảng xếp hạng
function getLeaderboardData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Thống kê số lượng lượt mời từ sheet "Giới thiệu"
    const refSheet = ss.getSheetByName("Giới thiệu");
    const inviteMap = {};
    if (refSheet) {
      const refLastRow = refSheet.getLastRow();
      if (refLastRow >= 2) {
        const refData = refSheet.getRange(2, 1, refLastRow - 1, 5).getValues();
        for (let j = 0; j < refData.length; j++) {
          const referrerName = String(refData[j][4]).trim(); // Tên Người Giới Thiệu ở cột E (chỉ số 4)
          if (referrerName && referrerName !== "") {
            inviteMap[referrerName] = (inviteMap[referrerName] || 0) + 1;
          }
        }
      }
    }
    
    // 2. Thống kê hoa hồng và số đơn từ sheet "Dữ liệu nạp tự động"
    const sheet = ss.getSheetByName("Dữ liệu nạp tự động");
    const map = {};
    
    if (sheet) {
      const lastRow = sheet.getLastRow();
      if (lastRow >= 3) {
        const data = sheet.getRange(3, 1, lastRow - 2, 10).getValues();
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const customerName = String(row[1]).trim();
          if (!customerName || customerName === "") continue;
          
          const orderStatus = String(row[7]).trim().toLowerCase();
          if (orderStatus === 'invalid' || orderStatus === 'cancelled' || orderStatus === 'đơn hủy') {
            continue;
          }
          
          const commission = Number(row[6]) || 0;
          
          if (!map[customerName]) {
            map[customerName] = {
              name: customerName,
              commission: 0,
              orderCount: 0,
              inviteCount: 0
            };
          }
          map[customerName].commission += commission;
          map[customerName].orderCount += 1;
        }
      }
    }
    
    // Áp dụng số lượng mời vào kết quả
    for (let name in map) {
      map[name].inviteCount = inviteMap[name] || 0;
    }
    
    // Đảm bảo những người chỉ có lượt mời (chưa phát sinh đơn) vẫn xuất hiện trong danh sách
    for (let referrerName in inviteMap) {
      if (!map[referrerName]) {
        map[referrerName] = {
          name: referrerName,
          commission: 0,
          orderCount: 0,
          inviteCount: inviteMap[referrerName]
        };
      }
    }
    
    const list = Object.values(map);
    // Sắp xếp mặc định theo commission để làm cơ sở ban đầu
    list.sort((a, b) => b.commission - a.commission);
    
    const top20 = list.slice(0, 20); // Mở rộng lấy top 20 thành viên xuất sắc nhất
    return { success: true, data: top20 };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// Hàm dịch chuyển tên Zalo từ Email
function getZaloIdByEmail(email) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  if (!sheet) {
    sheet = ss.insertSheet("Users");
    sheet.appendRow(["Google Email", "Zalo ID", "Linked Date"]);
    return "";
  }
  
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().trim().toLowerCase() === email.trim().toLowerCase()) {
      return data[i][1] ? data[i][1].toString().trim() : "";
    }
  }
  return "";
}

// Lưu hoặc cập nhật liên kết Zalo ID cho một Email
function saveUserLink(email, zaloId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  if (!sheet) {
    sheet = ss.insertSheet("Users");
    sheet.appendRow(["Google Email", "Zalo ID", "Linked Date"]);
  }
  
  var data = sheet.getDataRange().getValues();
  var foundRow = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().trim().toLowerCase() === email.trim().toLowerCase()) {
      foundRow = i + 1;
      break;
    }
  }
  
  if (foundRow !== -1) {
    sheet.getRange(foundRow, 2).setValue(zaloId.toString().trim());
    sheet.getRange(foundRow, 3).setValue(new Date());
  } else {
    sheet.appendRow([email.trim(), zaloId.toString().trim(), new Date()]);
  }
  return true;
}

// Hàm dịch ID Zalo thành tên Zalo
function getZaloNameById(zaloId) {
  if (!zaloId) return "";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  
  for (var s = 0; s < sheets.length; s++) {
    var sh = sheets[s];
    if (sh.getLastRow() > 0 && sh.getLastColumn() > 0) {
      var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
      var idColIdx = -1;
      var nameColIdx = -1;
      
      for (var c = 0; c < headers.length; c++) {
        var h = headers[c] ? headers[c].toString().toUpperCase().trim() : "";
        if (h === "ID ZALO" || h === "ZALO ID") idColIdx = c;
        if (h === "TÊN ZALO" || h === "ZALO NAME") nameColIdx = c;
      }
      
      if (idColIdx !== -1 && nameColIdx !== -1) {
        var data = sh.getDataRange().getValues();
        var targetId = zaloId.toString().trim();
        for (var i = 1; i < data.length; i++) {
          if (data[i][idColIdx]) {
            var cellId = data[i][idColIdx].toString().trim().split(".")[0];
            if (cellId === targetId) {
              return data[i][nameColIdx] ? data[i][nameColIdx].toString().trim() : "";
            }
          }
        }
      }
    }
  }
  return "";
}

// Hàm tìm Email đã liên kết với Zalo ID
function getEmailByZaloId(zaloId) {
  if (!zaloId) return "";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  if (!sheet) return "";
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] && data[i][1].toString().trim() === zaloId.toString().trim()) {
      return data[i][0] ? data[i][0].toString().trim() : "";
    }
  }
  return "";
}

// Hàm đặc biệt để kích hoạt hộp thoại cấp quyền truy cập internet (UrlFetchApp)
function authorizeScript() {
  console.log("Đang kích hoạt yêu cầu cấp quyền...");
  const res = UrlFetchApp.fetch("https://www.google.com");
  console.log("Cấp quyền thành công! Phản hồi từ Google:", res.getResponseCode());
}

// Hàm phân giải link rút gọn (redirect) để lấy link dài gốc
function resolveRedirect(url) {
  try {
    const response = UrlFetchApp.fetch(url, {
      followNewLocation: false,
      muteHttpExceptions: true,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    const headers = response.getHeaders();
    const redirectUrl = headers["Location"] || headers["location"] || "";
    if (redirectUrl) {
      // Đệ quy phân giải nếu vẫn là link rút gọn
      const isShort = redirectUrl.indexOf("shp.ee") !== -1 || 
                      redirectUrl.indexOf("shope.ee") !== -1 || 
                      redirectUrl.indexOf("s.shopee.vn") !== -1 ||
                      redirectUrl.indexOf("lzd.co") !== -1 ||
                      redirectUrl.indexOf("s.lazada.vn") !== -1;
      if (isShort) {
        return resolveRedirect(redirectUrl);
      }
      return redirectUrl;
    }
    return url;
  } catch (e) {
    return url;
  }
}

// Hàm tìm ID Zalo dựa vào tên Zalo từ Google Sheet
function getZaloIdByName(zaloName) {
  if (!zaloName) return "";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var targetName = zaloName.toString().toLowerCase().trim();
  
  for (var s = 0; s < sheets.length; s++) {
    var sh = sheets[s];
    if (sh.getLastRow() > 0 && sh.getLastColumn() > 0) {
      var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
      var idColIdx = -1;
      var nameColIdx = -1;
      
      for (var c = 0; c < headers.length; c++) {
        var h = headers[c] ? headers[c].toString().toUpperCase().trim() : "";
        if (h === "ID ZALO" || h === "ZALO ID") idColIdx = c;
        if (h === "TÊN ZALO" || h === "ZALO NAME") nameColIdx = c;
      }
      
      if (idColIdx !== -1 && nameColIdx !== -1) {
        var data = sh.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
          if (data[i][nameColIdx]) {
            var cellName = data[i][nameColIdx].toString().toLowerCase().trim();
            // So khớp hoàn toàn hoặc so khớp mềm dẻo (không dấu, bỏ chữ "Anh" / "An" nếu cần, hoặc đơn giản là trùng khớp)
            if (cellName === targetName || cellName.includes(targetName) || targetName.includes(cellName)) {
              var foundId = data[i][idColIdx] ? data[i][idColIdx].toString().trim().split(".")[0] : "";
              if (foundId) return foundId;
            }
          }
        }
      }
    }
  }
  return "";
}



function estimateLazadaRate(productName) {
  if (!productName) return 4.0;
  const name = productName.toLowerCase();
  
  // 1. Điện tử / Điện thoại (Electronic Devices): 1.0%
  if (name.includes("điện thoại") || name.includes("iphone") || name.includes("samsung") || 
      name.includes("oppo") || name.includes("xiaomi") || name.includes("realme") || 
      name.includes("laptop") || name.includes("máy tính") || name.includes("tivi") || 
      name.includes("ipad") || name.includes("tablet") || name.includes("macbook")) {
    return 1.0;
  }
  
  // 2. Phụ kiện điện tử (Electronic Accessories): 2.0%
  if (name.includes("tai nghe") || name.includes("sạc") || name.includes("cáp") || 
      name.includes("cường lực") || name.includes("ốp lưng") || name.includes("chuột") || 
      name.includes("bàn phím") || name.includes("thẻ nhớ") || name.includes("usb") || 
      name.includes("loa bluetooth") || name.includes("router") || name.includes("camera")) {
    return 2.0;
  }
  
  // 3. Thời trang / Phụ kiện thời trang (Fashion): 4.0%
  if (name.includes("váy") || name.includes("đầm") || name.includes("áo") || 
      name.includes("quần") || name.includes("tui") || name.includes("túi") || name.includes("giày") || 
      name.includes("ví") || name.includes("thời trang") || name.includes("giordano") || 
      name.includes("balo") || name.includes("kính") || name.includes("nhẫn") || 
      name.includes("vòng") || name.includes("trang sức") || name.includes("thắt lưng")) {
    return 4.0;
  }
  
  // 4. Sức khỏe & Sắc đẹp (Health & Beauty): 4.0%
  if (name.includes("son") || name.includes("kem dưỡng") || name.includes("sữa rửa mặt") || 
      name.includes("nước hoa") || name.includes("mỹ phẩm") || name.includes("serum") || 
      name.includes("dầu gội") || name.includes("sữa tắm") || name.includes("makeup")) {
    return 4.0;
  }
  
  // 5. Mẹ & Bé / Bách hóa (Mother & Baby / Groceries / Home): 3.0%
  if (name.includes("tã") || name.includes("bỉm") || name.includes("sữa bột") || 
      name.includes("đồ chơi") || name.includes("nước giặt") || name.includes("gia vị") || 
      name.includes("đồ dùng nhà bếp") || name.includes("nội thất") || name.includes("sách")) {
    return 3.0;
  }
  
  // Mức chung phổ biến của Lazada: 4.0%
  return 4.0;
}

function uploadBillToDrive(userId, base64Image) {
  try {
    if (!base64Image) return "";
    
    let folder;
    const folderName = "Bill_ThanhToan";
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }
    
    const contentType = base64Image.substring(base64Image.indexOf(":") + 1, base64Image.indexOf(";"));
    const base64Data = base64Image.substring(base64Image.indexOf(",") + 1);
    const decoded = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(decoded, contentType, "bill_" + userId + "_" + Date.now() + ".png");
    
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const fileId = file.getId();
    return "https://lh3.googleusercontent.com/d/" + fileId;
  } catch (e) {
    Logger.log("Error uploading bill to Drive: " + e.toString());
    return "";
  }
}

function savePayoutHistory(userId, amount, billBase64) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    let sheet = ss.getSheetByName("Lịch sử thanh toán") || 
                ss.getSheetByName("Lịch sử chuyển khoản") || 
                ss.getSheetByName("Lịch sử bill") || 
                ss.getSheetByName("Thanh toán");
                
    if (!sheet) {
      const allSheets = ss.getSheets();
      for (const s of allSheets) {
        if (s.getLastRow() > 0) {
          const headers = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
          const hasZaloId = headers.some(h => String(h).toLowerCase().indexOf("zalo id") !== -1);
          const hasBillUrl = headers.some(h => String(h).toLowerCase().indexOf("bill url") !== -1);
          if (hasZaloId && hasBillUrl) {
            sheet = s;
            break;
          }
        }
      }
    }
    
    if (!sheet) {
      sheet = ss.insertSheet("Lịch sử thanh toán");
      sheet.appendRow(["Zalo ID", "Amount", "Date", "Bill URL"]);
    }
    
    let billUrl = "";
    if (billBase64) {
      billUrl = uploadBillToDrive(userId, billBase64);
    }
    
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const dateStr = pad(now.getDate()) + "/" + pad(now.getMonth() + 1) + "/" + now.getFullYear() + " " + pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
    
    const headers = sheet.getRange(1, 1, 1, Math.max(4, sheet.getLastColumn())).getValues()[0];
    let colZalo = headers.findIndex(h => String(h).toLowerCase().indexOf("zalo id") !== -1) + 1;
    let colAmount = headers.findIndex(h => String(h).toLowerCase().indexOf("amount") !== -1) + 1;
    let colDate = headers.findIndex(h => String(h).toLowerCase().indexOf("date") !== -1) + 1;
    let colBill = headers.findIndex(h => String(h).toLowerCase().indexOf("bill url") !== -1 || String(h).toLowerCase().indexOf("bill") !== -1) + 1;
    
    if (colZalo === 0) colZalo = 1;
    if (colAmount === 0) colAmount = 2;
    if (colDate === 0) colDate = 3;
    if (colBill === 0) colBill = 4;
    
    const nextRow = sheet.getLastRow() + 1;
    sheet.getRange(nextRow, colZalo).setValue("'" + userId);
    sheet.getRange(nextRow, colAmount).setValue(amount);
    sheet.getRange(nextRow, colDate).setValue(dateStr);
    sheet.getRange(nextRow, colBill).setValue(billUrl);
    
    return { success: true, billUrl: billUrl };
  } catch (e) {
    Logger.log("Error in savePayoutHistory: " + e.toString());
    return { success: false, error: e.toString() };
  }
}

function getPaymentHistory(zaloId) {
  try {
    if (!zaloId) return { success: false, error: "Missing Zalo ID" };
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Lịch sử thanh toán") || 
                ss.getSheetByName("Lịch sử chuyển khoản") || 
                ss.getSheetByName("Lịch sử bill") || 
                ss.getSheetByName("Thanh toán");
                
    if (!sheet) {
      const allSheets = ss.getSheets();
      for (const s of allSheets) {
        if (s.getLastRow() > 0) {
          const headers = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
          const hasZaloId = headers.some(h => String(h).toLowerCase().indexOf("zalo id") !== -1);
          const hasBillUrl = headers.some(h => String(h).toLowerCase().indexOf("bill url") !== -1);
          if (hasZaloId && hasBillUrl) {
            sheet = s;
            break;
          }
        }
      }
    }
    
    if (!sheet) {
      return { success: true, data: [] };
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { success: true, data: [] };
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const colZalo = headers.findIndex(h => String(h).toLowerCase().indexOf("zalo id") !== -1) + 1;
    const colAmount = headers.findIndex(h => String(h).toLowerCase().indexOf("amount") !== -1) + 1;
    const colDate = headers.findIndex(h => String(h).toLowerCase().indexOf("date") !== -1) + 1;
    const colBill = headers.findIndex(h => String(h).toLowerCase().indexOf("bill url") !== -1 || String(h).toLowerCase().indexOf("bill") !== -1) + 1;
    
    if (colZalo === 0 || colAmount === 0 || colDate === 0 || colBill === 0) {
      return { success: false, error: "Không xác định được cấu trúc bảng Lịch sử thanh toán" };
    }
    
    const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    const targetZaloId = String(zaloId).trim();
    const transfers = [];
    
    for (let i = 0; i < rows.length; i++) {
      const rowZaloId = String(rows[i][colZalo - 1]).trim().replace(/'/g, '');
      if (rowZaloId === targetZaloId) {
        transfers.push({
          amount: parseFloat(rows[i][colAmount - 1]) || 0,
          date: String(rows[i][colDate - 1]),
          billUrl: String(rows[i][colBill - 1])
        });
      }
    }
    
    return { success: true, data: transfers };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}


// ====================================================================
// CHỨC NĂNG TÍCH HỢP RIOHUB API CONVERT LINK TIKTOK SHOP MOI NHAT
// ====================================================================
function convertTikTokLinkWithRio(rawUrl, subId) {
  var RIO_API_KEY = 'rhk_5e184fd38ebff8c159abbe6fb302d875cc4f00c4bbf162bc';
  var CREATOR_USERNAME = 'con.muon.noi6';
  subId = subId || 'shoppesale_web';

  if (rawUrl && rawUrl.indexOf('tiktok.com') !== -1) {
    try {
      var linkEndpoint = 'https://riohub.vn/api/v1/partner/tiktok/affiliate/links';
      var payload = {
        creator_username: CREATOR_USERNAME,
        product_url: rawUrl,
        sub_id: subId
      };

      var options = {
        method: 'post',
        contentType: 'application/json',
        headers: { 'X-Riohub-Api-Key': RIO_API_KEY },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      var resp = UrlFetchApp.fetch(linkEndpoint, options);
      var rioData = JSON.parse(resp.getContentText());

      if (rioData && (rioData.affiliate_link || rioData.link)) {
        var affLink = rioData.affiliate_link || rioData.link;
        var productId = rioData.product_id;

        var productName = 'Sản phẩm TikTok Shop';
        var price = 0;
        var commissionRate = 10.0;
        var commissionAmount = 0;
        var imageUrl = '';

        if (productId) {
          try {
            var prodEndpoint = 'https://riohub.vn/api/v1/partner/tiktok/affiliate/products?creator_username=' + encodeURIComponent(CREATOR_USERNAME) + '&product_id=' + encodeURIComponent(productId);
            var prodOptions = {
              method: 'get',
              headers: { 'X-Riohub-Api-Key': RIO_API_KEY },
              muteHttpExceptions: true
            };

            var prodResp = UrlFetchApp.fetch(prodEndpoint, prodOptions);
            var prodData = JSON.parse(prodResp.getContentText());

            if (prodData && prodData.products && prodData.products.length > 0) {
              var item = prodData.products[0];
              if (item.title) productName = item.title;
              if (item.main_image_url) imageUrl = item.main_image_url;

              if (item.sales_price && (item.sales_price.minimum_amount || item.sales_price.amount)) {
                price = parseFloat(item.sales_price.minimum_amount || item.sales_price.amount) || 0;
              }

              if (item.commission) {
                if (item.commission.rate) {
                  var rRate = parseFloat(item.commission.rate);
                  commissionRate = rRate > 50 ? rRate / 100 : rRate;
                }
                if (item.commission.amount) {
                  var mComm = String(item.commission.amount).match(/[\d.]+/);
                  if (mComm) commissionAmount = Math.round(parseFloat(mComm[0]));
                }
              }

              if (commissionAmount === 0 && price > 0 && commissionRate > 0) {
                commissionAmount = Math.round(price * commissionRate / 100);
              }
            }
          } catch (eProd) {}
        }

        return {
          success: true,
          shortLink: affLink,
          rawAffiliateLink: affLink,
          productName: productName,
          price: price,
          commissionRate: commissionRate,
          commissionAmount: commissionAmount,
          imageUrl: imageUrl,
          platformName: 'TikTok Shop'
        };
      }
    } catch (eRio) {}
  }
  return null;
}
