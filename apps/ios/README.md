# Pipz iOS（生活收集版 1.0）

原生 SwiftUI app。**唔用 web、唔用 Supabase、唔需要帳號**。
核心循環：手機感應器偵測生活事件 → 隨機「發現」一件物件 → 入圖鑑 → 揀一隻做夥伴，陪你行路慢慢長大／進化。

- 最低支援：iOS 16.0，iPhone only，直向
- Bundle ID：`com.anthroskill.pipz`（上架前可在 `project.yml` 改）
- 所有資料：只寫入 app 沙盒（`Application Support/pipz_mini_state.json`），無網絡同步

---

## 一、喺 MacBook 上面 build（最直接）

### 0. 需要
- macOS + Xcode 15 或以上（App Store 下載）
- 第一次開 Xcode 要同意 license：`sudo xcodebuild -license accept`

### 1. 攞 code
```bash
cd ~/Desktop
git clone https://github.com/hongkpng856-blip/pipz.git
cd pipz/apps/ios
```

### 2. 生成 Xcode project（用 XcodeGen）
```bash
brew install xcodegen     # 一次咁多
xcodegen generate
open Pipz.xcodeproj
```

### 3. 設定簽名
Xcode → 左邊 `Pipz` target → **Signing & Capabilities**
- Team：揀你用嘅 Apple Developer team
- Bundle Identifier：`com.anthroskill.pipz`（如已被佔用就加後綴，例如 `com.anthroskill.pipzapp`）
- ✅ Automatically manage signing

### 4. 插 iPhone 落 Mac
- iPhone：設定 → 私隱與安全性 → 開發者模式 → 開
- Xcode 上方 device 揀你部 iPhone → ⌘R
- 第一次會問「動作與健身」權限 → **一定要允許**，唔係就唔會有步數／衝擊／搖晃事件
- ⚠️ **模擬器冇動作感應器**，一定要用真機試

### 5. 如果 compile 有錯
把 Xcode 紅字錯誤原文貼返俾我（連檔名同行號），我即刻改。呢份 Swift code 係喺 Windows 寫，只做過語法檢查（tree-sitter parse 全綠），未經 Xcode type-check。

---

## 二、上 TestFlight

三條路都可以做到「push → 雲端自己 build → 自動上 TestFlight → 電話裝」。
**詳情同 secret 設定：`CI_TO_TESTFLIGHT.md`**（Xcode Cloud 最省事、25 小時/月內含）。
**TestFlight 逐步圖文流程（開 App 記錄 → Archive → 加 tester → 電話裝 → 常見錯誤）：`TESTFLIGHT_RUNBOOK.md`**

### 方案 A：Xcode Cloud（推薦，設一次之後唔洗開 Mac）
Xcode → Report navigator → Cloud → Get Started → 揀 GitHub repo → Branch `main` +
Actions `Archive` + Post-action `TestFlight (Internal)` → Start Build。
repo 已備 `ci_scripts/ci_post_clone.sh`（自動 `xcodegen generate`）。

### 方案 B：GitHub Actions（public repo 免費，workflow 已寫好）
`.github/workflows/ios-testflight.yml` — 加 4 個 secret（`ASC_KEY_ID` / `ASC_ISSUER_ID` /
`ASC_KEY_P8` / `APPLE_TEAM_ID`）就自動跑。

