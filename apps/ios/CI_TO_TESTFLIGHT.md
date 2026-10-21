# 由雲端自動上 TestFlight — 三條路

目標：**push 上 main → 雲端自己 build → 自動上傳 TestFlight → 電話 TestFlight app 直接裝**。
三個方案都做得到；分別係「要唔要 Mac」、「免費額度」、「簽名難唔難搞」。

| | Xcode Cloud（推薦） | GitHub Actions | Codemagic |
|---|---|---|---|
| 要唔要 Mac 設定一次 | 要（Xcode 按幾下） | 唔需要 | 唔需要 |
| 之後洗唔洗開 Mac | 唔洗 | 唔洗 | 唔洗 |
| 費用 | Apple Dev Program 內含 **25 小時/月** | public repo **免費**（macOS runner 唔計費） | 500 分鐘/月免費 |
| 簽名 | Xcode 自動（跟 team） | 用 App Store Connect API key | 用 API key 自動 |
| 難度 | ★☆☆ | ★★☆ | ★☆☆ |
| 本 repo 配套 | `ci_scripts/ci_post_clone.sh` ✅ | `.github/workflows/ios-testflight.yml` ✅ | 需要自己貼 yaml |

---

## 方案 A：Xcode Cloud（最省事，建議先用呢個）

1. **Mac 上面做一次**（5 分鐘）
   - `cd ~/Desktop/pipz/apps/ios && xcodegen generate && open Pipz.xcodeproj`
   - Xcode → 左邊 target `Pipz` → Signing & Capabilities → Team 揀你嘅 team（Bundle ID `com.anthroskill.pipz` 要同 App Store Connect 嗰個一樣）
   - Xcode 菜單 → **Report navigator**（最右邊 tab）→ **Cloud** → **Get Started with Xcode Cloud**
   - 授權 GitHub，揀 `hongkpng856-blip/pipz`
   - Workflow 設定：Branch = `main`，Actions = **Archive**，Post-action = **TestFlight (Internal Testing)**
   - 存檔 → **Start Build**

2. 之後每次 `git push origin main`，Xcode Cloud 自動 build + upload。

3. **iPhone**：App Store 裝 **TestFlight** → 用你 Apple ID 登入 → 等 email 或者直接見到 build → 撳 **Install**。

> repo 已經有 `apps/ios/ci_scripts/ci_post_clone.sh`：Xcode Cloud 唔識自己 generate xcodeproj，
> 呢個 script 會喺 clone 完之後自動下載 XcodeGen 再 `xcodegen generate`。
> `project.yml` 亦已加 `scheme:`，所以 CI 有 shared scheme 可以用。

⚠️ 第一次 Xcode Cloud build 之前，**App Store Connect 一定要先有 App 記錄**（My Apps → ＋ → New App，Bundle ID 揀 `com.anthroskill.pipz`），否則 upload 會 fail。

---

## 方案 B：GitHub Actions（public repo 免費，全自動）

Workflow 已經寫好：`.github/workflows/ios-testflight.yml`。
每次 push 改到 `apps/ios/**` 就會跑；亦可以喺 Actions 頁手動 **Run workflow**。

### 一次性設定（3 個 secret）

1. **App Store Connect API Key**（App Store Connect → Users and Access → Integrations → App Store Connect API → ＋）
   - Access：**App Manager** 就夠
   - 下載 `AuthKey_XXXXXXXXXX.p8`（**只可以下載一次**），記住 Key ID 同 Issuer ID
2. 去 GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**，加：

| Secret | 內容 |
|---|---|
| `ASC_KEY_ID` | Key ID（10 個字） |
| `ASC_ISSUER_ID` | Issuer ID（UUID） |
| `ASC_KEY_P8` | `.p8` 檔案內容以 base64 編碼：`base64 -i AuthKey_XXXX.p8 \| pbcopy`（Windows: `certutil -encode` 或者 WSL 用 base64） |
| `APPLE_TEAM_ID` | Apple Developer Team ID（Membership 頁 10 個字） |

3. （可選）Settings → Secrets and variables → Actions → **Variables** → `IOS_BUNDLE_ID`，如果你改咗 bundle id。

