import { NextRequest, NextResponse } from 'next/server'

// Pipz 生活收集版 —— 物件生成 proxy
// 玩家 app 唔需要任何 API key；key 只喺 server（Vercel env）存在。
//
// 環境變數：
//   PIPZ_AI_KEY        （必需）OpenAI 相容 API key
//   PIPZ_AI_BASE_URL   （選填）預設 https://api.commandcode.ai/provider/v1
//   PIPZ_AI_MODEL      （選填）預設 deepseek/deepseek-v4-flash
//
// POST /api/mini/spawn
// body: { "category": "animal", "rarity": "rare", "source": "衝擊", "seed": 123456 }
// 回： { "name": "...", "note": "...", "archetype": "creature", "ear": 2, "pattern": 1, "palette": "#B08968" }

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ARCHETYPES = ['creature', 'cup', 'bottle', 'lamp', 'clock', 'box', 'chair', 'brush', 'blob'] as const

const SYSTEM_PROMPT = `你係一個幫手機遊戲即時生成古怪小物件嘅作家，全部用香港繁體中文（廣東話語感，可以帶少少口語）。
風格：日常、平凡之中有少少驚喜、好奇多過恐怖、唔色情、唔涉及真人、政治、品牌或商標。

只可以輸出一個 JSON object，唔可以有其他文字或 markdown code fence：
{"name":"...","note":"...","archetype":"...","ear":0,"pattern":0,"palette":"#RRGGBB"}

規則：
- name：4 至 10 個中文字，具體、有畫面感，唔好用引號。
- note：一句 30 字以內描述，講佢點出現或者畀人咩感覺。
- archetype：外觀骨架，只可以係 creature / cup / bottle / lamp / clock / box / chair / brush / blob 之一。
  （動物同怪奇通常用 creature；家居可以用 cup/bottle/lamp/clock/box/chair）
- ear：0-3 整數，只有 archetype=creature 有意義（0=無耳 1=尖耳 2=圓耳 3=觸鬚）。
- pattern：0 或 1，身上有冇花紋。
- palette：一個 hex 色，作為物件主色，要符合物件氣質（唔要純黑或純白）。`

interface SpawnBody {
  category?: string
  rarity?: string
  source?: string
  seed?: number
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? Math.round(value) : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function sanitizePalette(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match = value.trim().match(/^#?([0-9a-fA-F]{6})$/)
  if (!match) return null
  const hex = match[1].toUpperCase()
  if (hex === '000000' || hex === 'FFFFFF') return null
  return `#${hex}`
}

function sanitizeText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return ''
  return value.replace(/[\r\n]+/g, ' ').replace(/["'`]/g, '').trim().slice(0, maxLen)
}

/** 由模型輸出抽 JSON，容忍 code fence 同前後雜訊 */
function extractJson(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.PIPZ_AI_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'server not configured' }, { status: 501 })
  }

  let body: SpawnBody = {}
  try {
    body = (await req.json()) as SpawnBody
  } catch {
    // 空 body 都容許
  }

  const category = sanitizeText(body.category, 24) || 'animal'
  const rarity = sanitizeText(body.rarity, 12) || '常見'
  const source = sanitizeText(body.source, 24) || '行路'

  const baseUrl = (process.env.PIPZ_AI_BASE_URL || 'https://api.commandcode.ai/provider/v1').replace(/\/$/, '')
  const model = process.env.PIPZ_AI_MODEL || 'deepseek/deepseek-v4-flash'

  const userPrompt = `物件類型：${category}
稀有度：${rarity}
出現情況：${source}

生成一件物件。`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)

  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 1.05,
        max_tokens: 220,
      }),
      signal: controller.signal,
    })

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '')
      return NextResponse.json(
        { error: 'upstream failed', status: upstream.status, detail: detail.slice(0, 200) },
        { status: 502 }
      )
    }

    const data = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content ?? ''
    const json = extractJson(content)

    if (!json) {
      return NextResponse.json({ error: 'unparseable model output' }, { status: 502 })
    }

    const name = sanitizeText(json.name, 24)
    if (!name) {
      return NextResponse.json({ error: 'empty name' }, { status: 502 })
    }

    const note = sanitizeText(json.note, 60)
    const archetypeRaw = sanitizeText(json.archetype, 16).toLowerCase()
    const archetype = (ARCHETYPES as readonly string[]).includes(archetypeRaw) ? archetypeRaw : 'creature'
    const ear = clampInt(json.ear, 0, 3, 1)
    const pattern = clampInt(json.pattern, 0, 1, 0)
    const palette = sanitizePalette(json.palette) ?? '#B08968'

    return NextResponse.json(
      { name, note, archetype, ear, pattern, palette },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError'
    return NextResponse.json({ error: aborted ? 'timeout' : 'request failed' }, { status: 504 })
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET() {
  return NextResponse.json({
    ok: Boolean(process.env.PIPZ_AI_KEY),
    hint: 'POST { category, rarity, source } 取得一件 AI 生成物件',
  })
}
