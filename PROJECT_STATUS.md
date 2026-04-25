# 詠晴漢方團購網頁 — 技術狀態文件（Claude 參考用）
> 最後更新：2026-04-25

---

## 商業架構

| 端 | 身份 | 角色 |
|---|---|---|
| **A端** | 使用者本人（ki.58328@gmail.com） | 平台開發者＋服務商，賣系統給 B端 |
| **B端** | 詠晴漢方 | 品牌供應商，付費使用系統，管理 C端 |
| **C端** | 團購主（JunHsu、順天宮、KK 等） | 各自有獨立連結＋密碼，帶動 D端消費 |
| **D端** | 消費者 | 透過 C端連結下單 |

金流方向：D 付錢給 C → C 付錢給 B

---

## 技術架構

| 元件 | 技術 | 說明 |
|---|---|---|
| 前端 | HTML/CSS/JS（單一 index.html） | GitHub Pages 靜態部署 |
| 後端 | Google Apps Script（GAS） | 讀寫 Google Sheet |
| 資料庫 | Google Sheets | 三張工作表（見下方） |
| 授權系統 | A端 GAS + A端 Google Sheet | B端 GAS 直接讀 A端 Sheet 驗證 |

---

## 重要 URL / ID

| 項目 | 值 |
|---|---|
| GitHub Pages URL | https://ki58328.github.io/yongqing-shop/ |
| GitHub Repo | https://github.com/ki58328/yongqing-shop |
| B端 GAS URL | `https://script.google.com/macros/s/AKfycbyS5_PsiRKLwCFG0BMwrmczisV4BSLVoEMsoNoQ-VrxBWGxB3MDO0HT9ZXzSBlyyrHe-Q/exec` |
| A端 GAS URL | `https://script.google.com/macros/s/AKfycbzanGWP_MMuhIiz_513Z7PJ8NBWFpzMgYq8C-JzmJHVPF89yqVfj9Ah1eh4KsWpmWjS/exec` |
| A端 Google Sheet ID | `1iVcl6O77c2JtMknoYb3OR8BaxEGsVIksKyyKrRb-lMk` |

> ⚠️ B端 GAS 每次重新部署都會產生新 URL，需同步更新 index.html 的 `APPS_SCRIPT_URL`

---

## 本地檔案位置

```
C:\Users\user\OneDrive\桌面\claude\
├── yongqing-shop\
│   ├── index.html                    ← 前端主檔
│   ├── images\
│   │   └── 中西藥局\                 ← 商品圖片（.webp 格式）
│   ├── 訂單後台_Apps_Script.gs       ← B端 GAS 程式碼（本地備份）
│   └── PROJECT_STATUS.md             ← 本文件
└── A端_授權管理_GAS.gs               ← A端 GAS 程式碼（本地備份）
```

---

## Google Sheets 結構（B端）

### Sheet 1：「訂單」
| 欄位 | 說明 |
|---|---|
| A | 時間 |
| B | 姓名 |
| C | 手機 |
| D | 地址 |
| E | 付款方式 |
| F | 商品明細 |
| G | 總金額 |
| H | 備註 |
| I | 團購主（currentTeam 名稱） |
| J | 確認是否收款 |
| K | 訂單狀況 |

新訂單寫入時：狀態預設「確認收款中」，整列黃色背景

### Sheet 2：「團購主商品管理」
| 欄位 | 說明 |
|---|---|
| A (row[0]) | 商品名稱 |
| B (row[1]) | 分類 |
| C (row[2]) | 價格（單份） |
| D (row[3]) | 規格/重量 |
| E (row[4]) | 描述 |
| F (row[5]) | 圖片路徑（對應 GitHub 上的圖片 URL） |
| G (row[6]) | 標籤（逗號分隔） |
| H (row[7]) | 庫存（TRUE/FALSE，用勾選方塊） |
| I (row[8]) | 單份標籤（singleLabel，如「1包」） |
| J (row[9]) | 組合價（priceBundle，空白=不顯示） |
| K (row[10]) | 組合描述（bundleDesc，如「3包特價」） |
| L (row[11]) | 多圖片路徑（逗號分隔，空白=使用F欄單圖） |
| M+ | 各團購主欄位（TRUE/FALSE 控制該 C端能否賣此商品） |

> 圖片路徑格式：`images/中西藥局/商品名稱.webp`
> 圖片放在 GitHub repo 的 `images/中西藥局/` 資料夾

### Sheet 3：「團購主設定」
| 欄位 | 說明 |
|---|---|
| A | URL 參數（小寫，如 junhsu） |
| B | 顯示名稱（如 JunHsu） |
| C | 是否啟用（TRUE/FALSE） |
| D | 密碼（空白=不需要密碼） |

