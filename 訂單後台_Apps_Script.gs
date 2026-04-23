// 詠晴訂單後台 — Google Apps Script
// 部署方式：Apps Script → 部署 → 新增部署 → 網頁應用程式
//   執行身分：我（你的帳號）
//   存取權限：所有人
// 部署後取得網址，貼到 index.html 的 APPS_SCRIPT_URL

var SHEET_NAME = '訂單';

function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  // 若還沒有「訂單」工作表，把第一張工作表改名
  if (!sheet) {
    sheet = ss.getSheets()[0];
    sheet.setName(SHEET_NAME);
  }

  // 若是空白表，建立標題列
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['時間', '姓名', '手機', '地址', '付款方式', '商品明細', '總金額', '備註', '團購主', '狀態']);
    sheet.getRange(1, 1, 1, 10)
      .setFontWeight('bold')
      .setBackground('#3d6b4f')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 160); // 時間
    sheet.setColumnWidth(6, 280); // 商品明細
  }

  return sheet;
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = getOrCreateSheet();

    sheet.appendRow([
      new Date(),
      data.name    || '',
      data.phone   || '',
      data.address || '',
      data.payment || '',
      data.items   || '',
      data.total   || 0,
      data.note    || '',
      data.team    || 'default',
      '確認收款中'
    ]);

    // 金額欄格式 + 整列黃色背景
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 7).setNumberFormat('$#,##0');
    sheet.getRange(lastRow, 1, 1, 11).setBackground('#FFFF00'); // 新訂單黃色背景

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// doGet：API 端點
//   ?team=xxx                  → 回傳該團購主可售商品清單
//   ?action=getOrders&team=xxx → 回傳該團購主的訂單（B/C/D/F/K 欄）
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || '';
    var team = (e && e.parameter && e.parameter.team) || 'JunHsu';

    if (action === 'getOrders') {
      return getOrdersByTeam(team);
    }

    if (action === 'getTeams') {
      return getTeams();
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 讀取「團購主商品管理」工作表
    var productSheet = ss.getSheetByName('團購主商品管理');
    if (!productSheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', message: '找不到「團購主商品管理」工作表' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var data = productSheet.getDataRange().getValues();
    var headers = data[0];

    // 找出對應團購主的欄位索引（統一轉字串比對，避免數字欄位不吻合）
    var teamColIndex = -1;
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).trim() === String(team).trim()) {
        teamColIndex = i;
        break;
      }
    }

    // 若找不到該團購主欄位，預設為 JunHsu（show all）
    if (teamColIndex === -1) {
      return ContentService
        .createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 根據團購主欄位 TRUE/FALSE 篩選，回傳完整商品資料
    var allowedProducts = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var canSell = row[teamColIndex];
      if (canSell !== true) continue;

      // 標籤：逗號分隔字串 → 陣列
      var tagsStr = String(row[7] || '');
      var tags = tagsStr ? tagsStr.split(',').map(function(t) { return t.trim(); }) : [];

      allowedProducts.push({
        id:          'prod_' + (i + 1),       // 自動ID：第2列 = prod_2
        name:        String(row[1] || ''),    // B：商品名稱
        category:    String(row[2] || ''),    // C：分類
        price:       Number(row[3]) || 0,     // D：價格
        weight:      String(row[4] || ''),    // E：規格
        description: String(row[5] || ''),    // F：描述
        image:       String(row[6] || ''),    // G：圖片路徑
        tags:        tags,                    // H：標籤
        inStock:     row[8] === true          // I：庫存
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify(allowedProducts))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 根據團購主回傳訂單清單（B 姓名 / C 手機 / D 地址 / F 商品明細 / K 訂單狀況）
function getOrdersByTeam(team) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', message: '找不到「' + SHEET_NAME + '」工作表' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return ContentService
        .createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 讀完整資料範圍（含標題列），方便用標題找「團購主」欄
    var lastCol = Math.max(sheet.getLastColumn(), 11); // 至少讀到 K 欄
    var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = data[0];

    // 找「團購主」欄索引（更穩定，不受插入欄影響）
    var teamColIndex = -1;
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).indexOf('團購主') >= 0) {
        teamColIndex = i;
        break;
      }
    }
    if (teamColIndex === -1) teamColIndex = 8; // 後備：預設 I 欄

    var orders = [];
    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      if (String(row[teamColIndex]) !== String(team)) continue;
      orders.push({
        time:    row[0] ? Utilities.formatDate(new Date(row[0]), 'Asia/Taipei', 'yyyy/MM/dd HH:mm') : '',
        name:    row[1] || '',   // B 欄：姓名
        phone:   row[2] || '',   // C 欄：手機
        address: row[3] || '',   // D 欄：地址
        items:   row[5] || '',   // F 欄：商品明細
        payment: row[9] || '',   // J 欄：確認是否收款
        status:  row[10] || ''   // K 欄：訂單狀況
      });
    }

    // 最新訂單在最上面
    orders.reverse();

    return ContentService
      .createTextOutput(JSON.stringify(orders))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 回傳「團購主設定」工作表的 URL 參數 → 顯示名稱對照表
function getTeams() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('團購主設定');

    // 若還沒建立設定表，回傳內建預設值
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify([
          { param: 'junhsu',   name: 'JunHsu' },
          { param: 'shuntian', name: '順天宮' },
          { param: 'kk',       name: 'KK' }
        ]))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var data = sheet.getDataRange().getValues();
    // 標題列格式：A=URL參數  B=顯示名稱  C=是否啟用（TRUE/FALSE）
    var teams = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var param   = String(row[0] || '').trim().toLowerCase();
      var name    = String(row[1] || '').trim();
      var enabled = (row[2] === true || String(row[2]).toLowerCase() === 'true');
      if (param && name && enabled) {
        teams.push({ param: param, name: name });
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify(teams))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 手動測試用（在 Apps Script 編輯器執行此函式確認能寫入）
function testWrite() {
  var sheet = getOrCreateSheet();
  sheet.appendRow([new Date(), '測試姓名', '0912345678', '台北市中正區測試路1號', 'LINE Pay',
    '梳絡通透夜好眠足浴包 x2 $68', 68, '無備註', 'junhsu', '確認是否收款']);
  Logger.log('寫入成功');
}
