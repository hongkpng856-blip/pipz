# Pipz iOS 生活收集版 — 遊戲邏輯 & 調參指南

> 對應 `apps/ios/Pipz/`。呢個 doc 係 tuning 用：想改節奏／機率／成長速度，全部喺下面列嘅位置。

## 1. 一句總結

感應器事件 → 觸發「發現」→ 隨機生成一件物件（外形由 seed 決定、名由離線字庫或 AI）→ 入圖鑑 → 揀一隻做夥伴 → 行路換經驗 → 4 階段進化。

## 2. 事件種類同觸發條件

| 事件 | 來源 | 條件（預設） | 代碼位置 |
|---|---|---|---|
| 行路 | `CMPedometer` | 累積每 600 步 | `GameStore.handleSteps` + `DiscoveryRules.stepInterval` |
| 行完一段 | `CMMotionActivityManager` | 連續移動 ≥250 步之後轉靜止 | `handle(.activity)` + `walkingBoutSteps` |
| 一下衝擊 | `CMMotionManager` userAcceleration | 幅度 ≥2.1g，冷卻 8s | `MotionService.process` + `impactThreshold` |
| 搖晃 | 同上 | 1.5s 內 4 次穿越 1.0g，冷卻 6s | `MotionService.process` |
| 靜止 | 本地計時器（前景） | 靜止 12 分鐘 | `GameStore.tick` + `stillnessSeconds` |
| 今日第一次 | 存檔日期比較 | 每日首次開 app，2 秒後 | `GameStore.bootstrap` → `pendingDailyGift` |

**全域限制**：每日最多 24 次（`maxPerDay`）、兩次之間最少隔 70 秒（`minGap`）、同一時間只可以有一張「發現」卡（`reveal == nil` 才觸發下一個）。

## 3. 稀有度

`Rarity`：常見 58 / 少見 26 / 稀有 11 / 史詩 4 / 傳說 1（基礎權重）。

`rollRarity` 用 `luck = source.luckBonus + max(0, intensity - 1)`，
每個等級權重 × `(1 + luck × 等級 × 0.18)` → 高 luck 會令稀有以上明顯變多。

| 事件 | luckBonus |
|---|---|
| 衝擊 | 3（最易出稀有） |
| 搖晃 | 2 |
| 今日第一次 | 2 |
| 行完一段 | 1 |
| 靜止 | 1 |
| 行路 | 0 |

## 4. 分類（邊種事件較易出邊類）

| 事件 | 動物 | 家居 | 食物 | 植物 | 工具 | 怪奇 |
|---|---|---|---|---|---|---|
| 行路 | 30 | 15 | 15 | 20 | 15 | 5 |
| 行完一段 | 40 | 10 | 10 | 25 | 5 | 10 |
| 衝擊 | 30 | 10 | 5 | 0 | 20 | 35 |
| 搖晃 | 25 | 10 | 10 | 0 | 15 | 40 |
| 靜止 | 10 | 35 | 20 | 20 | 0 | 15 |
| 今日/測試 | 20 | 20 | 15 | 15 | 15 | 15 |

位置：`GameStore.rollCategory`。

## 5. 外形生成

`ObjectGenerator.sprite(seed:category:stage:rarity:)`

- 畫布 20×20，`PixelGrid` 有 `setSym / symHLine / symEllipse / symTrapezoid / outline` 等 primitive
- 動物 / 怪奇：對稱身體（頭 + 身 + 耳角觸鬚 + 腳 + 尾 + 花紋 + 翼）
- 家居 / 食物 / 植物 / 工具：8 種模板（cup / bottle / lamp / clock / box / chair / brush / blob）+ 隨機尺寸裝飾
- 調色盤：`SpritePalette.make`（分類基礎色 + 稀有度 tint 混合）；`epic`/`legendary` 成熟階段外框改用發光色
- **決定性**：同一 (seed, category, stage, rarity) → 永遠同一張圖；只存 seed，唔存圖

驗圖方法：App 內 設定 → 進階 → 測試面板 → 「生成器預覽」。
喺電腦上面快速驗（唔需要 Xcode）：`python apps/ios/tools/sprite_preview.py` → 出 `sprite_sheet.png`（24 格：6 分類 × 4 階段）。

⚠️ **Pitfall（已中過）**：手畫座標好易超出 20×20 邊界而被無聲裁走（原本 leg 去度 y=19、長尾去度 x=19）。
所以 `sprite()` 一定會先 `fitInside(margin: 1)` 再畫外框 —— **唔好喺 shape 函數入面自己 fit**。
改完生成器之後跑一次 `sprite_preview.py`，確認 sheet 入面每個 sprite 都完整（內容唔可以貼住 0 或 19）。

## 6. 命名 / 外觀（AI 即時生成，開箱即用）

發現嘅一刻，app 會 call 自己嘅 proxy `https://pipz.anthroskill.com/api/mini/spawn`，
由 AI 回傳：`name`（4–10 字）、`note`（一句）、同 **外觀提示** `archetype / ear / pattern / palette`。
外觀提示直接餵落 `ObjectGenerator.sprite(..., hints:)`，所以骨架、耳朵、花紋、主色都係 AI 決定。

- Key 只喺 server（Vercel `PIPZ_AI_KEY`），**玩家唔需要填任何嘢**
- hints 會存落 `DiscoveredItem.hints` → 之後重開／進化都畫返同一隻
- AI 失敗（冇網 / server 未設 / timeout）→ 自動用 `NameGenerator` + 純程序化外形，唔會卡住
- 設定 → 「AI 即時生成」可以關；進階可以改 endpoint

接口契約、部署步驟、成本控制：`AI_GENERATION.md`。

### 離線命名（後備）
`NameGenerator.make` — 每個分類有 prefix / base / suffix 三段字庫 + 描述句字庫。
重名會重試 8 次，仍然重複就加 `（No.xx）`。

## 7. 成長 / 進化

`Growth.thresholds = [0, 250, 900, 2600]` → 幼體 / 成形 / 成熟 / 異變（`stage` 由 `exp` 計算，唔另外存，避免唔同步）。

經驗來源：
- 步數：每 60 步 1 點（只計夥伴，`stepsPerExp`）
- 發現新物件：新物件本身 +20（怪奇稀有以上 +40）

外形跟 stage 變化：更大、加花紋、加翼、加高光；`epic` 以上 + stage ≥2 會發光外框。

## 8. 存檔

`SaveState`（Codable）→ `Application Support/pipz_mini_state.json`
欄位：items / companionID / totalSteps / lastDiscovery / dailyKey / dailyCount / stepAccumulator / stepExpAccumulator。
每次發現、轉背景、加經驗之後都會寫。設定（toggles、AI key）用 `UserDefaults`。

## 9. 想調快慢，改呢幾個數就夠

| 想要 | 改 |
|---|---|
| 密啲有嘢出 | `stepInterval` 600 → 300；`minGap` 70 → 30 |
| 稀有嘢易出啲 | `Rarity.baseWeight`；或 `luckBonus` 表 |
| 進化快啲 | `Growth.thresholds` 調低；`stepsPerExp` 調低 |
| 靜止事件快啲 | `stillnessSeconds` 12*60 → 5*60 |
| 衝擊敏感啲 | `impactThreshold` 2.1 → 1.6（注意：太敏感行路都會誤觸） |
