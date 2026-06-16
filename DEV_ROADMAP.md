# Pipz — 開發路線圖 & SOP

## 1. Tech Stack 選擇

### 比較：Cross-platform vs Native

| 因素 | React Native + Expo | Flutter | Native (Android + iOS 分開) |
|------|-------------------|---------|---------------------------|
| 開發速度 | 快 | 快 | 慢（兩套 code） |
| Overlay 功能 | 要 Native Module | 要 Native Module | 原生支援最好 |
| AI 整合 | 易（JS/Python bridge） | 中等 | 易 |
| 效能（動畫） | 中等 | 好 | 最好 |
| 團隊規模需求 | 細 | 細 | 大 |
| 維護成本 | 低 | 低 | 高 |
| 社區生態 | 成熟 | 增長中 | 成熟 |

### 推薦：React Native + Expo
- 最快 MVP，一套 code 出 Android + iOS
- Overlay 功能用 Native Module 補充
- AI 整合用 JS/Python bridge
- 日後 Phase 2 硬件整合用 BlueTooth/LTE module

---

## 2. 開發階段 Timeline

### Phase 1 - Stage 0：Setup（1-2 週）
- 初始化 React Native + Expo project
- 設定開發環境
- 設計 Database schema
- 設定 CI/CD pipeline

### Phase 1 - Stage 1：Core MVP（4-6 週）
- 步數追蹤系統（Health API 整合）
- 基本寵物系統（數據結構 + 狀態機）
- 熒幕 Overlay 功能（浮動寵物視窗）
- 孵化第一隻寵物（0-1000 步流程）
- 基本動畫系統（寵物跟隨步伐）
- 情緒系統（開心/肚餓/眼瞓）

### Phase 1 - Stage 2：Pet System（4-6 週）
- AI 生成寵物 pipeline（後端）
- 多寵物支援 + 圖鑑系統
- 進化系統（Level 1-5）
- 隨機遇見機制（Gacha + 保底）
- 稀有度系統

### Phase 1 - Stage 3：互動 & Social（4-6 週）
- 熒幕互動系統（點擊反應、搗亂行為）
- 音樂/天氣反應
- 成就系統
- 好友系統
- 寵物交易系統

### Phase 1 - Stage 4：Polish & Launch（4-6 週）
- UI/UX 完成
- 性能優化
- Beta 測試
- App Store / Google Play 上架
- 行銷準備

### Phase 2：硬件發電（時間待定）
- 硬件規格設計
- 藍牙/LTE 通訊
- 能源數據追蹤
- 同寵物系統整合

---

## 3. Skills Required

### 核心團隊（初期 2-3 人）

#### 1. Mobile Developer（React Native）
必備：
- React Native + Expo 開發經驗
- TypeScript
- 懂 Native Module（Java/Kotlin 或 Swift/ObjC）
- 動畫系統（React Native Animated / Reanimated）
- 懂 HealthKit / Google Fit API

加分：
- 有遊戲開發經驗
- 做過 overlay/浮動視窗類型 App

#### 2. Full-stack / Backend Developer
必備：
- Node.js / Python（FastAPI）
- PostgreSQL + Redis
- REST API + WebSocket 設計
- Cloud 部署（AWS/GCP 簡單就好）

加分：
- 區塊鏈 / NFT 經驗
- AI model 部署經驗

#### 3. AI / ML Engineer（Part-time / 外判）
必備：
- Stable Diffusion / Diffusion Models
- Fine-tuning 經驗
- Python
- 懂 pixel art style transfer

#### 4. Pixel Artist / UI Designer
必備：
- 像素風設計
- 寵物動畫 sprites
- 可愛風格 UI

### 可以外判嘅部分
- Logo / Branding 設計
- AI model fine-tuning
- 初始寵物設計

---

## 4. Tools & Services

### Development
| 工具 | 用途 | 成本 |
|------|------|------|
| VS Code / Cursor | IDE | 免費 |
| React Native + Expo | Mobile framework | 免費 |
| GitHub / GitLab | Source control | 免費（私有 repo） |
| Notion / Linear | Project management | 免費/$8/mo |

### Backend & Infrastructure
| 工具 | 用途 | 成本 |
|------|------|------|
| Supabase | Database + Auth + Storage | 免費起手 |
| Vercel / Railway | API hosting | 免費起手 |
| Cloudflare | CDN + DNS | 免費 |
| Redis Upstash | Cache + Queue | 免費起手 |
| Sentry | Error tracking | 免費起手 |

### AI / ML
| 工具 | 用途 | 成本 |
|------|------|------|
| Replicate / Fal.ai | AI model hosting | Pay per use |
| Hugging Face | Model hub | 免費 |
| ComfyUI / Automatic1111 | Local fine-tuning | 免費 |
| OpenAI DALL-E / Stability AI | API generation | Pay per use |

### 設計
| 工具 | 用途 | 成本 |
|------|------|------|
| Figma | UI/UX design | 免費 |
| Aseprite | Pixel art 製作 | $19.99 |
| Rive/Lottie | 動畫系統 | 免費 |

