# 俾 remote agent 直接 build／上傳（Mac 接駁指南）

如果 Mac 上面有個 agent（或者我自己）可以行到 `xcodebuild` / `xcrun altool` / `Transporter`，
成個流程可以由「你手動撳」變成「講一句就完成」。呢個 doc 講三種接駁法，同我做得到／做唔到咩。

---

## 一、一鍵 release script（三種接駁法都用同一個）

`scripts/release.sh` — 喺 Mac 上面跑，一條指令做齊（**已喺真機 + 真 App Store Connect 驗證**）：

```bash
cd ~/Desktop/pipz/apps/ios

# 只出 IPA，唔上傳（想留住個檔／想手動用 Transporter 拖）
./scripts/release.sh --no-upload

# archive + 直接上傳 TestFlight
./scripts/release.sh
```

佢會自動做：`xcodegen generate` → `xcodebuild archive`（Release、自動簽名、build number 用時間戳保證遞增）
→ `xcodebuild -exportArchive` 匯出並上傳（`destination=upload`）。Log 全部寫入 `build/release.log`。

**認證方式（重要）**：
- **Mac 上面跑** → 用 Xcode 已經登入嘅 Apple ID，**唔需要任何 API key**
- **GitHub Actions 跑** → runner 冇 Xcode 登入，所以 workflow 會用 App Store Connect API key
  （`ASC_KEY_ID` / `ASC_ISSUER_ID` / `ASC_KEY_P8`）

只有 Team ID 一定要有（`~/.pipz_release_env` 嘅 `APPLE_TEAM_ID`，或者 project.yml 嘅 `DEVELOPMENT_TEAM`）。

---

## 二、三種接駁法

### A. SSH（最直接，推薦）
Mac 開一次：
1. 系統設定 → 一般 → 共享 → **遠端登入（Remote Login）** 開
2. 加我的 public key：`~/.ssh/authorized_keys`
3. 網絡：**Tailscale**（兩部機裝同一個 tailnet，唔需要開 port forward）或同一個 Wi-Fi + 區網 IP

之後我喺呢邊就可以：
```bash
ssh pipz-mac 'cd ~/Desktop/pipz/apps/ios && ./scripts/release.sh --no-upload'
ssh pipz-mac 'cd ~/Desktop/pipz/apps/ios && ./scripts/release.sh'
```
好處：我可以即時讀 compile 錯誤 → 改 Swift → 再跑，**自己 loop 到 build 過為止**（呢個係最大價值，
因為 Swift 喺 Windows 冇得 type-check）。

### B. Mac 上面裝 Hermes（同一個 profile）
Mac 裝 Hermes → 用同一個 config/profile → 喺 Telegram 同一個 bot 講嘢時，Mac 嗰部可以接單。
適合：唔想開 SSH、想 Mac 自己有個長期 agent。
需要：Mac 上面有 `hermes` CLI + 同一個 profile 目錄（或者直接喺 Mac 開一個 session）。

### C. Mac 上面已經有 CLI coding agent（Claude Code / Codex CLI / opencode…）
只要能經 SSH 或者佢自己嘅 gateway 收到指令，用法同 A 一樣：叫佢跑 `./scripts/release.sh`。
我負責寫 code + 睇 log，佢負責喺 Mac 執行。

---

## 三、同步規則（兩個 agent 改同一個 repo 一定要守）

現況：**我（Windows）同 Command Code（Mac）都改同一個 GitHub repo。** 呢個係實際風險，唔係理論：

- **我改 → Mac 收到**：要 Mac 跑 `git pull`（或者 CI 自動）。**唔會自己同步。**
- **Mac 改 → 我收到**：要我 `git fetch/pull`。**唔會自動通知我。**
  第一次真跑就係咁撞到：我 `git push` 被 rejected，fetch 之後才見到 Mac 個 commit
  （`1377e3f fix(ios): 令 release.sh 真係上到 TestFlight`）。如果兩邊同時改同一個檔 → merge conflict。

### 三條規矩

1. **我負責 code，Mac 只負責 build**（單一 writer）。
   Mac 上嘅 agent 只准「修到編譯得過」，唔准改功能／數值／UI（任務卡已經寫明）。
   佢修完一定即刻 `git commit && git push`，我下次改之前一定先 `git pull --rebase`。