### 方案 C：手動 Archive（第一次建議用呢個，順便確認 compile 冇問題）
1. Xcode → 上方 device 揀 **Any iOS Device (arm64)**
2. 選單 Product → **Archive**
3. Organizer 彈出 → **Distribute App** → **App Store Connect** → **Upload**
4. 去 [App Store Connect](https://appstoreconnect.apple.com) → My Apps → **＋** → New App
   - 名稱：`Pipz`（或 `Pipz - 生活收集`）
   - 主要語言：繁體中文
   - Bundle ID：同 Xcode 一樣
   - SKU：`pipz001`
5. 上傳後等 processing（10–30 分鐘）→ 加自己做 Internal Tester → iPhone 裝 **TestFlight** app → 收 email 就裝得

> 出口合規：本 app 冇用非豁免加密，`Info.plist` 已寫 `ITSAppUsesNonExemptEncryption = false`，唔會再問。

---

## 三、正式上架 App Store 要準備嘅嘢

| 項目 | 狀態 |
|---|---|
| App icon 1024×1024（冇透明、冇圓角） | ✅ `tools/make_icon.py` 生成，已入 Assets |
| 截圖（6.7" 同 6.1" 各 3 張以上） | ⬜ 要喺真機／模擬器影 |
| 私隱政策網址（**必須**） | ⬜ 可以放 `https://pipz.anthroskill.com/privacy` |
| App Privacy 問卷 | ⬜ 答案：唔收集任何資料（全部留喺 device） |
| 年齡分級 | 4+ |
| 支援網址 | ⬜ 可以用同一個 domain |
| 描述文案 | ⬜ 見下面草稿 |
| 審核備註（Review Notes） | 要寫明：要真機動作感應器；模擬器測唔到，可用內建測試面板 |

### App Store 描述草稿

```
Pipz — 平凡日子裡面嘅小驚喜

行路、放下手機、突然一下撞到枱角……
Pipz 會用你 iPhone 嘅動作感應器，喺呢啲日常時刻隨機「發現」一件嘢：
一隻絨獸、一個午後的陶瓷小碟、一個無法命名的輪廓。

・行 600 步 → 隨機發現一件物件
・行完一段路停低 → 動物類出現機會大增
・一下大衝擊 → 稀有度加成最高
・靜止一段時間 → 屋企類型嘅嘢會出現
・揀一隻做夥伴，佢會陪你行路慢慢長大、進化（4 個階段）

每件物件都係即時隨機生成，同一個種子永遠出同一隻，獨一無二。
冇帳號、冇追蹤、冇廣告，所有資料只留喺你部 iPhone。
```

### 審核注意
- **4.2 Minimum Functionality**：有收集／進化循環 + 圖鑑，唔算空殼；但審核員用模擬器試唔到感應器 → 一定要喺 Review Notes 寫「請用真機，或用 設定 → 進階 → 測試面板 模擬事件」。
- 唔好宣稱醫療／健康用途，唔好寫「計步器」做主功能（會撞 HealthKit 要求）。

---

## 四、專案結構

```
apps/ios/
├── project.yml                 # XcodeGen spec（無第三方依賴）
├── tools/
│   ├── make_icon.py            # 生成 1024 icon（純 Python stdlib）
│   └── icon-1024.png
└── Pipz/
    ├── PipzApp.swift           # @main
    ├── Info.plist              # NSMotionUsageDescription 等
    ├── Theme.swift             # 顏色 / 像素字 / PixelPanel / PixelGlyph / 小元件
    ├── Models/Models.swift     # 分類、稀有度、事件、物件、成長曲線
    ├── Engine/
    │   ├── SeededRandom.swift    # SplitMix64，決定性隨機
    │   ├── PixelSprite.swift     # 20×20 像素格、繪圖 primitive、調色盤
    │   ├── ObjectGenerator.swift # 程序化生成外形（動物對稱 / 死物模板）
    │   ├── NameGenerator.swift   # 離線中文字名 + 描述
    │   └── GameStore.swift       # 規則（步數/衝擊/搖晃/靜止）、冷卻、存讀檔、成長
    ├── Services/
    │   ├── MotionService.swift # CMPedometer + CMMotionActivityManager + CMMotionManager
    │   └── LLMService.swift    # 可選 AI 改名（OpenAI 相容）
    ├── Views/                  # Home / Collection / Detail / Settings / Debug / Reveal
    └── Assets.xcassets/        # AppIcon + AccentColor + LaunchScreenBackground
```

## 五、已知限制（v1）
- 背景收唔到事件：iOS 要 app 喺前景先收到動作資料（背景要另外申請 motion background mode，v1 唔做）
- 冇 iCloud 同步、冇多機
- 物件外形只有 8 種模板 + 參數變化
- 同名會加 `（No.xx）`，唔會撞名
