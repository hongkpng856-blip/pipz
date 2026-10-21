# 設定 GitHub Actions 自動上 TestFlight（10 分鐘，做一次）

設定完之後：**我 push → GitHub 自動 build + 上傳 → 電話撳 Update**。Mac 唔需要再開。

要準備 6 個 secret。全部喺 **Mac** 上面做（因為憑證喺 Keychain），最後貼入 GitHub 網頁。

---

## 0. 先攞 Team ID

[developer.apple.com/account](https://developer.apple.com/account) → **Membership** → **Team ID**（10 個字，例如 `A1B2C3D4E5`）

---

## 1. App Store Connect API Key（3 個值）

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **Users and Access** → 頂部 **Integrations**（或 **App Store Connect API**）
2. 左邊 **Team Keys** → **＋**（Generate API Key）
   - Name：`Pipz CI`
   - Access：**App Manager**（唔需要 Admin）
3. 撳 **Download API Key** → 得一個 `AuthKey_XXXXXXXXXX.p8`（**只可以下載一次**，唔見就要重新生成）
4. 記低頁面上嘅兩個值：

| Secret | 喺邊度攞 |
|---|---|
| `ASC_KEY_ID` | Key 列表嘅 **Key ID**（10 個字，例如 `2X9ABCD3EF`） |
| `ASC_ISSUER_ID` | 頁面頂部 **Issuer ID**（UUID 格式，全 team 共用） |

5. 轉成 base64（Mac 終端）：
```bash
cd ~/Downloads
openssl base64 -A -i AuthKey_XXXXXXXXXX.p8 > asc_key.b64
cat asc_key.b64          # 全段複製
```

> ⚠️ `.p8` 只可以下載一次。如果刪咗就要重新 generate 一個新 key（舊嘅可以 revoke）。

---

## 2. Apple Distribution 憑證（2 個值）

你部 Mac 已經有（因為 archive 成功過）。

1. 開 **Keychain Access**（鑰匙串存取）
2. 左邊揀 **login** → 分類揀 **My Certificates**（我的憑證）
3. 搵 **Apple Distribution: <你個名> (XXXXXXXXXX)**（唔係 Apple Development）
4. 右 click → **Export "Apple Distribution…"** → 格式揀 **Personal Information Exchange (.p12)**
5. 設一個密碼（自己記住，呢個就係 `IOS_DIST_CERT_PASSWORD`）→ 存去 `~/Desktop/pipz-dist.p12`
6. 轉 base64：

```bash
cd ~/Desktop
openssl base64 -A -i pipz-dist.p12 > dist_cert.b64
cat dist_cert.b64        # 全段複製
rm pipz-dist.p12         # 用完即刻刪
```

| Secret | 值 |
|---|---|
| `IOS_DIST_CERT_P12` | `dist_cert.b64` 全文 |
| `IOS_DIST_CERT_PASSWORD` | 你匯出時設嘅密碼 |

> 冇 **Apple Distribution** 憑證？Xcode → Settings → Accounts → 揀 team → **Manage Certificates** → ＋ → **Apple Distribution**。

---

## 3. 貼入 GitHub（6 個 secret）

[github.com/hongkpng856-blip/pipz](https://github.com/hongkpng856-blip/pipz) →
**Settings** → 左邊 **Secrets and variables** → **Actions** → **New repository secret**，逐個加：

1. `APPLE_TEAM_ID`
2. `ASC_KEY_ID`
3. `ASC_ISSUER_ID`
4. `ASC_KEY_P8`
5. `IOS_DIST_CERT_P12`
6. `IOS_DIST_CERT_PASSWORD`

（全部只貼值，Name 要一字不差。base64 可以一行，唔需要換行。）

---

## 4. 第一次試跑

1. GitHub → **Actions** → 左邊 **iOS → TestFlight** → 右邊 **Run workflow** → **Run workflow**
2. 睇住每一步：
   - `檢查 secrets 齊唔齊` → 缺邊個會直接寫出嚟
   - `匯入 Apple Distribution 憑證` → 應該印到 `1 identities found`
   - `Archive` → 5–10 分鐘
   - `匯出並上傳` → 最後印 "Upload succeeded" 之類
3. 去 App Store Connect → Pipz → TestFlight → 等新 build 由 Processing 變可用（5–30 分鐘）
4. 第一次可能要手動把新 build 加入 Internal Testing group（之後 TestFlight app 會直接提示 Update）

---

## 5. 之後嘅日常

```bash
# 我改完 code push 之後，你只需要：
# 1. 等 GitHub Actions 跑完（約 10 分鐘；通知可以開 email）
# 2. 電話 TestFlight → Pipz → Update
```

想睇狀態：GitHub → Actions → 最近一次 run；或者 `gh run list --limit 5`（有裝 GitHub CLI 嘅話）。

---

## 6. 出錯時對照

| Actions 邊步紅 | 多數原因 | 解決 |
|---|---|---|
| `檢查 secrets 齊唔齊` | 有 secret 名打錯／漏 | 對住上面 6 個名逐個核 |
| `匯入…憑證` | `.p12` base64 截斷 / 密碼錯 | 重新 `openssl base64 -A -i …`，確認密碼 |
| `Archive`：`No signing certificate "iOS Distribution" found` | 憑證冇 import 到（keychain 步驟失敗） | 睇上一步 log；重新匯出 `.p12` |
| `Archive`：`No profiles for 'com.anthroskill.pipz' were found` | API key 權限不足 | API key 要 **App Manager**；或檢查 `APPLE_TEAM_ID` |
| `匯出並上傳`：`bundle version must be higher` | build number 撞／太細 | workflow 已用 14 位時間戳，正常唔會；人手 Archive 過就要留意 |
| `匯出並上傳`：`authentication failed` | ASC key 過期／revoke 咗 | 重新 generate API key，更新 3 個 secret |
| 全部綠但 TestFlight 見唔到 | processing 未完成 / build 未入 group | 等 30 分鐘；去 group 撳 ＋ 加 build |

---

## 備註
- **macOS runner 費用**：public repo 免費；如果日後轉 private，macOS 分鐘以 10× 計。
- **workflow 唔會 bump version**：`MARKETING_VERSION` 固定 `1.0.0`，build number 用時間戳。
  正式上架出新版時，改 `project.yml` 嘅 `MARKETING_VERSION` 或者 workflow 嗰個值。
- **同時保留 Mac 路線**：`./scripts/release.sh` 照樣可以用（唔受 CI 影響），
  兩者都係 `destination=upload`，唔會互相打架，只係邊個後上傳邊個係最新 build。