2. **唔好兩邊同時改同一個檔**。我改 Swift 期間，Mac 唔好改 Swift（build 就冇問題）。
3. **長遠解法：CI 做 build**（`.github/workflows/ios-testflight.yml`）。
   設定一次 API key 之後，我 push → GitHub 自動 build + 上傳，Mac 完全唔需要參與，
   亦冇 divergence 風險。缺點：CI 冇 Xcode 登入嘅 Apple ID，
   要多一個 distribution 憑證 secret（Mac 上面 Keychain 匯出一次 `.p12` 就得）。

### 想即刻知我改咗咩
- GitHub 上面睇 `main` 嘅 commit list（我每次改都會有 commit message）
- 或者 Mac 跑 `git log --oneline -5 origin/main`

---

## 四、`/rc`（喺電話操控 Mac 上面嗰個 session）綁邊個 bot？

**唔係綁 Hermes 呢個 bot —— 要新開一個屬於 Command Code 嘅 bot。**

你手上有兩個完全獨立嘅 bot：

| | 邊個 bot | 跑喺邊 | 做咩 |
|---|---|---|---|
| 1 | Hermes（同佢傾嘢呢個） | Windows（本機） | 改 code、寫 docs、push |
| 2 | **Command Code 專用（你要新開）** | Mac | 喺 Mac 跑 `xcodebuild` / `release.sh` |

Telegram 一個 bot token **只可以有一個 poller**。Hermes 已經用咗佢自己嗰個 token，
如果你把 Hermes 個 token 填去 Command Code，兩邊會互相搶 update（其中一邊會被踢走／收唔到訊息）。

### 開一個新 bot（2 分鐘）
1. Telegram 搵 **@BotFather** → `/newbot` → 改名（例如 `Pipz Mac`）→ 攞到 token（`123456:AA...`）
2. Telegram 搵 **@userinfobot** → `/start` → 攞你嘅 user id（一串數字）
3. 去你新開嗰個 bot 嘅 chat → 撳 **Start**（一定要做，bot 唔可以主動開對話）
4. Mac 上面 Command Code 個 chat 打 **`/rc`** → 揀 Telegram → 貼 token + 你嘅 user id → **Connect**
5. 之後手機 Telegram 同「Pipz Mac」呢個 bot 講嘢 = 直接驅動 Mac 上面嗰個 session
   （狀態會顯示 `On via Telegram`；`/rc off` 解除）

### 需要唔需要？
- 你多數坐喺 Mac 隔離 → **可以唔用**，直接喺 Mac 打字就得
- 想出街都叫得佢出 build / 批准 tool → 值得開（mode 揀 `default` 會逐個批准，`yolo` 就唔問）

憑證存喺 Mac 嘅 `~/.commandcode/auth.json`（owner-only 權限），唔會入 repo。

---

## 五、有咗 remote Mac，我做得到 vs 做唔到

### ✅ 我可以全自動做
- `xcodegen generate`、`xcodebuild build/archive`、`-exportArchive` 出 IPA
- `xcrun altool --upload-app` 上傳 TestFlight（API key 或 app-specific password）
- 讀 compile 錯誤 → 改 code → 重試（無限次）
- 經 **App Store Connect API**：開 App 記錄、建 tester group、加 tester、assign build、查 build 處理狀態
- 改 `Info.plist` / 版本號 / build number、跑 `Transporter` CLI（`xcrun iTMSTransporter`）

### ❌ 一定要人手（一次性）
- App Store Connect 上面**同意最新 Program License Agreement**（黃色 bar）
- iPhone **開發者模式**、第一次「信任開發者」、允許「動作與健身」權限
- iPhone 上面喺 **TestFlight app 撳 Install**
- 正式上架嗰下 **Submit for Review**（法務／內容責任，唔應該自動）
- 截圖、App Privacy 問卷（可以用 API 但填嘅內容要你確認）

---

## 六、安全注意
- SSH 只開 **public key 認證**，唔好用密碼；`PasswordAuthentication no`
- 用 **Tailscale** 而唔好喺路由器開 port 22 出去
- `.p8` / app-specific password 只放喺 Mac 本機（`~/.private_keys`、`~/.pipz_release_env`），**唔好落 git**
  （`.gitignore` 已經蓋 `*.p8` / `*.p12` / `*.mobileprovision`）
- API key 用 **App Manager** 權限就夠，唔需要 Admin
