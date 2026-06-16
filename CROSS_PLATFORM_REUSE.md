# Pipz — Web MVP 跨平台重用策略

## 可以 100% 重用嘅部分

### 1. Backend（全部）
| 組件 | Web | Android | iOS |
|------|-----|---------|-----|
| Supabase Database | ✅ | ✅ | ✅ |
| Auth（註冊/登入） | ✅ | ✅ | ✅ |
| API Routes | ✅ | ✅ | ✅ |
| Storage（寵物圖片） | ✅ | ✅ | ✅ |
| Realtime（交易/聊天） | ✅ | ✅ | ✅ |

**策略：** 由頭到尾用同一個 backend，平台只係 client-side 嘅分別。

### 2. AI 生成寵物 Pipeline
- Replicate / Stable Diffusion API call 邏輯
- Prompt engineering（pixel art style prompts）
- Image storage + 處理
- **全部平台 call 同一個 API**

### 3. Database Schema
- Users, Pets, PetSpecies, Transactions, DailyActivity
- 所有表結構同邏輯完全重用
- 平台之間仲可以跨平台交易

### 4. 遊戲核心邏輯（Pure TypeScript）
呢個係最關鍵嘅策略：

**將 core game logic 抽成獨立 package：**

```
pipz-core/
├── src/
│   ├── formulas/
│   │   ├── evolution.ts      （進化所需步數、能力增長）
│   │   ├── encounter.ts      （遇見機率、稀有度計算）
│   │   ├── stats.ts          （能力值生成、成長曲線）
│   │   └── mood.ts           （情緒系統邏輯）
│   ├── types/
│   │   ├── pet.ts            （寵物數據類型）
│   │   ├── user.ts           （用戶數據類型）
│   │   └── transaction.ts    （交易數據類型）
│   └── utils/
│       ├── rarity.ts         （稀有度邏輯）
│       ├── genetics.ts       （遺傳系統參考）
│       └── achievements.ts   （成就系統）
└── package.json
```

**Web：** import 直接喺 Next.js 用
**React Native：** import 同一個 package（npm workspace）
**原理：** 純 TypeScript，冇任何 DOM/Web API 依賴

### 5. 設計系統（Design Tokens）
```
design-tokens/
├── colors.ts          （品牌色、稀有度色）
├── typography.ts      （字體、大小）
├── spacing.ts         （間距標準）
├── animations.ts      （動畫時長、easing）
└── icons/             （SVG icons）
```

- Web：Tailwind config + CSS variables
- Native：React Native StyleSheet / 對應變數

### 6. 寵物圖片 + Assets
- AI 生成嘅寵物 PNG（統一格式）
- 上傳去 Supabase Storage
- Web 直接 load URL
- Native 都係 load 同一個 URL

---

## 可以部份重用嘅部分

### 7. Canvas 寵物動畫（最複雜）
| 層面 | 重用策略 |
|------|---------|
| Animation Logic（行為 AI） | 可以抽成純 TS，決定寵物嘅位置、動作、時機 |
| Rendering 引擎 | Web：Pixi.js / Canvas | Native：OpenGL / Skia / Lottie |
| Sprite Sheets | 同一套 pixels，export 做 spritesheet 格式 |

**策略：** Animation behavior 用純 TS 寫（寵物 patrol AI、反應邏輯），但 rendering 層各平台自己實作。

### 8. UI Component 概念
- Design 方向統一
- 但 Web 用 CSS/HTML，Native 用 React Native components
- 唔可以直接重用，但設計稿同一套

---

## 要完全重寫嘅部分

| 組件 | 原因 |
|------|------|
| **Overlay 系統** | Web 做唔到，Native 先有 SYSTEM_ALERT_WINDOW |
| **背景步數追蹤** | Web 要開 browser，Native 可以用 background service |
| **Health API 整合** | HealthKit / Google Fit 係 platform-specific |
| **原生通知** | Web push notification 有限，Native 完整 |
| **手勢/觸控系統** | Web touch event vs Native gesture system |
| **硬體整合（Phase 2）** | BlueTooth / NFC 要 native |

---

## 最佳開發策略：Monorepo

為咗最大化重用，建議用 **Turborepo / Nx monorepo** 結構：

```
pipz/
├── apps/
│   ├── web/                  # Next.js（Web MVP）
│   ├── mobile/               # React Native（Phase 2）
│   └── admin/                # Admin panel（可選）
├── packages/
│   ├── core/                 # 純 TypeScript 遊戲邏輯（重用）
│   ├── design-tokens/        # 設計系統（重用）
│   ├── api-client/           # API 呼叫封裝（重用）
│   └── ai-pipeline/          # AI 生成邏輯（重用）
├── backend/
│   ├── supabase/             # Database migrations
│   └── functions/            # Edge functions
└── turbo.json
```

### 開發順序

```
Web MVP（先）
├── apps/web（Next.js）
└── packages/core ← 而家就要抽得乾淨，方便日後重用

React Native App（後）
├── apps/mobile
├── packages/core ← 直接重用
└── packages/design-tokens ← 重用

Native App（最後）
├── apps/android + ios（如果需要更底層）
├── packages/core ← 重用
└── packages/api-client ← 重用
```

### 重點：Core Package 嘅設計原則

寫 core package 嘅時候要遵守嘅規則：

1. 零 DOM 依賴（純 TS）
2. 零 Node.js API 依賴（可以用標準 library）
3. 所有 IO 用 dependency injection
   （例如：儲存寵物 -> 傳 callback，唔直接 call API）
4. 所有計算純函數（input -> output）
5. TypeScript strict mode
6. 唔用任何 framework-specific 嘅嘢

---

## Summary：Web MVP 留俾 Native 嘅資產

| 類別 | 重用率 | 說明 |
|------|--------|------|
| 後端 + Database | 100% | 完全同一套 |
| Core 遊戲邏輯 | 100% | 抽成 pure TS package |
| Design Tokens | 100% | Colors, typography, spacing |
| AI Prompt | 100% | 同一套 prompt + pipeline |
| 寵物圖片 Assets | 100% | 同一 URL 直接 load |
| Animation Logic | 80% | Behavior 重用，rendering 自寫 |
| UI Component | 30% | Design 方向一致但實作不同 |
| Platform Features | 0% | Overlay, background, health API |
