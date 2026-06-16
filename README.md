# Pipz

行路寵物 App - 陪你每一步

品牌定位：可愛為主，滲入科技感

Project 資料夾：C:\Users\claw\Desktop\Pipz\

Phase 1：Web MVP（試市場）
先做 Web（Next.js + Supabase + Pixi.js）
寵物喺 browser 畫面陪你行路
核心：行路 -> 解鎖 AI 像素寵物 -> 育成 -> 交易
Monorepo 結構，core logic 抽成 pure TS 日後重用

Phase 2：Native App + Overlay
React Native / Native App
真正熒幕 overlay 跨越其他 App
背景步數追蹤、Health API

Phase 3：硬件發電
配合硬件行路產生能源

開發策略
上層：apps/web（Next.js Web MVP）
中層：packages/core（純 TS 遊戲邏輯，跨平台重用）
底層：backend/（Supabase + API，全部平台共用）

Folder 結構
WEB_MVP_PLAN.md - Web MVP 詳細計劃
DEV_ROADMAP.md - 完整開發路線圖
RESEARCH_HANDOFF.md - Researcher 研究報告
CROSS_PLATFORM_REUSE.md - 跨平台重用策略
README.md - 呢個