### Analytics & 行銷
| 工具 | 用途 | 成本 |
|------|------|------|
| Firebase Analytics | User tracking | 免費 |
| Mixpanel / PostHog | Product analytics | 免費起手 |
| TestFlight (iOS) | Beta testing | 免費 |
| Google Play Console | Android 上架 | $25 一次 |
| Apple Developer Program | iOS 上架 | $99/年 |

---

## 5. Database Schema（初步設計）

### Core Tables

**Users**
- id, username, email, created_at
- total_steps, total_distance, level
- current_energy, max_energy

**Pets**
- id, user_id (owner), name
- species_id, generation
- level, xp, evolution_stage
- rarity (common/uncommon/epic/legendary)
- stats: efficiency, luck, comfort, resilience
- genes (parent traits)
- is_for_sale, price
- created_at (步數解鎖 timestamp)

**PetSpecies**
- species_id, name, description
- base_stats, growth_rates
- evolution_tree
- ai_generation_seed

**PetInteractions**
- id, pet_id, interaction_type (feed/play/walk/pet)
- timestamp, result (mood change)

**Transactions**
- id, seller_id, buyer_id, pet_id
- price, currency_type, timestamp
- status (pending/completed/cancelled)

**DailyLogs**
- id, user_id, date
- steps, distance, pets_encountered
- achievements_unlocked

---

## 6. 開發 SOP（Standard Operating Procedures）

### 每日開發流程
1. 睇 Linear/Notion task board，確認今日 tasks
2. Pull latest code，create feature branch
3. 寫 code -> 測試 -> commit
4. Push branch -> 開 PR
5. Code review（如果有多過一個人）
6. Merge to main

### 版本發佈 SOP
1. Feature freeze（所有功能完成）
2. QA testing（TestFlight / Internal testing）
3. Bug fixing
4. Production build
5. App Store / Play Store submit
6. Monitor crash rate（Sentry）

### Code Review 標準
- TypeScript strict mode
- 冇 any type
- 有 error handling
- 有 unit test（基本就好）
- 性能考慮（overlay 特別重要，唔可以 lag）

### Git Workflow
- main：production-ready
- develop：integration branch
- feature/*：新功能
- fix/*：bug fix
- release/*：release 前整理

### 測試策略
- Unit test：核心邏輯（步數計算、進化公式）
- Integration test：API endpoints
- Manual test：UI + overlay 行為（呢個最難自動化）
- Beta test：TestFlight + Google Play Internal

---

## 7. 關鍵技術決策要點

### Overlay 功能（最大技術挑戰）
- Android：用 SYSTEM_ALERT_WINDOW + Service
- iOS：用 Picture in Picture 或者 Widget（限制較大）
- 建議 MVP 先做 Android，iOS 後補
- 或者一開始 focus Android，iOS version 2

### AI 寵物生成
- Option A：後端 API（Replicate / Fal.ai）
  - 每次用戶「遇見」寵物時 call API
  - 優點：唔使用戶 device 資源
  - 缺點：latency、成本
- Option B：本地生成（ONNX / TensorFlow Lite）
  - 優點：快、離線可用
  - 缺點：App size 變大、device 效能要求
- 建議 MVP 用 Option A（簡單快），之後再優化

### 步數追蹤
- Android：Health Connect API（2024+）
- iOS：HealthKit
- Fallback：手機 Accelerometer（冇 Health API 時用）
- Background sync：WorkManager（Android）/ BGTaskScheduler（iOS）

### 交易系統 MVP
- 簡單版：遊戲內貨幣交易
- 進階版：NFT/區塊鏈交易
- 建議 MVP 用簡單版，之後加 Web3

---

## 8. 風險評估

| 風險 | 影響 | 發生率 | 對策 |
|------|------|--------|------|
| iOS overlay 限制 | 高 | 高 | MVP 先做 Android |
| AI 生成成本高 | 中 | 中 | 優化 prompt，batch generate |
| 用戶電池消耗 | 高 | 中 | Background step tracking 省電模式 |
| 步數作弊 | 中 | 高 | GPS + Accelerometer 雙重驗證 |
| Phase 2 硬件開發複雜 | 高 | 中 | 先做 Phase 1 站穩 |
| 競爭者抄襲 | 中 | 高 | 建立品牌 + 社群護城河 |

---

## 9. 上架 Checklist

### App Store
- Apple Developer Program 會員（$99/年）
- 私隱政策網頁
- App 截圖（6.7" 同 6.5" 各一組）
- 宣傳文字（30字內）
- 關鍵字（ASO）
- 內容分級問卷
- TestFlight beta

### Google Play
- 開發者帳戶（$25 一次）
- 私隱政策
- 圖示、截圖
- 內容分級問卷
- Internal / Closed / Open track

---

## 10. 每月成本估算（MVP 階段）

| 項目 | 成本 |
|------|------|
| Supabase（免費 plan） | $0 |
| Vercel / Railway（免費） | $0 |
| Replicate AI（per generation） | ~$0.01-0.05/張 |
| Sentry（免費） | $0 |
| Apple Developer | $8.25/月 |
| Domain（pipz.app / pipz.io） | ~$15-30/年 |
| **Total MVP** | **~$15-30/月** |
