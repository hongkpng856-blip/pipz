# 俾 Command Code（`cmd`）喺 Mac 上面執行嘅任務卡

> **重點：Command Code 係「喺邊部機開，就用邊部機」嘅 terminal agent。**
> 一定要喺 **Mac** 上面（`apps/ios` 目錄內）開，佢才摸得到 `xcodebuild` / `xcrun altool`。
> 喺 Windows 開嘅話佢只係有 Windows 環境，編譯唔到 iOS。

---

## 用法一：你自己喺 Mac 開（最簡單）

```bash
# 首次
npm i -g command-code          # 需要 Node 22+
cmd login

# 每次
git clone https://github.com/hongkpng856-blip/pipz.git ~/Desktop/pipz   # 已有就 git pull
cd ~/Desktop/pipz/apps/ios
cmd --trust
```

然後把下面「任務卡」整段貼入 `cmd`。

## 用法二：headless（一次過，唔需要人睇住）

```bash
cd ~/Desktop/pipz/apps/ios
cmd -p "$(cat COMMANDCODE_TASK.md)" --yolo --max-turns 80 -m deepseek-v4-pro
```
（model id 用 `cmd --list-models` 睇；`--yolo` 係略過每次確認，只建議喺自己部機用。）

## 用法三：我經 SSH 直接叫佢做
```bash
ssh pipz-mac 'cd ~/Desktop/pipz && git pull && cd apps/ios && \
  cmd -p "$(cat COMMANDCODE_TASK.md)" --yolo --max-turns 80' 2>&1 | tee /tmp/cc.log
```

---

## 任務卡（複製以下全部內容）

```
你係一個 iOS build 修復與上架執行 agent。工作目錄：~/Desktop/pipz/apps/ios（SwiftUI 專案，
用 XcodeGen 由 project.yml 生成 Pipz.xcodeproj）。請嚴格按以下順序做，並用繁體中文報告。

背景：呢個 SwiftUI app 係喺 Windows 上面寫嘅，只做過語法檢查，未經 Xcode type-check。
所以第一步一定會有一堆編譯錯誤，屬正常。你嘅任務就係令佢編譯通過。

【階段 1：先驗型別，唔好碰簽名】
1. cd ~/Desktop/pipz && git pull
2. cd apps/ios && ./scripts/typecheck.sh
3. 如果失敗：逐個 error 修。修改原則：
   - 只改到「編譯得過」，唔好改遊戲設計、數值、文案、顏色、IR 佈局
   - 唔准加任何第三方依賴（唔准加 SPM / CocoaPods）
   - 唔准改 iOS deployment target（要保持 16.0）
   - 唔准改 SWIFT_VERSION（要保持 5.9 語言模式）
   - 唔准刪除功能去令佢編譯過；真係要簡化就喺報告列出你刪咗咩、為咩
   - 最常見嘅問題：SwiftUI API 簽名唔同 iOS 版本、@MainActor 隔離、
     CoreMotion 回呼參數、Binding/optional 處理、Color(hex:) 之類 extension 未 import
4. 每修一輪就重跑 ./scripts/typecheck.sh，直到出現「✅ TYPE-CHECK 過」。
   最多修 12 輪；如果卡死，停手並報告卡喺邊個 error。

【階段 2：出 IPA（唔上傳）】
5. 如果冇 Team ID，問我或者由 ~/.pipz_release_env 讀（APPLE_TEAM_ID）。
6. ./scripts/release.sh --no-upload
7. 如果失敗係簽名問題（No profiles / no certificate / exportArchive 失敗）：
   唔好亂改 project.yml，停手，原文報告 xcodebuild 嘅錯誤段落。

【階段 3：上傳 TestFlight（只有我明確叫你先做）】
8. 如果 ~/.pipz_release_env 有 ASC_KEY_ID / ASC_ISSUER_ID 同 ~/private_keys/AuthKey_*.p8，
   就行 ./scripts/release.sh，否則停手報告缺少邊個憑證。

【絕對唔准做】
- 唔准 git push、唔准 git commit（除非我叫你）
- 唔准把任何 .p8 / .p12 / 密碼寫入 repo 或者貼入報告
- 唔准改 Bundle ID（com.anthroskill.pipz）同 App 名稱
- 唔准升級 Xcode / 唔准 brew upgrade

【完成後報告格式】
1. 型別檢查結果：過 / 未過
2. 改過嘅檔案（路徑 + 一句解釋）
3. 每個 error 嘅根因（如果有 8 個以上就只列最典型 8 個）
4. IPA 有冇出（路徑）
5. 下一步建議（例如「可以 archive 上 TestFlight」或者「仲有 2 個 error 需要人決定」）
```

---

## 我（Hermes）喺呢個流程嘅角色

- 我負責寫 code、寫 script、寫上面張任務卡、審你貼返嚟嘅報告
- 如果 `cmd` 卡死喺某些 error，你把「階段 1 第 4 步」嗰段原文貼返俾我，我直接改 Swift
- 有 SSH 嘅話，我連上面嗰句都自己跑，唔需要你 copy & paste

## 兩個 script 分別做咩

| Script | 做咩 | 要憑證？ |
|---|---|---|
| `scripts/typecheck.sh` | Simulator SDK 編譯，純驗型別，出錯誤摘要 | ❌ 唔需要 |
| `scripts/release.sh --no-upload` | 真 archive + 出 IPA | 要 Team / 憑證 |
| `scripts/release.sh` | 上面 + 上傳 TestFlight | 要 ASC API key（或 app-specific password） |
