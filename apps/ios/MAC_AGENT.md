# 俾 remote agent 直接 build／上傳（Mac 接駁指南）

如果 Mac 上面有個 agent（或者我自己）可以行到 `xcodebuild` / `xcrun altool` / `Transporter`，
成個流程可以由「你手動撳」變成「講一句就完成」。呢個 doc 講三種接駁法，同我做得到／做唔到咩。

---

## 一、一鍵 release script（三種接駁法都用同一個）

`scripts/release.sh` — 喺 Mac 上面跑，一條指令做齊：

```bash
cd ~/Desktop/pipz/apps/ios

# 只 build 出 IPA（唔上傳，第一次／試機用）
./scripts/release.sh --no-upload

# build + 自動上傳 TestFlight
./scripts/release.sh
```

佢會自動做：`xcodegen generate` → `xcodebuild archive`（Release，自動簽名，build number 用時間戳保證遞增）
→ `xcodebuild -exportArchive` 出 IPA → `xcrun altool` 上傳。Log 全部寫入 `build/release.log`。

憑證放喺 `~/.pipz_release_env`（script 自動 source，唔會入 git）：

```bash
cat > ~/.pipz_release_env <<'EOF'
export APPLE_TEAM_ID=XXXXXXXXXX          # developer.apple.com → Membership
export ASC_KEY_ID=YYYYYYYYYY             # App Store Connect → Users and Access → Integrations
export ASC_ISSUER_ID=xxxxxxxx-xxxx-...   # 同一頁嘅 Issuer ID
# .p8 放喺 ~/private_keys/AuthKey_<ASC_KEY_ID>.p8
EOF
chmod 600 ~/.pipz_release_env
```

冇 API key 都可以用 app-specific password（appleid.apple.com 生成）：
`export APPLE_ID=... APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx`
兩樣都冇 → script 會停低並印出用 **Transporter.app** 手動拖 IPA 嘅方法。

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

## 三、有咗 remote Mac，我做得到 vs 做唔到

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

## 四、安全注意
- SSH 只開 **public key 認證**，唔好用密碼；`PasswordAuthentication no`
- 用 **Tailscale** 而唔好喺路由器開 port 22 出去
- `.p8` / app-specific password 只放喺 Mac 本機（`~/.private_keys`、`~/.pipz_release_env`），**唔好落 git**
  （`.gitignore` 已經蓋 `*.p8` / `*.p12` / `*.mobileprovision`）
- API key 用 **App Manager** 權限就夠，唔需要 Admin
