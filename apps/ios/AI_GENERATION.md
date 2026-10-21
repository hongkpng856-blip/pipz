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

## 成本控制
- 每次發現一次請求，`max_tokens: 220`、temperature 1.05、12 秒 timeout。
- 每日發現上限 24（`DiscoveryRules.maxPerDay`）→ 每個玩家每日最多 24 次請求。
- 想再省：把 `PIPZ_AI_MODEL` 換成更便宜模型；或者把 `ai.enabled` 預設改 false（唔建議，會失去產品重點）。

## 安全 / 審核
- 唔會收集或傳送任何個人資料（只傳分類、稀有度、事件類型）→ App Privacy 可以照答「不收集」。
- Prompt 已寫明：唔准真人、政治、品牌、色情、恐怖；server 亦會 truncate 同清走引號／換行。
- 唔可以將 key 放入 app：`strings` 一抽就有，App Review 亦會當 abusive usage 拒。
