# TestFlight 完整流程（Pipz iOS）

> 目標：由 Xcode 有個 project，到**你部 iPhone 用 TestFlight 裝到 Pipz**。
> 第一次建議跟「路線 A（手動 Archive）」，因為順便會驗到 compile 有冇問題。之後用「路線 B」全自動。

---

## 0. 前置（只做一次，做完之後永遠唔洗再做）

### 0.1 確認 Developer Program 有效
[developer.apple.com/account](https://developer.apple.com/account) → Membership
記住 **Team ID**（10 個字，例如 `A1B2C3D4E5`）——後面 CI 要用。

### 0.2 個 Bundle ID 要存在
TestFlight 只認已註冊嘅 Bundle ID。檢查：
[developer.apple.com/account/resources/identifiers](https://developer.apple.com/account/resources/identifiers) → 睇有冇 `com.anthroskill.pipz`

冇嘅話，二選一：
- **方法一（最易）**：Mac 上面 Xcode 開 project → Signing & Capabilities → Team 揀你 team →
  Bundle Identifier 打 `com.anthroskill.pipz` → 等 Xcode 自己 register（下面會出 "Registering..."）。
- **方法二**：Identifiers → **＋** → App IDs → App → 打 Description 同 Bundle ID → 唔需要揀任何 capability → Register。

### 0.3 App Store Connect 開 App 記錄（**上傳之前一定要有**）
[appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **Apps** → **＋** → **New App**

| 欄位 | 填咩 |
|---|---|
| Platform | iOS |
| Name | `Pipz`（App Store 上要唯一，撞名就 `Pipz - 生活收集`） |
| Primary Language | Chinese (Traditional) |
| Bundle ID | 揀 `com.anthroskill.pipz`（下拉冇 = 0.2 未做好） |
| SKU | `pipz001`（自己識認嘅內部編號，唔會公開） |
| User Access | Full Access |

> 第一次入 App Store Connect 可能會叫你同意最新嘅 Program License Agreement
> （Agreements, Tax, and Banking → 頂部黃色 bar → Review and Accept）。未同意就建唔到 App。
> 免費 app **唔需要**填 Paid Applications / 銀行資料。

做完你就有一個「App 記錄」，但入面咩都未有 —— 呢個係正常。

---

## 1. 路線 A：手動 Archive（第一次推薦）

### 1.1 準備 project
```bash
cd ~/Desktop/pipz/apps/ios
brew install xcodegen            # 一次
xcodegen generate
open Pipz.xcodeproj
```

### 1.2 設簽名
Xcode 左邊 project navigator → 揀 `Pipz`（藍色 icon）→ TARGETS `Pipz` → **Signing & Capabilities**
- ✅ Automatically manage signing
- Team：你嘅 team
- Bundle Identifier：`com.anthroskill.pipz`
- 下面 `Signing Certificate` 應該顯示 **Apple Development**；冇紅字就 OK

### 1.3 先喺真機 run 一次（唔可以跳）
- iPhone：設定 → 私隱與安全性 → **開發者模式** 開（會叫你重開機）
- 用 USB 線插 Mac
- Xcode 上方 device dropdown 揀你部 iPhone → **⌘R**
- 第一次手機彈「不受信任的開發者」→ 設定 → 一般 → VPN與裝置管理 → 信任
- 開 app，允許「動作與健身」權限
- 設定 → 進階 → 測試面板 → 逐個撳「行路 / 衝擊 / 搖晃 / 靜止」睇有冇「發現！」彈出

> 呢一步係驗 compile + 驗遊戲循環。喺 Windows 寫嘅 Swift 未經 type-check，所以**一定要先過呢關**，
> 唔好玩到雲端 build 之後才 debug。

### 1.4 Archive
1. Xcode 上方 device dropdown → 揀 **Any iOS Device (arm64)**（唔好揀模擬器，Archive 會灰住）
2. 菜單 **Product → Archive**（等 2–5 分鐘）
3. 自動彈 **Organizer** → 見到一個 archive → 撳右邊 **Distribute App**
4. 揀 **App Store Connect** → **Next**
5. 揀 **Upload** → Next
6. 簽名選項：✅ Upload your app's symbols（crash log 用）+ ✅ Manage version and build number → Next
7. 睇一輪 summary → **Upload**
8. 等「Uploaded to App Store Connect」+ 綠剔

> 「Manage version and build number」呢個勾：如果你 CI 同手動並用，就要小心 build number 重複，
> 重複會 upload 失敗（見 §4 錯誤表）。

---

## 2. 路線 B：Xcode Cloud（設一次，之後全自動）

Mac 上面（只做一次）：
1. `cd ~/Desktop/pipz/apps/ios && xcodegen generate && open Pipz.xcodeproj`
2. Signing 同 §1.2 一樣設好
3. Xcode 菜單 **Report navigator**（右邊最尾個 tab，好似對話氣泡）→ 上面 **Cloud** → **Get Started with Xcode Cloud**
4. 授權 GitHub → 揀 `hongkpng856-blip/pipz` 呢個 repo
5. Workflow 設定：
   - Name：`TestFlight`
   - Environment：Xcode 最新、macOS 最新
   - Start Condition：**Branch Changes** → `main`
   - Actions：**Archive**（用 `Pipz` scheme）
   - Post-Actions：**TestFlight (Internal Testing Only)**
6. **Save** → **Start Build**

之後每次 `git push origin main`：
```
push → Xcode Cloud clone（跑 ci_scripts/ci_post_clone.sh 自動 xcodegen）
     → Archive → 自動簽名 → 自動上傳 App Store Connect → TestFlight
```
時間大約 10–25 分鐘（build 5–10 分鐘，Apple 處理 5–15 分鐘）。

⚠️ Xcode Cloud 需要 repo 入面有 `ci_scripts/ci_post_clone.sh`（本 repo 已有）否則搵唔到 `.xcodeproj`。

---

## 3. 上傳之後：點樣先裝到落電話

### 3.1 等 Apple 處理
App Store Connect → **Pipz** → **TestFlight** 分頁 → iOS builds
狀態會係 **Processing**（5–30 分鐘）→ 變 **Ready to Submit** / 可直接測試。

### 3.2 如果見到「Missing Compliance」
撳入去答出口合規問題。本 app 嘅 `Info.plist` 已寫 `ITSAppUsesNonExemptEncryption = false`，
正常唔會問；如果真係問，揀：
> 「我的 app 只使用豁免加密（例如 HTTPS）」→ 唔會再用。

### 3.3 建立 Internal Testing group 並加 build
TestFlight → 左邊 **Internal Testing** → **＋** 開一個 group（例如 `Me`）
→ **Testers** → **＋** → 揀你自己（你嘅 Apple ID 要係 App Store Connect 嘅 user；Account Holder 本身已經係）
→ 返去 group → **Builds** → **＋** → 揀啱啱上傳嗰個 build

> Internal tester 上限 100 人，**唔需要 Apple 審核**，加完即刻可以裝。
> External tester（上限 10,000）就要過 Beta App Review（通常 24 小時內）。

### 3.4 電話裝
1. App Store 裝 **TestFlight**（藍色飛機 icon）
2. 開 TestFlight → 用**同一個 Apple ID** 登入（一定要同 App Store Connect 加嗰個一樣）
3. 會見到 **Pipz** → 撳 **Install**（或者 email 通知裡面嘅 link）
4. 裝完喺主畫面開 —— 圖示下面會有個橙點，表示係 TestFlight 版本
5. 第一次開：允許「動作與健身」

### 3.5 之後出新 build
TestFlight app 會自動提示有新版本 → 撳 **Update**。舊 build **90 日後過期**（會顯示 "This build has expired"），
到時 push 一次就有新 build。

---

## 4. 常見錯誤對照

| 症狀 | 原因 / 解決 |
|---|---|
| Archive 灰住撳唔到 | device 揀咗模擬器 → 改揀 **Any iOS Device (arm64)** |
| `No profiles for 'com.anthroskill.pipz' were found` | Bundle ID 未註冊或 team 未揀 → 跟 §0.2 / §1.2 |
| `The bundle version must be higher than the previously uploaded version` | build number 重複 → 加 1（Xcode 用 §1.4 嘅 "Manage version and build number"，CI 用 `GITHUB_RUN_NUMBER`） |
| `Invalid Bundle. The bundle at ... does not support the minimum OS Version` | deployment target 同手機 iOS 唔配 → 本 app 係 iOS 16+ |
| `Missing Compliance` 卡住 | 跟 §3.2 答問題 |
| TestFlight app 見唔到 Pipz | tester email 同登入 Apple ID 唔同 / build 未 assign 去 group / processing 未完成 |
| TestFlight 版本感應器冇反應 | 權限被拒過一次就唔會再問 → 設定 → Pipz → 動作與健身 開返 |
| `ITMS-90035 Invalid Signature` | 用咗 development 憑證 archive → Archive 一定係 Release + Apple Distribution（Xcode 自動處理，通常係 keychain 有多條憑證搞亂） |

---

## 5. TestFlight 之後：正式上 App Store 要加嘅嘢

TestFlight 過得，唔代表上架過得。上架前要補：
- App icon（✅ 已有）／**截圖**（6.7" 同 6.1" 各最少 3 張）
- **私隱政策網址**（例如 `https://pipz.anthroskill.com/privacy`）+ 支援網址
- **App Privacy 問卷**：本 app 唔收集任何資料（全部留喺 device）→ 答案一律揀「不收集」
- 年齡分級：4+
- 描述文案、關鍵字、推廣文字（`README.md` §三 有草稿）
- **審核備註**：一定要寫「本 app 需要真機動作感應器；模擬器無感應器，可用 設定 → 進階 → 測試面板 模擬事件」
- 撳 **Add for Review → Submit to App Store**

審核通常 1–3 日。被 reject 就睇 Resolution Center 原因再改（最常見：4.2 功能太簡單、2.1 crash、5.1 私隱聲明不符）。

---

## 6. 上咗 TestFlight 之後：改 bug 嘅循環

TestFlight 嘅價值係：**Internal tester（你自己）唔需要 Apple 審核，出幾多個 build 都得，隨改隨上。**

### 6.1 兩種循環，揀一種定死

**循環 A（推薦，設定一次之後完全唔洗開 Mac）** — GitHub Actions
一次性加 4 個 secret（`CI_TO_TESTFLIGHT.md` 有步驟：`ASC_KEY_ID` / `ASC_ISSUER_ID` / `ASC_KEY_P8` / `APPLE_TEAM_ID`）。
之後：

```
你講症狀 → 我改 Swift → git push main → GitHub Actions 自動 archive + 上傳
          → Apple 處理 5–30 分鐘 → TestFlight app 撳 Update → 你試
```

**循環 B（冇 CI，每次用 Mac）** — 已喺真機驗證行得通
```
你講症狀 → 我改 Swift + push → Mac 上面跑：
   cd ~/Desktop/pipz && git pull
   cd apps/ios && ./scripts/release.sh        # 直接 archive + 上傳，3–6 分鐘
          → 等 App Store Connect 處理 5–30 分鐘 → TestFlight 撳 Update → 你試
```
上傳係由 `xcodebuild -exportArchive` 嘅 `destination=upload` 一手包辦，用**Xcode 已登入嘅 Apple ID**，
所以 Mac 路線**唔需要** App Store Connect API key。（API key 只係 GitHub Actions 需要，
因為 runner 冇登入過 Xcode。）

兩者分別只在「邊個負責 build」。我負責嘅部分一樣：**改 code + push**。

### 6.2 每個循環嘅實際步驟

1. **你試到問題** → 只需講「症狀」（唔需要你判斷原因）。
   最好連：邊個畫面、邊個操作、有冇閃退、iPhone 型號、iOS 版本
2. **我定位** → 我會講邊個檔／邊條規則，改完 push
3. **出 build** → 循環 A 自動；循環 B 你／Command Code 跑 `release.sh`
   （build number 自動用時間戳，永遠遞增，唔會撞）
4. **等處理** → App Store Connect → TestFlight → 睇 build 由 Processing 變可用（5–30 分鐘）
5. **電話 Update** → TestFlight app → Pipz → **Update** → 重試同一個操作
6. **回報** → 「OK」或者「未解決 + 新症狀」→ 回到第 2 步
7. **要爛到開唔到都唔怕** → TestFlight → Pipz → **Previous Builds** 可以裝返上一個可用 build

> 每次循環大約 15–40 分鐘（我改 code 幾分鐘 + build 5–10 分鐘 + Apple 處理 5–30 分鐘）。

### 6.3 收到問題時，先做嘅三分類（決定要唔要改 code）

| 你見到 | 先查 | 通常係 |
|---|---|---|
| 開 app 即閃退 | App Store Connect → TestFlight → build → **Crashes**；或者 Xcode → Window → Organizer → Crashes | 真實 bug，要改 code |
| 感應器完全冇反應 | App 內 設定 → 感應器狀態（授權／步數感應／陀螺儀） | 八成係權限被拒 → 設定 → Pipz → 動作與健身 開返，唔需要改 code |
| 行極都冇「發現」 | App 內 首頁步數有冇升？設定 → 進階 → 測試面板 撳模擬睇有冇彈 | 有彈＝生成器正常，係門檻／冷卻問題（我調 `DiscoveryRules`） |
| 出嘅嘢太醜／太怪 | 測試面板 → 生成器預覽 | `ObjectGenerator` / `NameGenerator`（我用 `tools/sprite_preview.py` 先驗） |
| 節奏太快／太慢 | 同上 | 改 `stepInterval` / `minGap` / `maxPerDay`（`GAME_LOGIC.md` §9 有對照） |
| 存檔唔見咗／數據怪 | 睇有冇換機／重裝 | 我會加 safe decode + 版本欄位 |
| 版面爆位／字太細 | 你出截圖 | SwiftUI 佈局，我改 Views |

**要提供咩證據**：一句症狀 + 截圖最好。我做唔到嘅係「估你部機發生咩事」，
所以請講現象，唔需要你判斷原因。

### 6.4 版本號規則（唔好亂）

- **Build number**（`CFBundleVersion`）：每次上傳都要大過上一次。`release.sh` 用時間戳（`YYYYMMDDHHmm`），
  CI 用 `GITHUB_RUN_NUMBER` —— 兩者都保證遞增，唔需要你記。
   ⚠️ 唔好手動 Archive 又唔勾 "Manage version and build number"，會撞號。
- **Version**（`CFBundleShortVersionString`）：TestFlight 期間一直用 `1.0.0` 都可以；
  正式上 App Store 之後改功能就用 `1.0.1`、`1.1.0`。改咗要喺 App Store Connect 開新 version 記錄。
- TestFlight build **90 日後過期**，唔會影響你嘅資料（存檔喺 app sandbox，Update 唔會清）。

### 6.5 想快啲？兩個 shortcut
- 喺 Command Code 個 chat 打 **`/rc`** 綁 Telegram → 你喺街都可以叫 Mac 出 build、批准 tool
- 把「已知問題」變成 regression 友善：每次修完，我喺 `docs/CHANGELOG.md` 記一句，
  同 `apps/ios/GAME_LOGIC.md` 更新參數，唔會改完又改返轉頭
