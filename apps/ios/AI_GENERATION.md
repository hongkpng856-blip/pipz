# AI 即時生成（開箱即用，玩家唔需要 key）

## 設計原則
- **Key 只喺 server**：`PIPZ_AI_KEY` 放喺 Vercel 環境變數。App 裡面冇任何 key，
  亦冇設定畫面要求玩家填 —— 開箱即用。
- **一定有後備**：AI 慢／冇網／server 未設定 → 自動用內建離線生成（`NameGenerator` + 程序化外形），
  流程永遠唔會卡住或出空白。
- **AI 決定外觀，唔只係名**：回傳 `archetype / ear / pattern / palette`，直接餵落
  `ObjectGenerator.sprite(..., hints:)`，所以每件嘢嘅骨架、耳朵、花紋、主色都係 AI 揀。
- **可重現**：hints 會存落 `DiscoveredItem.hints`（Codable），所以之後重開 app、
  進化、換階段，畫出嚟嘅仍然係同一隻。

## 接口（已經部署喺 Pipz web app）

```
POST https://pipz.anthroskill.com/api/mini/spawn
Content-Type: application/json

{ "category": "動物", "categoryKey": "animal", "rarity": "稀有", "source": "一下衝擊", "seed": "123456789" }
```

回傳（server 已驗證／夾值，唔會回傳未過濾嘅模型原文）：

```json
{
  "name": "午後的絨毛罐",
  "note": "行到轉角就見到佢，冇人認頭。",
  "archetype": "creature",
  "ear": 2,
  "pattern": 1,
  "palette": "#B08968"
}
```

- `archetype`：`creature | cup | bottle | lamp | clock | box | chair | brush | blob`
- `ear`：0–3（0 無耳、1 尖耳、2 圓耳、3 觸鬚）
- `pattern`：0 / 1
- `palette`：`#RRGGBB`（純黑、純白會被 server 拒）

錯誤：`501` = server 未設 `PIPZ_AI_KEY`；`502` = 上游失敗／模型輸出唔係 JSON；`504` = timeout。
App 收到任何非 200 都會靜靜咁保留離線版，唔會報錯畀用戶。

## 部署（一次性）

1. **Vercel 環境變數**（Project → Settings → Environment Variables）
   - `PIPZ_AI_KEY`＝OpenAI 相容 API key（**必需**）
   - `PIPZ_AI_BASE_URL`＝預設 `https://api.commandcode.ai/provider/v1`
   - `PIPZ_AI_MODEL`＝預設 `deepseek/deepseek-v4-flash`
2. Deploy（push 去 main 或者 `vercel --prod`）
3. 驗證：
   ```bash
   curl -s https://pipz.anthroskill.com/api/mini/spawn            # GET → {"ok":true,...}
   curl -s -X POST https://pipz.anthroskill.com/api/mini/spawn \
     -H 'content-type: application/json' \
     -d '{"category":"動物","rarity":"稀有","source":"一下衝擊"}'
   ```

## 每次生成用幾多 token（實測）
| | prompt | completion（含 reasoning） | total |
|---|---|---|---|
| 免費 `minimax-m3.1-flash:free`（`reasoning_effort=low`） | ~595 | 180–350（reasoning 125–290） | **~780–950** |
| 免費（預設 effort） | ~595 | 平均 464（reasoning 591） | ~710–1,280 |
| 付費 `deepseek-v4-flash` | ~461 | 590–1,140（reasoning 約 60%） | ~1,050–1,500 |

- Prompt 裡面大約 **450 token 係固定 system prompt**，其餘 ~100 係分類／稀有度／靈感。
- 上游有 prompt cache（實測 `cached_tokens` 128–384），重複請求平啲。
- 每玩家每日上限 24 次發現 → **大約 2 萬–3 萬 token／日**。
- `reasoning_effort: minimal` 呢個 provider 會回 **400**；`low` 對免費 model 有效（token 減半、延遲減半），對 deepseek 反而更差，所以只套用喺免費 model。

## 成本控制
- **先用免費 model**：`PIPZ_AI_MODEL` 係逗號分隔 try-list，預設
  `minimax/minimax-m3.1-flash:free,deepseek/deepseek-v4-flash`。免費永遠試先，慢／失敗就即刻換付費。
- 免費 model 得 **9 秒 leash**（成功時 3–9 秒，慢起上嚟 18–31 秒），付費 13 秒；
  成個請求總預算 24 秒（< `maxDuration` 30、< iOS client 26）。
- 每日發現上限 24（`DiscoveryRules.maxPerDay`）→ 每個玩家每日最多 24 次請求。
- 免費 model 調查（每個 2 次實測）：只有 `minimax/minimax-m3.1-flash:free` 穩定；
  `ornith-1.5-122b:free`／`poolside/laguna-s-2.1-free` 常 429，`stealth/glyph-cluster:free` 400，
  `reflection/beam:free` 慢到 timeout。想再省可以自己改 `PIPZ_AI_MODEL`。

## 實測（2026-10-21，live）
- 12 次連續請求：**12/12 成功**，延遲 5.6–18.7 秒（平均 13.2 秒）。
- Model 分佈：免費 minimax 4 次、付費 deepseek 8 次（免費永遠優先）。
- 分類骨架正確：動物／怪奇 → `creature`；家居 → cup/bottle/box/lamp；食物 → cup/blob/box；植物 → blob/brush/creature；工具 → brush/box/clock。
- 已寫入 Vercel env：`PIPZ_AI_KEY`、`PIPZ_AI_MODEL`（Production ＋ Development，project `pipz`，Root Directory `apps/web`）。
- 502 回應會帶 `attempts[]`（timeout／HTTP status／unparseable），Debug 用。

## 實作陷阱（改之前先睇）
1. 上游有 Cloudflare：**一定要送正常 `User-Agent`**，否則 403。
2. **`max_tokens` 至少 2500**：deepseek 先花 token 做 reasoning，太少會回空 `content`（1200 都試過失敗）。
3. Timeout 三層要對齊：function `maxDuration=30`、免費 9 秒／付費 13 秒、iOS client 26 秒。
4. `pattern` 唔可以信模型（永遠答 1），用名字 hash。
5. 測中文 body **唔好用 Windows bash inline curl**（會用 console codepage 變亂碼，server 會靜靜當成預設分類）。用 python 或者 UTF-8 檔案。



## 安全 / 審核
- 唔會收集或傳送任何個人資料（只傳分類、稀有度、事件類型）→ App Privacy 可以照答「不收集」。
- Prompt 已寫明：唔准真人、政治、品牌、色情、恐怖；server 亦會 truncate 同清走引號／換行。
- 唔可以將 key 放入 app：`strings` 一抽就有，App Review 亦會當 abusive usage 拒。
