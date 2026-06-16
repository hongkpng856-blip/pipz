# Pipz — Web MVP Plan

## 點解先做 Web？
- 最快出到 prototype（1-2 週就有得玩）
- 唔使 App Store / Play Store 審批
- Cost 最低（Vercel free tier 就夠）
- 試水溫、驗證 concept
- 日後可以 PWA -> React Native -> Native App

## Web 版做到嘅核心體驗

### ✅ 做得到
- 行路模擬（GPS / 手動輸入步數）
- 寵物系統（孵化、收集、進化、稀有度）
- AI 生成獨一無二像素寵物
- 寵物喺 browser 畫面走嚟走去（Canvas）
- 點擊互動、情緒系統
- 育成進化路線
- 圖鑑系統
- 交易市場
- 音樂/天氣反應
- PWA（Add to Home Screen）

### ❌ Web 版做唔到（留俾 Phase 2 Native App）
- 真 overlay（跨越其他 App）
- 背景步數追蹤（閂 browser 都計）
- HealthKit / Google Fit 整合
- 寵物喺其他 App 上面浮動

## Tech Stack

**Frontend**
Next.js 14+（React + TypeScript）
Tailwind CSS + cute 風格
Pixi.js / HTML Canvas（寵物動畫）
Framer Motion（UI 動畫）
PWA（next-pwa / next.config）

**Backend**
Next.js API Routes（初期夠用）
Supabase（Database + Auth + Storage）
Supabase Realtime（寵物同步、交易）

**AI**
Replicate API（Stable Diffusion 生圖）
或者 DALL-E 3 API

**Deployment**
Vercel（free tier）
Cloudflare（domain + CDN）

## Database Schema（Web MVP）

Users
- id, email, username
- total_steps, pet_slots, created_at

Pets
- id, user_id, name
- image_url（AI 生成嘅圖）
- species, rarity, level, evolution_stage
- stats: speed, luck, charm, energy
- mood: happy, hungry, sleepy
- created_at, last_interaction

PetSpecies
- id, name, description
- base_stats, evolution_path
- rarity_distribution

Transactions
- id, seller_id, buyer_id, pet_id
- price, status, created_at

DailyActivity
- id, user_id, date
- steps, pets_encountered
- achievements

## Web MVP 開發 Timeline（4-6 週）

### Week 1：Setup + 基礎架構
- Next.js project init
- Supabase setup（database + auth）
- 基本 UI layout（mobile-first）
- PWA config（manifest + service worker）
- 用戶註冊/登入

### Week 2：步數系統
- GPS 距離追蹤（Geolocation API）
- 手動步數輸入（for testing）
- 每日步數記錄
- 步數 -> 寵物解鎖邏輯
- 孵化動畫（0-1000 步）

### Week 3：寵物系統
- AI 生成寵物 pipeline（Replicate API）
- 寵物資料顯示頁
- 寵物狀態（情緒 + stats）
- 餵食、互動功能
- 進化系統

### Week 4：熒幕寵物 + 動畫
- Canvas 寵物喺畫面走動
- 步伐跟隨模擬
- 點擊反應（跳起、翻滾）
- 情緒表現動畫
- 音樂/天氣反應（基本版）

### Week 5：收集 + 圖鑑
- 隨機遇見系統（Gacha 效果）
- 圖鑑進度顯示
- 稀有度分級視覺
- 成就系統（基本）

### Week 6：交易 + Polish
- 交易市場（基本版）
- UI polish（可愛風格完成）
- 性能優化
- 部署上線

## UI / UX 設計方向（Web）

### Mobile-first 設計
- 主要 target 手機 browser
- PWA full screen 模式
- Desktop 都 support，但主力手機

### 畫面結構

**Home Screen（行路模式）**
- 寵物喺畫面中央走動
- 底部顯示步數、今日目標
- 頂部顯示情緒狀態
- 背景跟隨時間/天氣變化

**Pet Screen（寵物詳情）**
- 大圖顯示寵物
- stats 雷達圖
- 進化進度 bar
- 互動按鈕（餵食、摸頭、玩）

**Collection Screen（圖鑑）**
- 格仔顯示所有寵物
- 稀有度顏色標示
- 未解鎖顯示暗影 silhouette

**Market Screen（交易）**
- 寵物 listing
- 搜尋 + 過濾
- 買賣流程

**Profile Screen**
- 步數統計
- 成就
- 設定

### 配色方向（可愛+科技）
- 主色：柔和粉色/紫色系
- 輔色：螢光青/電光藍（科技感）
- 字體：圓潤可愛
- UI 元素：圓角、軟陰影、微動畫

## 技術注意事項

### GPS 步數追蹤（Web）
- navigator.geolocation.watchPosition()
- 計算兩點距離（Haversine formula）
- 過濾低精度讀數
- 最低速度門檻（避免震動當行路）
- 注意：開住 browser + GPS 會食電

### Canvas 寵物動畫
- Pixi.js 做 sprite animation
- 每幀更新寵物位置（隨機走動）
- 有基本 patrol AI（徘徊、休息、跟隨 cursor）
- 輕量級，唔可以拖慢網頁

### AI 生成策略（Web MVP）
- 初始批次預生成 100-200 款寵物
- 放入 database，遇見時 random 抽
- 用戶「遇見」先 reveal（慳成本）
- 進階：用戶解鎖時 call Replicate API 生成

### PWA 設定
- manifest.json（fullscreen, stand-alone）
- Service Worker（offline fallback）
- iOS 要加 meta tags（apple-mobile-web-app-capable）
- 注意：iOS PWA 冇 push notification（Web MVP 影響不大）

## Cost 估算（Web MVP）

| 項目 | 月費 |
|------|------|
| Vercel（Hobby） | $0 |
| Supabase（Free） | $0 |
| Replicate API | ~$5-20（按用量） |
| Domain（pipz.app） | ~$15/年 |
| **Total** | **~$5-20/月** |

## MVP 成功指標

- 100 個活躍用戶測試
- 每日平均行路 3000+ 步
- 用戶留存率 > 30%（Day 7）
- 用戶分享寵物 > 20%
- 驗證核心假設：用戶願意為寵物行路