### A端 Google Sheet：「網頁授權管理」→「授權管理」工作表
| 欄位 | 說明 |
|---|---|
| A | 識別碼（如 yongqing） |
| B | 公司名稱（如 詠晴漢方） |
| C | 到期日 |
| D | 狀態（啟用/停用） |
| E | 備註 |

---

## B端 GAS 函式清單（訂單後台_Apps_Script.gs）

| 函式 | 用途 |
|---|---|
| `doGet(e)` | API 入口：路由到 getTeams / getOrdersByTeam / 商品清單 |
| `doPost(e)` | 接收訂單，寫入「訂單」Sheet |
| `getOrCreateSheet()` | 初始化「訂單」工作表（含標題列格式） |
| `getOrdersByTeam(team)` | 回傳指定 C端的訂單清單 |
| `getTeams()` | 回傳「團購主設定」工作表的對照表（含密碼） |
| `checkLicense()` | 驗證授權（讀 A端 Sheet，24小時快取） |
| `suspendedResponse(message)` | 回傳停用狀態 JSON |
| `clearLicenseCache()` | 清除 GAS 快取（改完 A端 Sheet 後執行） |
| `testWrite()` | 手動測試寫入 |
| `testCheckLicense()` | 測試授權結果（除錯用） |

GAS 關鍵設定：
```javascript
var A_SHEET_ID   = '1iVcl6O77c2JtMknoYb3OR8BaxEGsVIksKyyKrRb-lMk';
var CLIENT_ID    = 'yongqing';
var AUTH_CACHE_TTL = 24 * 60 * 60; // 24小時
```

---

## A端 GAS 函式清單（A端_授權管理_GAS.gs）

| 函式 | 用途 |
|---|---|
| `doGet(e)` | 授權 API（已不使用，B端改為直接讀 Sheet） |
| `checkExpiryAndNotify()` | 每日到期提醒（到期前 7 天寄 email） |
| `setupDailyTrigger()` | 設定每日 09:00 觸發器（手動執行一次） |
| `setupAuthSheet()` | 初始化授權管理表（手動執行一次） |

通知 email：ki.58328@gmail.com

---

## 前端功能清單（index.html）

| 功能 | 說明 |
|---|---|
| 動態商品載入 | 從 GAS API 讀 Sheet，不寫死在 HTML |
| 商品分類篩選 | 動態產生按鈕，分類從 Sheet 自動抓 |
| 商品搜尋 | 即時關鍵字篩選 |
| 商品 Modal | 含輪播圖（多圖）、單份/組合價 |
| 購物車 | 加減數量、刪除、即時金額計算 |
| 訂單表單 | 姓名/手機/地址/付款方式/備註 |
| 防重複送單 | `isSubmitting` flag + 按鈕 disabled |
| 訂單查看 | C端可看自己的訂單，含搜尋/篩選 |
| 多 C端管理 | URL 參數 `?team=xxx` 切換 |
| C端密碼保護 | `localStorage` 記憶（不需每次輸入） |
| 授權停用畫面 | A端改停用後，網頁顯示「服務暫停中」 |
| 快取機制 | 商品 5 分鐘、訂單 2 分鐘（sessionStorage） |
| 快取版本控制 | `CACHE_VER = APPS_SCRIPT_URL.slice(-12)` |

---

## 關鍵程式碼片段

### APPS_SCRIPT_URL（index.html 第 889 行附近）
```javascript
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyS5_.../exec';
const CACHE_VER = APPS_SCRIPT_URL.slice(-12);
```

### 授權檢查流程
1. 前端每次開頁面 → 打 `?action=getTeams`
2. B端 GAS `doGet` → `checkLicense()` → 讀 A端 Sheet（有 24hr 快取）
3. 若 status='suspended' → 前端顯示停用畫面
4. 若 valid=true → 繼續回傳 teams 清單

### 停用後恢復正常的步驟
1. A端 Sheet 改「啟用」
2. B端 GAS 執行 `clearLicenseCache()`
3. 網頁即可正常開啟

---

## 已知問題與修復記錄

| 問題 | 原因 | 修復方式 |
|---|---|---|
| 全部商品顯示「已售完」 | Sheet 勾選框傳字串 "TRUE" 非 boolean | GAS 加 `\|\| String(row[7]).toUpperCase() === 'TRUE'` |
| 密碼每次重新整理都要輸入 | 用 sessionStorage | 改用 localStorage |
| 舊快取有密碼欄位 | teams_cache 沒有版本控制 | 改用 CACHE_VER 作 key 版本 |
| GAS-to-GAS HTTP 呼叫失敗 | UrlFetchApp 回傳 HTML 登入頁 | 改用 SpreadsheetApp.openById() 直接讀 Sheet |
| 停用後清快取才能立即生效 | GAS 快取 24 小時 | 執行 clearLicenseCache() |