### 如果 Archive 嗰步話簽名錯
雲端自動簽名有時唔能夠自己生 distribution 憑證。到時做一次（Mac 上面）：
```bash
# 1. Xcode → Settings → Accounts → 你 team → Manage Certificates → ＋ → Apple Distribution
# 2. Keychain Access → 匯出該憑證成 .p12（設密碼）
# 3. base64 之後加兩個 secret：IOS_DIST_CERT_P12 / IOS_DIST_CERT_PASSWORD
# 4. 另外由 developer.apple.com 下載 App Store provisioning profile（.mobileprovision），
#    base64 之後做 secret：IOS_PROVISIONING_PROFILE
```
（呢條路 workflow 需要再改幾行 import keychain；要就到時叫我改。）

### 注意
- **上傳係 `xcodebuild -exportArchive` 嘅 `destination=upload` 做的**（唔係另外 call `altool`）。
  Mac 上面用 Xcode 已登入嘅 Apple ID 就上得；CI runner 冇登入過 Xcode，
  所以 workflow 額外傳 `-authenticationKeyPath / -authenticationKeyID / -authenticationKeyIssuerID`。
- `apps/ios/ci/ExportOptions.plist` 嘅 `destination` 係 `__DESTINATION__` 佔位符：
  `release.sh` 按 `--no-upload` 填 `export` / `upload`，workflow 直接填 `upload`。
- 唔好喺 ExportOptions 硬寫 `provisioningProfiles`（曾經填過唔存在嘅 profile 名，
  會死在 `Error Downloading App Information`）；交返 automatic signing。
- macOS runner 用 `macos-15`（Xcode 16）。要指定 Xcode 版本就加 `sudo xcode-select -s /Applications/Xcode_16.x.app`。

---

## 方案 C：Codemagic

1. codemagic.io 用 GitHub 登入 → Add application → 揀 `pipz`
2. Project type：**Other**（因為用 XcodeGen）
3. 貼佢個 `codemagic.yaml`：
   ```yaml
   workflows:
     ios-testflight:
       instance_type: mac_mini_m2
       max_build_duration: 45
       environment:
         groups: [appstore_credentials]   # 喺 Codemagic UI 建 group，放 APP_STORE_CONNECT_PRIVATE_KEY / APP_STORE_CONNECT_KEY_IDENTIFIER / APP_STORE_CONNECT_ISSUER_ID
         vars:
           XCODE_PROJECT: "Pipz.xcodeproj"
           XCODE_SCHEME: "Pipz"
       scripts:
         - name: Install XcodeGen
           script: |
             curl -sL -o /tmp/xcodegen.zip https://github.com/yonaskolb/XcodeGen/releases/download/2.42.0/xcodegen.zip
             unzip -q /tmp/xcodegen.zip -d /tmp && export PATH="/tmp/xcodegen/bin:$PATH"
             cd apps/ios && xcodegen generate
       artifacts:
         - apps/ios/build/ios/ipa/*.ipa
       publishing:
         app_store_connect:
           api_key: $APP_STORE_CONNECT_PRIVATE_KEY
           key_id: $APP_STORE_CONNECT_KEY_IDENTIFIER
           issuer_id: $APP_STORE_CONNECT_ISSUER_ID
           submit_to_testflight: true
   ```
   注意 Codemagic 有內建 `xcode-project build-ipa` 步驟，比手寫 xcodebuild 穩，可以參考佢 docs。

---

## 三個方案都唔會幫你做嘅事

- **第一次喺 App Store Connect 開 App 記錄**（要人手，1 分鐘）
- **Submit for Review**（正式上架嗰下要人手撳，或者之後加 App Store Connect API 自動提交）
- **截圖 / 私隱政策網址 / App Privacy 問卷**（上架前必須）
- TestFlight build **90 日後過期**，到時再 push 一次就有新 build
- Internal tester（自己）**唔需要 Apple 審核**就可以裝；External tester 就要過 Beta App Review

## 想即刻試？最短路徑
1. Mac 開 Xcode 連真機跑一次（確認 compile 冇問題）← **必做，因為 Swift 未經 type-check**
2. Xcode Cloud 開 workflow → 掉上去
3. 電話裝 TestFlight → 玩
