# Pipz 功能模組分類索引 (Feature Module Index)

> **用途**：改嘢之前睇呢份文件，一次過知道「呢個分類涉及邊啲地方」，唔使逐個 file 搵。
> **配合**：`docs/BUGS_AND_PITFALLS.md`（bug 記錄）、`docs/CHANGELOG.md`（版本歷史）、`docs/COMPONENT_CATALOG.md`（UI 結構）。
> **行號基準**：2026-07 檢查，改 code 後可能漂移，只作參考。

---

## 快速導航

| 分類 | 主要檔案 | 核心行號 |
|------|---------|---------|
| [1. 地圖 (Leaflet)](#1-地圖-leaflet) | RealMap.tsx | 154-1484 |
| [2. 網格地圖 (Monopoly Grid)](#2-網格地圖-monopoly-grid) | RealMap.tsx + API | 235-594 |
| [3. GPS / 定位 / 行走](#3-gps--定位--行走) | page.tsx + position-tracker.ts | 623-840 |
| [4. 步數系統](#4-步數系統) | page.tsx + supabase-db.ts | 875-973 |
| [5. 路線 / Trail](#5-路線--trail) | RealMap.tsx + page.tsx | 711-830, 2283-2320 |
| [6. 寵物系統](#6-寵物系統) | page.tsx + PixelPetCanvas.tsx | 2321-2432 |
| [7. 蛋 / 孵化](#7-蛋--孵化) | page.tsx + supabase-db.ts | 1431-1455 |
| [8. 事件系統 (Roguelike)](#8-事件系統-roguelike) | EventModal.tsx + page.tsx | 1200-1237, 1456-1543 |
| [9. 怪物 / 商店](#9-怪物--商店) | RealMap.tsx + MonsterModal.tsx | 72-113, 436-594 |
| [10. 地產系統](#10-地產系統) | page.tsx + api/properties/* | 507-570, 2433-2467 |
| [11. 社群 / 市集](#11-社群--市集) | page.tsx + api/market | 491-506, 2468-2548 |
| [12. 背包 / 裝備](#12-背包--裝備) | page.tsx + InventoryModal.tsx | 1544-1624, 2549-2598 |
| [13. Card 卡片佈局 (Draggable)](#13-card-卡片佈局-draggable) | page.tsx + globals.css | 2165-2626 |
| [14. 登入 / 認證](#14-登入--認證) | auth-modal / auth-wrapper / auth-context | — |
| [15. 通知系統](#15-通知系統) | NotificationModal.tsx + api/notifications | — |
| [16. 開發工具 (Dev Tools)](#16-開發工具-dev-tools) | page.tsx | 1878-2146 |
| [17. 全域樣式 / z-index](#17-全域樣式--z-index) | globals.css | 全檔 |
| [18. 資料層 (Supabase DB)](#18-資料層-supabase-db) | supabase-db.ts | 57-680 |
| [19. API Routes](#19-api-routes) | app/api/** | — |
| [20. Pixel 圖形渲染](#20-pixel-圖形渲染) | PixelPetCanvas / WalkingCanvas 等 | — |
| [21. PWA / Service Worker](#21-pwa--service-worker) | sw.js / SwRegister.tsx | — |
| [22. 資料庫 Schema / Migrations](#22-資料庫-schema--migrations) | supabase-schema.sql + migrations | — |

---

## 1. 地圖 (Leaflet)

| 位置 | 內容 |
|------|------|
| `apps/web/src/components/RealMap.tsx` L154 | 主組件 `RealMap`，所有 props（position/walking/pet/mode/deviceHeading/compassActive/userId/ownedCells/allFlagCells/trailDayFilter/onCellEvent/onShopEntered） |
| RealMap.tsx L982-1091 | Map init（tiles、zoom control、ResizeObserver、marker popup、accuracy circle） |
| RealMap.tsx L1130-1158 | Pet 變更時更新 marker icon（`buildPetIcon`） |
| RealMap.tsx L1159-1231 | GPS 位置 sync、smooth animation、auto-follow、初始 zoom 顯示全部 trail |
| RealMap.tsx L1232-1243 | 指南針 / GPS heading fallback |
| `apps/web/src/app/globals.css` L803-830 | `.leaflet-control-zoom` 樣式 |
| `apps/web/src/app/globals.css` L878-1005 | `.real-map-gps-badge`、`.real-map-gps-toggle`、`.real-map-grid-toggle-btn`、`.real-map-trail-overview`（z-index 1000，低過 card 1003） |
| `apps/web/src/app/page.tsx` L2147-2146 | RealMap 掛載位置（地圖鋪底） |

**相關 BUGS**：1.2（tile z-index）、1.5（portal）、6.5（compass）、10.1（fitBounds）、18.3（按鈕被 card 冚住 → 反轉決策，card cover 按鈕）、27

---

## 2. 網格地圖 (Monopoly Grid)

| 位置 | 內容 |
|------|------|
| RealMap.tsx L32-71 | Grid config（`GRID_ANCHOR`、`CELL_SIZE_DEG`、`getGridZoomFactor`） |
| RealMap.tsx L235-362 | `updateGrid()` — 畫格線、highlight 當前 cell、zoom factor 控制、auto-hide 時清理 overlays |
| RealMap.tsx L363-435 | `placeAllFlags()` — 玩家旗標 + zoomend handler（zoom < 14 隱藏） |
| RealMap.tsx L1050-1067 | `onViewChange`（moveend/zoomend throttle：refresh grid + monsters + shops） |
| RealMap.tsx L1092-1129 | 點擊 cell → 地址 popup |
| `apps/web/src/app/api/grid-config/route.ts` | Server 端 grid anchor API（server-authoritative） |
| `supabase/migrations/20260801_grid_config.sql` | `grid_config` 表 + RLS |
| `apps/web/src/app/page.tsx` L127-165 | Properties state + batch geocode |

**相關 BUGS**：11.x（grid drift / flyTo / anchor）、12.1-12.2（gridVisibleRef / zoom auto-toggle）、18.3、24（zoom 後怪物/商店錯位或堆疊）

---

## 3. GPS / 定位 / 行走

| 位置 | 內容 |
|------|------|
| `apps/web/src/lib/position-tracker.ts` | 位置追蹤封裝（route through PositionTracker，L783） |
| page.tsx L623-840 | Walk 邏輯：DeviceOrientation（指南針 60Hz）、DeviceMotion（加速度計步數）、兩階段 GPS（快速 WiFi + 高精度 watchPosition）、movement mode |
| page.tsx L841-874 | 地圖 tab active 時自動開 GPS |
| page.tsx L1137-1199 | 手動 D-pad + manual mode |
| page.tsx L2141-2145 | `<RealMap>` props 傳入（`mapPos`、`walking`、`movementMode`、`compassHeading`） |

**相關 BUGS**：3.2（watchPosition closure）、4.1（GPS drift 假步數）、4.3（simulator 冇 GPS）、6.5（compass 方向）、13.1（walkStop 次序）、14.1（phantom trail）

---

## 4. 步數系統

| 位置 | 內容 |
|------|------|
| page.tsx L875-973 | Step manager：side-effects、event check、egg check、visual effects（`stepAnimTick`、`stepFlashType`、`stepArrows`） |
| page.tsx L593-622 | Debounced step sync 去 Supabase |
| page.tsx L2214-2246 | Map preview：今日步數 / 總步數 / 日均（`steps-num step-bounce`） |
| `apps/web/src/lib/supabase-db.ts` L91-145 | `updateTotalSteps` / `upsertDailySteps` / `getWeeklySteps` / `getTodaySteps` |
| page.tsx L2283-2303 | 每星期 bar 圖（`DAY_COLORS` + click filter） |

**相關 BUGS**：4.1-4.3（步數計算）、25（bar 顏色 + click-to-filter）

---

## 5. 路線 / Trail

| 位置 | 內容 |
|------|------|
| RealMap.tsx L29 | `DAY_COLORS`（0-6 對應日一二三四五六：紫/青/綠/琥珀/紅/粉/藍）— **與 page.tsx L46 同步，改色要兩邊一齊改** |
| RealMap.tsx L711-764 | `saveTrailToStorage` / `restoreTrailFromStorage`（localStorage：`pipz_trail_data` / `pipz_vehicle_trail`） |
| RealMap.tsx L765-830 | Trail heatmap（`generateTrailHeatmap` / `renderTrailHeatmap`，按 day filter） |
| RealMap.tsx L831-970 | Trail overview toggle（fitBounds 顯示全部 polyline） |
| RealMap.tsx L1068-1091 | Per-day trails（lazy create polyline） |
| RealMap.tsx L1244-1288 | Trail drawing（walk = `DAY_COLORS` dashed；vehicle = 藍色實線）+ persist |
| RealMap.tsx L1355-1397 | `trailDayFilter` prop sync → 顯示/隱藏該日路線 |
| page.tsx L101 | `trailDayFilter` state（預設今日 `new Date().getDay()`） |
| page.tsx L2283-2300 | Weekly chart bar click → `setTrailDayFilter(active ? null : dayIdx)` |
| page.tsx L46 | `DAY_COLORS`（同 RealMap L29） |
| page.tsx L2070-2102 | Dev tool：7日路線測試 |

**相關 BUGS**：12.2-12.5（filter / overview 互動）、14.2（phantom trail）、25（click-to-filter 遺失）

---

## 6. 寵物系統

| 位置 | 內容 |
|------|------|
| page.tsx L2321-2432 | Pets tab 完整內容：出戰寵物狀態、能量、技能、其他寵物 list（`maxHeight:50vh; overflowY:auto` 獨立 scroll） |
| page.tsx L1610-1624 | `toggleFavorite`（max 5）→ favorites[0] 自動 sync activeIdx（`useEffect` L474-490） |
| page.tsx L482-490 | First team slot = active map pet（`favorites[0]` → `activeIdx` → `pet`） |
| page.tsx L1627-1756 | Spawn PixelLab cat / Shiba、PixelLab 蛋 |
| `apps/web/src/components/PixelPetCanvas.tsx` | Canvas 寵物渲染 + animation |
| `apps/web/src/components/PetDetailModal.tsx` | 寵物詳情（開 modal 時 load equipment，page.tsx L221-284） |
| `apps/web/src/lib/supabase-db.ts` L207-335 | `loadPets` / `savePet` / `updatePet` / `deletePet` / `loadFavorites` / `setFavoriteOrder` |

**相關 BUGS**：5.2（skills 消失）、5.3（evolution steps）、6.1-6.4（sprite 渲染）、8.1-8.2（tab switch canvas）、21（pet preview block 移除）

---

## 7. 蛋 / 孵化

| 位置 | 內容 |
|------|------|
| page.tsx L937-961 | Egg encounter check（行路踩中蛋 cell） |
| page.tsx L1431-1455 | 孵化蛋（`hatchEgg`，由 inventory 揀蛋） |
| page.tsx L201-211 | Egg popup + modal queue state |
| page.tsx L392-413 | Dismiss egg popup |
| `apps/web/src/lib/supabase-db.ts` L166-206 | `loadEggs` / `saveEgg` / `deleteEgg` |

**相關 BUGS**：2.0（silent save）、2.0.1（event+egg 同時觸發）、2.1（popup 重疊）、2.2（popup 唔 dismiss）

---

## 8. 事件系統 (Roguelike)

| 位置 | 內容 |
|------|------|
| page.tsx L917-936 | Event check（`eventLog`、`encounteredEventsRef`） |
| page.tsx L1200-1237 | Cell event handler（行入 ❓ cell → 隨機事件） |
| page.tsx L1456-1543 | 處理事件結果（獎勵/懲罰/選項） |
| page.tsx L974-991 | Dev tool：強制觸發事件 |
| `apps/web/src/components/EventModal.tsx` | Roguelike 事件 popup |
| `apps/web/src/lib/supabase-db.ts` L529-576 | `logEvent` |

**相關 BUGS**：2.0.1（queue）、13.1（modal 唔 render）、15.2（monster/shop 共用 ref）

---

## 9. 怪物 / 商店

| 位置 | 內容 |
|------|------|
| RealMap.tsx L41-51 | Monster / shop spawn config |
| RealMap.tsx L72-113 | `getMonsterForCell` / `getShopForCell`（deterministic per cell） |
| RealMap.tsx L436-504 | `placeMonstersOnGrid`（zoom<14 early return + 5000 cells safety cap） |
| RealMap.tsx L505-594 | `placeShopsOnGrid`（倒數 badge、顏色隨時間變紅）+ 2s countdown timer（L1342-1354） |
| RealMap.tsx L1289-1325 | Monster / shop encounter check（行入 cell 時） |
| page.tsx L1238-1430 | Direct DOM monster / shop modal（bypass React state）+ shop countdown |
| `apps/web/src/components/MonsterModal.tsx` | 怪物詳細 popup |

**相關 BUGS**：13.1（monster modal）、15.1-15.4（shop lifetime / 共用 ref / refresh reset / badge clutter）、24（zoom 效能）

---

## 10. 地產系統

| 位置 | 內容 |
|------|------|
| page.tsx L507-570 | Load properties + global callbacks（buy/sell/list/unlist） |
| page.tsx L2433-2467 | Properties tab 完整內容（全部 51 塊顯示，冇 slice 限制） |
| page.tsx L2247-2257 | Properties preview（我的地產 + 插旗數） |
| `apps/web/src/app/api/properties/route.ts` | Properties CRUD API |
| `apps/web/src/app/api/properties/all-cells/route.ts` | 全部 cell 旗標 API |
| `apps/web/src/app/api/properties/transfer/route.ts` | 轉讓 API（atomic） |
| `apps/web/src/lib/supabase-db.ts` L577-680 | `loadProperties` / `fetchAllFlagCells` / `buyProperty` / `sellProperty` / `listProperty` / `unlistProperty` / `loadAllListedProperties` |
| `supabase/migrations/20260802_properties.sql` | `properties` 表 + RLS + index |

**相關 BUGS**：5.6（API URL）、5.7（RLS UPDATE）、5.8（JOIN RLS）、11.x（flag 唔出現 / highlight 覆蓋）、19（Set vs Array）

---

## 11. 社群 / 市集

| 位置 | 內容 |
|------|------|
| page.tsx L491-506 | Load market listings（user 改變或 tab 切換時） |
| page.tsx L571-583 | 切去社群 tab 時 reload market + notifs + properties |
| page.tsx L1757-1808 | Market actions（list / unlist / buy） |
| page.tsx L2468-2548 | Community tab 完整內容（商店、玩家互動、市集） |
| page.tsx L2258-2268 | Community preview |
| `apps/web/src/app/api/market/route.ts` | Market API |
| `apps/web/src/lib/supabase-db.ts` L336-412 | `loadAllMarketData` / `listPet` / `unlistPet` / `buyPet` |

**相關 BUGS**：5.1（buy race condition）、5.7（RLS）、20（placeholder tab）

---

## 12. 背包 / 裝備

| 位置 | 內容 |
|------|------|
| page.tsx L1544-1624 | 開背包 / 用道具 / 裝配 / 卸裝 |
| page.tsx L2549-2598 | Backpack tab 完整內容（道具 + 裝備，全列表冇 slice） |
| page.tsx L2269-2278 | Backpack preview |
| `apps/web/src/components/InventoryModal.tsx` | 裝備/消耗品 modal |
| `apps/web/src/lib/supabase-db.ts` L444-528 | `equipItem` / `unequipSlot` / `loadPetEquipment` / `addInventoryItem` / `removeInventoryItem` / `loadInventory` |

**相關 BUGS**：20（placeholder tab）、22（內容被 clip → 獨立 scroll）

---

## 13. Card 卡片佈局 (Draggable)

> ⚠️ **最易出 bug 嘅區域** — 見 BUGS Section 16、17、18、22、23、26、27

| 位置 | 內容 |
|------|------|
| page.tsx L87-88 | `cardDragYRef` / `cardDragY` state |
| page.tsx L315-343 | `innerRef`（preview 高度測量）、`extRef`（extended scrollHeight）、`innerH` / `navH` / `extH`、`CARD_MAX_EXTRA`、clamp effect |
| page.tsx L2165-2190 | 拖曳 handler（pointermove/up、snap logic、`CARD_MAX_EXTRA` clamp） |
| page.tsx L2191-2210 | Card container（`zIndex:1003`、`overflow:hidden`、flex column、height 公式） |
| page.tsx L2211-2212 | **Content wrapper：`display:flex; flexDirection:column; justifyContent:flex-end`**（內容停底部關鍵） |
| page.tsx L2599-2626 | 底部 tab nav（5 tab：地圖/寵物/地產/社群/背包） |
| page.tsx L78 | `cardTab` state |
| globals.css | `.weekly-chart`、`.weekly-bar-*`、`.steps-*` 樣式 |

**核心規則（唔好亂改）**：
1. Card `z-index:1003` — 高過 header(1001) 同 nav(1001)，低過 map 控制按鈕就反轉：**card 拉到最上要 cover 地圖按鈕**（BUGS 27）
2. Content wrapper `justify-content: flex-end` + `overflow:hidden` — 內容停留底部，card 可以拉高，內容唔會移上（BUGS 26）
3. 內部 scroll 區塊（其他寵物 etc）用 `maxHeight:50vh; overflowY:auto; overflowX:hidden` — 唔影響外層 drag（BUGS 22、23）
4. `innerRef` 係 preview（DOM 最後一個 child 保持喺最底），`extRef` 係 extended content

**相關 BUGS**：16.1-16.6（drag 邏輯）、17.1-17.5（tab sync）、18.1-18.2（card 高度）、22、23、26、27

---

## 14. 登入 / 認證

| 位置 | 內容 |
|------|------|
| `apps/web/src/app/auth-modal.tsx` | 登入 modal（password + magic link） |
| `apps/web/src/app/auth-wrapper.tsx` | Auth guard wrapper |
| `apps/web/src/lib/auth-context.tsx` | Auth provider + hooks（user / loading / signOut） |
| `apps/web/src/app/api/auth/callback/route.ts` | Server-side auth callback |
| `apps/web/src/app/api/confirm-test-user/route.ts` | 測試用戶確認 |
| `apps/web/src/lib/supabase-client.ts` | Supabase client factory |
| `supabase-schema.sql` L196-208 | `handle_new_user` trigger（signup 自動建 profile） |

**相關 BUGS**：5.4（callback null user）、5.5（duplicate profile upsert race）、懸置：灰色登入畫面 bug

---

## 15. 通知系統

| 位置 | 內容 |
|------|------|
| `apps/web/src/components/NotificationModal.tsx` | 通知 popup |
| page.tsx L584-592 | 登入時 load unread count（header 金色鐘 🔔） |
| page.tsx L571-583 | 切 tab reload notifs |
| `apps/web/src/app/api/notifications/route.ts` | 通知 API |
| `apps/web/src/lib/supabase-db.ts` L413-443 | `createNotification` |

**相關 BUGS**：2.3（modal 冚住 bottom nav）

---

## 16. 開發工具 (Dev Tools)

> 🔧 Header 個 🔧 按鈕開關，**生產環境要留意**（page.tsx L212 有 auto-login 測試 code）

| 位置 | 內容 |
|------|------|
| page.tsx L1878-2146 | Dev panel：GPS control、walk simulation、GPS walk sim、manual mode、D-pad、test pet、7日路線測試、quick modify |
| page.tsx L974-1005 | Force event / remove steps / clear steps |
| page.tsx L1006-1032 | Create test pet（all skills） |
| page.tsx L1092-1136 | Walk simulation（continuous steps） |
| page.tsx L1107-1136 | GPS walk simulation（fake GPS） |

---

## 17. 全域樣式 / z-index

| 位置 | 內容 |
|------|------|
| `apps/web/src/app/globals.css`（全檔 1073 行） | 所有樣式 |
| z-index 圖表 | **header 1001 / bottom-nav 1001 / card 1003 / map 控制按鈕 1000 / modal 1100+** |
| `.real-map-*` L878-1005 | 地圖按鈕 + GPS badge（z-index:1000） |
| `.weekly-chart` / `.weekly-bar-*` | 每星期 bar |
| `.steps-num` / `.steps-label` / `.step-bounce` / `.step-flash` / `.arrow-float` | 步數視覺效果 |

**相關 BUGS**：1.1-1.5（position:fixed / !important / portal）、18.3、27

---

## 18. 資料層 (Supabase DB)

| 位置 | 內容 |
|------|------|
| `apps/web/src/lib/supabase-db.ts` L57-680 | 所有 CRUD（見各分類引用） |
| `apps/web/src/lib/supabase-client.ts` | Client factory（browser + server） |
| Tables | `profiles` / `pets` / `daily_activity` / `eggs` / `transactions` / `notifications` / `pet_equipment` / `inventory` / `event_log` / `properties` / `grid_config` |

**RLS 狀態（2026-07 已全部開啟）**：
- ✅ 所有表都有 RLS + policies（`pet_equipment` / `inventory` / `event_log` 係 2026-07-29 後補）
- ⚠️ 開新表記得 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + policies（見 BUGS 5.7、5.8）

---

## 19. API Routes

| Route | 用途 |
|-------|------|
| `app/api/auth/callback/route.ts` | Auth callback |
| `app/api/confirm-test-user/route.ts` | 測試用戶確認 |
| `app/api/geocode/route.ts` | 地址 geocode |
| `app/api/grid-config/route.ts` | Grid anchor（server-authoritative） |
| `app/api/market/route.ts` | 市集 |
| `app/api/notifications/route.ts` | 通知 |
| `app/api/properties/route.ts` | 地產 CRUD |
| `app/api/properties/all-cells/route.ts` | 全部旗標 |
| `app/api/properties/transfer/route.ts` | 轉讓（atomic） |

**相關 BUGS**：5.6（API URL wrong path）

---

## 20. Pixel 圖形渲染

| 位置 | 內容 |
|------|------|
| `apps/web/src/components/PixelPetCanvas.tsx` | 主寵物 canvas renderer（animation / evolution stage） |
| `apps/web/src/components/PixelPet.tsx` | ⚠️ Deprecated 舊 SVG pet |
| `apps/web/src/components/WalkingCanvas.tsx` | 行走動畫 canvas |
| `apps/web/src/components/PetCompanion.tsx` | 寵物伴隨顯示 |
| `apps/web/public/pixel-gen/sprites/` | 50 個 PICO-8 dithered PNG sprites |

**相關 BUGS**：6.1-6.4（灰底殘留 / blur / flash / flip）、8.1（tab switch stale canvas）

---

## 21. PWA / Service Worker

| 位置 | 內容 |
|------|------|
| `apps/web/public/sw.js` | Cache-first static SW |
| `apps/web/src/components/SwRegister.tsx` | SW 註冊 |
| `apps/web/public/manifest.json` | PWA manifest |
| `apps/web/public/icon-192.png` / `icon-512.png` | App icons |

**相關 BUGS**：7.3（SW 快取 stale assets — 改 public/ 資源後要 bump cache version）

---

## 22. 資料庫 Schema / Migrations

| 位置 | 內容 |
|------|------|
| `supabase-schema.sql` | 主 schema（profiles / pets / daily_activity / eggs / transactions / notifications + functions） |
| `supabase/migrations/20260801_grid_config.sql` | grid_config |
| `supabase/migrations/20260802_properties.sql` | properties |
| `supabase/migrations/20260729_rls_fix.sql` | RLS 修復（pet_equipment / inventory / event_log） |
| `migrations/roguelike_tables.sql` | pet_equipment / inventory / event_log（⚠️ 呢個 file 當初冇 RLS — 已修） |
| `docs/DATA_MODEL.md` | 資料模型文件 |

**Workflow**：
1. 新表/改表 → 寫 migration 落 `supabase/migrations/`（命名 `<timestamp>_name.sql`）
2. Apply：`supabase db push --include-all`（需要 `SUPABASE_ACCESS_TOKEN`，見環境變數）
3. **一定要加 RLS**（`ENABLE ROW LEVEL SECURITY` + policies）

---

## 改嘢前 Checklist

1. **搵分類** → 睇呢份 index 涉及邊啲檔案
2. **睇 BUGS** → 相關 section 避免重蹈覆轍（尤其 Card / Grid / Trail / RLS）
3. **同步改色/常數** → `DAY_COLORS` 喺 **RealMap.tsx L29** 同 **page.tsx L46** 兩處，改一處要改另一處
4. **RLS** → 涉及新表一定要開 RLS
5. **z-index** → 改層級前睇 Section 17 圖表
6. **改完** → update `docs/CHANGELOG.md` + 有需要加 BUGS section

---

# 改動影響分析流程 (Change Impact Analysis)

> **每次用戶要求改某樣嘢，必須先做影響分析**，自動檢查牽涉邊啲相關位置、需唔需要一齊改。唔好淨係改用戶講嘅嗰一個地方。

## 流程（5 步）

### Step 1 — 定位主分類
用戶話改「時間」，先諗：時間喺邊幾個系統出現？（見下方「跨分類依賴矩陣」）
用上方分類索引搵出主檔案 + 行號。

### Step 2 — 查依賴（影響分析）
用「跨分類依賴矩陣」檢查所有受影響位置。重點問：
- 呢個變數/常數有冇喺**第二個檔案**出現？（例：`DAY_COLORS` 喺 RealMap.tsx L29 同 page.tsx L46）
- 呢個狀態有冇**多個消費者**？（例：`trailDayFilter` 同時影響 RealMap polyline + weekly chart bar highlight）
- 呢個 UI 改動會唔會**影響 z-index / 佈局**？（例：改 card 高度 → 地圖按鈕被冚）
- 呢個資料改動需唔需要**改 DB schema / RLS / API route**？
- 呢個邏輯有冇 **guest vs logged-in 兩條路**？（localStorage vs Supabase）

### Step 3 — 列出同步修改清單
喺動手前，向用戶或自己列出：「呢個改動需要一齊改：A、B、C」。
如果涉及 3+ 個檔案，**停低問用戶**（見 pipz-blueprint 嘅 "Ask before deciding" 規則）。

### Step 4 — 一齊改 + 驗證
- 所有相關位置同步修改（唔好改一半）
- Build 驗證（`npx next build`，唔止 `tsc --noEmit`）
- 用 git diff 檢查冇漏

### Step 5 — 更新 Docs
- `CHANGELOG.md`（每次 functional change）
- `BUGS_AND_PITFALLS.md`（有 bug/坑就加）
- 如果改咗模組結構 → 更新呢份 MODULES.md

---

## 跨分類依賴矩陣 (Cross-Module Dependency Matrix)

> 點用：改左邊個分類，檢查右邊一齊受影響嘅分類。⚠️ = 好易漏。

| 改動分類 | 一齊要改/檢查 |
|---------|--------------|
| **時間 / 日期** ⚠️ | ① Shop countdown（RealMap L505-594 + page.tsx L1403）② Trail day filter（`trailDayFilter` + `new Date().getDay()`）③ Weekly chart（`weeklySteps` date）④ `daily_activity` date ⑤ 通知 `created_at` ⑥ shop lifetime（`shopLifetimeRef`） |
| **步數公式** ⚠️ | ① `addSt()` step manager（page.tsx L875）② GPS drift filter ③ `updateTotalSteps`/`upsertDailySteps`/`getWeeklySteps`（supabase-db）④ 進化檢查（`totalSteps`）⑤ 市集貨幣 ⑥ 步數視覺（`steps-num`/`step-bounce`/`step-flash`） |
| **顏色 / 常數** ⚠️ | ① `DAY_COLORS`：**RealMap.tsx L29 + page.tsx L46 兩處要同步** ② `RARITY_COLORS` ③ zone colors（`getZoneIdx`）④ shop countdown 顏色 ⑤ design tokens（globals.css） |
| **寵物 icon / 渲染** ⚠️ | ① 地圖 marker（`buildPetIcon` RealMap L1130-1158）② PixelPetCanvas ③ PetDetailModal ④ 主力隊伍 slots ⑤ **`walkingPet` 資料源：`userConfig` vs `pets[activeIdx]`（已知懸置問題）** |
| **z-index / 層級** ⚠️ | ① Card 1003 ② header/bottom-nav 1001 ③ 地圖控制按鈕 1000 ④ modal portal 9999 ⑤ 改任何一個要查全部（見 BUGS 18.3 / 27） |
| **Card 佈局** ⚠️ | ① `cardDragY`/`CARD_MAX_EXTRA`（page.tsx L87-88, L337）② content wrapper `justify-content:flex-end` ③ `innerRef`/`extRef` 測量 ④ 內部 scroll 區塊 ⑤ 地圖按鈕 z-index ⑥ 底部 nav |
| **狀態 / cardTab** ⚠️ | ① `cardTab` state（page.tsx L78）② 底部 nav 按鈕 ③ RealMap props ④ preview + extended content 兩段 ⑤ tab 切換 reload effect（L571-583） |
| **資料模型 / DB** | ① `supabase-schema.sql` ② `supabase/migrations/` ③ `supabase-db.ts` CRUD ④ RLS policies ⑤ page.tsx load effect ⑥ 對應 modal/component |
| **RLS / 權限** | ① 新表一定要 `ENABLE ROW LEVEL SECURITY` + policies ② cross-user query 要用 server API route（`SUPABASE_SERVICE_ROLE_KEY`）③ 改 table → 檢查現有 policies 仲啱唔啱 |
| **localStorage keys** | `pipz_trail_data` / `pipz_vehicle_trail` / `pipz_eggs` / `pipz_favs` — guest 同 logged-in 兩條路，改 key 要兩邊一齊改 |
| **API routes** | 改資料層 → 檢查對應 `app/api/**` route 有冇受影響（見 Section 19） |
| **步數 bar / 路線** | `DAY_COLORS` 兩處 + `trailDayFilter` + weekly chart click handler（見 Section 5） |

---

## 常見改動例子（睇一次就識）

### 例 1：「改時間格式」
影響：
- Shop modal countdown（page.tsx L1403 附近）
- Shop grid badge（RealMap L505-594）
- Weekly chart dayLabel（page.tsx L2283）
- Trail 記錄時間戳（`saveTrailToStorage`）
- 通知 created_at 顯示

**要一齊改：5 個位置** — 唔可以淨係改 modal 嗰個。

### 例 2：「改每星期 bar 顏色」
影響：
- `DAY_COLORS`（page.tsx L46）
- `DAY_COLORS`（RealMap.tsx L29）← **必同步，唔係地圖路線同 bar 又唔一致**（BUGS 25）
- `trailDayFilter` 預設值（page.tsx L101）

### 例 3：「改 Card 高度 / 佈局」
影響：
- `CARD_MAX_EXTRA` 公式（page.tsx L337）
- `cardDragY` clamp effect（L342-347）
- 地圖按鈕 z-index（可能被冚 — BUGS 18.3/27）
- `innerRef`/`extRef` 測量
- 內部 scroll 區塊（其他寵物等）

### 例 4：「加新 DB table」
影響：
- migration file（`supabase/migrations/<timestamp>_name.sql`）
- **RLS 一定要加**（唔係又收到 Supabase 安全警告）
- `supabase-db.ts` 加 CRUD
- page.tsx load effect + state
- 如果 cross-user → server API route + service role key

---

## 永久 Skill

呢個流程同時記錄喺 skill：**`pipz-change-impact`**（skill_view 攞詳細版）。
每個 session 開始改 Pipz code 前，load 呢個 skill 或者直接睇 `docs/MODULES.md`。
