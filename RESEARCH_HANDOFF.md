# Pipz — Researcher to Developer Handoff

## Project Overview
行路寵物 App。行路步數解鎖 AI 生成像素寵物，寵物會喺手機熒幕陪你行路互動。

## Brand
- 名：Pipz
- 感覺：可愛為主 + 科技感
- Project folder：C:\Users\claw\Desktop\Pipz\

## Two Phases
### Phase 1：行路養寵物 App（試市場、吸客）
### Phase 2：硬件發電（配合硬件，行路產生能源）

---

## Core Gameplay Mechanics

### 1. 步數解鎖寵物（Gacha + 隨機遇見）
- 0-1000 步 -> 孵化人生第一隻寵物（新手獎勵）
- 之後繼續行路 -> 隨機遇見新寵物
- 每次遇見嘅寵物能力值隨機
- 稀有度分級：普通 / 罕見 / 史詩 / 傳說
- 保底機制：行夠 N 步必定遇到稀有

### 2. AI 生成獨一無二像素寵物
- 每隻寵物由 AI 生成，獨一無二
- 像素風格，可愛為主
- 隨機能力值，每次唔同
- 每隻寵物嘅樣都唔同，係獨一無二嘅 token/NFT

### 3. 育成進化系統
- 行 10,000 步 -> 進化一級，能力增強
- 進化同時改變像素外觀
- 進化路線：
  - Level 1（0-1000步）：蛋 -> 孵化 -> BB 形態
  - Level 2（10000步）：幼年形態
  - Level 3（30000步）：成年形態
  - Level 4（60000步）：完全體
  - Level 5（100000步）：傳說形態
- 玩家選擇：育成現有寵物 vs 繼續搵新寵物

### 4. 熒幕陪伴互動（核心差異化功能）
- 寵物喺手機熒幕上面陪住你（唔係收埋喺 menu）
- 行路時寵物喺熒幕跟住你一齊跑
- 互動行為：
  - 跑步跟隨：步伐同你一齊
  - 屏幕搗亂：周圍走、爬、跳
  - 點擊反應：跳起/翻滾/叫聲
  - 情緒表現：開心（行路後）、肚餓、眼瞓
  - 提醒功能：飲水、休息、步數里程碑
  - 音樂反應：跟住節奏跳舞
  - 天氣反應：落雨擔遮、好天曬太陽
  - 成就慶祝：達到目標放煙花

### 5. 寵物交易
- 玩家可以交易寵物
- 可以係 Web3/NFT 或者 Web2 遊戲內交易
- 稀有寵物有市場價值

---

## Reference Products（已研究）

### STEPN（Move-to-Earn 先驅）
- 入場要先買 NFT 波鞋（要避開呢個致命傷）
- 雙代幣系統：GST（無限）+ GMT（60億有限）
- Energy 系統限制每日賺幣時長
- 衰亡原因：入場門檻太高、增長太快供給過剩、幣價死亡螺旋
- 教訓：新手要免費玩到，唔好要人先俾錢

### Pokemon Go
- 年收入 $10億+，累計 $60億+
- 行路孵蛋（2/5/10km 解鎖隨機寵物）
- Buddy System：寵物跟住你一齊行路
- 賺錢模式：內購（Pokecoin）、孵蛋器、活動 Pass、廣告
- 參考重點：免費入場、隨機遇見、社交分享

### Axie Infinity
- 寵物育成 + 繁殖 + 對戰
- 顯性基因 D（37.5%）/ 隱性 R1（9.375%）/ 次隱性 R2（3.125%）
- 最多繁殖 7 次，成本遞增
- 交易市場抽 4.25% 稅
- 參考重點：遺傳系統、稀有度機制

### Screen Pet - Aro / Shimeji Planet
- 浮動寵物 overlay 喺手機熒幕
- 對音樂、天氣、時間作出反應
- 最多 6 隻寵物同時顯示
- Android：SYSTEM_ALERT_WINDOW 權限

### Finch（500萬+ 用戶）
- 自我照顧 App，完成任務養寵物鳥
- 寵物有情緒、有探險
- 參考重點：寵物情感連結

---

## 技術考慮

### 熒幕 Overlay 方案
- Android：SYSTEM_ALERT_WINDOW（成熟技術，已有 Screen Pet 證明可行）
- iOS：限制較多，可用 Picture in Picture 或 WidgetKit
- 跨平台考慮：React Native / Flutter + native module

### 步數追蹤
- Android：Google Fit / Health Connect API
- iOS：HealthKit / Core Motion
- Background sync：參考 Pokemon Go Adventure Sync 模式

### AI 生成像素寵物
- Stable Diffusion fine-tune 做像素風
- 或者用 Generative Adversarial Networks
- 重點：每隻真正獨一無二，唔係 template 組合

---

## 建議 MVP（最小可行產品）

### Phase 1 - Stage 1
- 基本步數追蹤（手機 sensor / Health API）
- 簡單像素寵物顯示喺熒幕（overlay）
- 寵物跟住行路節奏郁動
- 孵化第一隻寵物（0-1000 步）
- 情緒系統（開心/肚餓）

### Phase 1 - Stage 2
- AI 生成多款寵物
- 進化系統
- 互動（點擊有反應）
- 交易系統
- 社交功能

---

## 收入模式建議
- 免費下載 + 內購（最穩定，Pokemon Go 經驗證）
- 廣告收入（激勵視頻廣告）
- 交易市場抽佣金（5-10%）
- 訂閱制（月費解鎖更多功能）
- 品牌合作（運動/健康品牌）

## 關鍵成功因素
1. 免費入場（STEPN 致命教訓）
2. 寵物情感連結（Finch 證明有效）
3. 隨機遇見令人上癮（Gacha 機制）
4. 熒幕陪伴係核心差異化
5. 社交裂變（打卡、分享寵物）
